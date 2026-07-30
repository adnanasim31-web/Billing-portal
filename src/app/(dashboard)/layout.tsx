import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/services/current-user-service";
import { isTwoFactorEnabled } from "@/lib/services/two-factor-service";
import { isMfaCookieValid, MFA_COOKIE_NAME } from "@/lib/mfa-cookie";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const twoFactorEnabled = await isTwoFactorEnabled(user.id);
  if (twoFactorEnabled) {
    const cookieStore = await cookies();
    const mfaCookie = cookieStore.get(MFA_COOKIE_NAME)?.value;
    if (!isMfaCookieValid(user.id, mfaCookie)) redirect("/two-factor");
  }

  let organization: { name: string; npi: string | null } | null = null;
  if (user.organizationId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("organizations")
      .select("name, npi")
      .eq("id", user.organizationId)
      .maybeSingle();
    organization = data ?? null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar organization={organization} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} organization={organization} />
        <main className="flex-1 overflow-x-hidden p-6">{children}</main>
      </div>
    </div>
  );
}
