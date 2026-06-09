import { SignIn } from "@clerk/react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/sign-in";
import { isClerkConfigured } from "~/lib/session.server";

export async function loader(_: Route.LoaderArgs) {
  if (!isClerkConfigured()) throw redirect("/dev/login");
  return null;
}

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <SignIn signUpUrl="/sign-up" />
    </main>
  );
}
