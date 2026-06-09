import { redirect } from "react-router";
import type { Route } from "./+types/api.logout";
import { clearDevUser, isClerkConfigured } from "~/lib/session.server";

// Dev-login logout: clears the dev cookie. (Clerk has its own sign-out flow.)
export async function action(_: Route.ActionArgs) {
  if (isClerkConfigured()) {
    return redirect("/");
  }
  return redirect("/", {
    headers: { "Set-Cookie": await clearDevUser() },
  });
}
