"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AddRationItemModal } from "@/components/AddRationItemModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { PageHeader } from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDateRange } from "@/data/analytics";
import { deleteRationItem, useRationItems } from "@/data/personal";
import { formatCurrency, formatDate } from "@/lib/format";

export default function RationPage() {
  const { fromISO, toISO } = useDateRange();
  const { data: items = [] } = useRationItems(fromISO, toISO);
  const [adding, setAdding] = useState(false);
  const total = items.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ration list"
        actions={
          <>
            <DateRangeFilter />
            <Button onClick={() => setAdding(true)}>
              <Plus size={16} strokeWidth={2.4} /> Add item
            </Button>
          </>
        }
      />

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg text-ink">Items</h2>
          <span className="text-base font-bold text-ink">{formatCurrency(total)}</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-bold text-ink">{item.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                <TableCell className="text-ink-muted">{formatDate(item.date)}</TableCell>
                <TableCell>
                  <Button variant="destructive" size="sm" onClick={() => deleteRationItem(item.id)}>
                    <Trash2 size={16} strokeWidth={2.4} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {items.length === 0 && <p className="p-6 text-center text-base text-ink-muted">Nothing added for this period.</p>}
      </Card>

      {adding && <AddRationItemModal onClose={() => setAdding(false)} />}
    </div>
  );
}
