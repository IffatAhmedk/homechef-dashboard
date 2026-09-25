import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordStockEntry } from "@/lib/stock-ledger";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movements = await prisma.stockMovement.findMany({
    where: { ingredientId: id },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: { order: { select: { id: true, externalId: true, customer: { select: { name: true } } } } },
  });
  return NextResponse.json(movements);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movementId = req.nextUrl.searchParams.get("movementId");
  if (!movementId) return NextResponse.json({ error: "movementId is required" }, { status: 400 });

  const movement = await prisma.stockMovement.findFirst({ where: { id: movementId, ingredientId: id } });
  if (!movement) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  if (movement.orderId) {
    return NextResponse.json({ error: "This came from an order — change the order instead" }, { status: 400 });
  }
  await prisma.stockMovement.delete({ where: { id: movementId } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { type, quantity, totalCost, unitCost, date, note } = body as {
    type?: string;
    quantity?: number;
    totalCost?: number;
    unitCost?: number;
    date?: string;
    note?: string;
  };

  if (type !== "PURCHASE" && type !== "COUNT" && type !== "WASTAGE") {
    return NextResponse.json({ error: "type must be PURCHASE, COUNT or WASTAGE" }, { status: 400 });
  }
  const when = date ? new Date(date) : undefined;
  if (when && isNaN(when.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  try {
    await recordStockEntry(id, {
      type,
      quantity: Number(quantity),
      totalCost: totalCost != null ? Number(totalCost) : undefined,
      unitCost: unitCost != null ? Number(unitCost) : undefined,
      date: when,
      note,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to record stock" }, { status: 400 });
  }
}
