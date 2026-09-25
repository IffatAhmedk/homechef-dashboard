"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/Modal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDialogs } from "@/components/DialogProvider";
import { removeStockEntry, useStockHistory } from "@/data/ingredients";
import { formatDate } from "@/lib/format";
import { formatQuantity } from "@/lib/units";
import type { Ingredient, StockMovement, StockMovementType } from "@/models";

const TYPE_LABEL: Record<StockMovementType, string> = {
  OPENING: "Starting stock",
  PURCHASE: "Bought",
  SALE: "Used in sales",
  WASTAGE: "Wasted",
  ADJUSTMENT: "Stock count",
};

/** Everything that came in and went out of one ingredient. Hand-entered lines can be removed. */
export function StockHistoryModal({ ingredient, onClose }: { ingredient: Ingredient; onClose: () => void }) {
  const { data: history } = useStockHistory(ingredient.id);
  const { confirm, notify } = useDialogs();

  async function remove(entry: StockMovement) {
    const ok = await confirm({
      title: `Remove this ${TYPE_LABEL[entry.type].toLowerCase()} entry?`,
      message: "Stock goes back to what it was without it.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;

    const result = await removeStockEntry(ingredient.id, entry.id);
    if (!result.ok) await notify({ title: "Can't remove it", message: result.error });
  }

  return (
    <Modal title={`${ingredient.name} — coming and going`} onClose={onClose}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>What</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Price each</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(history ?? []).map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="text-ink-muted">{formatDate(entry.date)}</TableCell>
              <TableCell>
                <p className="font-bold text-ink">{TYPE_LABEL[entry.type]}</p>
                {(entry.note || entry.order) && (
                  <p className="text-caption text-ink-muted">{entry.order ? `Order ${entry.order.externalId ?? entry.order.customer.name}` : entry.note}</p>
                )}
              </TableCell>
              <TableCell className={`text-right font-bold ${entry.quantity >= 0 ? "text-leaf" : "text-danger"}`}>
                {entry.quantity >= 0 ? "+" : "−"}
                {formatQuantity(Math.abs(entry.quantity))} {ingredient.unit}
              </TableCell>
              <TableCell className="text-right text-ink-muted">{entry.unitCost != null ? entry.unitCost.toFixed(2) : "—"}</TableCell>
              <TableCell className="text-right">
                {!entry.order && (
                  <Button variant="destructive" size="sm" onClick={() => remove(entry)}>
                    Remove
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {history && history.length === 0 && <p className="p-6 text-center text-base text-ink-muted">Nothing recorded yet. Use Update stock to log a purchase or a count.</p>}
    </Modal>
  );
}
