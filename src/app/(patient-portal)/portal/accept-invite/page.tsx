import type { Metadata } from "next";
import { Suspense } from "react";
import { PortalAcceptInviteForm } from "@/components/portal/portal-accept-invite-form";

export const metadata: Metadata = { title: "Activate Patient Portal Account" };

export default function PortalAcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <Suspense>
          <PortalAcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
