"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export function PatientsFilters() {
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
          placeholder="Search by name, MRN, or email..."
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
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="deceased">Deceased</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
