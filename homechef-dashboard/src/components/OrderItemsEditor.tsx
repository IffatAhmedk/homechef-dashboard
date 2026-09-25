import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { MenuItem } from "@/models";

/** One line of an order as typed. */
export interface OrderLine {
  menuItemId: string;
  quantity: string;
  price: string;
}

export const emptyLine = (): OrderLine => ({ menuItemId: "", quantity: "1", price: "" });

interface OrderItemsEditorProps {
  menu: MenuItem[];
  lines: OrderLine[];
  onChange: (lines: OrderLine[]) => void;
}

/** The items on an order: which item, how many, and the price for each. */
export function OrderItemsEditor({ menu, lines, onChange }: OrderItemsEditorProps) {
  function change(index: number, patch: Partial<OrderLine>) {
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function chooseItem(index: number, menuItemId: string) {
    const item = menu.find((m) => m.id === menuItemId);
    change(index, { menuItemId, price: item ? String(item.price) : "" });
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <NativeSelect aria-label="Item" value={line.menuItemId} onChange={(e) => chooseItem(i, e.target.value)} className="flex-1">
            <option value="">Select item…</option>
            {menu.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.category.name})
              </option>
            ))}
          </NativeSelect>
          <Input type="number" min="1" aria-label="Quantity" value={line.quantity} onChange={(e) => change(i, { quantity: e.target.value })} className="w-20" />
          <Input type="number" min="0" aria-label="Price" placeholder="Price" value={line.price} onChange={(e) => change(i, { price: e.target.value })} className="w-24" />
          <Button variant="destructive" size="sm" disabled={lines.length === 1} onClick={() => onChange(lines.filter((_, n) => n !== i))}>
            <Trash2 size={16} strokeWidth={2.4} /> Remove
          </Button>
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...lines, emptyLine()])}>
        <Plus size={16} strokeWidth={2.4} /> Add item
      </Button>
    </div>
  );
}
