"use client";

import { usePathname } from "next/navigation";
import { PORTAL_NAV } from "@/lib/constants/portal-nav";
import { PortalMobileNav } from "@/components/portal/portal-mobile-nav";
import { PortalUserMenu } from "@/components/portal/portal-user-menu";

function resolveTitle(pathname: string): string {
  if (pathname === "/portal") return "Statements";
  const match = PORTAL_NAV.find((item) => item.href !== "/portal" && pathname.startsWith(item.href));
  return match?.label ?? "Patient Portal";
}

export function PortalHeader({ firstName, lastName }: { firstName: string; lastName: string }) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <PortalMobileNav patientName={`${firstName} ${lastName}`} />
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <PortalUserMenu firstName={firstName} lastName={lastName} />
    </header>
  );
}
