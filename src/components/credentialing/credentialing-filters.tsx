"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { CREDENTIAL_STATUSES } from "@/lib/validations/credentialing";
import { CREDENTIAL_STATUS_LABELS } from "@/components/credentialing/credentialing-table";

export function CredentialingFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const debouncedSearch = useDebouncedCallback((value: string) => updateParam("query", value), 350);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by number or issuing authority..."
          className="pl-9"
          defaultValue={searchParams.get("query") ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>
      <Select
        defaultValue={searchParams.get("status") ?? "all"}
        onValueChange={(value) => updateParam("status", value === "all" ? "" : value)}
      >
        <SelectTrigger className="sm:w-44">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {CREDENTIAL_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {CREDENTIAL_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("expiringSoon") ?? "false"}
        onValueChange={(value) => updateParam("expiringSoon", value === "true" ? "true" : "")}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Expiration" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false">All expirations</SelectItem>
          <SelectItem value="true">Expiring in 60 days</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
