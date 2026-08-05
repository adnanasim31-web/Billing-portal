"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { PROVIDER_PORTAL_NAV } from "@/lib/constants/provider-portal-nav";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProviderPortalSidebar({ providerName }: { providerName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground lg:flex print:hidden"
    >
      <Link href="/provider" className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          M
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold">MedBill</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Provider Portal</p>
          </div>
        )}
      </Link>

      <TooltipProvider delayDuration={0}>
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-2">
          <ul className="space-y-0.5">
            {PROVIDER_PORTAL_NAV.map((item) => {
              const isActive =
                item.href === "/provider" ? pathname === "/provider" : pathname.startsWith(item.href);
              const linkContent = (
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-white"
                      : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-white",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </span>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.href}>{linkContent}</Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Link href={item.href}>{linkContent}</Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>

      {!collapsed && (
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Provider</p>
          <p className="mt-0.5 truncate text-sm font-medium">{providerName}</p>
        </div>
      )}

      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex h-11 items-center justify-center border-t border-sidebar-border text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
