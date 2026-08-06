"use client";

import * as React from "react";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface ProviderPortalMessageRow {
  id: string;
  body: string;
  senderType: "provider" | "staff";
  senderName: string;
  createdAt: string;
}

export function ProviderPortalMessagesTab({ initialMessages }: { initialMessages: ProviderPortalMessageRow[] }) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function handleSend() {
    if (!draft.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/provider/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to send message");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { id: data.id, body: data.body, senderType: "provider", senderName: "You", createdAt: data.created_at },
      ]);
      setDraft("");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="flex flex-col rounded-lg border border-border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "28rem", minHeight: "16rem" }}>
        {messages.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No messages yet"
            description="Ask the billing office a question about a claim, credentialing, or anything else - they'll see it here."
          />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2",
                message.senderType === "provider" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"
              )}
            >
              <p className="text-xs font-medium opacity-70">
                {message.senderName} · {new Date(message.createdAt).toLocaleString()}
              </p>
              <p className="text-sm">{message.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-border p-4">
        <Input
          placeholder="Message the billing office"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button size="sm" onClick={handleSend} disabled={!draft.trim() || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
