import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: { id: true, name: true, phone: true, address: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return NextResponse.json(
    customers.map((c) => ({ ...c, phone: c.phone.startsWith("manual-") ? "" : c.phone }))
  );
}
