"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { HeartPulse, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { patientHistoryEntrySchema, type PatientHistoryEntryInput } from "@/lib/validations/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";
import type { MedicalHistoryStatus, MedicalHistoryType } from "@/types/database.types";

export interface HistoryEntryRow {
  id: string;
  entryType: MedicalHistoryType;
  description: string;
  onsetDate: string | null;
  status: MedicalHistoryStatus;
  createdAt: string;
}

const TYPE_LABELS: Record<MedicalHistoryType, string> = {
  condition: "Condition",
  allergy: "Allergy",
  medication: "Medication",
  surgery: "Surgery",
  immunization: "Immunization",
};

const STATUS_VARIANT: Record<MedicalHistoryStatus, "warning" | "success" | "secondary"> = {
  active: "warning",
  chronic: "secondary",
  resolved: "success",
};

export function HistoryTab({ patientId, entries }: { patientId: string; entries: HistoryEntryRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<PatientHistoryEntryInput>({
    resolver: zodResolver(patientHistoryEntrySchema),
    defaultValues: { entryType: "condition", description: "", onsetDate: "", status: "active" },
  });

  async function onSubmit(values: PatientHistoryEntryInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add entry");
        return;
      }
      toast.success("History entry added");
      form.reset();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(entryId: string) {
    setDeletingId(entryId);
    try {
      const res = await fetch(`/api/patients/${patientId}/history/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to delete entry");
        return;
      }
      toast.success("Entry deleted");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add medical history entry</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="chronic">Chronic</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Type 2 diabetes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="onsetDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onset date (optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save entry
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No medical history recorded"
          description="Add conditions, allergies, medications, surgeries, or immunizations."
        />
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{TYPE_LABELS[entry.entryType]}</Badge>
                  <Badge variant={STATUS_VARIANT[entry.status]} className="capitalize">
                    {entry.status}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm font-medium">{entry.description}</p>
                {entry.onsetDate && (
                  <p className="text-xs text-muted-foreground">
                    Onset {new Date(entry.onsetDate + "T00:00:00").toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                disabled={deletingId === entry.id}
                onClick={() => handleDelete(entry.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
