const MODEL = "openai/gpt-oss-120b";

export interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

export interface GroqTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

interface GroqResponse {
  choices: { message: GroqMessage; finish_reason: string }[];
}

/** One call to Groq's (OpenAI-compatible) chat completions API — no SDK, matching src/lib/anthropic-menu.ts's style. */
export async function callGroq(options: {
  messages: GroqMessage[];
  tools?: GroqTool[];
  response_format?: { type: "json_schema"; json_schema: { name: string; strict: true; schema: Record<string, unknown> } };
}): Promise<GroqMessage> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured on the server");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: options.messages,
      ...(options.tools && { tools: options.tools }),
      ...(options.response_format && { response_format: options.response_format }),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Groq API error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as GroqResponse;
  const choice = data.choices[0];
  if (!choice) throw new Error("Groq returned no response");
  return choice.message;
}
