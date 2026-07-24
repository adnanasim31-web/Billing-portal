"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export function InsuranceSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("query", value);
    else params.delete("query");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }, 350);

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search by payer name or ID..."
        className="pl-9"
        defaultValue={searchParams.get("query") ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
    </div>
  );
}
