import { redirect, Form, useLoaderData } from "react-router";
import type { Route } from "./+types/dev.login";
import {
  isClerkConfigured,
  serializeDevUser,
} from "~/lib/session.server";
import * as userService from "~/services/userService";

// Dev-only login: pick a seeded user. Disabled when Clerk is configured.

export async function loader(_: Route.LoaderArgs) {
  if (isClerkConfigured()) {
    throw redirect("/");
  }
  return { users: userService.getDevUsers() };
}

export async function action({ request }: Route.ActionArgs) {
  if (isClerkConfigured()) {
    throw redirect("/");
  }
  const form = await request.formData();
  const userId = Number(form.get("userId"));
  if (!Number.isFinite(userId)) {
    throw redirect("/dev/login");
  }
  return redirect("/dashboard", {
    headers: { "Set-Cookie": await serializeDevUser(userId) },
  });
}

export default function DevLogin() {
  const { users } = useLoaderData<typeof loader>();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Dev Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No auth provider configured — pick a seeded user to sign in. Set Clerk
          keys to enable real authentication.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No users yet. Run <code>pnpm db:seed</code> first.
          </p>
        )}
        {users.map((user) => (
          <Form key={user.id} method="post">
            <input type="hidden" name="userId" value={user.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-left transition-colors hover:bg-accent"
            >
              <span>
                <span className="font-medium">{user.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {user.email}
                </span>
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium capitalize">
                {user.role}
              </span>
            </button>
          </Form>
        ))}
      </div>
    </main>
  );
}
