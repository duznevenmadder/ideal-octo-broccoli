"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/accounts", label: "Accounts" },
  { href: "/liabilities", label: "Liabilities" },
  { href: "/investments", label: "Investments" },
  { href: "/transactions", label: "Transactions" },
  { href: "/import", label: "Import" },
  { href: "/budget", label: "Budget" },
  { href: "/goals", label: "Goals" },
  { href: "/fire", label: "FIRE" },
  { href: "/businesses", label: "Businesses" },
  { href: "/ira", label: "IRA Schedule" },
  { href: "/tax", label: "Tax Planner" },
  { href: "/reports", label: "Reports" },
  { href: "/summary", label: "AI Summary" },
];

export default function Nav({ showLogout = false }: { showLogout?: boolean }) {
  const pathname = usePathname();
  // No chrome on the login screen.
  if (pathname.startsWith("/login")) return null;
  return (
    <nav className="no-print border-b border-gray-200 dark:border-gray-800">
      {/* Scrolls horizontally on narrow screens instead of wrapping into a tall block. */}
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-4 py-3 sm:px-6">
        <span className="mr-2 shrink-0 font-semibold">Finance</span>
        {LINKS.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`shrink-0 whitespace-nowrap rounded px-2 py-1 text-sm ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        {showLogout && (
          <form action={logout} className="ml-auto shrink-0">
            <button
              type="submit"
              className="whitespace-nowrap rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Log out
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}
