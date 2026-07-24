import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAuditLog } from "@/lib/services/audit-service";
import type { ProviderScheduleInput } from "@/lib/validations/providers";

export async function listProviderSchedule(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_schedules")
    .select("*")
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("day_of_week")
    .order("start_time");

  if (error) throw error;
  return data;
}

export async function addProviderScheduleBlock(params: {
  providerId: string;
  organizationId: string;
  actingUserId: string;
  input: ProviderScheduleInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_schedules")
    .insert({
      provider_id: params.providerId,
      organization_id: params.organizationId,
      day_of_week: params.input.dayOfWeek,
      start_time: params.input.startTime,
      end_time: params.input.endTime,
      location: params.input.location || null,
    })
    .select("*")
    .single();

  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "provider.schedule_added",
    entityType: "provider",
    entityId: params.providerId,
  });

  return data;
}

export async function deleteProviderScheduleBlock(params: {
  scheduleId: string;
  organizationId: string;
  actingUserId: string;
}) {
  const admin = createAdminClient();
  const { data: block, error: fetchError } = await admin
    .from("provider_schedules")
    .select("provider_id")
    .eq("id", params.scheduleId)
    .eq("organization_id", params.organizationId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await admin
    .from("provider_schedules")
    .delete()
    .eq("id", params.scheduleId)
    .eq("organization_id", params.organizationId);
  if (error) throw error;

  await recordAuditLog({
    organizationId: params.organizationId,
    userId: params.actingUserId,
    action: "provider.schedule_removed",
    entityType: "provider",
    entityId: block.provider_id,
  });
}
