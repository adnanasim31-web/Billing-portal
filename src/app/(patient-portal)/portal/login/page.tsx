import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata: Metadata = { title: "Patient Portal Sign In" };

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Suspense>
          <PortalLoginForm />
        </Suspense>
      </div>
    </div>
  );
}
