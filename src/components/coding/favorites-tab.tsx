"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { CodingFavoriteType } from "@/types/database.types";
import type { CodeItem } from "@/components/coding/coding-browser";

interface FavoriteRow {
  code_type: CodingFavoriteType;
  code: string;
}

const TYPE_LABELS: Record<CodingFavoriteType, string> = {
  icd10: "ICD-10",
  cpt: "CPT",
  hcpcs: "HCPCS",
  modifier: "Modifier",
};

const ENDPOINTS: Record<CodingFavoriteType, string> = {
  icd10: "/api/coding/icd10",
  cpt: "/api/coding/procedures?codeSet=CPT",
  hcpcs: "/api/coding/procedures?codeSet=HCPCS",
  modifier: "/api/coding/modifiers",
};

export function FavoritesTab({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = React.useState<(FavoriteRow & CodeItem)[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const favRes = await fetch("/api/coding/favorites");
        const favorites: FavoriteRow[] = favRes.ok ? await favRes.json() : [];

        const byType = new Map<CodingFavoriteType, string[]>();
        for (const fav of favorites) {
          byType.set(fav.code_type, [...(byType.get(fav.code_type) ?? []), fav.code]);
        }

        const results: (FavoriteRow & CodeItem)[] = [];
        for (const [codeType, codes] of byType.entries()) {
          const res = await fetch(ENDPOINTS[codeType].includes("?") ? `${ENDPOINTS[codeType]}&query=` : `${ENDPOINTS[codeType]}?query=`);
          if (!res.ok) continue;
          const items: CodeItem[] = await res.json();
          for (const item of items) {
            if (codes.includes(item.code)) results.push({ ...item, code_type: codeType, code: item.code });
          }
        }

        if (!cancelled) setRows(results);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No favorites yet"
        description="Star codes in the ICD-10, CPT, HCPCS, or Modifiers tabs to pin them here for quick access."
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {rows.map((row) => (
        <li key={`${row.code_type}-${row.code}`} className="flex items-center gap-3 p-3.5">
          <Star className="h-4 w-4 shrink-0 fill-warning text-warning" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">{row.code}</span>
              <Badge variant="outline" className="text-[10px]">
                {TYPE_LABELS[row.code_type]}
              </Badge>
            </div>
            <p className="truncate text-sm text-muted-foreground">{row.description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
