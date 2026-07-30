"use client";

import { LineChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderOverviewTab } from "@/components/providers/provider-overview-tab";
import { ScheduleTab, type ScheduleBlockRow } from "@/components/providers/schedule-tab";
import { ProviderClaimsTab, type ProviderClaimRow } from "@/components/providers/provider-claims-tab";
import { ProviderCredentialingTab, type ProviderCredentialRow } from "@/components/providers/provider-credentialing-tab";
import { UpcomingModulePlaceholder } from "@/components/shared/upcoming-module-placeholder";

interface ProviderTabsProps {
  providerId: string;
  overview: {
    taxId: string | null;
    taxonomyCode: string | null;
    licenseNumber: string | null;
    licenseState: string | null;
    deaNumber: string | null;
    email: string | null;
    phone: string | null;
    createdAt: string;
  };
  schedule: ScheduleBlockRow[];
  claims: ProviderClaimRow[];
  credentials: ProviderCredentialRow[] | null;
  canManageCredentialing: boolean;
}

export function ProviderTabs({
  providerId,
  overview,
  schedule,
  claims,
  credentials,
  canManageCredentialing,
}: ProviderTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="schedule">Schedule ({schedule.length})</TabsTrigger>
        <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
        <TabsTrigger value="performance">Performance &amp; Revenue</TabsTrigger>
        {credentials && <TabsTrigger value="credentialing">Credentialing ({credentials.length})</TabsTrigger>}
      </TabsList>

      <TabsContent value="overview">
        <ProviderOverviewTab {...overview} />
      </TabsContent>
      <TabsContent value="schedule">
        <ScheduleTab providerId={providerId} blocks={schedule} />
      </TabsContent>
      <TabsContent value="claims">
        <ProviderClaimsTab providerId={providerId} claims={claims} />
      </TabsContent>
      <TabsContent value="performance">
        <UpcomingModulePlaceholder
          icon={LineChart}
          title="No performance data yet"
          moduleName="Reports"
        />
      </TabsContent>
      {credentials && (
        <TabsContent value="credentialing">
          <ProviderCredentialingTab
            providerId={providerId}
            credentials={credentials}
            canManage={canManageCredentialing}
          />
        </TabsContent>
      )}
    </Tabs>
  );
}
