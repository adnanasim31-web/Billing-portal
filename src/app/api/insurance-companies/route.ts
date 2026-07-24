import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import {
  listInsuranceCompanies,
  listActiveInsuranceCompaniesForSelect,
  createInsuranceCompany,
} from "@/lib/services/insurance-service";
import { insuranceCompanySchema, insuranceCompanySearchSchema } from "@/lib/validations/insurance";
import { PERMISSIONS } from "@/lib/constants/permissions";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.INSURANCE_VIEW)) {
    return NextResponse.json({ error: "You do not have permission to view insurance" }, { status: 403 });
  }

  const url = new URL(request.url);

  // ?select=1 returns a lightweight active-only list for populating dropdowns
  // (e.g. the patient insurance form's payer picker).
  if (url.searchParams.get("select")) {
    const companies = await listActiveInsuranceCompaniesForSelect(user.organizationId);
    return NextResponse.json(companies);
  }

  const parsed = insuranceCompanySearchSchema.safeParse({
    query: url.searchParams.get("query") ?? undefined,
    page: url.searchParams.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const result = await listInsuranceCompanies({
    organizationId: user.organizationId,
    query: parsed.data.query,
    page: parsed.data.page,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.organizationId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!hasPermission(user, PERMISSIONS.INSURANCE_MANAGE)) {
    return NextResponse.json({ error: "You do not have permission to manage insurance" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = insuranceCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const company = await createInsuranceCompany({
      organizationId: user.organizationId,
      createdBy: user.id,
      input: parsed.data,
    });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create payer" },
      { status: 400 }
    );
  }
}
