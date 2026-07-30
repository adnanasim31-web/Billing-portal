"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { SearchCombobox, type ComboboxOption } from "@/components/shared/search-combobox";
import { EmptyState } from "@/components/shared/empty-state";
import { Stethoscope } from "lucide-react";

export interface ClaimDiagnosisRow {
  id: string;
  sequence: number;
  icd10Code: string;
  description: string;
}

async function fetchIcd10Codes(query: string): Promise<ComboboxOption[]> {
  const res = await fetch(`/api/coding/icd10?query=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  const data: { code: string; description: string }[] = await res.json();
  return data.map((c) => ({ value: c.code, label: c.code, sublabel: c.description }));
}

export function ClaimDiagnosesSection({
  claimId,
  diagnoses,
  canEdit,
}: {
  claimId: string;
  diagnoses: ClaimDiagnosisRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [icd10Code, setIcd10Code] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const usedSequences = new Set(diagnoses.map((d) => d.sequence));
  const nextSequence = Array.from({ length: 12 }, (_, i) => i + 1).find((n) => !usedSequences.has(n));

  async function handleAdd() {
    if (!icd10Code || !nextSequence) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/claims/${claimId}/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequence: nextSequence, icd10Code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to add diagnosis");
        return;
      }
      toast.success("Diagnosis added");
      setIsOpen(false);
      setIcd10Code("");
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemove(diagnosisId: string) {
    const res = await fetch(`/api/claims/${claimId}/diagnoses/${diagnosisId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Unable to remove diagnosis");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Diagnoses</CardTitle>
        {canEdit && nextSequence && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add diagnosis
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add diagnosis #{nextSequence}</DialogTitle>
                <DialogDescription>Search the ICD-10 library for the diagnosis code.</DialogDescription>
              </DialogHeader>
              <SearchCombobox value={icd10Code} onChange={setIcd10Code} fetchOptions={fetchIcd10Codes} placeholder="Search ICD-10 codes..." />
              <DialogFooter>
                <Button onClick={handleAdd} disabled={!icd10Code || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add diagnosis
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {diagnoses.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No diagnoses yet" description="Add at least one ICD-10 diagnosis." />
        ) : (
          <ul className="divide-y divide-border">
            {diagnoses.map((dx) => (
              <li key={dx.id} className="flex items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-medium">
                    {dx.sequence}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{dx.icd10Code}</p>
                    <p className="text-xs text-muted-foreground">{dx.description}</p>
                  </div>
                </div>
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(dx.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
