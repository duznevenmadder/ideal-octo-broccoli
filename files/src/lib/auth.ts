// Lightweight single-user password gate. Pure helpers only (no next/headers) so
// this module is safe to import from both middleware (edge) and server actions.
//
// Auth is OPT-IN: if APP_PASSWORD is unset, authEnabled() is false and the whole
// gate is bypassed — the app stays open (useful for local/sandbox use).

export const COOKIE_NAME = "fa_session";

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

// Deterministic session token = SHA-256(password : secret). Stored in an
// httpOnly cookie; compared by middleware. Uses Web Crypto so it runs on edge.
export async function expectedToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "insecure-dev-secret";
  const data = new TextEncoder().encode(`${password}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
