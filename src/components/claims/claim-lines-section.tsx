"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";
import { EmptyState } from "@/components/shared/empty-state";

export interface ClaimLineRow {
  id: string;
  lineNumber: number;
  procedureCode: string;
  description: string;
  modifier1: string | null;
  modifier2: string | null;
  diagnosisPointers: number[];
  units: number;
  chargeAmount: number;
  paidAmount: number;
  adjustmentAmount: number;
}

async function fetchProcedureCodes(query: string): Promise<ComboboxOption[]> {
  const res = await fetch(`/api/coding/procedures?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data: { code: string; description: string }[] = await res.json();
  return data.map((c) => ({ value: c.code, label: c.code, sublabel: c.description }));
}

function formatCurrency(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function ClaimLinesSection({
  claimId,
  lines,
  diagnosisSequences,
  canEdit,
}: {
  claimId: string;
  lines: ClaimLineRow[];
  diagnosisSequences: number[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [procedureCode, setProcedureCode] = React.useState("");
  const [modifier1, setModifier1] = React.useState("");
  const [modifier2, setModifier2] = React.useState("");
  const [pointers, setPointers] = React.useState<number[]>([]);
  const [units, setUnits] = React.useState("1");
  const [chargeAmount, setChargeAmount] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const nextLineNumber = (lines.reduce((max, l) => Math.max(max, l.lineNumber), 0) || 0) + 1;

  function togglePointer(sequence: number) {
    setPointers((prev) => (prev.includes(sequence) ? prev.filter((p) => p !== sequence) : [...prev, sequence]));
  }

  function resetForm() {
    setProcedureCode("");
    setModifier1("");
    setModifier2("");
    setPointers([]);
    setUnits("1");
    setChargeAmount("");
  }

  async function handleAdd() {
    if (!procedureCode || pointers.length === 0 || !chargeAmount) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineNumber: nextLineNumber,
          procedureCode,
          modifier1,
          modifier2,
          diagnosisPointers: pointers,
          units: Number(units) || 1,
          chargeAmount: Number(chargeAmount) || 0,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add procedure line");
        return;
      }
      toast.success("Procedure line added");
      setIsOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(lineId: string) {
    const res = await fetch(`/api/claims/${claimId}/lines/${lineId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Unable to remove procedure line");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Procedure lines</CardTitle>
        {canEdit && diagnosisSequences.length > 0 && (
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add procedure line #{nextLineNumber}</DialogTitle>
                <DialogDescription>Search the CPT/HCPCS library and link it to at least one diagnosis.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Procedure code</Label>
                  <SearchCombobox
                    value={procedureCode}
                    onChange={setProcedureCode}
                    fetchOptions={fetchProcedureCodes}
                    placeholder="Search CPT/HCPCS codes..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Modifier 1 (optional)</Label>
                    <Input value={modifier1} onChange={(e) => setModifier1(e.target.value.toUpperCase())} maxLength={2} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modifier 2 (optional)</Label>
                    <Input value={modifier2} onChange={(e) => setModifier2(e.target.value.toUpperCase())} maxLength={2} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Linked diagnoses</Label>
                  <div className="flex flex-wrap gap-3">
                    {diagnosisSequences.map((sequence) => (
                      <label key={sequence} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={pointers.includes(sequence)} onCheckedChange={() => togglePointer(sequence)} />
                        #{sequence}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Units</Label>
                    <Input type="number" min={1} value={units} onChange={(e) => setUnits(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Charge amount</Label>
                    <Input type="number" min={0} step="0.01" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={!procedureCode || pointers.length === 0 || !chargeAmount || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add line
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No procedure lines yet"
            description={
              diagnosisSequences.length === 0
                ? "Add a diagnosis first, then attach procedure lines."
                : "Add a CPT/HCPCS procedure line."
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                    {line.lineNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      {line.procedureCode}
                      {line.modifier1 ? `-${line.modifier1}` : ""}
                      {line.modifier2 ? `-${line.modifier2}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.description} · Dx {line.diagnosisPointers.map((p) => `#${p}`).join(", ")} · {line.units}{" "}
                      unit{line.units === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(line.chargeAmount)}</p>
                    {(line.paidAmount > 0 || line.adjustmentAmount > 0) && (
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(line.paidAmount)} paid ·{" "}
                        {formatCurrency(line.chargeAmount - line.paidAmount - line.adjustmentAmount)} balance
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemove(line.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
