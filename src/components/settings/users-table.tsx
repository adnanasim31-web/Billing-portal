"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/shared/data-table";
import { getInitials, formatRelativeTime } from "@/lib/utils";
import type { UserStatus } from "@/types/database.types";

export interface OrgUserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  roleNames: string[];
  lastLoginAt: string | null;
}

const STATUS_VARIANT: Record<UserStatus, "success" | "secondary" | "warning" | "destructive"> = {
  active: "success",
  invited: "secondary",
  suspended: "warning",
  disabled: "destructive",
};

export function UsersTable({ users }: { users: OrgUserRow[] }) {
  const router = useRouter();

  async function updateStatus(userId: string, status: UserStatus) {
    const res = await fetch(`/api/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Unable to update user status");
      return;
    }
    toast.success("User status updated");
    router.refresh();
  }

  const columns = React.useMemo<ColumnDef<OrgUserRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(row.original.firstName, row.original.lastName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {row.original.firstName} {row.original.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "roles",
        header: "Role",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roleNames.length ? (
              row.original.roleNames.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">No role</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
            {row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last active",
        cell: ({ row }) =>
          row.original.lastLoginAt ? (
            <span className="text-sm text-muted-foreground">{formatRelativeTime(row.original.lastLoginAt)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Never</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {row.original.status !== "active" && (
                <DropdownMenuItem onSelect={() => updateStatus(row.original.id, "active")}>
                  Activate
                </DropdownMenuItem>
              )}
              {row.original.status !== "suspended" && (
                <DropdownMenuItem onSelect={() => updateStatus(row.original.id, "suspended")}>
                  Suspend
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => updateStatus(row.original.id, "disabled")}
              >
                Remove access
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <DataTable
      columns={columns}
      data={users}
      emptyTitle="No team members yet"
      emptyDescription="Invite your first colleague to get started."
    />
  );
}
