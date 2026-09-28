import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SignOutButton } from "@/components/SignOutButton";
import { auth, isAllowedEmail } from "@/lib/auth";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { error } = await searchParams;

  if (session && isAllowedEmail(session.user.email)) redirect("/admin-dashboard");

  const notAllowed = !!session || error === "unable_to_create_user" || error === "access_denied";

  return (
    <main className="flex min-h-screen items-center justify-center bg-ground p-4">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-card p-8 text-center shadow-card">
        <div>
          <p className="font-wordmark text-3xl text-leaf">Rozana</p>
          <p className="font-urdu text-3xl text-ink">گھر کا کھانا</p>
          <p className="text-caption text-ink-muted">Ghar ka khana, rozana.</p>
        </div>

        <div className="space-y-1">
          <h1 className="font-heading text-2xl text-ink">Assalam o Alaikum</h1>
          <p className="text-base text-ink-muted">Sign in to see how the kitchen is doing.</p>
        </div>

        {notAllowed && (
          <p className="rounded-sm bg-danger-soft px-4 py-3 text-base text-danger">
            {session ? `${session.user.email} isn't on the list.` : "That Google account isn't on the list."} Ask Iffat to add it.
          </p>
        )}
        {error && !notAllowed && <p className="rounded-sm bg-danger-soft px-4 py-3 text-base text-danger">Something went wrong signing in. Please try again.</p>}

        {session ? <SignOutButton /> : <GoogleSignInButton />}

        <Link href="/preview" className={buttonVariants({ variant: "secondary", className: "w-full" })}>
          Preview with no data
        </Link>
      </div>
    </main>
  );
}
