import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { DenialUpdateInput } from "@/lib/validations/denials";
import type { DenialCategory, DenialClaimStatus, DenialResolutionStatus } from "@/types/database.types";

const DENIAL_SELECT =
  "*, claims:claim_id (id, claim_number, status, patient_id, patients:patient_id (id, mrn, first_name, last_name)), profiles:assigned_to (id, first_name, last_name)";

const RESOLVED_STATUSES: DenialResolutionStatus[] = ["resolved", "written_off"];

/** Called from the claims status API route right after a claim transitions to denied/rejected. */
export async function createDenialRecordForClaim(params: {
  organizationId: string;
  claimId: string;
  claimStatus: DenialClaimStatus;
  reasonDetail?: string | null;
  createdBy: string;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claim_denials")
    .insert({
      organization_id: params.organizationId,
      claim_id: params.claimId,
      claim_status: params.claimStatus,
      reason_detail: params.reasonDetail || null,
      created_by: params.createdBy,
      updated_by: params.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.createdBy,
    action: "denial.opened",
    entityType: "claim_denial",
    entityId: data.id,
    metadata: { claimId: params.claimId, claimStatus: params.claimStatus },
  });

  return data;
}

export interface ListDenialsParams {
  organizationId: string;
  query?: string;
  resolutionStatus?: DenialResolutionStatus | "all";
  category?: DenialCategory | "all";
  page?: number;
  pageSize?: number;
}

export async function listDenials(params: ListDenialsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("claim_denials")
    .select(DENIAL_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("created_at", { ascending: false });

  if (params.resolutionStatus && params.resolutionStatus !== "all") {
    queryBuilder = queryBuilder.eq("resolution_status", params.resolutionStatus);
  }
  if (params.category && params.category !== "all") {
    queryBuilder = queryBuilder.eq("category", params.category);
  }
  if (params.query) {
    queryBuilder = queryBuilder.or(`claim_number.ilike.%${params.query.trim()}%`, { foreignTable: "claims" });
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { denials: data, total: count ?? 0, page, pageSize };
}

/** Used by the dashboard - denials still open (not resolved or written off). */
export async function countActiveDenials(organizationId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("claim_denials")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .not("resolution_status", "in", `(${RESOLVED_STATUSES.join(",")})`);
  if (error) throw error;
  return count ?? 0;
}

export async function getDenialById(denialId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claim_denials")
    .select(DENIAL_SELECT)
    .eq("id", denialId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateDenial(params: {
  denialId: string;
  organizationId: string;
  actingUserId: string;
  input: DenialUpdateInput;
}) {
  const admin = createAdminClient();
  const isResolved = RESOLVED_STATUSES.includes(params.input.resolutionStatus);

  const { data, error } = await admin
    .from("claim_denials")
    .update({
      category: params.input.category,
      assigned_to: params.input.assignedTo || null,
      follow_up_date: params.input.followUpDate || null,
      resolution_status: params.input.resolutionStatus,
      resolution_notes: params.input.resolutionNotes || null,
      resolved_at: isResolved ? new Date().toISOString() : null,
      updated_by: params.actingUserId,
    })
    .eq("id", params.denialId)
    .eq("organization_id", params.organizationId)
    .select(DENIAL_SELECT)
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "denial.updated",
    entityType: "claim_denial",
    entityId: params.denialId,
    metadata: { resolutionStatus: params.input.resolutionStatus, category: params.input.category },
  });

  return data;
}
