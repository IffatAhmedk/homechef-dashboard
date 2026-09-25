"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { AddOrderModal } from "@/components/AddOrderModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOrder } from "@/data/orders";
import { FOODPANDA_COMMISSION_RATE, itemFinancials, orderFinancials } from "@/lib/finance";
import { formatCurrency, formatDateTime } from "@/lib/format";

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-line pt-1.5 font-bold text-ink" : "text-ink-muted"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** The right-hand panel for one order: items, and how its price splits into cost, Foodpanda's share and profit. */
export function OrderDetailSheet({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { data: order } = useOrder(orderId);
  const [editing, setEditing] = useState(false);
  const money = order ? orderFinancials(order) : null;

  const discount = order?.discount ?? 0;
  const deliveryCharge = order?.deliveryCharge ?? 0;
  const tip = order?.tip ?? 0;

  return (
    <>
      <Sheet open onOpenChange={(open) => !open && onClose()}>
        <SheetContent>
          <SheetHeader title="Order detail" />
          {!order || !money ? (
            <p className="p-5 text-base text-ink-muted">Loading…</p>
          ) : (
            <div className="flex-1 space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-ink">{order.customer.name}</p>
                  <p className="text-base text-ink-muted">{order.customer.phone}</p>
                  <p className="text-caption text-ink-muted">{formatDateTime(order.createdAt)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={order.channel === "FOODPANDA" ? "brand" : "neutral"}>{order.channel === "FOODPANDA" ? "Foodpanda" : "Direct"}</Badge>
                  <OrderStatusBadge order={order} />
                </div>
              </div>

              {order.channel === "DIRECT" && (
                <Button variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil size={16} strokeWidth={2.4} /> Edit this order
                </Button>
              )}

              {order.deliveryAddress && <p className="text-base text-ink-muted">Deliver to: {order.deliveryAddress}</p>}

              {order.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const line = itemFinancials(item, order.channel, money.effectiveCutRate);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.quantity} × {item.menuItem.name}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(line.revenue)}</TableCell>
                          <TableCell className="text-right text-ink-muted">{formatCurrency(line.cost)}</TableCell>
                          <TableCell className={`text-right font-bold ${line.profit >= 0 ? "text-leaf" : "text-danger"}`}>{formatCurrency(line.profit)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                order.costOverride != null && (
                  <p className="rounded-lg bg-sunken p-3 text-caption text-ink-muted">
                    Imported from a Foodpanda daily summary report — no itemized breakdown is available. Cost of goods below is estimated from your menu&apos;s cost
                    prices and overall dish mix.
                  </p>
                )
              )}

              {order.externalId && <p className="text-caption text-ink-muted">Foodpanda order code: {order.externalId}</p>}

              <div className="space-y-1.5 rounded-lg bg-sunken p-4 text-base">
                {(discount > 0 || deliveryCharge > 0 || tip > 0) && (
                  <div className="space-y-1.5 border-b border-line pb-1.5">
                    <Line label="Items subtotal" value={formatCurrency(money.revenue + discount - deliveryCharge - tip)} />
                    {discount > 0 && <Line label="Discount" value={`−${formatCurrency(discount)}`} />}
                    {deliveryCharge > 0 && <Line label="Delivery charge" value={`+${formatCurrency(deliveryCharge)}`} />}
                    {tip > 0 && <Line label="Tip" value={`+${formatCurrency(tip)}`} />}
                  </div>
                )}
                <Line label="Revenue" value={formatCurrency(money.revenue)} />
                <Line label="Cost of goods" value={`−${formatCurrency(money.cost)}`} />
                {order.channel === "FOODPANDA" && (
                  <Line
                    label={
                      order.platformCutOverride != null
                        ? order.invoiceId
                          ? "Foodpanda commission + tax (invoice)"
                          : "Foodpanda commission + tax (estimated from payout)"
                        : `Foodpanda cut (${Math.round(FOODPANDA_COMMISSION_RATE * 100)}% est.)`
                    }
                    value={`−${formatCurrency(money.platformCut)}`}
                  />
                )}
                <Line label="Profit" value={formatCurrency(money.profit)} bold />
              </div>

              {order.notes && <p className="text-base text-ink-muted">Note: {order.notes}</p>}
            </div>
          )}
        </SheetContent>
      </Sheet>
      {editing && order && <AddOrderModal order={order} onClose={() => setEditing(false)} />}
    </>
  );
}
