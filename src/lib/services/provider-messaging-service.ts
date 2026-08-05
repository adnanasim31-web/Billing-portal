import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderMessageInput } from "@/lib/validations/provider-messaging";

/** One row per provider that has at least one message - drives the staff-side worklist. */
export async function listProvidersWithMessages(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_messages")
    .select("provider_id, created_at, providers:provider_id (provider_type, first_name, last_name, organization_name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const seen = new Map<string, (typeof data)[number]>();
  for (const row of data) {
    if (!seen.has(row.provider_id)) seen.set(row.provider_id, row);
  }
  return Array.from(seen.values());
}

export async function listProviderMessages(providerId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_messages")
    .select("*, profiles:sender_profile_id (first_name, last_name)")
    .eq("provider_id", providerId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function postProviderMessageAsStaff(params: {
  providerId: string;
  organizationId: string;
  senderProfileId: string;
  input: ProviderMessageInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_messages")
    .insert({
      organization_id: params.organizationId,
      provider_id: params.providerId,
      sender_type: "staff",
      sender_profile_id: params.senderProfileId,
      body: params.input.body,
    })
    .select("*, profiles:sender_profile_id (first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}

export async function postProviderMessageAsProvider(params: {
  providerId: string;
  organizationId: string;
  senderProviderAccountId: string;
  input: ProviderMessageInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_messages")
    .insert({
      organization_id: params.organizationId,
      provider_id: params.providerId,
      sender_type: "provider",
      sender_provider_account_id: params.senderProviderAccountId,
      body: params.input.body,
    })
    .select("*, profiles:sender_profile_id (first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}
