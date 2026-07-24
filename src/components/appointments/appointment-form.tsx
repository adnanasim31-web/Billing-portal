"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { appointmentSchema, type AppointmentInput } from "@/lib/validations/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";

interface AppointmentFormProps {
  appointmentId?: string;
  defaultValues?: Partial<AppointmentInput>;
  initialPatientLabel?: string;
  initialProviderLabel?: string;
}

const EMPTY_DEFAULTS: AppointmentInput = {
  patientId: "",
  providerId: "",
  appointmentType: "follow_up",
  date: "",
  startTime: "09:00",
  endTime: "09:30",
  reason: "",
  location: "",
};

async function fetchPatients(query: string): Promise<ComboboxOption[]> {
  const res = await fetch(`/api/patients?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.patients ?? []).map((p: { id: string; first_name: string; last_name: string; mrn: string }) => ({
    value: p.id,
    label: `${p.first_name} ${p.last_name}`,
    sublabel: p.mrn,
  }));
}

async function fetchProviders(query: string): Promise<ComboboxOption[]> {
  const res = await fetch(`/api/providers?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.providers ?? []).map(
    (p: {
      id: string;
      provider_type: string;
      first_name: string | null;
      last_name: string | null;
      organization_name: string | null;
      specialty: string;
    }) => ({
      value: p.id,
      label: p.provider_type === "organization" ? (p.organization_name ?? "") : `${p.first_name} ${p.last_name}`,
      sublabel: p.specialty,
    })
  );
}

export function AppointmentForm({
  appointmentId,
  defaultValues,
  initialPatientLabel,
  initialProviderLabel,
}: AppointmentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isEdit = !!appointmentId;

  const form = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  async function onSubmit(values: AppointmentInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/appointments/${appointmentId}` : "/api/appointments", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Unable to save appointment");
        return;
      }

      toast.success(isEdit ? "Appointment updated" : "Appointment scheduled");
      router.push(`/appointments/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule appointment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      fetchOptions={fetchPatients}
                      placeholder="Search patients by name or MRN..."
                      initialLabel={initialPatientLabel}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="providerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      fetchOptions={fetchProviders}
                      placeholder="Search providers..."
                      initialLabel={initialProviderLabel}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="appointmentType"
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
                      <SelectItem value="new_patient">New patient</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                      <SelectItem value="procedure">Procedure</SelectItem>
                      <SelectItem value="telehealth">Telehealth</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
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
              name="reason"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Reason for visit (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Annual physical, follow-up on labs..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : "Schedule appointment"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
