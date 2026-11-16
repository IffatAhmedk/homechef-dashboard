import { computeAnalytics } from "@/lib/analytics";
import { callGroq, type GroqTool } from "@/lib/groq";
import { prisma } from "@/lib/prisma";

export const AGENT_TOOLS: GroqTool[] = [
  {
    type: "function",
    function: {
      name: "log_whatsapp_orders",
      description:
        "Read the WhatsApp chat export attached to this message and draft every order found in it, with best-guess requested times and matched menu items. Only call this when a WhatsApp export is actually attached and the user asked to log/record orders from it — never invent orders without one attached.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_business",
      description:
        "Compute real sales, cost and profit numbers for a date range, plus per-item sales volume and margin, to answer questions about how the business or specific menu items are performing. Always use this for any question about sales, profit, revenue or menu performance — never guess numbers.",
      parameters: {
        type: "object",
        properties: {
          from: { type: "string", description: "Start of the period, ISO date (YYYY-MM-DD)" },
          to: { type: "string", description: "End of the period, ISO date (YYYY-MM-DD)" },
        },
        required: ["from", "to"],
        additionalProperties: false,
      },
    },
  },
];

export interface DraftOrderItem {
  menuItemName: string;
  menuItemId: string | null;
  quantity: number;
}

export interface DraftOrder {
  requestedTime: string;
  items: DraftOrderItem[];
  notes: string | null;
  rawExcerpt: string;
}

const ORDER_EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    orders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requestedTime: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                menuItemName: { type: "string" },
                quantity: { type: "number" },
              },
              required: ["menuItemName", "quantity"],
              additionalProperties: false,
            },
          },
          notes: { type: ["string", "null"] },
          rawExcerpt: { type: "string" },
        },
        required: ["requestedTime", "items", "notes", "rawExcerpt"],
        additionalProperties: false,
      },
    },
  },
  required: ["orders"],
  additionalProperties: false,
};

function extractionPrompt(chatText: string, customerName: string | undefined, menuNames: string[]): string {
  return [
    `You are reading a WhatsApp chat export between a home-kitchen food vendor and ONE customer` +
      (customerName ? ` named "${customerName}"` : "") +
      `. Lines from the other sender are the vendor — use them only as context (e.g. a price confirmation), never as orders.`,
    `Each line starts with a timestamp in whatever format WhatsApp used (e.g. "[10/29/26, 3:45:12 PM] Sender: text" or "29/10/26, 15:45 - Sender: text"). Use that message's own send time to resolve relative time references like "tomorrow evening" or "in an hour" into an absolute date/time.`,
    `Find every distinct order the customer placed anywhere in this conversation. For each order:`,
    `- requestedTime: the time they actually wanted it delivered/ready, as an ISO 8601 datetime. If they never specified a time, use that message's own send time instead.`,
    `- items: each dish they asked for, matched to the closest name from this menu: ${menuNames.join(", ")}. Use the exact menu name, not their casual wording.`,
    `- notes: anything else relevant (special instructions, substitutions), or null.`,
    `- rawExcerpt: the original message text this order came from, so the vendor can double-check it.`,
    `Skip anything that isn't an actual order (greetings, price questions with no order placed, etc).`,
    ``,
    `--- Chat export ---`,
    chatText,
  ].join("\n");
}

/** Drafts orders from a WhatsApp export — never writes to the database. The caller reviews and confirms each one. */
export async function logWhatsappOrders(
  chatText: string,
  customerName: string | undefined
): Promise<{ orders: DraftOrder[]; unmatched: string[] }> {
  const menuItems = await prisma.menuItem.findMany({ where: { isAvailable: true }, select: { id: true, name: true } });
  const byName = new Map(menuItems.map((m) => [m.name.toLowerCase(), m]));

  const reply = await callGroq({
    messages: [{ role: "user", content: extractionPrompt(chatText, customerName, menuItems.map((m) => m.name)) }],
    response_format: { type: "json_schema", json_schema: { name: "whatsapp_orders", strict: true, schema: ORDER_EXTRACTION_SCHEMA } },
  });

  if (!reply.content) throw new Error("Groq didn't return any orders");
  const parsed = JSON.parse(reply.content) as {
    orders: { requestedTime: string; items: { menuItemName: string; quantity: number }[]; notes: string | null; rawExcerpt: string }[];
  };

  const unmatched = new Set<string>();
  const orders: DraftOrder[] = parsed.orders.map((o) => ({
    requestedTime: o.requestedTime,
    notes: o.notes,
    rawExcerpt: o.rawExcerpt,
    items: o.items.map((i) => {
      const match = byName.get(i.menuItemName.toLowerCase());
      if (!match) unmatched.add(i.menuItemName);
      return { menuItemName: i.menuItemName, menuItemId: match?.id ?? null, quantity: i.quantity };
    }),
  }));

  return { orders, unmatched: Array.from(unmatched) };
}

/** Real sales/cost/profit numbers and per-item performance for a period — the caller's model narrates feedback from these. */
export async function analyzeBusiness(from: Date, to: Date) {
  const data = await computeAnalytics(from, to);
  return {
    from: data.from,
    to: data.to,
    sales: data.sales,
    cost: data.cost,
    profit: data.profit,
    orderCount: data.orderCount,
    averageOrderValue: data.averageOrderValue,
    profitByItem: data.profitByItem,
    bestSellers: data.bestSellers,
  };
}
