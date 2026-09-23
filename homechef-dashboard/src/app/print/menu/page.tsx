import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import PrintTrigger from "./print-trigger";

export const dynamic = "force-dynamic";

export default async function MenuPrintPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      menuItems: { where: { isAvailable: true }, orderBy: { name: "asc" } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl bg-card p-10 text-ink print:p-0">
      <PrintTrigger />
      <header className="mb-8 text-center">
        <h1 className="font-wordmark text-4xl text-leaf">Rozana</h1>
        <p className="font-urdu text-3xl text-ink">گھر کا کھانا</p>
        <p className="text-caption text-ink-muted">Ghar ka khana, rozana.</p>
      </header>

      {categories.map(
        (category) =>
          category.menuItems.length > 0 && (
            <section key={category.id} className="mb-7 break-inside-avoid">
              <h2 className="font-heading mb-2 border-b-2 border-leaf pb-1 text-2xl text-leaf">
                {category.name}
              </h2>
              <div className="space-y-2">
                {category.menuItems.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="font-bold text-ink">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-ink-muted">{item.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-bold text-brand">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
            </section>
          )
      )}

      <footer className="mt-10 text-center text-xs text-ink-muted">
        Ghar jaisa khana, seedha aapke ghar.
      </footer>
    </div>
  );
}
