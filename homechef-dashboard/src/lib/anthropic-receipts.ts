const MODEL = "claude-sonnet-5-5";

const EXTRACTION_PROMPT =
  "This is a photo of a receipt or invoice. Read it and extract: the total amount paid, as a plain number (strip " +
  "currency symbols/commas); the vendor/shop name, or null if illegible; the date on the receipt as an ISO 8601 date " +
  "(YYYY-MM-DD), or null if there isn't one; a one-line description of what was bought (e.g. 'Groceries — vegetables " +
  "and spices', 'Petrol'); and your best guess at an expense category, in plain words (e.g. 'Ingredients', 'Petrol', " +
  "'Utilities', 'Packaging'). If the total isn't clearly readable, use your best estimate from the line items.";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    amount: { type: "number" },
    vendor: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    description: { type: "string" },
    suggestedCategory: { type: "string" },
  },
  required: ["amount", "vendor", "date", "description", "suggestedCategory"],
  additionalProperties: false,
};

export interface ExtractedReceipt {
  amount: number;
  vendor: string | null;
  date: string | null;
  description: string;
  suggestedCategory: string;
}

/** Sends one receipt photo to Claude's vision API and returns what it read off it. */
export async function extractReceipt(mediaType: string, data: string): Promise<ExtractedReceipt> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured on the server");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [{ type: "image", source: { type: "base64", media_type: mediaType, data } }, { type: "text", text: EXTRACTION_PROMPT }],
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
  if (message.stop_reason === "refusal") throw new Error("Claude declined to read this receipt");
  if (message.stop_reason === "max_tokens") throw new Error("The receipt was too long to read in one go");

  const text = message.content?.find((b: { type: string }) => b.type === "text")?.text;
  if (!text) throw new Error("Claude didn't return anything for this receipt");

  const parsed = JSON.parse(text) as ExtractedReceipt;
  if (!Number.isFinite(parsed.amount) || parsed.amount <= 0) throw new Error("Couldn't read a usable amount off this receipt");
  return parsed;
}
