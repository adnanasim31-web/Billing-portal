"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { PRIMARY_NAV } from "@/lib/constants/nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import type { CurrentUser } from "@/lib/services/current-user-service";

function resolveTitle(pathname: string): string {
  if (pathname.startsWith("/settings/profile")) return "My Profile";
  if (pathname.startsWith("/settings/security")) return "Security & Sign-In";
  if (pathname.startsWith("/settings/users")) return "Team Members";
  if (pathname.startsWith("/settings/roles")) return "Roles & Permissions";
  const match = PRIMARY_NAV.find((item) => pathname.startsWith(item.href));
  return match?.label ?? "Overview";
}

export function Navbar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Quick search..."
            className="h-10 w-64 rounded-md border border-input bg-card pl-9 pr-3 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <ThemeToggle />

        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>

        <UserMenu
          firstName={user.firstName}
          lastName={user.lastName}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
      </div>
    </header>
  );
}
