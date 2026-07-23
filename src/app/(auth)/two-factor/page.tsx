import type { Metadata } from "next";
import { TwoFactorVerifyForm } from "@/components/auth/two-factor-verify-form";

export const metadata: Metadata = { title: "Two-Factor Verification" };

export default function TwoFactorPage() {
  return <TwoFactorVerifyForm />;
}
