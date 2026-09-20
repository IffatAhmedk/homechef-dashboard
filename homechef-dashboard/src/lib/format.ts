export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
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
  PENDING: "bg-warm-beige/40 text-charcoal border-warm-beige",
  CONFIRMED: "bg-terracotta/10 text-terracotta border-terracotta/20",
  PREPARING: "bg-terracotta/20 text-terracotta border-terracotta/30",
  OUT_FOR_DELIVERY: "bg-sage/10 text-sage border-sage/20",
  DELIVERED: "bg-sage/20 text-sage border-sage/30",
  CANCELLED: "bg-maroon/10 text-maroon border-maroon/20",
};
