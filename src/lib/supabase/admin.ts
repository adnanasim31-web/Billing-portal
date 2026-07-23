import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Service-role Supabase client. BYPASSES Row Level Security entirely.
 *
 * Server-only (the `server-only` import throws a build error if this is
 * ever pulled into a client bundle). Restricted to:
 *   - OTP issuance/verification (otp_codes has no client RLS policy)
 *   - Invitation token lookup (unauthenticated invitee)
 *   - Audit log writes
 *   - Admin user provisioning (creating auth.users on behalf of an org admin)
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
