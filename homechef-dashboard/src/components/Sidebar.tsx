"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, UtensilsCrossed, Wheat, Wallet, PanelLeftClose, PanelLeftOpen, LogIn } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SignOutButton } from "@/components/SignOutButton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const PAGES = [
  { href: "/admin-dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin-dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin-dashboard/menu", label: "Menu & Inventory", icon: UtensilsCrossed },
  { href: "/admin-dashboard/ingredients", label: "Ingredients", icon: Wheat },
  { href: "/admin-dashboard/invoices", label: "Money", icon: Wallet },
  { href: "/admin-dashboard/customers", label: "Customers", icon: Users },
];

const STORAGE_KEY = "rozana-sidebar-collapsed";

/** The page menu on the left. On wide screens it can be collapsed to icons, and it remembers that. */
export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {}
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {}
  }

  return (
    <aside className={cn("border-b border-line bg-card lg:shrink-0 lg:border-b-0 lg:border-r", collapsed ? "lg:w-20" : "lg:w-64")}>
      <div className={cn("flex items-start justify-between gap-2 px-4 py-4", collapsed && "lg:justify-center lg:px-2")}>
        <div className={cn(collapsed && "lg:hidden")}>
          <p className="font-wordmark text-xl text-leaf">Rozana</p>
          <p className="font-urdu text-xl text-ink">گھر کا کھانا</p>
        </div>
        <button
          onClick={toggle}
          aria-label={collapsed ? "Open the menu" : "Collapse the menu"}
          title={collapsed ? "Open the menu" : "Collapse the menu"}
          className="hidden size-10 items-center justify-center rounded-pill text-ink hover:bg-sunken lg:flex"
        >
          {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-5">
        {PAGES.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin-dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 shrink-0 items-center gap-3 rounded-pill px-4 text-label font-bold",
                collapsed && "lg:justify-center lg:px-0",
                active ? "bg-ink text-on-ink" : "text-ink hover:bg-sunken"
              )}
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className={cn(collapsed && "lg:hidden")}>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("space-y-1 border-t border-line px-3 py-3", collapsed && "lg:px-2")}>
        {session && <p className={cn("truncate px-4 text-caption text-ink-muted", collapsed && "lg:hidden")}>{session.user.name || session.user.email}</p>}
        {session || isPending ? (
          <SignOutButton compact={collapsed} />
        ) : (
          <>
            <p className={cn("px-4 text-caption text-ink-muted", collapsed && "lg:hidden")}>Preview: no data is shown.</p>
            <Link href="/preview/exit" className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start", collapsed && "justify-center px-0")}>
              <LogIn size={20} strokeWidth={2.2} />
              <span className={cn(collapsed && "hidden")}>Sign in</span>
            </Link>
          </>
        )}
      </div>
    </aside>
  );
}
