# HomeChef Dashboard

I built this for our Foodpanda HomeChef business because the Foodpanda dashboard was hard for my mother to understand. She needed a clear answer to a simple question: **are we actually making money?**

The dashboard brings sales, costs, profit, profit percentage, recent orders and best sellers into one place. It also follows ingredients from purchase to recipe to sale, so we can see what’s in stock and what each dish costs us to make.

## What it does

- Shows sales, costs, profit and profit percentage for a selected date range
- Tracks Foodpanda and private orders
- Shows recent orders, best sellers and profit by menu item
- Calculates recipe costs from ingredient prices and quantities
- Records ingredient purchases, stock counts and wastage
- Deducts recipe ingredients from tracked stock when orders are recorded
- Imports Foodpanda orders and invoices
- Compares Foodpanda payouts with the amount received in the bank
- Tracks expenses, including labour and packaging

## What you need to keep updated

Add your ingredients, menu items and recipes first. Record an opening stock count, then log purchases as you buy more ingredients. Upload Foodpanda order and invoice files weekly or monthly, and enter private orders and other expenses as they happen.

The dashboard calculates costs and updates tracked stock from the orders you record. Profit is only as accurate as the prices, recipes, orders and expenses you give it.

## Tech stack

- **Next.js** and **TypeScript** for the app and API routes
- **Prisma** for database access and migrations
- **Neon PostgreSQL** for the database
- **Vercel** for deployment
- **shadcn/ui** components for the interface

## Project structure

```text
homechef-dashboard/
├── prisma/
│   ├── schema.prisma       Database models
│   ├── migrations/         Database migration history
│   └── seed.ts             Seed script
├── src/
│   ├── app/
│   │   ├── admin-dashboard/  Dashboard screens
│   │   ├── api/              API routes
│   │   └── print/menu/       Printable menu
│   ├── components/         Interface components
│   ├── data/               Client-side data access
│   ├── lib/                Calculations and business rules
│   └── models/             Shared TypeScript types
└── package.json
```

## Run locally

The Next.js app is in the `homechef-dashboard` subfolder of this repository.

```bash
git clone https://github.com/IffatAhmedk/homechef-dashboard.git
cd homechef-dashboard/homechef-dashboard
npm ci
```

Create `.env` with your Neon connection strings:

```env
POSTGRES_PRISMA_URL="your pooled connection string"
POSTGRES_URL_NON_POOLING="your direct connection string"
```

Apply the migrations, generate the Prisma client and start the app:

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For Vercel, set the project’s root directory to `homechef-dashboard` and add the same environment variables to the project settings.

## A note on profit

The dashboard includes recipe and packaging costs, Foodpanda charges, and recorded expenses in its overall profit calculation. Foodpanda charges are estimated for orders without invoice details and can be updated from imported invoice data. Keep ingredient prices and expenses current if you want the numbers to stay useful.

## Next steps

- [ ] **Google login.** Better Auth with Google, in our own Neon database, only letting in specific emails. It has to protect the API routes too, not just the pages.

- [ ] **Remember customers.** Serverless function for catching orders maybe. Why? Foodpanda leaves customer names out of the order history, but the name is visible when the order comes in. The function above saves it against the order code, and it gets attached when the order details file is uploaded. That gives us a list of returning customers.
