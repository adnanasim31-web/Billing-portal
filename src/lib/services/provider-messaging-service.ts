import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { renderInviteEmail } from "@/lib/email-templates";
import { resolveProviderDisplayName } from "@/lib/services/provider-display-name";
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

  await notifyProviderOfNewMessage(params.providerId, params.organizationId);

  return data;
}

/**
 * Best-effort - a provider not seeing an email for a new message is a much
 * smaller problem than a staff member's reply failing to save because the
 * mailer hiccuped, so this never throws back into the caller.
 */
async function notifyProviderOfNewMessage(providerId: string, organizationId: string) {
  try {
    const admin = createAdminClient();
    const { data: account } = await admin
      .from("provider_portal_accounts")
      .select("email, providers:provider_id (provider_type, first_name, last_name, organization_name, credential_suffix)")
      .eq("provider_id", providerId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!account) return;

    const providerName = account.providers ? resolveProviderDisplayName(account.providers) : "there";

    await sendEmail({
      to: account.email,
      subject: "New message from your billing office",
      html: renderInviteEmail({
        heading: "New message from your billing office",
        body: `Hi ${providerName}, your billing office sent you a new message. Sign in to the provider portal to read and reply.`,
        actionLabel: "View message",
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/provider/messages`,
      }),
    });
  } catch (err) {
    console.error("[provider-messaging] failed to send new-message notification", err);
  }
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
