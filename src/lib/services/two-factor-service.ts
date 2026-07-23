import "server-only";
import { createHash, randomBytes } from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

const ISSUER = "MedBill RCM Suite";
const BACKUP_CODE_COUNT = 10;

function hashBackupCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateBackupCodes(count = BACKUP_CODE_COUNT) {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}

function buildTotp(secret: string, email: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

/**
 * Starts 2FA enrollment: generates a new TOTP secret + QR code data URL and
 * a fresh set of backup codes. Nothing is marked `is_enabled` until the user
 * proves possession of the authenticator by calling confirmTwoFactorSetup().
 */
export async function beginTwoFactorSetup(userId: string, email: string) {
  const supabase = createAdminClient();
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  const backupCodes = generateBackupCodes();

  const { error } = await supabase.from("two_factor_auth").upsert({
    user_id: userId,
    method: "totp",
    secret,
    backup_codes: backupCodes.map(hashBackupCode),
    is_enabled: false,
    verified_at: null,
  });
  if (error) throw error;

  const totp = buildTotp(secret, email);
  const otpauthUrl = totp.toString();
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl, backupCodes };
}

export async function confirmTwoFactorSetup(userId: string, code: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("two_factor_auth")
    .select("secret")
    .eq("user_id", userId)
    .single();
  if (error || !row?.secret) return false;

  const totp = buildTotp(row.secret, userId);
  const delta = totp.validate({ token: code, window: 1 });
  if (delta === null) return false;

  await supabase
    .from("two_factor_auth")
    .update({ is_enabled: true, verified_at: new Date().toISOString() })
    .eq("user_id", userId);

  return true;
}

export async function verifyTwoFactorCode(userId: string, code: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("two_factor_auth")
    .select("secret, backup_codes, is_enabled")
    .eq("user_id", userId)
    .single();
  if (error || !row?.is_enabled || !row.secret) return false;

  const totp = buildTotp(row.secret, userId);
  if (totp.validate({ token: code, window: 1 }) !== null) return true;

  const hashedInput = hashBackupCode(code.trim());
  if (row.backup_codes.includes(hashedInput)) {
    await supabase
      .from("two_factor_auth")
      .update({ backup_codes: row.backup_codes.filter((c) => c !== hashedInput) })
      .eq("user_id", userId);
    return true;
  }

  return false;
}

export async function disableTwoFactor(userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("two_factor_auth")
    .update({ is_enabled: false, secret: null, backup_codes: [], verified_at: null })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function isTwoFactorEnabled(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("two_factor_auth")
    .select("is_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.is_enabled ?? false;
}
