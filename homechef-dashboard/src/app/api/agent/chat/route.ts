import { NextRequest, NextResponse } from "next/server";
import { AGENT_TOOLS, analyzeBusiness, logWhatsappOrders, type DraftOrder } from "@/lib/agent-tools";
import { callGroq, type GroqMessage } from "@/lib/groq";
import { formatDate } from "@/lib/format";

export const maxDuration = 60;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Attachment {
  text: string;
  customerName?: string;
}

const MAX_ROUNDS = 4;

function systemPrompt(): string {
  return [
    "You are the assistant inside HomeChef, a home-kitchen food business's dashboard. You're talking to the vendor.",
    `Today's date is ${formatDate(new Date())}.`,
    "You have two tools:",
    "- log_whatsapp_orders: reads an attached WhatsApp export and drafts the orders in it. Only call it when a file is actually attached — never invent orders otherwise.",
    "- analyze_business: real sales/cost/profit numbers and per-item volume/margin for a date range you pick. Always use this for any question about sales, profit, revenue, or how menu items are doing — never guess numbers yourself.",
    "When analyze_business returns data, use it to give concrete, specific feedback — call out items with low order volume, thin margins, or standout performance by name.",
    "Keep replies short and conversational.",
  ].join("\n");
}

async function runTool(name: string, args: string, attachment: Attachment | undefined): Promise<{ content: string; draftOrders?: DraftOrder[]; unmatched?: string[] }> {
  if (name === "log_whatsapp_orders") {
    if (!attachment) return { content: JSON.stringify({ error: "No WhatsApp export is attached to this message." }) };
    const result = await logWhatsappOrders(attachment.text, attachment.customerName);
    return {
      content: JSON.stringify({ orderCount: result.orders.length, unmatchedItems: result.unmatched }),
      draftOrders: result.orders,
      unmatched: result.unmatched,
    };
  }

  if (name === "analyze_business") {
    const parsed = JSON.parse(args) as { from: string; to: string };
    const data = await analyzeBusiness(new Date(parsed.from), new Date(parsed.to));
    return { content: JSON.stringify(data) };
  }

  return { content: JSON.stringify({ error: `Unknown tool: ${name}` }) };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, attachment } = body as { messages?: ChatMessage[]; attachment?: Attachment };

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const history: GroqMessage[] = [{ role: "system", content: systemPrompt() }, ...messages];

  let draftOrders: DraftOrder[] | undefined;
  let unmatched: string[] | undefined;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    let reply;
    try {
      reply = await callGroq({ messages: history, tools: AGENT_TOOLS });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "The assistant failed to respond" }, { status: 502 });
    }
    history.push(reply);

    if (!reply.tool_calls || reply.tool_calls.length === 0) {
      return NextResponse.json({ reply: reply.content ?? "", draftOrders, unmatched });
    }

    for (const call of reply.tool_calls) {
      let result;
      try {
        result = await runTool(call.function.name, call.function.arguments, attachment);
      } catch (err) {
        result = { content: JSON.stringify({ error: err instanceof Error ? err.message : "Tool failed" }) };
      }
      if (result.draftOrders) draftOrders = result.draftOrders;
      if (result.unmatched) unmatched = result.unmatched;
      history.push({ role: "tool", tool_call_id: call.id, name: call.function.name, content: result.content });
    }
  }

  return NextResponse.json({ reply: "Sorry, I got stuck handling that — try asking again.", draftOrders, unmatched });
}
