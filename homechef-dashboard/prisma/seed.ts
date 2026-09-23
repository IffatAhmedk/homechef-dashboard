import { PrismaClient, OrderStatus, OrderChannel } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.expense.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();

  const categories = await Promise.all(
    [
      { name: "Rotis & Breads", sortOrder: 1 },
      { name: "Dals", sortOrder: 2 },
      { name: "Sabzis", sortOrder: 3 },
      { name: "Rice & Biryani", sortOrder: 4 },
      { name: "Thalis", sortOrder: 5 },
      { name: "Sweets", sortOrder: 6 },
    ].map((c) => prisma.category.create({ data: c }))
  );

  const byName = (name: string) => categories.find((c) => c.name === name)!.id;

  // costPrice is roughly 45-60% of the selling price, reflecting real ingredient/prep cost.
  const menuItems = await Promise.all(
    [
      { name: "Tawa Roti (2 pc)", description: "Fresh whole wheat rotis, made to order", price: 30, costPrice: 12, categoryId: byName("Rotis & Breads"), stockQty: 80 },
      { name: "Butter Naan", description: "Soft leavened bread with ghee", price: 45, costPrice: 20, categoryId: byName("Rotis & Breads"), stockQty: 50 },
      { name: "Missi Roti", description: "Gram flour roti with spices", price: 35, costPrice: 15, categoryId: byName("Rotis & Breads"), stockQty: 40 },
      { name: "Dal Tadka", description: "Yellow lentils tempered with ghee and cumin", price: 120, costPrice: 55, categoryId: byName("Dals"), stockQty: 30 },
      { name: "Dal Makhani", description: "Slow-cooked black lentils with cream", price: 150, costPrice: 75, categoryId: byName("Dals"), stockQty: 25 },
      { name: "Rajma", description: "Kidney beans in tomato gravy", price: 130, costPrice: 58, categoryId: byName("Dals"), stockQty: 28 },
      { name: "Aloo Gobi", description: "Potato and cauliflower, home-style", price: 110, costPrice: 48, categoryId: byName("Sabzis"), stockQty: 30 },
      { name: "Bhindi Masala", description: "Okra stir-fried with onions and spices", price: 120, costPrice: 55, categoryId: byName("Sabzis"), stockQty: 25 },
      { name: "Paneer Butter Masala", description: "Cottage cheese in rich tomato gravy", price: 180, costPrice: 95, categoryId: byName("Sabzis"), stockQty: 22 },
      { name: "Mix Veg", description: "Seasonal vegetables in light gravy", price: 110, costPrice: 50, categoryId: byName("Sabzis"), stockQty: 30 },
      { name: "Jeera Rice", description: "Basmati rice tempered with cumin", price: 90, costPrice: 38, categoryId: byName("Rice & Biryani"), stockQty: 40 },
      { name: "Veg Biryani", description: "Fragrant basmati rice with mixed vegetables", price: 160, costPrice: 75, categoryId: byName("Rice & Biryani"), stockQty: 20 },
      { name: "Chicken Biryani", description: "Slow-cooked dum biryani with tender chicken", price: 220, costPrice: 115, categoryId: byName("Rice & Biryani"), stockQty: 18 },
      { name: "Ghar Ka Thali (Veg)", description: "2 sabzi, dal, 4 roti, rice, salad", price: 199, costPrice: 95, categoryId: byName("Thalis"), stockQty: 25 },
      { name: "Ghar Ka Thali (Non-Veg)", description: "Chicken curry, dal, 4 roti, rice, salad", price: 259, costPrice: 130, categoryId: byName("Thalis"), stockQty: 20 },
      { name: "Gulab Jamun (2 pc)", description: "Soft milk dumplings in sugar syrup", price: 60, costPrice: 22, categoryId: byName("Sweets"), stockQty: 35 },
      { name: "Kheer", description: "Traditional rice pudding with cardamom", price: 70, costPrice: 28, categoryId: byName("Sweets"), stockQty: 20 },
    ].map((item) => prisma.menuItem.create({ data: item }))
  );

  const customers = await Promise.all(
    [
      { name: "Ayesha Raza", phone: "03001234501", address: "House 12, Bahria Town Phase 4, Rawalpindi" },
      { name: "Bilal Khan", phone: "03001234502", address: "Flat 3B, DHA Phase 5, Karachi" },
      { name: "Sana Malik", phone: "03001234503", address: "House 88, Bahria Town, Lahore" },
      { name: "Usman Farooq", phone: "03001234504", address: "Street 7, F-10, Islamabad" },
      { name: "Hira Sheikh", phone: "03001234505", address: "House 21, Bahria Town Phase 8, Rawalpindi" },
    ].map((c) => prisma.customer.create({ data: c }))
  );

  const statuses: OrderStatus[] = ["DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "PREPARING", "CONFIRMED", "PENDING"];
  const channels: OrderChannel[] = ["DIRECT", "DIRECT", "FOODPANDA", "DIRECT", "FOODPANDA"];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 60; i++) {
    const customer = customers[i % customers.length];
    const status = statuses[i % statuses.length];
    const channel = channels[i % channels.length];
    const daysAgo = Math.floor(i / 2);
    const createdAt = new Date(now - daysAgo * dayMs - Math.floor(Math.random() * dayMs));

    const numItems = 1 + Math.floor(Math.random() * 3);
    const chosen = [...menuItems].sort(() => 0.5 - Math.random()).slice(0, numItems);

    let total = 0;
    const itemsData = chosen.map((mi) => {
      const qty = 1 + Math.floor(Math.random() * 3);
      total += mi.price * qty;
      return { menuItemId: mi.id, quantity: qty, priceAtSale: mi.price, costAtSale: mi.costPrice };
    });

    await prisma.order.create({
      data: {
        customerId: customer.id,
        channel,
        status,
        deliveryAddress: customer.address ?? "",
        totalAmount: total,
        createdAt,
        updatedAt: createdAt,
        items: { create: itemsData },
      },
    });
  }

  const expenses = await Promise.all(
    [
      { description: "Weekly vegetable & grocery haul", amount: 4200, category: "INGREDIENTS" as const, daysAgo: 1 },
      { description: "LPG cylinder refill", amount: 1100, category: "UTILITIES" as const, daysAgo: 3 },
      { description: "Takeaway containers & bags", amount: 1850, category: "PACKAGING" as const, daysAgo: 5 },
      { description: "Kitchen staff wages (weekly)", amount: 6000, category: "LABOUR" as const, daysAgo: 7 },
      { description: "Spice & masala restock", amount: 2300, category: "INGREDIENTS" as const, daysAgo: 9 },
      { description: "Delivery bike fuel", amount: 900, category: "OTHER" as const, daysAgo: 12 },
      { description: "Kitchen staff wages (weekly)", amount: 6000, category: "LABOUR" as const, daysAgo: 14 },
      { description: "Rice & atta bulk purchase", amount: 3600, category: "INGREDIENTS" as const, daysAgo: 18 },
    ].map(({ daysAgo, ...e }) =>
      prisma.expense.create({ data: { ...e, date: new Date(now - daysAgo * dayMs) } })
    )
  );

  console.log(
    `Seeded ${categories.length} categories, ${menuItems.length} menu items, ${customers.length} customers, 60 orders, ${expenses.length} expenses.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
