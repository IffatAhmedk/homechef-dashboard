import Link from "next/link";
import { CartProvider } from "@/lib/cart-context";
import CartBadge from "./cart-badge";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <CartProvider>
      <header className="sticky top-0 z-10 border-b border-orange-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-orange-700">Rozana</span>
            <span className="text-sm text-neutral-500">ghar ka khana</span>
          </Link>
          <Link
            href="/checkout"
            className="relative rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Cart
            <CartBadge />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-orange-100 py-6 text-center text-xs text-neutral-400">
        Rozana — fresh home-style meals, delivered daily.
      </footer>
    </CartProvider>
  );
}
