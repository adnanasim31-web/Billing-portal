"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { credentialSchema, CREDENTIAL_TYPES, CREDENTIAL_STATUSES, type CredentialInput } from "@/lib/validations/credentialing";
import {
  CREDENTIAL_TYPE_LABELS,
  CREDENTIAL_STATUS_LABELS,
  CREDENTIAL_STATUS_VARIANT,
} from "@/components/credentialing/credentialing-table";
import { isExpired, isExpiringSoon } from "@/lib/services/credentialing-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";
import type { CredentialStatus, CredentialType } from "@/types/database.types";

export interface ProviderCredentialRow {
  id: string;
  credentialType: CredentialType;
  credentialNumber: string | null;
  issuingAuthority: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: CredentialStatus;
  notes: string | null;
}

const EMPTY_DEFAULTS: CredentialInput = {
  credentialType: "state_license",
  credentialNumber: "",
  issuingAuthority: "",
  issueDate: "",
  expirationDate: "",
  status: "active",
  notes: "",
};

function ExpirationBadge({ expirationDate }: { expirationDate: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  if (isExpired(expirationDate, today)) return <Badge variant="destructive">Expired</Badge>;
  if (isExpiringSoon(expirationDate, today)) return <Badge variant="warning">Expiring soon</Badge>;
  return null;
}

export function ProviderCredentialingTab({
  providerId,
  credentials,
  canManage,
}: {
  providerId: string;
  credentials: ProviderCredentialRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const form = useForm<CredentialInput>({
    resolver: zodResolver(credentialSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  function openAddDialog() {
    setEditingId(null);
    form.reset(EMPTY_DEFAULTS);
    setIsOpen(true);
  }

  function openEditDialog(credential: ProviderCredentialRow) {
    setEditingId(credential.id);
    form.reset({
      credentialType: credential.credentialType,
      credentialNumber: credential.credentialNumber ?? "",
      issuingAuthority: credential.issuingAuthority ?? "",
      issueDate: credential.issueDate ?? "",
      expirationDate: credential.expirationDate ?? "",
      status: credential.status,
      notes: credential.notes ?? "",
    });
    setIsOpen(true);
  }

  async function onSubmit(values: CredentialInput) {
    setIsSubmitting(true);
    try {
      const url = editingId
        ? `/api/providers/${providerId}/credentials/${editingId}`
        : `/api/providers/${providerId}/credentials`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save credential");
        return;
      }
      toast.success(editingId ? "Credential updated" : "Credential added");
      setIsOpen(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(credentialId: string) {
    setDeletingId(credentialId);
    try {
      const res = await fetch(`/api/providers/${providerId}/credentials/${credentialId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to remove credential");
        return;
      }
      toast.success("Credential removed");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Credentialing</CardTitle>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4" />
                Add credential
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit credential" : "Add credential"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="credentialType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credential type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CREDENTIAL_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {CREDENTIAL_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="credentialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="issuingAuthority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issuing authority (optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. State of New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="issueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue date (optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiration date (optional)</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CREDENTIAL_STATUSES.map((status) => (
                              <SelectItem key={status} value={status}>
                                {CREDENTIAL_STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (optional)</FormLabel>
                        <FormControl>
                          <textarea
                            rows={3}
                            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-soft placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {editingId ? "Save changes" : "Add credential"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {credentials.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No credentialing records yet"
            description="Add a license, DEA registration, or malpractice insurance record."
          />
        ) : (
          <ul className="divide-y divide-border">
            {credentials.map((credential) => (
              <li key={credential.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{CREDENTIAL_TYPE_LABELS[credential.credentialType]}</p>
                    <Badge variant={CREDENTIAL_STATUS_VARIANT[credential.status]}>
                      {CREDENTIAL_STATUS_LABELS[credential.status]}
                    </Badge>
                    <ExpirationBadge expirationDate={credential.expirationDate} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {[credential.credentialNumber, credential.issuingAuthority].filter(Boolean).join(" · ") || "—"}
                    {credential.expirationDate
                      ? ` · Expires ${new Date(`${credential.expirationDate}T00:00:00`).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(credential)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={deletingId === credential.id}
                      onClick={() => handleDelete(credential.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
