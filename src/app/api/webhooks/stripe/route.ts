import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { recordPortalPayment } from "@/lib/services/patient-portal-service";
import { recordAuditLog } from "@/lib/services/audit-service";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe isn't configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { claimId, patientId, organizationId } = intent.metadata;
    if (claimId && patientId && organizationId) {
      await recordPortalPayment({
        claimId,
        patientId,
        organizationId,
        amount: intent.amount / 100,
        stripePaymentIntentId: intent.id,
      });
    } else {
      console.error("[stripe-webhook] payment_intent.succeeded missing expected metadata", intent.id);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const { claimId, patientId, organizationId } = intent.metadata;
    await recordAuditLog({
      organizationId: organizationId || null,
      action: "patient_portal.payment_failed",
      entityType: "claim",
      entityId: claimId || undefined,
      metadata: {
        patientId,
        stripePaymentIntentId: intent.id,
        error: intent.last_payment_error?.message,
      },
    });
  }

  return NextResponse.json({ received: true });
}
