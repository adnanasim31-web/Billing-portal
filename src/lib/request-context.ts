import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP + user agent extraction for audit/rate-limit logging. */
export async function getRequestContext() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() ?? headerList.get("x-real-ip") ?? null;
  const userAgent = headerList.get("user-agent");

  return { ipAddress, userAgent };
}
