import { NextRequest, NextResponse } from "next/server";
import { extractMenuItems, findOrCreateCategoryServer } from "@/lib/anthropic-menu";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

const VALID_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

export async function POST(req: NextRequest) {
  const { mediaType, data } = (await req.json()) as { mediaType?: string; data?: string };

  if (!mediaType || !VALID_MEDIA_TYPES.includes(mediaType)) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, WEBP, GIF or PDF file" }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "No file data received" }, { status: 400 });
  }

  let items;
  try {
    items = await extractMenuItems(mediaType, data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read that file" }, { status: 502 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Couldn't find any menu items in that file" }, { status: 400 });
  }

  const errors: { row: string; message: string }[] = [];
  let created = 0;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const categoryId = await findOrCreateCategoryServer(tx, item.category);

      // Skip rather than duplicate when the same item already exists in this category — makes
      // re-uploading the same photo harmless instead of spamming duplicates.
      const existing = await tx.menuItem.findFirst({
        where: { categoryId, name: { equals: item.name.trim(), mode: "insensitive" } },
      });
      if (existing) {
        errors.push({ row: item.name, message: "Already on the menu" });
        continue;
      }

      await tx.menuItem.create({
        data: { name: item.name.trim(), price: item.price, categoryId, costPrice: 0, isAvailable: true },
      });
      created++;
    }
  });

  return NextResponse.json({ created, updated: 0, errors }, { status: 201 });
}
