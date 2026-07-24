import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { getInsuranceCompanyById, updateInsuranceCompany } from "@/lib/services/insurance-service";
import { insuranceCompanySchema } from "@/lib/validations/insurance";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.INSURANCE_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view insurance" }, { status: 403 });
  }

  const { id } = await params;
  const company = await getInsuranceCompanyById(id, user.organizationId);
  if (!company) return NextResponse.json({ error: "Payer not found" }, { status: 404 });

  return NextResponse.json(company);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.INSURANCE_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage insurance" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = insuranceCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const company = await updateInsuranceCompany({
      companyId: id,
      organizationId: user.organizationId,
      updatedBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update payer" },
      { status: 400 }
    );
  }
}
