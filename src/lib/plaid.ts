// Plaid bank-sync scaffold. Feature-flagged: enabled only when PLAID_CLIENT_ID,
// PLAID_SECRET, and PLAID_ENV are all set. The server calls below hit Plaid's
// stable REST endpoints; the browser-side Plaid Link UI (react-plaid-link) is
// the remaining wiring — see SETUP.md. Nothing here runs without credentials.

export function plaidConfigured(): boolean {
  return Boolean(
    process.env.PLAID_CLIENT_ID &&
      process.env.PLAID_SECRET &&
      process.env.PLAID_ENV,
  );
}

function plaidBaseUrl(): string {
  const env = process.env.PLAID_ENV ?? "sandbox";
  return `https://${env}.plaid.com`;
}

function creds() {
  return {
    client_id: process.env.PLAID_CLIENT_ID,
    secret: process.env.PLAID_SECRET,
  };
}

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${plaidBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds(), ...body }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plaid ${path} failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

// Create a short-lived link_token to initialize Plaid Link in the browser.
export async function createLinkToken(clientUserId: string): Promise<string> {
  const data = await plaidPost<{ link_token: string }>("/link/token/create", {
    user: { client_user_id: clientUserId },
    client_name: "Personal Finance App",
    products: ["transactions"],
    country_codes: ["US"],
    language: "en",
  });
  return data.link_token;
}

// Exchange the public_token (returned by Plaid Link on success) for a persistent
// access_token. In production, store access_token securely per item/account.
export async function exchangePublicToken(
  publicToken: string,
): Promise<{ accessToken: string; itemId: string }> {
  const data = await plaidPost<{ access_token: string; item_id: string }>(
    "/item/public_token/exchange",
    { public_token: publicToken },
  );
  return { accessToken: data.access_token, itemId: data.item_id };
}
