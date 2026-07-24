import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { InsuranceCompanyInput } from "@/lib/validations/insurance";

export interface ListInsuranceCompaniesParams {
  organizationId: string;
  query?: string;
  page?: number;
  pageSize?: number;
}

export async function listInsuranceCompanies(params: ListInsuranceCompaniesParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("insurance_companies")
    .select("*", { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("name")
    .range(from, to);

  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.or(`name.ilike.%${term}%,payer_id_code.ilike.%${term}%`);
  }

  const { data, error, count } = await queryBuilder;
  if (error) throw error;

  return { companies: data, total: count ?? 0, page, pageSize };
}

/** Lightweight list for populating payer-select dropdowns (e.g. patient insurance form). */
export async function listActiveInsuranceCompaniesForSelect(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("insurance_companies")
    .select("id, name, payer_id_code")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data;
}

/** Patients currently carrying this payer, for the company profile's Patients tab. */
export async function listPatientsForPayer(companyId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patient_insurance_policies")
    .select("id, rank, policy_number, is_active, patients:patient_id (id, mrn, first_name, last_name)")
    .eq("payer_company_id", companyId)
    .eq("organization_id", organizationId)
    .order("is_active", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getInsuranceCompanyById(companyId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("insurance_companies")
    .select("*")
    .eq("id", companyId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function toRow(input: InsuranceCompanyInput) {
  return {
    name: input.name,
    payer_id_code: input.payerIdCode || null,
    phone: input.phone || null,
    fax: input.fax || null,
    website: input.website || null,
    claims_address_line1: input.claimsAddressLine1 || null,
    claims_address_line2: input.claimsAddressLine2 || null,
    claims_city: input.claimsCity || null,
    claims_state: input.claimsState || null,
    claims_postal_code: input.claimsPostalCode || null,
    benefits_notes: input.benefitsNotes || null,
    is_active: input.isActive,
  };
}

export async function createInsuranceCompany(params: {
  organizationId: string;
  createdBy: string;
  input: InsuranceCompanyInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("insurance_companies")
    .insert({
      ...toRow(params.input),
      organization_id: params.organizationId,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A payer with this name already exists in your organization");
    }
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.createdBy,
    action: "insurance_company.created",
    entityType: "insurance_company",
    entityId: data.id,
    metadata: { name: params.input.name },
  });

  return data;
}

export async function updateInsuranceCompany(params: {
  companyId: string;
  organizationId: string;
  updatedBy: string;
  input: InsuranceCompanyInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("insurance_companies")
    .update({ ...toRow(params.input), updated_by: params.updatedBy })
    .eq("id", params.companyId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A payer with this name already exists in your organization");
    }
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.updatedBy,
    action: "insurance_company.updated",
    entityType: "insurance_company",
    entityId: params.companyId,
  });

  return data;
}
