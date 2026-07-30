"use client";

import * as React from "react";
import { Hash, Loader2, Plus, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { MessagesSquare } from "lucide-react";

export interface ChannelSummary {
  id: string;
  name: string;
  description: string | null;
}

export interface MessageRow {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

async function fetchMessages(channelId: string): Promise<MessageRow[]> {
  const res = await fetch(`/api/messages/channels/${channelId}/messages`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data ?? []).map((m: { id: string; body: string; created_at: string; profiles: { first_name: string; last_name: string } | null }) => ({
    id: m.id,
    body: m.body,
    authorName: m.profiles ? `${m.profiles.first_name} ${m.profiles.last_name}` : "Unknown",
    createdAt: m.created_at,
  }));
}

export function MessagesWorkspace({ initialChannels }: { initialChannels: ChannelSummary[] }) {
  const [channels, setChannels] = React.useState(initialChannels);
  const [selectedChannelId, setSelectedChannelId] = React.useState<string | null>(initialChannels[0]?.id ?? null);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = React.useState(false);
  const [newChannelName, setNewChannelName] = React.useState("");
  const [newChannelDescription, setNewChannelDescription] = React.useState("");
  const [isCreatingChannel, setIsCreatingChannel] = React.useState(false);

  const loadMessages = React.useCallback(async (channelId: string) => {
    setIsLoadingMessages(true);
    try {
      setMessages(await fetchMessages(channelId));
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  React.useEffect(() => {
    if (selectedChannelId) loadMessages(selectedChannelId);
  }, [selectedChannelId, loadMessages]);

  async function handleSend() {
    if (!draft.trim() || !selectedChannelId) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/messages/channels/${selectedChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to send message");
        return;
      }
      setDraft("");
      await loadMessages(selectedChannelId);
    } finally {
      setIsSending(false);
    }
  }

  async function handleCreateChannel() {
    if (!newChannelName.trim()) return;
    setIsCreatingChannel(true);
    try {
      const res = await fetch("/api/messages/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newChannelName, description: newChannelDescription }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to create channel");
        return;
      }
      toast.success("Channel created");
      setChannels((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedChannelId(data.id);
      setNewChannelName("");
      setNewChannelDescription("");
      setIsChannelDialogOpen(false);
    } finally {
      setIsCreatingChannel(false);
    }
  }

  const selectedChannel = channels.find((c) => c.id === selectedChannelId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
      <div className="space-y-3">
        <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="w-full">
              <Plus className="h-4 w-4" />
              New channel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a channel</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Channel name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
              <Input
                placeholder="Description (optional)"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button onClick={handleCreateChannel} disabled={!newChannelName.trim() || isCreatingChannel}>
                {isCreatingChannel && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ul className="space-y-1">
          {channels.map((channel) => (
            <li key={channel.id}>
              <button
                type="button"
                onClick={() => setSelectedChannelId(channel.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-secondary",
                  selectedChannelId === channel.id && "bg-secondary font-medium"
                )}
              >
                <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                {channel.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col rounded-lg border border-border">
        {!selectedChannel ? (
          <div className="p-6">
            <EmptyState
              icon={MessagesSquare}
              title="No channels yet"
              description="Create a channel to start messaging your team."
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <p className="text-sm font-medium">#{selectedChannel.name}</p>
                {selectedChannel.description && (
                  <p className="text-xs text-muted-foreground">{selectedChannel.description}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => loadMessages(selectedChannel.id)}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ maxHeight: "24rem" }}>
              {isLoadingMessages ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id}>
                    <p className="text-xs font-medium text-muted-foreground">
                      {message.authorName} · {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p className="text-sm">{message.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center gap-2 border-t border-border p-4">
              <Input
                placeholder={`Message #${selectedChannel.name}`}
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
          </>
        )}
      </div>
    </div>
  );
}
