import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { listPayments, createPayment } from "@/lib/services/payment-service";
import { paymentSchema, paymentSearchSchema } from "@/lib/validations/payments";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view payments" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = paymentSearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    method: url.searchParams.get("method") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const pageParam = url.searchParams.get("page");
  const result = await listPayments({
    organizationId: user.organizationId,
    query: parsed.data.query,
    method: parsed.data.method,
    page: pageParam ? Number(pageParam) : undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.PAYMENTS_POST)) {
    return NextResponse.json({ error: "You do not have permission to post payments" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const payment = await createPayment({
      organizationId: user.organizationId,
      postedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to post payment" },
      { status: 400 }
    );
  }
}
