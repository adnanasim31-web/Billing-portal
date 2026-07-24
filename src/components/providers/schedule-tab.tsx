"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { providerScheduleSchema, type ProviderScheduleInput } from "@/lib/validations/providers";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";

export interface ScheduleBlockRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
}

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const h = Number(hours ?? 0);
  const m = Number(minutes ?? 0);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function ScheduleTab({ providerId, blocks }: { providerId: string; blocks: ScheduleBlockRow[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<ProviderScheduleInput>({
    resolver: zodResolver(providerScheduleSchema),
    defaultValues: { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", location: "" },
  });

  async function onSubmit(values: ProviderScheduleInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/providers/${providerId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add availability");
        return;
      }
      toast.success("Availability added");
      form.reset();
      setOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(scheduleId: string) {
    setDeletingId(scheduleId);
    try {
      const res = await fetch(`/api/providers/${providerId}/schedule/${scheduleId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to remove availability");
        return;
      }
      toast.success("Availability removed");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = React.useMemo(() => {
    const map = new Map<number, ScheduleBlockRow[]>();
    for (const block of blocks) {
      const list = map.get(block.dayOfWeek) ?? [];
      list.push(block);
      map.set(block.dayOfWeek, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [blocks]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add availability
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add weekly availability</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of week</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAY_LABELS.map((label, index) => (
                            <SelectItem key={label} value={String(index)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Main office, Suite 200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save availability
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {grouped.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No availability set"
          description="Add weekly availability blocks - the future Appointments module will use these."
        />
      ) : (
        <div className="space-y-3">
          {grouped.map(([day, dayBlocks]) => (
            <div key={day} className="rounded-lg border border-border p-4">
              <p className="mb-2 text-sm font-semibold">{DAY_LABELS[day]}</p>
              <ul className="space-y-1.5">
                {dayBlocks.map((block) => (
                  <li key={block.id} className="flex items-center justify-between text-sm">
                    <span>
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                      {block.location && <span className="text-muted-foreground"> · {block.location}</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={deletingId === block.id}
                      onClick={() => handleDelete(block.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
