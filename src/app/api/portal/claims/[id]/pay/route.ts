import { NextResponse } from "next/server";
import { patientPortalPaymentSchema } from "@/lib/validations/patient-portal";
import { getCurrentPortalUser, recordPortalPayment } from "@/lib/services/patient-portal-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const portalUser = await getCurrentPortalUser();
  if (!portalUser) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = patientPortalPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { id } = await params;

  try {
    const payment = await recordPortalPayment({
      claimId: id,
      patientId: portalUser.patientId,
      organizationId: portalUser.organizationId,
      amount: parsed.data.amount,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to record payment";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
