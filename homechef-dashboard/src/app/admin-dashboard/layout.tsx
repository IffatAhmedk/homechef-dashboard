import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Users, UtensilsCrossed, Wheat, Receipt } from "lucide-react";

const NAV = [
  { href: "/admin-dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin-dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin-dashboard/menu", label: "Menu & Inventory", icon: UtensilsCrossed },
  { href: "/admin-dashboard/ingredients", label: "Ingredients", icon: Wheat },
  { href: "/admin-dashboard/invoices", label: "Payouts", icon: Receipt },
  { href: "/admin-dashboard/customers", label: "Customers", icon: Users },
];

export default function AdminLayout({ children }: LayoutProps<"/admin-dashboard">) {
  return (
    <div className="min-h-screen bg-cream lg:flex">
      <aside className="border-b border-warm-beige/50 bg-white lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-5 py-4">
          <p className="text-lg font-bold text-terracotta">Rozana</p>
          <p className="text-xs text-charcoal/50">Admin dashboard</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/70 hover:bg-warm-beige/25 hover:text-terracotta"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
