"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerFields } from "@/components/CustomerFields";
import { Field } from "@/components/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/Modal";
import { NativeSelect } from "@/components/ui/native-select";
import { OrderItemsEditor, emptyLine, type OrderLine } from "@/components/OrderItemsEditor";
import { PillGroup } from "@/components/PillGroup";
import { createOrder, updateOrder } from "@/data/orders";
import { useMenu } from "@/data/menu";
import { formatCurrency, STATUS_FLOW, STATUS_LABELS } from "@/lib/format";
import type { CustomerMatch, Order, OrderChannel } from "@/models";

function toDateTimeInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Add an order by hand, or (with `order`) edit a direct one. The discount is a percentage of the items' total. */
export function AddOrderModal({ order, onClose }: { order?: Order; onClose: () => void }) {
  const { data: menu = [] } = useMenu();

  const itemsTotal = (order?.items ?? []).reduce((sum, i) => sum + i.priceAtSale * i.quantity, 0);
  const [channel, setChannel] = useState<OrderChannel>("DIRECT");
  const [status, setStatus] = useState(order?.status ?? "PENDING");
  const [name, setName] = useState(order?.customer.name ?? "");
  const [phone, setPhone] = useState(order?.customer.phone.startsWith("manual-") ? "" : (order?.customer.phone ?? ""));
  const [customerId, setCustomerId] = useState<string | undefined>();
  const [address, setAddress] = useState(order?.deliveryAddress ?? "");
  const [date, setDate] = useState(toDateTimeInput(order ? new Date(order.createdAt) : new Date()));
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [discountPercent, setDiscountPercent] = useState(order?.discount && itemsTotal > 0 ? String(Number(((order.discount / itemsTotal) * 100).toFixed(2))) : "");
  const [deliveryCharge, setDeliveryCharge] = useState(order?.deliveryCharge ? String(order.deliveryCharge) : "");
  const [tip, setTip] = useState(order?.tip ? String(order.tip) : "");
  const [lines, setLines] = useState<OrderLine[]>(
    order ? order.items.map((i) => ({ menuItemId: i.menuItemId, quantity: String(i.quantity), price: String(i.priceAtSale) })) : [emptyLine()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);
  const discount = (subtotal * Number(discountPercent)) / 100 || 0;
  const total = subtotal - discount + (Number(deliveryCharge) || 0) + (Number(tip) || 0);

  function pickCustomer(customer: CustomerMatch | null) {
    setCustomerId(customer?.id);
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone);
      if (customer.address) setAddress(customer.address);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = lines
      .filter((l) => l.menuItemId && Number(l.quantity) > 0)
      .map((l) => ({ menuItemId: l.menuItemId, quantity: Number(l.quantity), price: l.price !== "" ? Number(l.price) : undefined }));
    if (items.length === 0) return setError("Add at least one item");

    const details = {
      customerId,
      name,
      phone: phone || undefined,
      address: address || undefined,
      notes: notes || undefined,
      channel,
      status,
      createdAt: new Date(date).toISOString(),
      discount,
      deliveryCharge: Number(deliveryCharge) || 0,
      tip: Number(tip) || 0,
      items,
    };
    setSaving(true);
    const result = order ? await updateOrder(order.id, details) : await createOrder(details);
    setSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? "Could not save the order");
  }

  return (
    <Modal
      title={order ? "Edit order" : "Add order"}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <Button type="button" variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : order ? "Save changes" : "Add order"}
          </Button>
        </>
      }
    >
      {!order && (
        <PillGroup
          label="Where the order came from"
          options={[
            { value: "DIRECT", label: "Direct" },
            { value: "FOODPANDA", label: "Foodpanda" },
          ]}
          value={channel}
          onChange={setChannel}
        />
      )}

      <CustomerFields name={name} phone={phone} onName={setName} onPhone={setPhone} onPick={pickCustomer} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date and time">
          <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Status">
          <NativeSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            {[...STATUS_FLOW, "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      <Field label="Delivery address (optional)">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>

      <OrderItemsEditor menu={menu} lines={lines} onChange={setLines} />

      <Field label="Notes (optional)">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-4">
        <Field label="Discount (%)">
          <Input type="number" min="0" max="100" placeholder="0" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)} />
        </Field>
        <Field label="Delivery charges (DC)">
          <Input type="number" min="0" placeholder="0" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} />
        </Field>
        <Field label="Tip">
          <Input type="number" min="0" placeholder="0" value={tip} onChange={(e) => setTip(e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-base text-ink-muted">Total</span>
        <span className="text-xl font-bold text-ink">{formatCurrency(total)}</span>
      </div>

      {error && <p className="text-base text-danger">{error}</p>}
    </Modal>
  );
}
