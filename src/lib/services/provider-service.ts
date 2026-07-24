import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { ProviderInput } from "@/lib/validations/providers";
import type { ProviderStatus } from "@/types/database.types";

export interface ListProvidersParams {
  organizationId: string;
  query?: string;
  status?: ProviderStatus | "all";
  page?: number;
  pageSize?: number;
}

export async function listProviders(params: ListProvidersParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("providers")
    .select("*", { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }

  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,organization_name.ilike.%${term}%,npi.ilike.%${term}%,specialty.ilike.%${term}%`
    );
  }

  const { data, error, count } = await queryBuilder;
  if (error) throw error;

  return { providers: data, total: count ?? 0, page, pageSize };
}

export async function getProviderById(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function toRow(input: ProviderInput) {
  return {
    provider_type: input.providerType,
    first_name: input.providerType === "individual" ? input.firstName || null : null,
    last_name: input.providerType === "individual" ? input.lastName || null : null,
    credential_suffix: input.credentialSuffix || null,
    organization_name: input.providerType === "organization" ? input.organizationName || null : null,
    npi: input.npi,
    tax_id: input.taxId || null,
    specialty: input.specialty,
    taxonomy_code: input.taxonomyCode || null,
    license_number: input.licenseNumber || null,
    license_state: input.licenseState || null,
    dea_number: input.deaNumber || null,
    email: input.email || null,
    phone: input.phone || null,
    status: input.status,
  };
}

export async function createProvider(params: {
  organizationId: string;
  createdBy: string;
  input: ProviderInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("providers")
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
      throw new Error("A provider with this NPI already exists in your organization");
    }
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.createdBy,
    action: "provider.created",
    entityType: "provider",
    entityId: data.id,
    metadata: { npi: params.input.npi },
  });

  return data;
}

export async function updateProvider(params: {
  providerId: string;
  organizationId: string;
  updatedBy: string;
  input: ProviderInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("providers")
    .update({ ...toRow(params.input), updated_by: params.updatedBy })
    .eq("id", params.providerId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A provider with this NPI already exists in your organization");
    }
    throw error;
  }

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.updatedBy,
    action: "provider.updated",
    entityType: "provider",
    entityId: params.providerId,
  });

  return data;
}
