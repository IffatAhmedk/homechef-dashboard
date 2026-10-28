import { Badge } from "@/components/ui/badge";
import type { Order } from "@/models";

/** Whether the customer has paid for a direct order. */
export function PaymentStatusBadge({ order }: { order: Pick<Order, "paymentStatus"> }) {
  return order.paymentStatus === "PAID" ? <Badge tone="good">Paid</Badge> : <Badge tone="warn">Payment pending</Badge>;
}
