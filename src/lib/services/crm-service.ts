import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { CrmLeadInput, CrmActivityInput } from "@/lib/validations/crm";
import type { CrmLeadStage } from "@/types/database.types";

const LEAD_SELECT = "*, profiles:owner_id (id, first_name, last_name)";

export interface ListLeadsParams {
  organizationId: string;
  query?: string;
  stage?: CrmLeadStage | "all";
  page?: number;
  pageSize?: number;
}

export async function listLeads(params: ListLeadsParams) {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let queryBuilder = admin
    .from("crm_leads")
    .select(LEAD_SELECT, { count: "exact" })
    .eq("organization_id", params.organizationId)
    .order("updated_at", { ascending: false });

  if (params.stage && params.stage !== "all") {
    queryBuilder = queryBuilder.eq("stage", params.stage);
  }
  if (params.query) {
    const term = params.query.trim();
    queryBuilder = queryBuilder.or(`contact_name.ilike.%${term}%,company_name.ilike.%${term}%`);
  }

  const { data, error, count } = await queryBuilder.range(from, to);
  if (error) throw error;
  return { leads: data, total: count ?? 0, page, pageSize };
}

export async function getLeadById(leadId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLead(params: { organizationId: string; actingUserId: string; input: CrmLeadInput }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_leads")
    .insert({
      organization_id: params.organizationId,
      contact_name: params.input.contactName,
      company_name: params.input.companyName || null,
      email: params.input.email || null,
      phone: params.input.phone || null,
      stage: params.input.stage,
      estimated_value: params.input.estimatedValue ?? null,
      source: params.input.source,
      owner_id: params.input.ownerId || null,
      notes: params.input.notes || null,
      created_by: params.actingUserId,
      updated_by: params.actingUserId,
    })
    .select("*")
    .single();
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "crm.lead_created",
    entityType: "crm_lead",
    entityId: data.id,
    metadata: { contactName: params.input.contactName, stage: params.input.stage },
  });

  return data;
}

export async function updateLead(params: {
  leadId: string;
  organizationId: string;
  actingUserId: string;
  input: CrmLeadInput;
}) {
  const admin = createAdminClient();
  const { data: existing, error: fetchError } = await admin
    .from("crm_leads")
    .select("stage")
    .eq("id", params.leadId)
    .eq("organization_id", params.organizationId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) throw new Error("Lead not found");

  const { data, error } = await admin
    .from("crm_leads")
    .update({
      contact_name: params.input.contactName,
      company_name: params.input.companyName || null,
      email: params.input.email || null,
      phone: params.input.phone || null,
      stage: params.input.stage,
      estimated_value: params.input.estimatedValue ?? null,
      source: params.input.source,
      owner_id: params.input.ownerId || null,
      notes: params.input.notes || null,
      updated_by: params.actingUserId,
    })
    .eq("id", params.leadId)
    .eq("organization_id", params.organizationId)
    .select("*")
    .single();
  if (error) throw error;

  if (existing.stage !== params.input.stage) {
    await recordAuditLog({
      organizationId: params.organizationId,
      userId: params.actingUserId,
      action: "crm.lead_stage_changed",
      entityType: "crm_lead",
      entityId: params.leadId,
      metadata: { fromStage: existing.stage, toStage: params.input.stage },
    });
  }

  return data;
}

export async function listActivitiesForLead(leadId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_activities")
    .select("*, profiles:author_id (first_name, last_name)")
    .eq("lead_id", leadId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function addActivity(params: {
  leadId: string;
  organizationId: string;
  authorId: string;
  input: CrmActivityInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("crm_activities")
    .insert({
      organization_id: params.organizationId,
      lead_id: params.leadId,
      activity_type: params.input.activityType,
      body: params.input.body,
      author_id: params.authorId,
    })
    .select("*, profiles:author_id (first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}
