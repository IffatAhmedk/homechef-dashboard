import Link from "next/link";
import { LayoutDashboard, ShoppingBag, Users, UtensilsCrossed, ExternalLink } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/menu", label: "Menu & Inventory", icon: UtensilsCrossed },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export default function AdminLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <aside className="border-b border-neutral-200 bg-white lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-5 py-4">
          <p className="text-lg font-bold text-orange-700">Rozana</p>
          <p className="text-xs text-neutral-500">Admin dashboard</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-orange-50 hover:text-orange-700"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-neutral-100 px-5 py-3">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-orange-700"
          >
            View storefront <ExternalLink size={12} />
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
