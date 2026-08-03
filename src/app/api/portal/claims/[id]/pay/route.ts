import { NextResponse } from "next/server";
import { patientPortalPaymentSchema } from "@/lib/validations/patient-portal";
import { getCurrentPortalUser, getPortalClaimById } from "@/lib/services/patient-portal-service";
import { getStripeClient } from "@/lib/stripe";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const stripe = getStripeClient();
  if (!stripe) {
    return NextResponse.json({ error: "Card payments aren't enabled yet. Please contact your provider's billing office." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patientPortalPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { id } = await params;
  const result = await getPortalClaimById(id, portalUser.patientId, portalUser.organizationId);
  if (!result) return NextResponse.json({ error: "Statement not found" }, { status: 404 });

  const balanceAmount = Math.max(0, Number(result.claim.balance_amount));
  if (parsed.data.amount > balanceAmount) {
    return NextResponse.json({ error: "That amount is more than the outstanding balance on this statement." }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(parsed.data.amount * 100),
    currency: "usd",
    payment_method_types: ["card"],
    metadata: {
      claimId: id,
      patientId: portalUser.patientId,
      organizationId: portalUser.organizationId,
    },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
