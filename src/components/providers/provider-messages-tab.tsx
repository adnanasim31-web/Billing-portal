"use client";

import * as React from "react";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export interface ProviderMessageRow {
  id: string;
  body: string;
  senderType: "provider" | "staff";
  senderName: string;
  createdAt: string;
}

interface ProviderMessagesTabProps {
  providerId: string;
  providerName: string;
  initialMessages: ProviderMessageRow[];
  canReply: boolean;
}

export function ProviderMessagesTab({ providerId, providerName, initialMessages, canReply }: ProviderMessagesTabProps) {
  const [messages, setMessages] = React.useState(initialMessages);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);

  async function handleSend() {
    if (!draft.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/providers/${providerId}/messages`, {
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
        { id: data.id, body: data.body, senderType: "staff", senderName: "You", createdAt: data.created_at },
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
            description={`No messages with ${providerName} yet.`}
          />
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2",
                message.senderType === "staff" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"
              )}
            >
              <p className="text-xs font-medium opacity-70">
                {message.senderName} · {new Date(message.createdAt).toLocaleString()}
              </p>
              <p className="text-sm">{message.body}</p>
            </div>
          ))
        )}
      </div>

      {canReply && (
        <div className="flex items-center gap-2 border-t border-border p-4">
          <Input
            placeholder={`Message ${providerName}`}
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
      )}
    </div>
  );
}
