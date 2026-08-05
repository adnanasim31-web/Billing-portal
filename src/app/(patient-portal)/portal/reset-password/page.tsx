import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalBrandPanel } from "@/components/portal/portal-brand-panel";
import { PortalResetPasswordForm } from "@/components/portal/portal-reset-password-form";

export const metadata: Metadata = { title: "Set New Patient Portal Password" };

export default function PortalResetPasswordPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <PortalBrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <PortalResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
