import "server-only";
import { createHash, randomInt } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { OtpPurpose } from "@/types/database.types";

const OTP_TTL_MINUTES = 10;
const OTP_LENGTH = 6;

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateNumericCode(length: number) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(randomInt(min, max + 1));
}

/**
 * Issues a fresh one-time code for the given email + purpose, invalidating
 * any prior unconsumed codes for that pair. Returns the raw code so the
 * caller can email/text it - it is never persisted in plaintext.
 */
export async function issueOtp(params: {
  email: string;
  purpose: OtpPurpose;
  userId?: string | null;
}): Promise<string> {
  const supabase = createAdminClient();
  const code = generateNumericCode(OTP_LENGTH);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", params.email)
    .eq("purpose", params.purpose)
    .is("consumed_at", null);

  const { error } = await supabase.from("otp_codes").insert({
    email: params.email,
    user_id: params.userId ?? null,
    purpose: params.purpose,
    code_hash: hashCode(code),
    expires_at: expiresAt,
  });

  if (error) throw error;

  return code;
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "incorrect" };

/** Verifies a submitted code, incrementing the attempt counter on failure. */
export async function verifyOtp(params: {
  email: string;
  purpose: OtpPurpose;
  code: string;
}): Promise<OtpVerifyResult> {
  const supabase = createAdminClient();

  const { data: record, error } = await supabase
    .from("otp_codes")
    .select("*")
    .eq("email", params.email)
    .eq("purpose", params.purpose)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!record) return { ok: false, reason: "not_found" };

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= record.max_attempts) {
    return { ok: false, reason: "too_many_attempts" };
  }

  if (record.code_hash !== hashCode(params.code)) {
    await supabase
      .from("otp_codes")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    return { ok: false, reason: "incorrect" };
  }

  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", record.id);

  return { ok: true };
}
