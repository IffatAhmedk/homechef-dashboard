"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddOrderModal } from "@/components/AddOrderModal";
import { Button } from "@/components/ui/button";
import { OrderWorkflowList } from "@/components/OrderWorkflowList";
import { PageHeader } from "@/components/PageHeader";
import { PillGroup } from "@/components/PillGroup";
import { useOrders } from "@/data/orders";
import { STATUS_FLOW, STATUS_LABELS } from "@/lib/format";

const FILTERS = [{ value: "ALL", label: "All" }, ...[...STATUS_FLOW, "CANCELLED"].map((s) => ({ value: s, label: STATUS_LABELS[s] }))];

export default function OrdersPage() {
  const { data: orders = [] } = useOrders();
  const [filter, setFilter] = useState("ALL");
  const [adding, setAdding] = useState(false);

  const shown = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        subtitle="Kitchen & delivery workflow — move orders through their status."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} strokeWidth={2.4} /> Add order
          </Button>
        }
      />
      <PillGroup label="Show orders" options={FILTERS} value={filter} onChange={setFilter} />
      <OrderWorkflowList orders={shown} />
      {adding && <AddOrderModal onClose={() => setAdding(false)} />}
    </div>
  );
}
