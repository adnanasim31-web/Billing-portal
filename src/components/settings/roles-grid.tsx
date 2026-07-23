import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RoleCardData {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
}

export function RolesGrid({ roles }: { roles: RoleCardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => (
        <Card key={role.id}>
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-base">
                {role.name}
                {role.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              </CardTitle>
              {role.description && <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>}
            </div>
            {role.isSystem && (
              <Badge variant="secondary" className="shrink-0">
                System
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {role.permissionCount} permission{role.permissionCount === 1 ? "" : "s"} granted
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
