import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { PatientInput } from "@/lib/validations/patients";
import type { PatientStatus } from "@/types/database.types";

/** Generates the next sequential MRN for an org, e.g. "MB-000001", retrying on collision. */
async function generateNextMrn(organizationId: string): Promise<string> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const nextNumber = (count ?? 0) + 1;
  return `MB-${String(nextNumber).padStart(6, "0")}`;
}

export interface ListPatientsParams {
  organizationId: string;
  query?: string;
  status?: PatientStatus | "all";
  page?: number;
  pageSize?: number;
}

export async function listPatients(params: ListPatientsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("patients")
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
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,mrn.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, error, count } = await queryBuilder;
  if (error) throw error;

  return { patients: data, total: count ?? 0, page, pageSize };
}

export async function getPatientById(patientId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

const MAX_MRN_COLLISION_RETRIES = 3;

export async function createPatient(params: {
  organizationId: string;
  createdBy: string;
  input: PatientInput;
}) {
  const admin = createAdminClient();

  for (let attempt = 0; attempt <= MAX_MRN_COLLISION_RETRIES; attempt++) {
    const mrn = await generateNextMrn(params.organizationId);

    const { data, error } = await admin
      .from("patients")
      .insert({
        organization_id: params.organizationId,
        mrn,
        first_name: params.input.firstName,
        last_name: params.input.lastName,
        middle_name: params.input.middleName || null,
        preferred_name: params.input.preferredName || null,
        date_of_birth: params.input.dateOfBirth,
        sex: params.input.sex,
        ssn_last4: params.input.ssnLast4 || null,
        email: params.input.email || null,
        phone_mobile: params.input.phoneMobile || null,
        phone_home: params.input.phoneHome || null,
        address_line1: params.input.addressLine1 || null,
        address_line2: params.input.addressLine2 || null,
        city: params.input.city || null,
        state: params.input.state || null,
        postal_code: params.input.postalCode || null,
        preferred_language: params.input.preferredLanguage,
        status: params.input.status,
        created_by: params.createdBy,
        updated_by: params.createdBy,
      })
      .select("*")
      .single();

    if (error) {
      // 23505 = unique_violation - another concurrent request claimed this MRN first; retry.
      if (error.code === "23505" && attempt < MAX_MRN_COLLISION_RETRIES) continue;
      throw error;
    }

    await recordAuditLog({
      organizationId: params.organizationId,
      userId: params.createdBy,
      action: "patient.created",
      entityType: "patient",
      entityId: data.id,
      metadata: { mrn },
    });

    return data;
  }

  throw new Error("Unable to allocate a unique MRN after multiple attempts");
}

export async function updatePatient(params: {
  patientId: string;
  organizationId: string;
  updatedBy: string;
  input: PatientInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("patients")
    .update({
      first_name: params.input.firstName,
      last_name: params.input.lastName,
      middle_name: params.input.middleName || null,
      preferred_name: params.input.preferredName || null,
      date_of_birth: params.input.dateOfBirth,
      sex: params.input.sex,
      ssn_last4: params.input.ssnLast4 || null,
      email: params.input.email || null,
      phone_mobile: params.input.phoneMobile || null,
      phone_home: params.input.phoneHome || null,
      address_line1: params.input.addressLine1 || null,
      address_line2: params.input.addressLine2 || null,
      city: params.input.city || null,
      state: params.input.state || null,
      postal_code: params.input.postalCode || null,
      preferred_language: params.input.preferredLanguage,
      status: params.input.status,
      updated_by: params.updatedBy,
    })
    .eq("id", params.patientId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.updatedBy,
    action: "patient.updated",
    entityType: "patient",
    entityId: params.patientId,
  });

  return data;
}
