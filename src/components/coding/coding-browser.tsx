"use client";

import * as React from "react";
import { Search, Star } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";
import type { CodingFavoriteType } from "@/types/database.types";

export interface CodeItem {
  code: string;
  description: string;
  category?: string;
}

interface CodingBrowserProps {
  codeType: CodingFavoriteType;
  endpoint: string;
  favorites: Set<string>;
  onFavoritesChange: (favorites: Set<string>) => void;
  placeholder: string;
}

export function CodingBrowser({ codeType, endpoint, favorites, onFavoritesChange, placeholder }: CodingBrowserProps) {
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<CodeItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [pendingCode, setPendingCode] = React.useState<string | null>(null);

  const runSearch = useDebouncedCallback(async (term: string) => {
    setIsLoading(true);
    try {
      const separator = endpoint.includes("?") ? "&" : "?";
      const res = await fetch(`${endpoint}${separator}query=${encodeURIComponent(term)}`);
      if (res.ok) setItems(await res.json());
    } finally {
      setIsLoading(false);
    }
  }, 300);

  React.useEffect(() => {
    runSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  async function toggleFavorite(code: string) {
    setPendingCode(code);
    const isFavorited = favorites.has(code);
    try {
      const res = await fetch("/api/coding/favorites", {
        method: isFavorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeType, code }),
      });
      if (!res.ok) {
        toast.error("Unable to update favorites");
        return;
      }
      const next = new Set(favorites);
      if (isFavorited) next.delete(code);
      else next.add(code);
      onFavoritesChange(next);
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            runSearch(e.target.value);
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={Search} title="No codes found" description="Try a different search term." />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {items.map((item) => (
            <li key={item.code} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold">{item.code}</span>
                  {item.category && (
                    <Badge variant="outline" className="text-[10px]">
                      {item.category}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={pendingCode === item.code}
                onClick={() => toggleFavorite(item.code)}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    favorites.has(item.code) ? "fill-warning text-warning" : "text-muted-foreground"
                  )}
                />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
