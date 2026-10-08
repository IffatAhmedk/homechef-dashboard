"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AddExpenseModal } from "@/components/AddExpenseModal";
import { AddOrderModal } from "@/components/AddOrderModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateRangeFilter } from "@/components/DateRangeFilter";
import { ExpenseList } from "@/components/ExpenseList";
import { OrderDetailSheet } from "@/components/OrderDetailSheet";
import { OrderLogList } from "@/components/OrderLogList";
import { PageHeader } from "@/components/PageHeader";
import { PillGroup } from "@/components/PillGroup";
import { StatCard } from "@/components/StatCard";
import { useDateRange } from "@/data/analytics";
import { useExpenses } from "@/data/money";
import { useOrders } from "@/data/orders";
import { orderFinancials } from "@/lib/finance";
import type { OrderChannel } from "@/models";

export default function LogPage() {
  const { fromISO, toISO } = useDateRange();
  const [channel, setChannel] = useState<OrderChannel>("DIRECT");
  const { data: orders = [] } = useOrders(fromISO, toISO, channel);
  const { data: expenses = [] } = useExpenses(fromISO, toISO);
  const [addingOrder, setAddingOrder] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const sales = useMemo(
    () => orders.filter((o) => o.status !== "CANCELLED").reduce((sum, o) => sum + orderFinancials(o).revenue, 0),
    [orders]
  );
  const cost = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Log" actions={<DateRangeFilter />} />

      <PillGroup
        label="Orders shown"
        options={[
          { value: "DIRECT", label: "Direct" },
          { value: "FOODPANDA", label: "Foodpanda" },
        ]}
        value={channel}
        onChange={setChannel}
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Sales" value={sales} />
        <StatCard label="Cost" value={cost} tone="bad" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-ink">Expenses</h2>
            <Button size="sm" onClick={() => setAddingExpense(true)}>
              <Plus size={16} strokeWidth={2.4} /> Log expense
            </Button>
          </div>
          <ExpenseList expenses={expenses} />
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg text-ink">Orders</h2>
            <Button size="sm" onClick={() => setAddingOrder(true)}>
              <Plus size={16} strokeWidth={2.4} /> Log order
            </Button>
          </div>
          <OrderLogList orders={orders} onSelect={(order) => setSelectedOrderId(order.id)} />
        </Card>
      </div>

      {addingOrder && <AddOrderModal defaultChannel={channel} onClose={() => setAddingOrder(false)} />}
      {addingExpense && <AddExpenseModal onClose={() => setAddingExpense(false)} />}
      {selectedOrderId && <OrderDetailSheet orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />}
    </div>
  );
}
