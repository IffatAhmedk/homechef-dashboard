"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Signs out and goes back to the login page. Pass `compact` to show only the icon (the sidebar when collapsed). */
export function SignOutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Button variant="plain" onClick={signOut} title="Sign out" aria-label="Sign out" className={cn("w-full justify-start", compact && "justify-center px-0")}>
      <LogOut size={20} strokeWidth={2.2} />
      <span className={cn(compact && "hidden")}>Sign out</span>
    </Button>
  );
}
