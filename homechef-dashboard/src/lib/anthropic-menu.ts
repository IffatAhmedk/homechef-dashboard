import type { Prisma } from "@prisma/client";

const MODEL = "claude-sonnet-5-5";

const EXTRACTION_PROMPT =
  "This is a photo or scanned page of a restaurant/home-kitchen menu. Extract every distinct menu item you can read. " +
  "For each: its name, its price as a plain number (strip currency symbols/commas), and its category — the section " +
  "heading it's listed under, or a sensible category like 'Beverages' if there's no explicit heading (never leave it " +
  "blank). If a price is a range, use the lower number. Skip section headers, descriptions-only lines, and anything " +
  "that isn't an actual priced item.";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          price: { type: "number" },
          category: { type: "string" },
        },
        required: ["name", "price", "category"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export interface ExtractedMenuItem {
  name: string;
  price: number;
  category: string;
}

/** Sends a menu photo/PDF to Claude's vision API and returns the items it read off it. */
export async function extractMenuItems(mediaType: string, data: string): Promise<ExtractedMenuItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            mediaType === "application/pdf"
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
              : { type: "image", source: { type: "base64", media_type: mediaType, data } },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
      output_config: { format: { type: "json_schema", schema: EXTRACTION_SCHEMA } },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Claude API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const message = await res.json();
  if (message.stop_reason === "refusal") throw new Error("Claude declined to read this file");
  if (message.stop_reason === "max_tokens") throw new Error("The menu was too long to read in one go");

  const text = message.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("Claude didn't return any items");

  const parsed = JSON.parse(text) as { items: ExtractedMenuItem[] };
  return parsed.items.filter((i) => i.name?.trim() && Number.isFinite(i.price) && i.price > 0);
}

const UNCATEGORIZED = "Uncategorized";

/** Server-side equivalent of the client-only findOrCreateCategory in src/data/menu.ts. */
export async function findOrCreateCategoryServer(tx: Prisma.TransactionClient, name: string | undefined): Promise<string> {
  const trimmed = (name ?? "").trim() || UNCATEGORIZED;
  const existing = await tx.category.findMany();
  const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.id;
  const created = await tx.category.create({ data: { name: trimmed, sortOrder: existing.length } });
  return created.id;
}
