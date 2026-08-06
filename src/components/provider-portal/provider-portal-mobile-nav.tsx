"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PROVIDER_PORTAL_NAV } from "@/lib/constants/provider-portal-nav";
import { cn } from "@/lib/utils";

export function ProviderPortalMobileNav({ providerName }: { providerName: string }) {
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

      {open &&
        createPortal(
          // Rendered via portal, not as a descendant of the header - the header's `backdrop-blur`
          // makes it a containing block for `position: fixed` descendants, which would otherwise
          // clip this overlay to the header's own height instead of the full viewport.
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
                    <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Provider Portal</p>
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
                  {PROVIDER_PORTAL_NAV.map((item) => {
                    const isActive =
                      item.href === "/provider" ? pathname === "/provider" : pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-accent text-white"
                              : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white"
                          )}
                        >
                          <item.icon className="h-4.5 w-4.5 shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="border-t border-sidebar-border px-5 py-4">
                <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Provider</p>
                <p className="mt-0.5 truncate text-sm font-medium">{providerName}</p>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
