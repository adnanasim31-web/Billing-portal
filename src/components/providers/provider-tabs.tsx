"use client";

import { BadgeCheck, LineChart, ReceiptText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProviderOverviewTab } from "@/components/providers/provider-overview-tab";
import { ScheduleTab, type ScheduleBlockRow } from "@/components/providers/schedule-tab";
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
}

export function ProviderTabs({ providerId, overview, schedule }: ProviderTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="schedule">Schedule ({schedule.length})</TabsTrigger>
        <TabsTrigger value="claims">Claims</TabsTrigger>
        <TabsTrigger value="performance">Performance &amp; Revenue</TabsTrigger>
        <TabsTrigger value="credentialing">Credentialing</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <ProviderOverviewTab {...overview} />
      </TabsContent>
      <TabsContent value="schedule">
        <ScheduleTab providerId={providerId} blocks={schedule} />
      </TabsContent>
      <TabsContent value="claims">
        <UpcomingModulePlaceholder icon={ReceiptText} title="No claims yet" moduleName="Claims" />
      </TabsContent>
      <TabsContent value="performance">
        <UpcomingModulePlaceholder
          icon={LineChart}
          title="No performance data yet"
          moduleName="Reports"
        />
      </TabsContent>
      <TabsContent value="credentialing">
        <UpcomingModulePlaceholder
          icon={BadgeCheck}
          title="No credentialing records yet"
          moduleName="Credentialing"
        />
      </TabsContent>
    </Tabs>
  );
}
