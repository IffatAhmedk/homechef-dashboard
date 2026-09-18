import { prisma } from "@/lib/prisma";
import MenuItemCard from "./menu-item-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      menuItems: { orderBy: { name: "asc" } },
    },
  });

  return (
    <div className="space-y-10">
      <section className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-6 text-center sm:p-10">
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">
          Ghar jaisa khana, seedha aapke ghar
        </h1>
        <p className="mt-2 text-sm text-neutral-600 sm:text-base">
          Fresh, home-cooked meals made daily. Order below and we&apos;ll get it to you hot.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category.id}>
          <h2 className="mb-3 text-lg font-semibold text-neutral-800">{category.name}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.menuItems.map((item) => (
              <MenuItemCard
                key={item.id}
                id={item.id}
                name={item.name}
                description={item.description}
                price={item.price}
                isAvailable={item.isAvailable}
                stockQty={item.stockQty}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
