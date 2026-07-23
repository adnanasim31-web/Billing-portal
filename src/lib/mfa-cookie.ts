import "server-only";
import { createHmac } from "crypto";

export const MFA_COOKIE_NAME = "mb_mfa";

function getSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET is not configured");
  return secret;
}

/** Signs a short-lived assertion that `userId` has completed 2FA for this browser session. */
export function signMfaCookieValue(userId: string): string {
  return createHmac("sha256", getSecret()).update(userId).digest("hex");
}

export function isMfaCookieValid(userId: string, value: string | undefined): boolean {
  if (!value) return false;
  return value === signMfaCookieValue(userId);
}
