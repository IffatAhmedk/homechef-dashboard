import { History, PackagePlus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { lastsText } from "@/components/RunningLowCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatQuantity } from "@/lib/units";
import type { Ingredient } from "@/models";

interface IngredientsTableProps {
  ingredients: Ingredient[];
  onEdit: (ingredient: Ingredient) => void;
  onUpdateStock: (ingredient: Ingredient) => void;
  onHistory: (ingredient: Ingredient) => void;
  onDelete: (ingredient: Ingredient) => void;
}

export function IngredientsTable({ ingredients, onEdit, onUpdateStock, onHistory, onDelete }: IngredientsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Cost per unit</TableHead>
            <TableHead>In stock</TableHead>
            <TableHead>Lasts</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {ingredients.map((ingredient) => (
            <TableRow key={ingredient.id}>
              <TableCell className="font-bold text-ink">{ingredient.name}</TableCell>
              <TableCell className="text-ink-muted">{ingredient.unit}</TableCell>
              <TableCell>Rs {Number(ingredient.costPerUnit.toFixed(3))}</TableCell>
              <TableCell>
                {ingredient.tracked ? (
                  <span className={ingredient.stockQty <= 0 ? "font-bold text-danger" : "font-bold text-ink"}>
                    {formatQuantity(ingredient.stockQty)} {ingredient.unit}
                  </span>
                ) : (
                  <Badge tone="warn">Not counted yet</Badge>
                )}
              </TableCell>
              <TableCell className="text-ink-muted">{lastsText(ingredient)}</TableCell>
              <TableCell>
                <Badge tone={ingredient.category === "PACKAGING" ? "neutral" : "good"}>{ingredient.category === "PACKAGING" ? "Packaging" : "Food"}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(ingredient)}>
                    <Pencil size={16} strokeWidth={2.4} /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onUpdateStock(ingredient)}>
                    <PackagePlus size={16} strokeWidth={2.4} /> Update stock
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onHistory(ingredient)}>
                    <History size={16} strokeWidth={2.4} /> History
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => onDelete(ingredient)}>
                    <Trash2 size={16} strokeWidth={2.4} /> Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {ingredients.length === 0 && <p className="p-6 text-center text-base text-ink-muted">No ingredients yet.</p>}
    </>
  );
}
