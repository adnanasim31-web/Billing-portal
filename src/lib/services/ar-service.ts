import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import { getAgingBucketDateRange, summarizeAging, type AgingBucket } from "@/lib/services/ar-aging";
import type { ArNoteInput } from "@/lib/validations/ar";

const AR_CLAIM_SELECT =
  "*, patients:patient_id (id, mrn, first_name, last_name), providers:provider_id (id, first_name, last_name, organization_name, provider_type), insurance_companies:payer_company_id (id, name)";

/** Claims that haven't been submitted yet carry no AR-relevant balance. */
const UNBILLED_STATUSES = "(draft,ready)";

export interface ListArClaimsParams {
  organizationId: string;
  query?: string;
  agingBucket?: AgingBucket | "all";
  page?: number;
  pageSize?: number;
}

export async function listArClaims(params: ListArClaimsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const today = new Date().toISOString().slice(0, 10);

  let queryBuilder = admin
    .from("claims")
    .select(AR_CLAIM_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .not("status", "in", UNBILLED_STATUSES)
    .gt("balance_amount", 0)
    .order("submitted_at", { ascending: true });

  if (params.agingBucket && params.agingBucket !== "all") {
    const range = getAgingBucketDateRange(params.agingBucket, today);
    if (range.from) queryBuilder = queryBuilder.gte("submitted_at", range.from);
    if (range.to) queryBuilder = queryBuilder.lte("submitted_at", range.to);
  }
  if (params.query) {
    queryBuilder = queryBuilder.ilike("claim_number", `%${params.query.trim()}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { claims: data, total: count ?? 0, page, pageSize };
}

export async function getArAgingSummary(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("claims")
    .select("balance_amount, submitted_at, service_date_from")
    .eq("organization_id", organizationId)
    .not("status", "in", UNBILLED_STATUSES)
    .gt("balance_amount", 0);
  if (error) throw error;

  const today = new Date().toISOString().slice(0, 10);
  return summarizeAging(
    (data ?? []).map((c) => ({
      balanceAmount: Number(c.balance_amount),
      anchorDate: c.submitted_at ? c.submitted_at.slice(0, 10) : c.service_date_from,
    })),
    today
  );
}

export async function listArNotesForClaim(claimId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ar_notes")
    .select("*, profiles:author_id (first_name, last_name)")
    .eq("claim_id", claimId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addArNote(params: {
  claimId: string;
  organizationId: string;
  authorId: string;
  input: ArNoteInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("ar_notes")
    .insert({
      organization_id: params.organizationId,
      claim_id: params.claimId,
      author_id: params.authorId,
      body: params.input.body,
    })
    .select("*, profiles:author_id (first_name, last_name)")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.authorId,
    action: "ar_note.added",
    entityType: "claim",
    entityId: params.claimId,
  });

  return data;
}
