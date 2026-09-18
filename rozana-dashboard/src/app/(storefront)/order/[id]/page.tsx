import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: { include: { menuItem: true } } },
  });

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-orange-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">Order placed!</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Thanks, {order.customer.name}. We&apos;ve got your order and are getting it ready.
        </p>

        <div className="mt-5 rounded-lg bg-orange-50 p-3 text-left text-sm">
          <p className="font-medium text-neutral-700">
            Status: <span className="text-orange-700">{STATUS_LABELS[order.status]}</span>
          </p>
          <p className="text-neutral-500">Order #{order.id.slice(-8).toUpperCase()}</p>
          <p className="text-neutral-500">{formatDateTime(order.createdAt)}</p>
        </div>

        <div className="mt-5 space-y-2 text-left">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-neutral-700">
                {item.quantity} × {item.menuItem.name}
              </span>
              <span className="text-neutral-600">{formatCurrency(item.priceAtSale * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-orange-100 pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.totalAmount)}</span>
          </div>
        </div>

        <p className="mt-4 text-left text-sm text-neutral-500">
          Delivering to: {order.deliveryAddress}
        </p>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-orange-600 px-5 py-2 text-sm font-medium text-white hover:bg-orange-700"
        >
          Order more
        </Link>
      </div>
    </div>
  );
}
