"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, MessageSquare, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { patientNoteSchema, type PatientNoteInput } from "@/lib/validations/patients";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";
import { formatRelativeTime } from "@/lib/utils";
import type { PatientNoteType } from "@/types/database.types";

export interface PatientNoteRow {
  id: string;
  noteType: PatientNoteType;
  body: string;
  isPinned: boolean;
  createdAt: string;
  authorName: string;
}

const TYPE_VARIANT: Record<PatientNoteType, "secondary" | "warning" | "outline"> = {
  general: "secondary",
  billing: "warning",
  clinical: "outline",
  collections: "warning",
};

export function NotesTab({ patientId, notes }: { patientId: string; notes: PatientNoteRow[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const form = useForm<PatientNoteInput>({
    resolver: zodResolver(patientNoteSchema),
    defaultValues: { noteType: "general", body: "", isPinned: false },
  });

  async function onSubmit(values: PatientNoteInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add note");
        return;
      }
      form.reset({ noteType: values.noteType, body: "", isPinned: false });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function togglePin(noteId: string, isPinned: boolean) {
    setPendingId(noteId);
    try {
      const res = await fetch(`/api/patients/${patientId}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !isPinned }),
      });
      if (!res.ok) {
        toast.error("Unable to update note");
        return;
      }
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleDelete(noteId: string) {
    setPendingId(noteId);
    try {
      const res = await fetch(`/api/patients/${patientId}/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to delete note");
        return;
      }
      toast.success("Note deleted");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="noteType"
              render={({ field }) => (
                <FormItem className="w-40">
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="billing">Billing</SelectItem>
                      <SelectItem value="clinical">Clinical</SelectItem>
                      <SelectItem value="collections">Collections</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <textarea
                    placeholder="Add a note about this patient..."
                    rows={3}
                    className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post note
            </Button>
          </div>
        </form>
      </Form>

      {notes.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No notes yet" description="Notes from your team will appear here." />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge variant={TYPE_VARIANT[note.noteType]} className="capitalize">
                    {note.noteType}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {note.authorName} · {formatRelativeTime(note.createdAt)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={pendingId === note.id}
                    onClick={() => togglePin(note.id, note.isPinned)}
                  >
                    {note.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={pendingId === note.id}
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
