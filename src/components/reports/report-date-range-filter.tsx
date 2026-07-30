"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReportDateRangeFilter({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label>From</Label>
        <Input type="date" defaultValue={from} onChange={(e) => updateParam("from", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>To</Label>
        <Input type="date" defaultValue={to} onChange={(e) => updateParam("to", e.target.value)} />
      </div>
    </div>
  );
}
