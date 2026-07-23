import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyOtpForm } from "@/components/auth/verify-otp-form";

export const metadata: Metadata = { title: "Verify Email" };

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpForm />
    </Suspense>
  );
}
