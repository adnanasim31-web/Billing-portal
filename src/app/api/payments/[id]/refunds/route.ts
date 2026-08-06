import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { createPaymentRefund, listRefundsForPayment } from "@/lib/services/payment-refund-service";
import { paymentRefundSchema } from "@/lib/validations/payment-refunds";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view payments" }, { status: 403 });
  }

  const { id } = await params;
  const refunds = await listRefundsForPayment(id, user.organizationId);
  return NextResponse.json(refunds);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_POST)) {
    return NextResponse.json({ error: "You do not have permission to post payments or refunds" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = paymentRefundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const refund = await createPaymentRefund({
      paymentId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(refund, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to issue refund";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
