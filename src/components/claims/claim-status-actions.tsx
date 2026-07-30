"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ClaimStatus } from "@/types/database.types";

interface StatusAction {
  label: string;
  next: ClaimStatus;
  variant?: "outline" | "destructive";
  requiresNote?: boolean;
  notePrompt?: string;
}

const ACTIONS: Partial<Record<ClaimStatus, StatusAction[]>> = {
  draft: [{ label: "Mark ready", next: "ready" }],
  ready: [
    { label: "Submit claim", next: "submitted" },
    { label: "Back to draft", next: "draft", variant: "outline" },
  ],
  submitted: [
    { label: "Mark accepted", next: "accepted" },
    {
      label: "Mark rejected",
      next: "rejected",
      variant: "destructive",
      requiresNote: true,
      notePrompt: "Reason for rejection:",
    },
    {
      label: "Mark denied",
      next: "denied",
      variant: "destructive",
      requiresNote: true,
      notePrompt: "Reason for denial:",
    },
  ],
  rejected: [{ label: "Revise & resubmit", next: "draft", variant: "outline" }],
  denied: [
    { label: "File appeal", next: "appealed", requiresNote: true, notePrompt: "Appeal notes:" },
    { label: "Close claim", next: "closed", variant: "outline" },
  ],
  appealed: [
    { label: "Mark accepted", next: "accepted" },
    { label: "Mark denied", next: "denied", variant: "destructive", requiresNote: true, notePrompt: "Reason for denial:" },
  ],
  accepted: [{ label: "Mark paid", next: "paid" }],
  paid: [{ label: "Close claim", next: "closed", variant: "outline" }],
};

export function ClaimStatusActions({
  claimId,
  status,
  canSubmit,
  canAppeal,
  isReadyToSubmit,
}: {
  claimId: string;
  status: ClaimStatus;
  canSubmit: boolean;
  canAppeal: boolean;
  isReadyToSubmit: boolean;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const actions = (ACTIONS[status] ?? []).filter((action) => {
    if (action.next === "submitted" && !canSubmit) return false;
    if (action.next === "appealed" && !canAppeal) return false;
    return true;
  });

  if (actions.length === 0) return null;

  async function handleClick(action: StatusAction) {
    let note: string | undefined;
    if (action.requiresNote) {
      const value = window.prompt(action.notePrompt ?? "Note:");
      if (!value) return;
      note = value;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action.next, note }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to update claim status");
        return;
      }
      toast.success("Claim status updated");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const disabled = isSubmitting || (action.next === "submitted" && !isReadyToSubmit);
        return (
          <Button
            key={action.next}
            variant={action.variant ?? "default"}
            disabled={disabled}
            title={disabled && action.next === "submitted" ? "Resolve the scrubbing errors before submitting" : undefined}
            onClick={() => handleClick(action)}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
