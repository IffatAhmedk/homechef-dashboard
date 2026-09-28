"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

/** Sends you to Google to sign in, then back to the dashboard. */
export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true);
    await authClient.signIn.social({ provider: "google", callbackURL: "/admin-dashboard", errorCallbackURL: "/login" });
    setBusy(false);
  }

  return (
    <Button size="default" className="w-full" onClick={signIn} disabled={busy}>
      {busy ? "Opening Google…" : "Sign in with Google"}
    </Button>
  );
}
