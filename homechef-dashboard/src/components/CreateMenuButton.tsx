import { Plus } from "lucide-react";

interface CreateMenuButtonProps {
  onCreateItem: () => void;
  onCreateDeal: () => void;
}

/** A "+" button; hover (or focus) it to choose between a menu item and a deal. */
export function CreateMenuButton({ onCreateItem, onCreateDeal }: CreateMenuButtonProps) {
  const choice = "block w-full px-4 py-2 text-left text-base text-ink hover:bg-sunken";
  return (
    <div className="group relative">
      <button
        aria-label="Create menu item or deal"
        aria-haspopup="menu"
        className="flex size-10 items-center justify-center rounded-pill bg-brand text-on-brand hover:opacity-90"
      >
        <Plus size={20} />
      </button>
      <div className="invisible absolute top-full right-0 z-20 pt-1 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        <div role="menu" className="w-48 overflow-hidden rounded-lg border border-control bg-card py-1 shadow-lg">
          <button role="menuitem" className={choice} onClick={onCreateItem}>
            Create menu item
          </button>
          <button role="menuitem" className={choice} onClick={onCreateDeal}>
            Create menu deal
          </button>
        </div>
      </div>
    </div>
  );
}
