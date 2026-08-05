import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalBrandPanel } from "@/components/portal/portal-brand-panel";
import { PortalForgotPasswordForm } from "@/components/portal/portal-forgot-password-form";

export const metadata: Metadata = { title: "Reset Patient Portal Password" };

export default function PortalForgotPasswordPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <PortalBrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <PortalForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
