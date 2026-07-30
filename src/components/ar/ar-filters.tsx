"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { AGING_BUCKETS } from "@/lib/validations/ar";
import { AGING_BUCKET_LABELS } from "@/components/ar/ar-aging-summary";

export function ArFilters() {
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
          placeholder="Search by claim number..."
          className="pl-9"
          defaultValue={searchParams.get("query") ?? ""}
          onChange={(e) => debouncedSearch(e.target.value)}
        />
      </div>
      <Select
        defaultValue={searchParams.get("agingBucket") ?? "all"}
        onValueChange={(value) => updateParam("agingBucket", value === "all" ? "" : value)}
      >
        <SelectTrigger className="sm:w-48">
          <SelectValue placeholder="Aging bucket" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All aging buckets</SelectItem>
          {AGING_BUCKETS.map((bucket) => (
            <SelectItem key={bucket} value={bucket}>
              {AGING_BUCKET_LABELS[bucket]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
