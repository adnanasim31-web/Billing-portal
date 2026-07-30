import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ChannelInput, MessageInput } from "@/lib/validations/messaging";

export async function listChannels(organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("message_channels")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return data;
}

export async function createChannel(params: { organizationId: string; actingUserId: string; input: ChannelInput }) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("message_channels")
    .insert({
      organization_id: params.organizationId,
      name: params.input.name,
      description: params.input.description || null,
      created_by: params.actingUserId,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("A channel with that name already exists");
    throw error;
  }
  return data;
}

export async function listMessages(channelId: string, organizationId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .select("*, profiles:author_id (first_name, last_name)")
    .eq("channel_id", channelId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function postMessage(params: {
  channelId: string;
  organizationId: string;
  authorId: string;
  input: MessageInput;
}) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("messages")
    .insert({
      organization_id: params.organizationId,
      channel_id: params.channelId,
      author_id: params.authorId,
      body: params.input.body,
    })
    .select("*, profiles:author_id (first_name, last_name)")
    .single();
  if (error) throw error;
  return data;
}
