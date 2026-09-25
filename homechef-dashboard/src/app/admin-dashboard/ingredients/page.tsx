"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { AddIngredientModal } from "@/components/AddIngredientModal";
import { Button } from "@/components/ui/button";
import { EditIngredientModal } from "@/components/EditIngredientModal";
import { ImportIngredientsModal } from "@/components/ImportIngredientsModal";
import { IngredientsTable } from "@/components/IngredientsTable";
import { PageHeader } from "@/components/PageHeader";
import { RunningLowCard } from "@/components/RunningLowCard";
import { StockHistoryModal } from "@/components/StockHistoryModal";
import { StockModal } from "@/components/StockModal";
import { useDialogs } from "@/components/DialogProvider";
import { deleteIngredient, useIngredients } from "@/data/ingredients";
import type { Ingredient } from "@/models";

type Window = { kind: "add" } | { kind: "import" } | { kind: "edit" | "stock" | "history"; ingredient: Ingredient } | null;

export default function IngredientsPage() {
  const { data: ingredients = [] } = useIngredients();
  const { confirm, notify } = useDialogs();
  const [open, setOpen] = useState<Window>(null);
  const close = () => setOpen(null);

  async function askToDelete(ingredient: Ingredient) {
    const ok = await confirm({
      title: `Delete ${ingredient.name}?`,
      message: "Its stock history goes with it. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const result = await deleteIngredient(ingredient.id);
    if (!result.ok) await notify({ title: "Can't delete it", message: result.error });
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ingredients"
        subtitle="Ingredients and packaging: what they cost, what you have, and how long it will last. Prices follow your purchases and feed menu item costs."
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen({ kind: "import" })}>
              <Upload size={16} /> Import CSV
            </Button>
            <Button onClick={() => setOpen({ kind: "add" })}>
              <Plus size={16} strokeWidth={2.4} /> Add
            </Button>
          </>
        }
      />

      <RunningLowCard ingredients={ingredients} />

      <IngredientsTable
        ingredients={ingredients}
        onEdit={(ingredient) => setOpen({ kind: "edit", ingredient })}
        onUpdateStock={(ingredient) => setOpen({ kind: "stock", ingredient })}
        onHistory={(ingredient) => setOpen({ kind: "history", ingredient })}
        onDelete={askToDelete}
      />

      {open?.kind === "add" && <AddIngredientModal onClose={close} />}
      {open?.kind === "import" && <ImportIngredientsModal onClose={close} />}
      {open?.kind === "edit" && <EditIngredientModal ingredient={open.ingredient} onClose={close} />}
      {open?.kind === "stock" && <StockModal ingredient={open.ingredient} onClose={close} />}
      {open?.kind === "history" && <StockHistoryModal ingredient={open.ingredient} onClose={close} />}
    </div>
  );
}
