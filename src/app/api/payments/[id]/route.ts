import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getPaymentById } from "@/lib/services/payment-service";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view payments" }, { status: 403 });
  }

  const { id } = await params;
  const detail = await getPaymentById(id, user.organizationId);
  if (!detail) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

  return NextResponse.json(detail);
}
