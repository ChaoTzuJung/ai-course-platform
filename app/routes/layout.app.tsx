import { Outlet, Link, NavLink, Form, useLoaderData } from "react-router";
import { SignOutButton } from "@clerk/react-router";
import type { Route } from "./+types/layout.app";
import { requireUser, isClerkConfigured } from "~/lib/session.server";
import { UserRole } from "~/db/enums";
import { cn } from "~/lib/utils";

export async function loader(args: Route.LoaderArgs) {
  const user = await requireUser(args);
  return { user, clerkEnabled: isClerkConfigured() };
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-secondary text-secondary-foreground"
      : "text-muted-foreground hover:text-foreground"
  );

export default function AppLayout() {
  const { user, clerkEnabled } = useLoaderData<typeof loader>();
  const isInstructor =
    user.role === UserRole.Instructor || user.role === UserRole.Admin;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/dashboard" className="mr-2 font-bold">
            AI Course Platform
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/courses" className={navLinkClass}>
              Browse
            </NavLink>
            {isInstructor && (
              <NavLink to="/instructor" className={navLinkClass}>
                Instructor
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {user.name}
              <span className="ml-1 rounded bg-secondary px-1.5 py-0.5 text-xs capitalize">
                {user.role}
              </span>
            </span>
            {clerkEnabled ? (
              <SignOutButton>
                <button className="text-sm text-muted-foreground hover:text-foreground">
                  Sign out 1
                </button>
              </SignOutButton>
            ) : (
              <Form method="post" action="/api/logout">
                <button
                  type="submit"
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </button>
              </Form>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
