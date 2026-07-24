"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodingBrowser } from "@/components/coding/coding-browser";
import { FavoritesTab } from "@/components/coding/favorites-tab";
import type { CodingFavoriteType } from "@/types/database.types";

interface FavoriteRow {
  code_type: CodingFavoriteType;
  code: string;
}

export function CodingTabs() {
  const [favoritesByType, setFavoritesByType] = React.useState<Record<CodingFavoriteType, Set<string>>>({
    icd10: new Set(),
    cpt: new Set(),
    hcpcs: new Set(),
    modifier: new Set(),
  });
  const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    fetch("/api/coding/favorites")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: FavoriteRow[]) => {
        const next: Record<CodingFavoriteType, Set<string>> = {
          icd10: new Set(),
          cpt: new Set(),
          hcpcs: new Set(),
          modifier: new Set(),
        };
        for (const row of rows) next[row.code_type].add(row.code);
        setFavoritesByType(next);
      })
      .catch(() => undefined);
  }, []);

  function updateFavorites(type: CodingFavoriteType, next: Set<string>) {
    setFavoritesByType((prev) => ({ ...prev, [type]: next }));
    setRefreshKey((k) => k + 1);
  }

  return (
    <Tabs defaultValue="favorites">
      <TabsList>
        <TabsTrigger value="favorites">My Favorites</TabsTrigger>
        <TabsTrigger value="icd10">ICD-10</TabsTrigger>
        <TabsTrigger value="cpt">CPT</TabsTrigger>
        <TabsTrigger value="hcpcs">HCPCS</TabsTrigger>
        <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
      </TabsList>

      <TabsContent value="favorites">
        <FavoritesTab refreshKey={refreshKey} />
      </TabsContent>
      <TabsContent value="icd10">
        <CodingBrowser
          codeType="icd10"
          endpoint="/api/coding/icd10"
          favorites={favoritesByType.icd10}
          onFavoritesChange={(next) => updateFavorites("icd10", next)}
          placeholder="Search ICD-10 codes or descriptions..."
        />
      </TabsContent>
      <TabsContent value="cpt">
        <CodingBrowser
          codeType="cpt"
          endpoint="/api/coding/procedures?codeSet=CPT"
          favorites={favoritesByType.cpt}
          onFavoritesChange={(next) => updateFavorites("cpt", next)}
          placeholder="Search CPT codes or descriptions..."
        />
      </TabsContent>
      <TabsContent value="hcpcs">
        <CodingBrowser
          codeType="hcpcs"
          endpoint="/api/coding/procedures?codeSet=HCPCS"
          favorites={favoritesByType.hcpcs}
          onFavoritesChange={(next) => updateFavorites("hcpcs", next)}
          placeholder="Search HCPCS codes or descriptions..."
        />
      </TabsContent>
      <TabsContent value="modifiers">
        <CodingBrowser
          codeType="modifier"
          endpoint="/api/coding/modifiers"
          favorites={favoritesByType.modifier}
          onFavoritesChange={(next) => updateFavorites("modifier", next)}
          placeholder="Search modifiers..."
        />
      </TabsContent>
    </Tabs>
  );
}
