"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { patientPortalPaymentSchema, type PatientPortalPaymentInput } from "@/lib/validations/patient-portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;
const isTestMode = publishableKey?.startsWith("pk_test_") ?? false;

function CardPaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message ?? "Payment failed");
        return;
      }
      if (paymentIntent?.status === "succeeded") {
        toast.success("Payment successful");
        onSuccess();
      } else {
        toast.error("Payment could not be completed");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" disabled={!stripe || isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Pay now
      </Button>
    </form>
  );
}

export function PortalPaymentDialog({ claimId, balanceAmount }: { claimId: string; balanceAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isCreatingIntent, setIsCreatingIntent] = React.useState(false);
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  const form = useForm<PatientPortalPaymentInput>({
    resolver: zodResolver(patientPortalPaymentSchema),
    defaultValues: { amount: balanceAmount },
  });

  async function onSubmitAmount(values: PatientPortalPaymentInput) {
    setIsCreatingIntent(true);
    try {
      const res = await fetch(`/api/portal/claims/${claimId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to start payment");
        return;
      }
      setClientSecret(data.clientSecret);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsCreatingIntent(false);
    }
  }

  function handleSuccess() {
    setOpen(false);
    setClientSecret(null);
    router.refresh();
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setClientSecret(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <CreditCard className="h-4 w-4" />
          Pay balance
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay this statement</DialogTitle>
          <DialogDescription>
            {isTestMode
              ? "Test mode - use Stripe's test card 4242 4242 4242 4242 with any future expiry and any CVC. No real charge occurs."
              : "Enter your card details to pay toward this statement."}
          </DialogDescription>
        </DialogHeader>

        {!stripePromise ? (
          <p className="text-sm text-muted-foreground">
            Card payments aren&apos;t enabled yet. Please contact your provider&apos;s billing office.
          </p>
        ) : !clientSecret ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAmount)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.01}
                        max={balanceAmount}
                        step="0.01"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" className="w-full" disabled={isCreatingIntent}>
                  {isCreatingIntent && <Loader2 className="h-4 w-4 animate-spin" />}
                  Continue to payment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CardPaymentForm onSuccess={handleSuccess} />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
