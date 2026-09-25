import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { orderFinancials } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";
import type { Order } from "@/models";

interface OrderTableProps {
  orders: Order[];
  onSelect: (order: Order) => void;
  /** Show only the newest few. */
  limit?: number;
}

/** Orders as rows: who, when, status, what was sold and what you receive. Click a row for the details. */
export function OrderTable({ orders, onSelect, limit }: OrderTableProps) {
  const rows = limit ? orders.slice(0, limit) : orders;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">You receive</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((order) => {
            const money = orderFinancials(order);
            return (
              <TableRow key={order.id} onClick={() => onSelect(order)} className="cursor-pointer hover:bg-sunken">
                <TableCell>
                  <p className="font-bold text-ink">{order.customer.name}</p>
                  <p className="text-caption text-ink-muted">{order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}</p>
                </TableCell>
                <TableCell className="text-ink-muted">{formatDateTime(order.createdAt)}</TableCell>
                <TableCell>
                  <OrderStatusBadge order={order} />
                </TableCell>
                <TableCell className="text-right">{formatCurrency(money.revenue)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(order.status === "CANCELLED" ? 0 : money.revenue - money.platformCut)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {rows.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No orders in this period.</p>}
    </>
  );
}
