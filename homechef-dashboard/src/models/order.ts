export type OrderChannel = "DIRECT" | "FOODPANDA";

export interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  priceAtSale: number;
  costAtSale: number;
  packagingCostAtSale?: number;
  menuItem: { id: string; name: string };
}

export interface Order {
  id: string;
  channel: OrderChannel;
  status: string;
  totalAmount: number;
  discount?: number;
  deliveryCharge?: number;
  tip?: number;
  deliveryAddress: string;
  notes: string | null;
  createdAt: string;
  wastage?: boolean;
  costOverride?: number | null;
  platformCutOverride?: number | null;
  externalId: string | null;
  invoiceId?: string | null;
  customer: { name: string; phone: string };
  items: OrderItem[];
}

export interface CustomerMatch {
  id: string;
  name: string;
  phone: string;
  address: string | null;
}
