"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";

export function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const purpose = searchParams.get("purpose") ?? "email_verification";

  const [code, setCode] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleVerify() {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(data.error ?? "Invalid or expired code");
        setCode("");
        return;
      }

      toast.success("Verified successfully");
      router.push(purpose === "password_reset" ? "/reset-password" : "/login");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <MailCheck className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Verify your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email || "your email"}</span>.
        </p>
      </div>

      <OtpInput value={code} onChange={setCode} disabled={isSubmitting} />

      <Button className="w-full" disabled={isSubmitting} onClick={handleVerify}>
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Verify code
      </Button>
    </div>
  );
}
