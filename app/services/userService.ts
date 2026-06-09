import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users, UserRole } from "~/db/schema";

// ─── User Service ───
// User CRUD + the Clerk mirror (an app user row per Clerk account).

export function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function getUserByClerkId(clerkId: string) {
  return db.select().from(users).where(eq(users.clerkId, clerkId)).get();
}

export function getUserByEmail(email: string) {
  return db.select().from(users).where(eq(users.email, email)).get();
}

export function listUsers() {
  return db.select().from(users).all();
}

/** Seeded / dev-login users have no Clerk id. Used by the dev-login picker. */
export function getDevUsers() {
  return db.select().from(users).all();
}

export function createUser(
  email: string,
  name: string,
  role: UserRole,
  avatarUrl: string | null,
  clerkId: string | null
) {
  return db
    .insert(users)
    .values({ email, name, role, avatarUrl, clerkId })
    .returning()
    .get();
}

export function updateUserRole(id: number, role: UserRole) {
  return db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning()
    .get();
}

/**
 * Returns the app user for a Clerk account, creating a mirror row on first
 * sign-in (matched by clerkId, then by email to adopt a pre-seeded account).
 */
export function upsertUserFromClerk(
  clerkId: string,
  email: string,
  name: string,
  avatarUrl: string | null
) {
  const byClerk = getUserByClerkId(clerkId);
  if (byClerk) return byClerk;

  const byEmail = getUserByEmail(email);
  if (byEmail) {
    return db
      .update(users)
      .set({ clerkId })
      .where(eq(users.id, byEmail.id))
      .returning()
      .get();
  }

  return createUser(email, name, UserRole.Student, avatarUrl, clerkId);
}
