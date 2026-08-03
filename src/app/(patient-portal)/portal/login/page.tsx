import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalBrandPanel } from "@/components/portal/portal-brand-panel";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export const metadata: Metadata = { title: "Patient Portal Sign In" };

export default function PortalLoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <PortalBrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <PortalLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
