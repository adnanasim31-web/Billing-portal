"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { eligibilityCheckSchema, type EligibilityCheckInput } from "@/lib/validations/eligibility";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";

interface EligibilityCheckFormProps {
  defaultValues?: Partial<EligibilityCheckInput>;
  initialPatientLabel?: string;
  initialProviderLabel?: string;
}

const EMPTY_DEFAULTS: EligibilityCheckInput = {
  patientId: "",
  patientInsurancePolicyId: "",
  providerId: "",
  serviceType: "general",
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

export function EligibilityCheckForm({ defaultValues, initialPatientLabel, initialProviderLabel }: EligibilityCheckFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EligibilityCheckInput>({
    resolver: zodResolver(eligibilityCheckSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  async function onSubmit(values: EligibilityCheckInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Unable to run eligibility check");
        return;
      }

      toast.success("Eligibility check complete");
      router.push(`/eligibility/${data.id}`);
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
            <CardTitle>Run an eligibility check</CardTitle>
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
                  <FormLabel>Provider (optional)</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      value={field.value ?? ""}
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
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="specialist">Specialist</SelectItem>
                      <SelectItem value="behavioral_health">Behavioral health</SelectItem>
                      <SelectItem value="urgent_care">Urgent care</SelectItem>
                      <SelectItem value="telehealth">Telehealth</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
              Run check
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
