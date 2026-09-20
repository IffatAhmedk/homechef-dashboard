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
    <div className="mx-auto max-w-2xl bg-white p-10 text-charcoal print:p-0">
      <PrintTrigger />
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-terracotta">Rozana</h1>
        <p className="text-sm tracking-wide text-charcoal/60">ghar ka khana</p>
      </header>

      {categories.map(
        (category) =>
          category.menuItems.length > 0 && (
            <section key={category.id} className="mb-7 break-inside-avoid">
              <h2 className="mb-2 border-b-2 border-sage pb-1 text-lg font-semibold text-sage">
                {category.name}
              </h2>
              <div className="space-y-2">
                {category.menuItems.map((item) => (
                  <div key={item.id} className="flex items-baseline justify-between gap-4">
                    <div>
                      <p className="font-medium text-charcoal">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-charcoal/50">{item.description}</p>
                      )}
                    </div>
                    <p className="shrink-0 font-semibold text-terracotta">{formatCurrency(item.price)}</p>
                  </div>
                ))}
              </div>
            </section>
          )
      )}

      <footer className="mt-10 text-center text-xs text-charcoal/40">
        Ghar jaisa khana, seedha aapke ghar.
      </footer>
    </div>
  );
}
