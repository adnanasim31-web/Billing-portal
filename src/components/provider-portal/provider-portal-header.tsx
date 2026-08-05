"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ProviderPortalHeader({ providerName }: { providerName: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const res = await fetch("/api/provider/auth/logout", { method: "POST" });
    if (!res.ok) {
      toast.error("Unable to sign out. Please try again.");
      return;
    }
    router.push("/provider/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-sidebar px-4 text-sidebar-foreground sm:px-6">
      <Link href="/provider" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          M
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">MedBill</p>
          <p className="text-[10px] uppercase tracking-wider text-sidebar-muted">Provider Portal</p>
        </div>
      </Link>

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-sidebar-muted sm:inline">{providerName}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
