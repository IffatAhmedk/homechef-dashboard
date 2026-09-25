import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/models";

/** A word for where an order stands: Successful, Wastage, Cancelled, or its step in the kitchen. */
export function OrderStatusBadge({ order }: { order: Pick<Order, "status" | "wastage"> }) {
  if (order.status === "CANCELLED") return order.wastage ? <Badge tone="warn">Wastage</Badge> : <Badge tone="bad">Cancelled</Badge>;
  if (order.status === "DELIVERED") return <Badge tone="good">Successful</Badge>;
  return <Badge tone="warn">{STATUS_LABELS[order.status] ?? order.status}</Badge>;
}
