import { redirect } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { authEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // If auth isn't configured, there's nothing to log into.
  if (!authEnabled()) redirect("/dashboard");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-gray-500">Enter your app password.</p>
      <form action={login} className="grid gap-3">
        <input
          name="password"
          type="password"
          autoFocus
          required
          placeholder="Password"
          className="rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Sign in
        </button>
        {error && (
          <p className="text-sm text-red-600">Incorrect password. Try again.</p>
        )}
      </form>
    </main>
  );
}
