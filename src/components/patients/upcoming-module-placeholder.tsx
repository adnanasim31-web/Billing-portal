import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

export function UpcomingModulePlaceholder({
  icon,
  title,
  moduleName,
}: {
  icon: LucideIcon;
  title: string;
  moduleName: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={`This ships with the ${moduleName} module - once it's built, it will appear here automatically for every patient.`}
    />
  );
}
