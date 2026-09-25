"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, Upload } from "lucide-react";
import { AddMenuItemModal } from "@/components/AddMenuItemModal";
import { Button } from "@/components/ui/button";
import { CreateMenuButton } from "@/components/CreateMenuButton";
import { DealModal, type EditableDeal } from "@/components/DealModal";
import { EditMenuItemModal } from "@/components/EditMenuItemModal";
import { ImportMenuModal } from "@/components/ImportMenuModal";
import { MenuTable } from "@/components/MenuTable";
import { PageHeader } from "@/components/PageHeader";
import { ProfitByItemCard } from "@/components/ProfitByItemCard";
import { RecipeModal } from "@/components/RecipeModal";
import { useDialogs } from "@/components/DialogProvider";
import { deleteMenuItem, getRecipe, updateMenuItem, useCategories, useMenu } from "@/data/menu";
import { buttonVariants } from "@/components/ui/button";
import type { MenuItem } from "@/models";

type Window =
  | { kind: "add" | "newDeal" | "import" }
  | { kind: "edit" | "recipe"; item: MenuItem }
  | { kind: "editDeal"; deal: EditableDeal }
  | null;

export default function MenuPage() {
  const { data: items = [] } = useMenu();
  const { data: categories = [] } = useCategories();
  const { confirm, notify } = useDialogs();
  const [open, setOpen] = useState<Window>(null);
  const close = () => setOpen(null);

  async function edit(item: MenuItem) {
    if (!item.isDeal) return setOpen({ kind: "edit", item });

    const lines = await getRecipe(item.id);
    const components = Object.fromEntries(lines.filter((l) => l.componentItem).map((l) => [l.componentItem!.id, String(l.quantity)]));
    setOpen({ kind: "editDeal", deal: { item, components } });
  }

  async function askToDelete(item: MenuItem) {
    const ok = await confirm({
      title: `Delete ${item.name}?`,
      message: item.isDeal ? "The deal is removed. The items inside it stay on your menu." : "This removes it from your menu for good.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;

    const result = await deleteMenuItem(item.id);
    if (result.ok) return;

    if (result.data.reason === "orders") {
      const hide = await confirm({
        title: `${item.name} can't be deleted`,
        message: `${result.error} Hide it from the menu instead? Your past orders and profit stay exactly as they are.`,
        confirmLabel: "Hide it",
      });
      if (hide) await updateMenuItem(item.id, { isAvailable: false });
    } else {
      await notify({ title: `${item.name} can't be deleted`, message: result.error });
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Menu & Inventory"
        subtitle="Your menu, what each item costs, and what is in stock."
        actions={
          <>
            <Link href="/print/menu" target="_blank" className={buttonVariants({ variant: "secondary" })}>
              <Printer size={16} /> Print menu
            </Link>
            <Button variant="secondary" onClick={() => setOpen({ kind: "import" })}>
              <Upload size={16} /> Import CSV
            </Button>
            <CreateMenuButton onCreateItem={() => setOpen({ kind: "add" })} onCreateDeal={() => setOpen({ kind: "newDeal" })} />
          </>
        }
      />

      <ProfitByItemCard />

      <MenuTable
        items={items}
        categories={categories}
        onEdit={edit}
        onRecipe={(item) => setOpen({ kind: "recipe", item })}
        onDelete={askToDelete}
        onToggleAvailable={(item) => updateMenuItem(item.id, { isAvailable: !item.isAvailable })}
      />

      {open?.kind === "add" && <AddMenuItemModal onClose={close} />}
      {open?.kind === "newDeal" && <DealModal onClose={close} />}
      {open?.kind === "editDeal" && <DealModal deal={open.deal} onClose={close} />}
      {open?.kind === "edit" && <EditMenuItemModal item={open.item} onClose={close} />}
      {open?.kind === "recipe" && <RecipeModal item={open.item} onClose={close} />}
      {open?.kind === "import" && <ImportMenuModal onClose={close} />}
    </div>
  );
}
