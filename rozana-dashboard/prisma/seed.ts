import { PrismaClient, OrderStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  const menuItems = await Promise.all(
    [
      { name: "Tawa Roti (2 pc)", description: "Fresh whole wheat rotis, made to order", price: 30, categoryId: byName("Rotis & Breads"), stockQty: 80 },
      { name: "Butter Naan", description: "Soft leavened bread with ghee", price: 45, categoryId: byName("Rotis & Breads"), stockQty: 50 },
      { name: "Missi Roti", description: "Gram flour roti with spices", price: 35, categoryId: byName("Rotis & Breads"), stockQty: 40 },
      { name: "Dal Tadka", description: "Yellow lentils tempered with ghee and cumin", price: 120, categoryId: byName("Dals"), stockQty: 30 },
      { name: "Dal Makhani", description: "Slow-cooked black lentils with cream", price: 150, categoryId: byName("Dals"), stockQty: 25 },
      { name: "Rajma", description: "Kidney beans in tomato gravy", price: 130, categoryId: byName("Dals"), stockQty: 28 },
      { name: "Aloo Gobi", description: "Potato and cauliflower, home-style", price: 110, categoryId: byName("Sabzis"), stockQty: 30 },
      { name: "Bhindi Masala", description: "Okra stir-fried with onions and spices", price: 120, categoryId: byName("Sabzis"), stockQty: 25 },
      { name: "Paneer Butter Masala", description: "Cottage cheese in rich tomato gravy", price: 180, categoryId: byName("Sabzis"), stockQty: 22 },
      { name: "Mix Veg", description: "Seasonal vegetables in light gravy", price: 110, categoryId: byName("Sabzis"), stockQty: 30 },
      { name: "Jeera Rice", description: "Basmati rice tempered with cumin", price: 90, categoryId: byName("Rice & Biryani"), stockQty: 40 },
      { name: "Veg Biryani", description: "Fragrant basmati rice with mixed vegetables", price: 160, categoryId: byName("Rice & Biryani"), stockQty: 20 },
      { name: "Chicken Biryani", description: "Slow-cooked dum biryani with tender chicken", price: 220, categoryId: byName("Rice & Biryani"), stockQty: 18 },
      { name: "Ghar Ka Thali (Veg)", description: "2 sabzi, dal, 4 roti, rice, salad", price: 199, categoryId: byName("Thalis"), stockQty: 25 },
      { name: "Ghar Ka Thali (Non-Veg)", description: "Chicken curry, dal, 4 roti, rice, salad", price: 259, categoryId: byName("Thalis"), stockQty: 20 },
      { name: "Gulab Jamun (2 pc)", description: "Soft milk dumplings in sugar syrup", price: 60, categoryId: byName("Sweets"), stockQty: 35 },
      { name: "Kheer", description: "Traditional rice pudding with cardamom", price: 70, categoryId: byName("Sweets"), stockQty: 20 },
    ].map((item) => prisma.menuItem.create({ data: item }))
  );

  const customers = await Promise.all(
    [
      { name: "Ananya Sharma", phone: "9876500001", address: "12 MG Road, Bengaluru" },
      { name: "Rohit Verma", phone: "9876500002", address: "45 Sector 21, Noida" },
      { name: "Priya Iyer", phone: "9876500003", address: "78 Anna Salai, Chennai" },
      { name: "Karan Mehta", phone: "9876500004", address: "3 Linking Road, Mumbai" },
      { name: "Sana Khan", phone: "9876500005", address: "22 Banjara Hills, Hyderabad" },
    ].map((c) => prisma.customer.create({ data: c }))
  );

  const statuses: OrderStatus[] = ["DELIVERED", "DELIVERED", "DELIVERED", "OUT_FOR_DELIVERY", "PREPARING", "CONFIRMED", "PENDING"];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 24; i++) {
    const customer = customers[i % customers.length];
    const status = statuses[i % statuses.length];
    const daysAgo = Math.floor(i / 3);
    const createdAt = new Date(now - daysAgo * dayMs - Math.floor(Math.random() * dayMs));

    const numItems = 1 + Math.floor(Math.random() * 3);
    const chosen = [...menuItems].sort(() => 0.5 - Math.random()).slice(0, numItems);

    let total = 0;
    const itemsData = chosen.map((mi) => {
      const qty = 1 + Math.floor(Math.random() * 3);
      total += mi.price * qty;
      return { menuItemId: mi.id, quantity: qty, priceAtSale: mi.price };
    });

    await prisma.order.create({
      data: {
        customerId: customer.id,
        status,
        deliveryAddress: customer.address ?? "",
        totalAmount: total,
        createdAt,
        updatedAt: createdAt,
        items: { create: itemsData },
      },
    });
  }

  console.log(`Seeded ${categories.length} categories, ${menuItems.length} menu items, ${customers.length} customers, 24 orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
