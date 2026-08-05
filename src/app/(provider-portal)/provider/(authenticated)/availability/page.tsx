import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProviderPortalUser, getProviderPortalSchedule } from "@/lib/services/provider-portal-service";
import { ProviderPortalAvailabilityTab } from "@/components/provider-portal/provider-portal-availability-tab";

export const metadata: Metadata = { title: "My Availability" };

export default async function ProviderAvailabilityPage() {
  const providerUser = await getCurrentProviderPortalUser();
  if (!providerUser) redirect("/provider/login");

  const schedule = await getProviderPortalSchedule(providerUser.providerId, providerUser.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Availability</h2>
        <p className="text-sm text-muted-foreground">
          Manage your weekly availability blocks - the billing office uses these when scheduling appointments.
        </p>
      </div>

      <ProviderPortalAvailabilityTab
        blocks={schedule.map((block) => ({
          id: block.id,
          dayOfWeek: block.day_of_week,
          startTime: block.start_time,
          endTime: block.end_time,
          location: block.location,
        }))}
      />
    </div>
  );
}
