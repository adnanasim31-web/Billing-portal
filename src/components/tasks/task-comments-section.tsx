"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export interface TaskCommentRow {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export function TaskCommentsSection({
  taskId,
  comments,
  canManage,
}: {
  taskId: string;
  comments: TaskCommentRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleAdd() {
    if (!body.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add comment");
        return;
      }
      toast.success("Comment added");
      setBody("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage && (
          <div className="space-y-2">
            <textarea
              rows={3}
              placeholder="Add a comment..."
              className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleAdd} disabled={!body.trim() || isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Add comment
              </Button>
            </div>
          </div>
        )}

        {comments.length === 0 ? (
          <EmptyState icon={MessageSquareText} title="No comments yet" />
        ) : (
          <ul className="divide-y divide-border">
            {comments.map((comment) => (
              <li key={comment.id} className="py-2">
                <p className="text-sm">{comment.body}</p>
                <p className="text-xs text-muted-foreground">
                  {comment.authorName} · {new Date(comment.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
