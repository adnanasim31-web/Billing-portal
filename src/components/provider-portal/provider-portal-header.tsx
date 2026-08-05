"use client";

import { usePathname } from "next/navigation";
import { PROVIDER_PORTAL_NAV } from "@/lib/constants/provider-portal-nav";
import { ProviderPortalMobileNav } from "@/components/provider-portal/provider-portal-mobile-nav";
import { ProviderPortalUserMenu } from "@/components/provider-portal/provider-portal-user-menu";

function resolveTitle(pathname: string): string {
  if (pathname === "/provider") return "Overview";
  const match = PROVIDER_PORTAL_NAV.find((item) => item.href !== "/provider" && pathname.startsWith(item.href));
  return match?.label ?? "Provider Portal";
}

export function ProviderPortalHeader({ providerName }: { providerName: string }) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 backdrop-blur sm:px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <ProviderPortalMobileNav providerName={providerName} />
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <ProviderPortalUserMenu displayName={providerName} />
    </header>
  );
}
