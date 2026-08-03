import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalBrandPanel } from "@/components/portal/portal-brand-panel";
import { PortalAcceptInviteForm } from "@/components/portal/portal-accept-invite-form";

export const metadata: Metadata = { title: "Activate Patient Portal Account" };

export default function PortalAcceptInvitePage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <PortalBrandPanel />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <Suspense>
            <PortalAcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
