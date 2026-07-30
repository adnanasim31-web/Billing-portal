"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Settings, X } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";

interface OrganizationSummary {
  name: string;
  npi: string | null;
}

export function MobileNav({ organization }: { organization: OrganizationSummary | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex h-16 items-center justify-between gap-2.5 px-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  M
                </div>
                <div className="leading-tight">
                  <p className="text-sm font-semibold">MedBill</p>
                  <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">RCM Suite</p>
                </div>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
              <ul className="space-y-0.5">
                {PRIMARY_NAV.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const linkContent = (
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-white"
                          : item.enabled
                            ? "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white"
                            : "cursor-not-allowed text-sidebar-muted/50"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!item.enabled && (
                        <span className="rounded-full bg-sidebar-border px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-muted">
                          Soon
                        </span>
                      )}
                    </span>
                  );

                  return (
                    <li key={item.href}>
                      {item.enabled ? (
                        <Link href={item.href}>{linkContent}</Link>
                      ) : (
                        <div aria-disabled>{linkContent}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="space-y-0.5 border-t border-sidebar-border px-3 py-2">
              <Link
                href="/settings/profile"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white",
                  pathname.startsWith("/settings") && "bg-sidebar-accent text-white"
                )}
              >
                <Settings className="h-4.5 w-4.5 shrink-0" />
                <span>Settings</span>
              </Link>
            </div>

            {organization && (
              <div className="border-t border-sidebar-border px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Practice</p>
                <p className="mt-0.5 truncate text-sm font-medium">{organization.name}</p>
                {organization.npi && <p className="text-xs text-sidebar-muted">NPI {organization.npi}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
