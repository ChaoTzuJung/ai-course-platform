import {
  createCookie,
  redirect,
  data,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";
import { getAuth } from "@clerk/react-router/ssr.server";
import * as userService from "~/services/userService";
import { UserRole } from "~/db/schema";

// ─── Session / Auth ───
// Two modes, chosen by env at runtime:
//   • Clerk configured  → real auth via Clerk; app mirrors the user row.
//   • Not configured    → dev-login: a signed cookie holds a seeded user id.

export type RouteArgs = LoaderFunctionArgs | ActionFunctionArgs;

export type AppUser = NonNullable<ReturnType<typeof userService.getUserById>>;

export function isClerkConfigured(): boolean {
  return Boolean(
    process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY
  );
}

// ─── Dev-login cookie (only used when Clerk is not configured) ───

const devUserCookie = createCookie("acp_dev_user", {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secrets: ["acp-dev-secret"],
});

export async function getDevUserId(request: Request): Promise<number | null> {
  const value = await devUserCookie.parse(request.headers.get("Cookie"));
  const id = typeof value === "string" ? Number(value) : value;
  return typeof id === "number" && Number.isFinite(id) ? id : null;
}

export function serializeDevUser(userId: number): Promise<string> {
  return devUserCookie.serialize(String(userId));
}

export function clearDevUser(): Promise<string> {
  return devUserCookie.serialize("", { maxAge: 0 });
}

// ─── Current user resolution ───

export async function getCurrentUser(args: RouteArgs): Promise<AppUser | null> {
  if (isClerkConfigured()) {
    const auth = await getAuth(args);
    const clerkId = auth.userId;
    if (!clerkId) return null;

    const claims = (auth.sessionClaims ?? {}) as Record<string, unknown>;
    const email =
      (claims.email as string) ?? `${clerkId}@clerk.local`;
    const name =
      (claims.name as string) ?? (claims.username as string) ?? "Learner";
    const avatar = (claims.picture as string) ?? null;

    return userService.upsertUserFromClerk(clerkId, email, name, avatar);
  }

  const devId = await getDevUserId(args.request);
  if (devId == null) return null;
  return userService.getUserById(devId) ?? null;
}

export async function requireUser(args: RouteArgs): Promise<AppUser> {
  const user = await getCurrentUser(args);
  if (!user) {
    throw redirect(isClerkConfigured() ? "/sign-in" : "/dev/login");
  }
  return user;
}

/** Throws a 403 unless the user holds one of the allowed roles. */
export function requireRole(user: AppUser, ...roles: UserRole[]): void {
  if (!roles.includes(user.role)) {
    throw data("You don't have access to this page.", { status: 403 });
  }
}
