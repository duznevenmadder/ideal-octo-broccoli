import SummaryGenerator from "@/components/SummaryGenerator";

export const dynamic = "force-dynamic";

export default function SummaryPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold">AI Monthly Summary</h1>
      <p className="mb-6 text-sm text-gray-500">
        Generates a plain-English summary of this month from your live data — net
        worth, cash flow, budget variance, goal progress, and IRA distribution
        room. Your financial figures are sent to the Anthropic API to produce the
        summary.
      </p>
      <SummaryGenerator />
    </main>
  );
}
