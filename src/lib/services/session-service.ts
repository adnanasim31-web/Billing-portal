import "server-only";
import { createHash } from "crypto";
import { UAParser } from "@/lib/ua-parser";
import { createAdminClient } from "@/lib/supabase/admin";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Registers/refreshes a device session row after a successful sign-in. */
export async function upsertSessionRecord(params: {
  userId: string;
  refreshTokenId: string;
  ipAddress: string | null;
  userAgent: string | null;
}) {
  const admin = createAdminClient();
  const parsed = UAParser(params.userAgent ?? "");

  const { error } = await admin.from("user_sessions").upsert(
    {
      user_id: params.userId,
      session_token_hash: hashToken(params.refreshTokenId),
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      device_label: parsed,
      last_active_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "session_token_hash" }
  );

  if (error) throw error;
}

export async function listUserSessions(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("last_active_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function revokeSession(sessionId: string, requestingUserId: string) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", requestingUserId);

  if (error) throw error;
}
