"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { paymentSchema, type PaymentInput } from "@/lib/validations/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";

interface PaymentFormProps {
  defaultValues?: Partial<PaymentInput>;
  initialClaimLabel?: string;
}

const EMPTY_DEFAULTS: PaymentInput = {
  claimId: "",
  payerName: "",
  paymentMethod: "era",
  paymentDate: "",
  referenceNumber: "",
  totalAmount: 0,
  notes: "",
};

async function fetchClaims(query: string): Promise<ComboboxOption[]> {
  const res = await fetch(`/api/claims?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.claims ?? []).map(
    (c: {
      id: string;
      claim_number: string;
      patients: { first_name: string; last_name: string } | null;
    }) => ({
      value: c.id,
      label: c.claim_number,
      sublabel: c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : undefined,
    })
  );
}

export function PaymentForm({ defaultValues, initialClaimLabel }: PaymentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  async function onSubmit(values: PaymentInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Unable to post payment");
        return;
      }

      toast.success("Payment posted");
      router.push(`/payments/${data.id}`);
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
            <CardTitle>Post a payment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="claimId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Claim</FormLabel>
                  <FormControl>
                    <SearchCombobox
                      value={field.value}
                      onChange={(value) => field.onChange(value)}
                      fetchOptions={fetchClaims}
                      placeholder="Search by claim number..."
                      initialLabel={initialClaimLabel}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payer name</FormLabel>
                  <FormControl>
                    <Input placeholder="Aetna" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="era">ERA</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="credit_card">Credit card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="eft">EFT</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Check # or EFT trace #" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    />
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
              Post payment
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
