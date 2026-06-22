"use server";

import { getCurrentUser } from "@/lib/user";
import { plaidConfigured, createLinkToken } from "@/lib/plaid";

export type PlaidLinkResult =
  | { ok: true; linkToken: string }
  | { ok: false; error: string };

// Returns a Plaid link_token to bootstrap Plaid Link, or a not-configured error.
export async function startPlaidLink(): Promise<PlaidLinkResult> {
  if (!plaidConfigured()) {
    return {
      ok: false,
      error:
        "Plaid is not configured. Set PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV in .env.",
    };
  }
  try {
    const user = await getCurrentUser();
    const linkToken = await createLinkToken(user.id);
    return { ok: true, linkToken };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
