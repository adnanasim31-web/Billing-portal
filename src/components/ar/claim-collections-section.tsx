"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { MessageSquareText } from "lucide-react";

export interface ArNoteRow {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ClaimCollectionsSection({
  claimId,
  balanceAmount,
  notes,
  canManage,
}: {
  claimId: string;
  balanceAmount: number;
  notes: ArNoteRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleAddNote() {
    if (!body.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/ar/${claimId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add note");
        return;
      }
      toast.success("Note added");
      setBody("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Collections</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open balance</p>
          <p className="text-lg font-semibold tracking-tight">{formatCurrency(balanceAmount)}</p>
        </div>

        {canManage && (
          <div className="space-y-2">
            <textarea
              rows={3}
              placeholder="e.g. Called payer 8/2, said reprocessing within 10 business days."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAddNote} disabled={!body.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add note
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No collection notes yet" />
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((note) => (
              <li key={note.id} className="py-2">
                <p className="text-sm">{note.body}</p>
                <p className="text-xs text-muted-foreground">
                  {note.authorName} · {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
