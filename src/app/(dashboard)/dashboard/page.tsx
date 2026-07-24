import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { getCurrentUser, hasPermission } from "@/lib/services/current-user-service";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { ClaimStatusDonut } from "@/components/dashboard/claim-status-donut";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasPermission(user, PERMISSIONS.DASHBOARD_VIEW)) redirect("/settings/profile");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back, {user?.firstName}</h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s a snapshot of your revenue cycle. Sample data - live KPIs ship with the Claims &amp; Reports modules.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3">
        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" />
        <p className="text-sm">
          <span className="font-medium">2 claims require attention</span>{" "}
          <span className="text-muted-foreground">
            once the Claims module ships, denial and prior-auth alerts will surface here.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="MTD Billed" value="$184,200" caption="July 2024 - 12 days" changePercent={8.2} progress={62} />
        <KpiCard
          label="MTD Collected"
          value="$109,442"
          caption="59.4% collection rate"
          changePercent={3.1}
          progress={59}
        />
        <KpiCard
          label="Outstanding AR"
          value="$74,758"
          caption="Avg age: 18.4 days"
          changePercent={-2.3}
          increaseIsGood={false}
        />
        <KpiCard
          label="Denial Rate"
          value="11.3%"
          caption="28 of 248 claims"
          changePercent={-0.8}
          increaseIsGood={false}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Billing Volume</CardTitle>
              <CardDescription>Feb - Jul 2024</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Claim Status Mix</CardTitle>
            <CardDescription>All claims - July 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimStatusDonut />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
