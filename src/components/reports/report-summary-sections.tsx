import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { Inbox } from "lucide-react";
import { CLAIM_STATUS_LABELS } from "@/components/claims/claims-table";
import { DENIAL_CATEGORY_LABELS } from "@/components/denials/denials-table";
import type {
  ClaimsStatusSummary,
  CollectionsSummary,
  ProviderProductionEntry,
  DenialCategorySummary,
} from "@/lib/services/report-aggregation";
import type { ClaimStatus, DenialCategory } from "@/types/database.types";

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function ExportButton({ type, from, to }: { type: string; from: string; to: string }) {
  return (
    <Button size="sm" variant="outline" asChild>
      <a href={`/api/reports/export?type=${type}&from=${from}&to=${to}`} download>
        <Download className="h-4 w-4" />
        Export CSV
      </a>
    </Button>
  );
}

export function ClaimsStatusSection({
  summary,
  from,
  to,
}: {
  summary: ClaimsStatusSummary;
  from: string;
  to: string;
}) {
  const entries = Object.entries(summary) as [ClaimStatus, { count: number; totalCharge: number }][];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Claims by status</CardTitle>
        <ExportButton type="status" from={from} to={to} />
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Inbox} title="No claims in this date range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Total charge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([status, entry]) => (
                <TableRow key={status}>
                  <TableCell>{CLAIM_STATUS_LABELS[status]}</TableCell>
                  <TableCell>{entry.count}</TableCell>
                  <TableCell>{formatCurrency(entry.totalCharge)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function CollectionsSection({
  summary,
  from,
  to,
}: {
  summary: CollectionsSummary;
  from: string;
  to: string;
}) {
  const stats = [
    { label: "Total charge", value: formatCurrency(summary.totalCharge) },
    { label: "Total paid", value: formatCurrency(summary.totalPaid) },
    { label: "Total adjustment", value: formatCurrency(summary.totalAdjustment) },
    { label: "Outstanding balance", value: formatCurrency(summary.totalBalance) },
    { label: "Collection rate", value: `${(summary.collectionRate * 100).toFixed(1)}%` },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Collections summary</CardTitle>
        <ExportButton type="collections" from={from} to={to} />
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ProviderProductionSection({
  entries,
  from,
  to,
}: {
  entries: ProviderProductionEntry[];
  from: string;
  to: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Provider production</CardTitle>
        <ExportButton type="providers" from={from} to={to} />
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Inbox} title="No claims in this date range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Claims</TableHead>
                <TableHead>Total charge</TableHead>
                <TableHead>Total paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.providerId}>
                  <TableCell>{entry.providerName}</TableCell>
                  <TableCell>{entry.claimCount}</TableCell>
                  <TableCell>{formatCurrency(entry.totalCharge)}</TableCell>
                  <TableCell>{formatCurrency(entry.totalPaid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function DenialCategorySection({
  summary,
  denialRate,
  from,
  to,
}: {
  summary: DenialCategorySummary;
  denialRate: number;
  from: string;
  to: string;
}) {
  const entries = Object.entries(summary) as [DenialCategory, number][];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          Denials by category <span className="text-sm font-normal text-muted-foreground">({(denialRate * 100).toFixed(1)}% denial rate)</span>
        </CardTitle>
        <ExportButton type="denials" from={from} to={to} />
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState icon={Inbox} title="No denials opened in this date range" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Denials</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([category, count]) => (
                <TableRow key={category}>
                  <TableCell>{DENIAL_CATEGORY_LABELS[category]}</TableCell>
                  <TableCell>{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
