import type { Metadata } from "next";
import { Suspense } from "react";
import { ProviderPortalBrandPanel } from "@/components/provider-portal/provider-portal-brand-panel";
import { ProviderPortalLoginForm } from "@/components/provider-portal/provider-portal-login-form";

export const metadata: Metadata = { title: "Provider Portal Sign In" };

export default function ProviderLoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <ProviderPortalBrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <ProviderPortalLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
