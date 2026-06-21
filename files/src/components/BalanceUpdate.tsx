"use client";

import { useState } from "react";
import { updateBalance } from "@/lib/actions/accounts";

// Inline balance editor — click the balance to update it quickly.
export default function BalanceUpdate({
  id,
  display,
  raw,
}: {
  id: string;
  display: string;
  raw: string;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Click to update balance"
        className="font-mono tabular-nums hover:underline"
      >
        {display}
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateBalance(fd);
        setEditing(false);
      }}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <input
        name="balance"
        autoFocus
        defaultValue={raw}
        inputMode="decimal"
        className="w-28 rounded border border-gray-300 px-1 py-0.5 text-right font-mono text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <button type="submit" className="text-xs font-medium text-blue-600 hover:underline">
        Save
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="text-xs text-gray-500 hover:underline"
      >
        ✕
      </button>
    </form>
  );
}
