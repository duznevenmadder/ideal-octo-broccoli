import { prisma } from "./db";

// AUTH SEAM — Phase 1 has no auth; we operate as the single seeded user.
// When auth (Clerk/NextAuth) is added later, replace the body of this function
// to resolve the authenticated user; all callers stay unchanged.
export const SEED_USER_EMAIL = "keeling.taylor@gmail.com";

export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { email: SEED_USER_EMAIL },
  });
  if (!user) {
    throw new Error(
      `No user found for ${SEED_USER_EMAIL}. Run \`npm run db:seed\` to seed the database.`,
    );
  }
  return user;
}
