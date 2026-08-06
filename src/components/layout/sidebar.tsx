"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, Settings } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrganizationSummary {
  name: string;
  npi: string | null;
}

export function Sidebar({ organization }: { organization: OrganizationSummary | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 76 : 264 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground lg:flex print:hidden"
    >
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          M
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="text-sm font-semibold">MedBill</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">RCM Suite</p>
          </div>
        )}
      </div>

      <TooltipProvider delayDuration={0}>
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
                        : "cursor-not-allowed text-sidebar-muted/50",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && !item.enabled && (
                    <span className="rounded-full bg-sidebar-border px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-muted">
                      Soon
                    </span>
                  )}
                </span>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {item.enabled ? (
                          <Link href={item.href}>{linkContent}</Link>
                        ) : (
                          <div aria-disabled>{linkContent}</div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {item.label}
                        {!item.enabled && " (coming soon)"}
                      </TooltipContent>
                    </Tooltip>
                  ) : item.enabled ? (
                    <Link href={item.href}>{linkContent}</Link>
                  ) : (
                    <div aria-disabled>{linkContent}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </TooltipProvider>

      <div className="space-y-0.5 border-t border-sidebar-border px-3 py-2">
        <Link
          href="/settings/profile"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-white",
            pathname.startsWith("/settings") && "bg-sidebar-accent text-white",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      {organization && !collapsed && (
        <div className="border-t border-sidebar-border px-5 py-4">
          <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Practice</p>
          <p className="mt-0.5 truncate text-sm font-medium">{organization.name}</p>
          {organization.npi && <p className="text-xs text-sidebar-muted">NPI {organization.npi}</p>}
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
