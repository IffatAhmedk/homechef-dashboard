import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ingredients = await prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(ingredients);
}

export async function POST(req: NextRequest) {
  const { name, unit, costPerUnit, category } = await req.json();
  if (!name || !unit || costPerUnit == null) {
    return NextResponse.json({ error: "name, unit and costPerUnit are required" }, { status: 400 });
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      name,
      unit,
      costPerUnit: Number(costPerUnit),
      ...(category && { category }),
    },
  });

  return NextResponse.json(ingredient, { status: 201 });
}
