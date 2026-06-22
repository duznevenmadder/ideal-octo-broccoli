"use server";

import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { getNetWorth } from "@/lib/networth";
import { getYtdIncome } from "@/lib/income";
import { CONFIG } from "@/lib/config";
import { federalTaxMFJ, roomBefore32 } from "@/lib/tax";
import { humanize } from "@/lib/labels";

// Default to the most capable model; override with ANTHROPIC_MODEL (e.g. the
// README's claude-sonnet-4-6 for lower cost).
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8";

export type SummaryResult =
  | { ok: true; summary: string; model: string }
  | { ok: false; error: string };

// Build a compact, structured snapshot of the user's live finances for the model.
async function buildSnapshot(userId: string) {
  const now = new Date();
  const year = now.getFullYear();
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 1);

  const [nw, monthTxns, budgets, goals, iraYear, ytdIncome] = await Promise.all([
    getNetWorth(userId),
    prisma.transaction.findMany({
      where: { userId, date: { gte: monthStart, lt: monthEnd } },
    }),
    prisma.budget.findMany({ where: { userId, isActive: true } }),
    prisma.goal.findMany({ where: { userId, isActive: true } }),
    prisma.iRADistribution.findUnique({
      where: { userId_year: { userId, year } },
    }),
    getYtdIncome(userId, year),
  ]);

  const income = monthTxns.filter((t) => t.isIncome).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = monthTxns.filter((t) => !t.isIncome).reduce((s, t) => s + Number(t.amount), 0);

  // Expense by category vs budget for the month.
  const spentByCat = new Map<string, number>();
  for (const t of monthTxns) {
    if (t.isIncome) continue;
    spentByCat.set(t.category, (spentByCat.get(t.category) ?? 0) + Number(t.amount));
  }
  const budgetByCat = new Map(budgets.map((b) => [b.category, Number(b.monthlyTarget)]));
  const categoryLines = [...spentByCat.entries()].map(([cat, spent]) => {
    const target = budgetByCat.get(cat);
    return `  - ${humanize(cat)}: spent $${spent.toFixed(0)}${
      target != null ? ` of $${target.toFixed(0)} budget` : " (no budget set)"
    }`;
  });

  const taxableBaseline = ytdIncome.total; // pre-IRA-distribution income proxy
  const room = roomBefore32(taxableBaseline);

  const goalLines = goals.map((g) => {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    const pct = target > 0 ? ((current / target) * 100).toFixed(0) : "0";
    return `  - ${g.name} (${humanize(g.type)}): $${current.toFixed(0)} of $${target.toFixed(0)} (${pct}%)`;
  });

  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return `MONTH: ${monthLabel}

NET WORTH
  Assets: $${nw.totalAssets.toFixed(0)}
  Liabilities: $${nw.totalLiabilities.toFixed(0)}
  Net worth: $${nw.netWorth.toFixed(0)}
  FIRE target: $${CONFIG.FIRE_TARGET} (gap: $${(CONFIG.FIRE_TARGET - nw.netWorth).toFixed(0)})

THIS MONTH CASH FLOW
  Income: $${income.toFixed(0)}
  Expenses: $${expenses.toFixed(0)}
  Surplus: $${(income - expenses).toFixed(0)}
  By category:
${categoryLines.length ? categoryLines.join("\n") : "  (no expense transactions recorded this month)"}

YEAR-TO-DATE INCOME (${year}, from transactions)
  W2: $${ytdIncome.w2.toFixed(0)}, 1099: $${ytdIncome.business1099.toFixed(0)}, K-1: $${ytdIncome.k1.toFixed(0)}, IRA distributions: $${ytdIncome.iraDistribution.toFixed(0)}
  Total: $${ytdIncome.total.toFixed(0)}

TAX / IRA-BDA (${year})
  32% bracket threshold (MFJ): $${CONFIG.BRACKET_32_THRESHOLD_MFJ}
  Room before 32% (from current YTD income): $${room.toFixed(0)}
  IRA-BDA must be emptied by ${CONFIG.IRA_BDA_DEADLINE}
${
  iraYear
    ? `  ${year} recommended distribution: $${Number(iraYear.recommendedAmt).toFixed(0)}; taken YTD: $${ytdIncome.iraDistribution.toFixed(0)}`
    : `  No ${year} IRA distribution plan recorded`
}

GOALS
${goalLines.length ? goalLines.join("\n") : "  (no goals set)"}`;
}

const SYSTEM_PROMPT = `You are a concise, practical personal-finance assistant writing a monthly summary for a household (filing MFJ, KY tax resident, with an inherited IRA on a 10-year drawdown). Use the data provided — never invent figures. Write in plain English, 4-6 short paragraphs or tight bullet groups. Cover: (1) where net worth and cash flow stand this month, (2) any budget categories over target, (3) progress toward goals and FIRE, (4) the most useful 2-3 concrete actions, especially around the IRA distribution room before the 32% bracket. Be direct and specific with dollar figures. Do not give legal or tax advice disclaimers; keep it actionable.`;

export async function generateMonthlySummary(): Promise<SummaryResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error:
        "ANTHROPIC_API_KEY is not set. Add it to your .env to enable AI summaries.",
    };
  }

  try {
    const user = await getCurrentUser();
    const snapshot = await buildSnapshot(user.id);

    const client = new Anthropic();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the household's current financial snapshot:\n\n${snapshot}\n\nWrite this month's summary.`,
        },
      ],
    });

    const summary = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!summary) {
      return { ok: false, error: "The model returned no text. Try again." };
    }
    return { ok: true, summary, model: message.model };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to generate summary: ${msg}` };
  }
}
