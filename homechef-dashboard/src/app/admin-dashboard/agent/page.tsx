"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DraftOrdersCard } from "@/components/DraftOrdersCard";
import { Field } from "@/components/Field";
import { FilePicker } from "@/components/FilePicker";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/PageHeader";
import type { DraftOrder } from "@/lib/agent-tools";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  draftOrders?: DraftOrder[];
  unmatched?: string[];
  customerName?: string;
  customerPhone?: string;
}

export default function AgentPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  async function chooseFile([file]: File[]) {
    setAttachedFile({ name: file.name, text: await file.text() });
  }

  async function send() {
    if (!input.trim() && !attachedFile) return;
    setError(null);

    const text = input.trim() || `Log the orders from ${attachedFile?.name}.`;
    const nextVisible: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextVisible);
    setInput("");
    const attachment = attachedFile ? { text: attachedFile.text, customerName, customerPhone } : null;
    setAttachedFile(null);
    setSending(true);

    const res = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextVisible.map((m) => ({ role: m.role, content: m.content })),
        attachment: attachment ? { text: attachment.text, customerName: attachment.customerName || undefined } : undefined,
      }),
    });
    setSending(false);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: data.reply,
        draftOrders: data.draftOrders,
        unmatched: data.unmatched,
        customerName: attachment?.customerName,
        customerPhone: attachment?.customerPhone,
      },
    ]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-4">
      <PageHeader title="Assistant" subtitle="Log orders from a WhatsApp chat, or ask how the business is doing." />

      <div className="flex-1 space-y-4 overflow-y-auto rounded-lg bg-card p-5 shadow-card">
        {messages.length === 0 && (
          <p className="text-base text-ink-muted">
            Try: &quot;Log the orders from this chat&quot; (attach a WhatsApp export below), or &quot;How&apos;s this month looking?&quot;
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] space-y-2 ${m.role === "user" ? "" : "w-full"}`}>
              <div className={`rounded-lg px-4 py-2 text-base ${m.role === "user" ? "bg-brand text-on-brand" : "bg-sunken text-ink"}`}>{m.content}</div>
              {m.draftOrders && (
                <DraftOrdersCard orders={m.draftOrders} unmatched={m.unmatched ?? []} customerName={m.customerName} customerPhone={m.customerPhone} />
              )}
            </div>
          </div>
        ))}
        {sending && <p className="text-base text-ink-muted">Thinking…</p>}
        {error && <p className="text-base text-danger">{error}</p>}
      </div>

      <div className="space-y-3 rounded-lg bg-card p-4 shadow-card">
        {attachedFile ? (
          <>
            <div className="flex items-center justify-between rounded-lg bg-sunken px-3 py-2">
              <span className="text-base text-ink">📎 {attachedFile.name}</span>
              <button onClick={() => setAttachedFile(null)} aria-label="Remove attachment" className="text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer name">
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Who is this chat with?" />
              </Field>
              <Field label="Customer phone (optional)">
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="For matching to an existing customer" />
              </Field>
            </div>
          </>
        ) : (
          <FilePicker fileName="" prompt="Attach a WhatsApp export (.txt)" accept=".txt" onFiles={chooseFile} />
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about sales, or say what to do with the attached chat…"
            />
          </div>
          <Button onClick={send} disabled={sending || (!input.trim() && !attachedFile)}>
            <Send size={16} strokeWidth={2.4} />
          </Button>
        </div>
      </div>
    </div>
  );
}
