import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuditLogEntry {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an append-only audit trail entry. Always goes through the service
 * role because audit_logs has no client insert policy - only the server
 * should be able to assert "this event happened."
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("audit_logs").insert({
    organization_id: entry.organizationId ?? null,
    user_id: entry.userId ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    metadata: entry.metadata ?? {},
    ip_address: entry.ipAddress ?? null,
    user_agent: entry.userAgent ?? null,
  });

  if (error) {
    // Audit logging must never break the primary request flow.
    console.error("[audit-service] failed to record audit log", error, entry.action);
  }
}

export async function listAuditLogs(organizationId: string, limit = 50) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
