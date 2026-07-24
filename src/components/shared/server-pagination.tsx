"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServerPaginationProps {
  page: number;
  pageSize: number;
  total: number;
}

/** Prev/Next pager that mutates the `page` URL param, for server-fetched pages. */
export function ServerPagination({ page, pageSize, total }: ServerPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (pageCount <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Page {page} of {pageCount} - {total} total
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => goToPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={() => goToPage(page + 1)} disabled={page >= pageCount}>
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
