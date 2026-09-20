export const FOODPANDA_COMMISSION_RATE = 0.28;

interface FinancialItem {
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
}

export function itemFinancials(
  item: FinancialItem,
  channel: "DIRECT" | "FOODPANDA",
  cutRate: number = FOODPANDA_COMMISSION_RATE
) {
  const revenue = item.priceAtSale * item.quantity;
  const cost = item.costAtSale * item.quantity;
  const platformCut = channel === "FOODPANDA" ? revenue * cutRate : 0;
  const profit = revenue - cost - platformCut;
  return { revenue, cost, platformCut, profit };
}

interface FinancialOrder {
  channel: "DIRECT" | "FOODPANDA";
  totalAmount: number;
  items: FinancialItem[];
  costOverride?: number | null;
  platformCutOverride?: number | null;
}

export function orderFinancials(order: FinancialOrder) {
  const revenue = order.totalAmount;
  const cost =
    order.costOverride != null ? order.costOverride : order.items.reduce((sum, i) => sum + i.costAtSale * i.quantity, 0);
  const platformCut =
    order.channel === "FOODPANDA"
      ? order.platformCutOverride != null
        ? order.platformCutOverride
        : revenue * FOODPANDA_COMMISSION_RATE
      : 0;
  const profit = revenue - cost - platformCut;
  // The rate that reproduces this order's actual platformCut — use this for per-item cut lines so they
  // sum back to the order total exactly, whether the cut is the flat estimate or an exact imported figure.
  const effectiveCutRate = revenue > 0 ? platformCut / revenue : FOODPANDA_COMMISSION_RATE;
  return { revenue, cost, platformCut, profit, effectiveCutRate };
}
