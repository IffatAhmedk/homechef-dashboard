export function formatCurrency(amount: number) {
  const formatted = new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
  // Real minus sign, as the design system asks for.
  return formatted.replace(/^-/, "−");
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const STATUS_FLOW: string[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warn-soft text-warn border-warn-soft",
  CONFIRMED: "bg-stone-soft text-stone border-stone-soft",
  PREPARING: "bg-brand-soft text-brand-deep border-brand-soft",
  OUT_FOR_DELIVERY: "bg-stone-soft text-stone border-stone-soft",
  DELIVERED: "bg-leaf-soft text-leaf border-leaf-soft",
  CANCELLED: "bg-danger-soft text-danger border-danger-soft",
};

export const EXPENSE_CATEGORIES = [
  "INGREDIENTS",
  "PACKAGING",
  "FOODPANDA_SUBSCRIPTION",
  "ADVERTISING",
  "ONBOARDING",
  "UTILITIES",
  "LABOUR",
  "WASTAGE_SPOILAGE",
  "BRANDING_PRINTING",
  "STARTUP_INVESTMENT",
  "OTHER",
] as const;

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  INGREDIENTS: "Ingredients",
  PACKAGING: "Packaging",
  FOODPANDA_SUBSCRIPTION: "Foodpanda subscription",
  ADVERTISING: "Advertising / CPC",
  ONBOARDING: "Onboarding",
  UTILITIES: "Gas & electricity",
  LABOUR: "Worker payments",
  WASTAGE_SPOILAGE: "Refunds, wastage & spoilage",
  BRANDING_PRINTING: "Branding & printing",
  STARTUP_INVESTMENT: "Startup investment",
  OTHER: "Other",
};
