import { ChefHat, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type { Category, MenuItem } from "@/models";

interface MenuTableProps {
  items: MenuItem[];
  categories: Category[];
  onEdit: (item: MenuItem) => void;
  onRecipe: (item: MenuItem) => void;
  onDelete: (item: MenuItem) => void;
  onToggleAvailable: (item: MenuItem) => void;
}

/** The menu, one table per category. */
export function MenuTable({ items, categories, onEdit, onRecipe, onDelete, onToggleAvailable }: MenuTableProps) {
  if (items.length === 0) return <p className="text-base text-ink-muted">No menu items yet.</p>;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const inCategory = items.filter((i) => i.categoryId === category.id);
        if (inCategory.length === 0) return null;
        return (
          <div key={category.id}>
            <h3 className="mb-1 px-1 font-heading text-lg text-ink">{category.name}</h3>
            <Table>
              <TableBody>
                {inCategory.map((item) => (
                  <TableRow key={item.id} className={item.isAvailable ? "" : "bg-sunken opacity-60"}>
                    <TableCell>
                      <p className="font-bold text-ink">
                        {item.name} {item.isDeal && <Badge tone="brand">Deal</Badge>}
                      </p>
                      {item.description && <p className="text-caption text-ink-muted">{item.description}</p>}
                    </TableCell>
                    <TableCell>
                      Rs {item.price} <span className="text-caption text-ink-muted">sell</span>
                    </TableCell>
                    <TableCell>
                      Rs {item.costPrice.toFixed(0)} <span className="text-caption text-ink-muted">{item.costIsAuto ? "cost (auto)" : "cost"}</span>
                    </TableCell>
                    <TableCell>
                      {item.isDeal ? item.availableQty : item.stockQty} <span className="text-caption text-ink-muted">{item.isDeal ? "can make" : "in stock"}</span>
                    </TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-caption text-ink-muted">
                        <input type="checkbox" checked={item.isAvailable} onChange={() => onToggleAvailable(item)} />
                        Available
                      </label>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                          <Pencil size={16} strokeWidth={2.4} /> Edit
                        </Button>
                        {!item.isDeal && (
                          <Button variant="ghost" size="sm" onClick={() => onRecipe(item)}>
                            <ChefHat size={16} strokeWidth={2.4} /> Recipe
                          </Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => onDelete(item)}>
                          <Trash2 size={16} strokeWidth={2.4} /> Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </div>
  );
}
