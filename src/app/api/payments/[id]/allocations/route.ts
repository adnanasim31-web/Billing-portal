import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { addPaymentAllocation } from "@/lib/services/payment-service";
import { paymentAllocationSchema } from "@/lib/validations/payments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_POST)) {
    return NextResponse.json({ error: "You do not have permission to post payments" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = paymentAllocationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const allocation = await addPaymentAllocation({
      paymentId: id,
      organizationId: user.organizationId,
      actingUserId: user.id,
      input: parsed.data,
    });
    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to allocate payment" },
      { status: 400 }
    );
  }
}
