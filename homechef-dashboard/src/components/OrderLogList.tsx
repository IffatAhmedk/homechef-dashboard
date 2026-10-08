import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Order } from "@/models";

/** A compact order list with the order ID shown, so every order is traceable back to its record. */
export function OrderLogList({ orders, onSelect }: { orders: Order[]; onSelect: (order: Order) => void }) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} onClick={() => onSelect(order)} className="cursor-pointer hover:bg-sunken">
              <TableCell className="font-bold text-ink">#{order.id.slice(-8).toUpperCase()}</TableCell>
              <TableCell className="text-ink-muted">{order.customer.name}</TableCell>
              <TableCell className="text-ink-muted">{formatDateTime(order.createdAt)}</TableCell>
              <TableCell>
                <OrderStatusBadge order={order} />
              </TableCell>
              <TableCell className="text-right font-bold">{formatCurrency(order.totalAmount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {orders.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No orders here yet.</p>}
    </>
  );
}
