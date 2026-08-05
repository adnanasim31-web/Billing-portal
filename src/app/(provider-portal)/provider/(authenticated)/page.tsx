import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, MessagesSquare, ReceiptText, ShieldCheck } from "lucide-react";
import {
  getCurrentProviderPortalUser,
  getProviderPortalOverviewStats,
} from "@/lib/services/provider-portal-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Overview" };

export default async function ProviderOverviewPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const stats = await getProviderPortalOverviewStats(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome, {providerUser.displayName}</h2>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/provider/appointments">
          <Card className="transition-colors hover:bg-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s appointments</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stats.appointmentsTodayCount}</p>
              {stats.nextAppointment ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next: {stats.nextAppointment.patientName} at{" "}
                  {new Date(stats.nextAppointment.scheduledStart).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">No upcoming appointments scheduled</p>
              )}
            </CardContent>
          </Card>
        </Link>

        <Link href="/provider/claims">
          <Card className="transition-colors hover:bg-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Claims pending</CardTitle>
              <ReceiptText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stats.pendingClaimsCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Draft, ready, or submitted</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/provider/credentialing">
          <Card className="transition-colors hover:bg-secondary/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credentials expiring soon</CardTitle>
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{stats.credentialsExpiringSoonCount}</p>
              <p className="mt-1 text-xs text-muted-foreground">Within the next 30 days</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link href="/provider/messages" className="block">
        <Card className="transition-colors hover:bg-secondary/50">
          <CardContent className="flex items-center gap-3 py-4">
            <MessagesSquare className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              Have a question for the billing office? <span className="font-medium">Send them a message.</span>
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
