"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { claimSchema, type ClaimInput } from "@/lib/validations/claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";

interface ClaimFormProps {
  claimId?: string;
  defaultValues?: Partial<ClaimInput>;
  initialPatientLabel?: string;
  initialProviderLabel?: string;
}

const EMPTY_DEFAULTS: ClaimInput = {
  patientId: "",
  providerId: "",
  payerCompanyId: "",
  patientInsurancePolicyId: "",
  serviceDateFrom: "",
  serviceDateTo: "",
  placeOfService: "",
  notes: "",
};

interface PayerOption {
  id: string;
  name: string;
  payer_id_code: string | null;
}

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

export function ClaimForm({ claimId, defaultValues, initialPatientLabel, initialProviderLabel }: ClaimFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [payers, setPayers] = React.useState<PayerOption[]>([]);
  const isEdit = !!claimId;

  const form = useForm<ClaimInput>({
    resolver: zodResolver(claimSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  React.useEffect(() => {
    fetch("/api/insurance-companies?select=1")
      .then((res) => (res.ok ? res.json() : []))
      .then(setPayers)
      .catch(() => setPayers([]));
  }, []);

  async function onSubmit(values: ClaimInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(isEdit ? `/api/claims/${claimId}` : "/api/claims", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Unable to save claim");
        return;
      }

      toast.success(isEdit ? "Claim updated" : `Claim created - ${data.claim_number}`);
      router.push(`/claims/${data.id}`);
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
            <CardTitle>Claim details</CardTitle>
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
                  <FormLabel>Rendering provider</FormLabel>
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
              name="payerCompanyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payer (optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {payers.map((payer) => (
                        <SelectItem key={payer.id} value={payer.id}>
                          {payer.name}
                          {payer.payer_id_code ? ` (${payer.payer_id_code})` : ""}
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
              name="placeOfService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Place of service (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="11 - Office" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceDateFrom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service date from</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="serviceDateTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service date to</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <textarea
                      rows={3}
                      className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...field}
                    />
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
              {isEdit ? "Save changes" : "Create claim"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
