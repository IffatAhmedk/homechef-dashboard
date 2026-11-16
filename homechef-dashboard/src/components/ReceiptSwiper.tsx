"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addExpense } from "@/data/money";
import { addPersonalExpense } from "@/data/personal";
import { useKeyboardQueue } from "@/hooks/useKeyboardQueue";
import { EXPENSE_CATEGORY_LABELS, formatCurrency } from "@/lib/format";

export interface ReceiptCard {
  file: File;
  amount: number;
  vendor: string | null;
  date: string | null;
  description: string;
  matchedCategory: string;
}

/** One receipt at a time: left = business expense, right = personal. Each decision saves immediately. */
export function ReceiptSwiper({ receipts, onClose }: { receipts: ReceiptCard[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState({ business: 0, personal: 0, failed: 0 });
  const done = index >= receipts.length;
  const current = receipts[index];

  const imageUrl = useMemo(() => (current ? URL.createObjectURL(current.file) : null), [current]);
  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);

  async function saveBusiness() {
    const receipt = current;
    setIndex((i) => i + 1);
    const result = await addExpense({
      description: receipt.description,
      amount: receipt.amount,
      category: receipt.matchedCategory,
      date: receipt.date ?? undefined,
    });
    setCounts((c) => (result.ok ? { ...c, business: c.business + 1 } : { ...c, failed: c.failed + 1 }));
  }

  async function savePersonal() {
    const receipt = current;
    setIndex((i) => i + 1);
    const result = await addPersonalExpense({
      category: "PENDING",
      description: receipt.description,
      amount: receipt.amount,
      date: receipt.date ?? undefined,
    });
    setCounts((c) => (result.ok ? { ...c, personal: c.personal + 1 } : { ...c, failed: c.failed + 1 }));
  }

  useKeyboardQueue(!done, { onLeft: saveBusiness, onRight: savePersonal });

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg bg-card p-8 text-center shadow-card">
        <p className="font-heading text-xl text-ink">
          {counts.business} business, {counts.personal} personal sorted
          {counts.failed > 0 && ` — ${counts.failed} failed to save`}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/admin-dashboard/log" className="text-base text-brand hover:underline">
            View business expenses
          </Link>
          <span className="text-ink-muted">·</span>
          <Link href="/admin-dashboard/personal" className="text-base text-brand hover:underline">
            View personal expenses
          </Link>
        </div>
        <Button variant="secondary" onClick={onClose}>
          Back to chat
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg bg-card p-5 shadow-card">
      <div className="flex items-center justify-between text-caption text-ink-muted">
        <span>
          Receipt {index + 1} of {receipts.length}
        </span>
        <button onClick={onClose} className="hover:text-ink">
          Cancel
        </button>
      </div>

      {imageUrl && <img src={imageUrl} alt="Receipt" className="mx-auto max-h-80 rounded-lg object-contain" />}

      <div className="space-y-1 text-center">
        <p className="text-2xl font-bold text-ink">{formatCurrency(current.amount)}</p>
        <p className="text-base text-ink-muted">{current.vendor ?? current.description}</p>
        <p className="text-caption text-ink-muted">Guessed: {EXPENSE_CATEGORY_LABELS[current.matchedCategory] ?? current.matchedCategory}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button variant="secondary" onClick={saveBusiness} className="flex-1">
          <ArrowLeft size={16} strokeWidth={2.4} /> Business
        </Button>
        <Button variant="secondary" onClick={savePersonal} className="flex-1">
          Personal <ArrowRight size={16} strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}
