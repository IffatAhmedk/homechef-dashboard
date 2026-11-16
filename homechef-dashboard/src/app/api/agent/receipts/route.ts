import { NextRequest, NextResponse } from "next/server";
import { extractReceipt } from "@/lib/anthropic-receipts";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/format";

export const maxDuration = 60;

interface ReceiptInput {
  mediaType: string;
  data: string;
}

/** Matches a free-text category guess against the real business category list, by name or label. */
function matchExpenseCategory(guess: string): string {
  const needle = guess.trim().toLowerCase();
  const byName = EXPENSE_CATEGORIES.find((c) => c.toLowerCase() === needle);
  if (byName) return byName;
  const byLabel = EXPENSE_CATEGORIES.find((c) => EXPENSE_CATEGORY_LABELS[c].toLowerCase() === needle);
  return byLabel ?? "OTHER";
}

export async function POST(req: NextRequest) {
  const { receipts } = (await req.json()) as { receipts?: ReceiptInput[] };
  if (!receipts || receipts.length === 0) {
    return NextResponse.json({ error: "No receipts provided" }, { status: 400 });
  }

  const results = await Promise.allSettled(receipts.map((r) => extractReceipt(r.mediaType, r.data)));

  return NextResponse.json({
    results: results.map((r) =>
      r.status === "fulfilled"
        ? {
            amount: r.value.amount,
            vendor: r.value.vendor,
            date: r.value.date,
            description: r.value.description,
            matchedCategory: matchExpenseCategory(r.value.suggestedCategory),
          }
        : { error: r.reason instanceof Error ? r.reason.message : "Could not read this receipt" }
    ),
  });
}
