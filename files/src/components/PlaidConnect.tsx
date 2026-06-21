"use client";

import { useState, useTransition } from "react";
import { startPlaidLink } from "@/lib/actions/plaid";

// Feature-flagged Plaid entry point. When configured, fetches a link_token; the
// remaining step (mounting Plaid Link via react-plaid-link and exchanging the
// returned public_token) is documented in SETUP.md.
export default function PlaidConnect({ configured }: { configured: boolean }) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  if (!configured) {
    return (
      <span
        className="cursor-not-allowed text-sm text-gray-400"
        title="Set PLAID_CLIENT_ID, PLAID_SECRET, and PLAID_ENV in .env to enable"
      >
        Connect a bank (Plaid not configured)
      </span>
    );
  }

  function connect() {
    setStatus(null);
    startTransition(async () => {
      const result = await startPlaidLink();
      setStatus(
        result.ok
          ? "Link token acquired — mount Plaid Link to finish (see SETUP.md)."
          : result.error,
      );
    });
  }

  return (
    <span className="text-sm">
      <button
        onClick={connect}
        disabled={pending}
        className="font-medium text-blue-600 hover:underline disabled:opacity-60"
      >
        {pending ? "Connecting…" : "Connect a bank (Plaid)"}
      </button>
      {status && <span className="ml-2 text-xs text-gray-500">{status}</span>}
    </span>
  );
}
