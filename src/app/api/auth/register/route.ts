import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validations/auth";
import { registerOrganizationOwner } from "@/lib/services/auth-service";
import { getRequestContext } from "@/lib/request-context";
import { recordAuditLog } from "@/lib/services/audit-service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const result = await registerOrganizationOwner(parsed.data);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { ipAddress, userAgent } = await getRequestContext();
  await recordAuditLog({
    organizationId: result.organizationId,
    userId: result.userId,
    action: "auth.register",
    ipAddress,
    userAgent,
  });

  return NextResponse.json({
    emailConfirmationRequired: result.emailConfirmationRequired,
  });
}
