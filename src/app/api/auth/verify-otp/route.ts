import { NextResponse } from "next/server";
import { z } from "zod";
import { otpSchema } from "@/lib/validations/auth";
import { verifyOtp } from "@/lib/services/otp-service";

const requestSchema = otpSchema.extend({
  email: z.string().email(),
  purpose: z.enum(["email_verification", "login_2fa", "password_reset", "phone_verification"]),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const result = await verifyOtp(parsed.data);

  if (!result.ok) {
    const messages: Record<string, string> = {
      not_found: "No code was requested for this email.",
      expired: "This code has expired. Please request a new one.",
      too_many_attempts: "Too many attempts. Please request a new code.",
      incorrect: "That code is incorrect.",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
