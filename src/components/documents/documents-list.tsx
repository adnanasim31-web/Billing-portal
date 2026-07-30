"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileStack, Loader2, RefreshCw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/documents";
import type { OrgDocumentCategory } from "@/types/database.types";

export const DOCUMENT_CATEGORY_LABELS: Record<OrgDocumentCategory, string> = {
  contract: "Contract",
  policy: "Policy",
  payer_agreement: "Payer agreement",
  compliance: "Compliance",
  provider_credential: "Provider credential",
  other: "Other",
};

export interface DocumentRow {
  id: string;
  fileName: string;
  fileSize: number;
  category: OrgDocumentCategory;
  version: number;
  uploadedByName: string;
  createdAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadFile(file: File, category: string): Promise<{ path: string } | null> {
  const urlRes = await fetch("/api/documents/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, category }),
  });
  const urlData = await urlRes.json().catch(() => ({}));
  if (!urlRes.ok) {
    toast.error(urlData.error ?? "Unable to start upload");
    return null;
  }

  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from("organization-documents")
    .uploadToSignedUrl(urlData.path, urlData.token, file);
  if (uploadError) {
    toast.error(uploadError.message);
    return null;
  }

  return { path: urlData.path };
}

export function DocumentsList({ documents, canManage }: { documents: DocumentRow[]; canManage: boolean }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const versionInputRef = React.useRef<HTMLInputElement>(null);
  const [category, setCategory] = React.useState<OrgDocumentCategory>("other");
  const [isUploading, setIsUploading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [versioningId, setVersioningId] = React.useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadFile(file, category);
      if (!uploaded) return;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: uploaded.path,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          category,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to save document");
        return;
      }
      toast.success("Document uploaded");
      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  async function handleNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const documentId = versioningId;
    e.target.value = "";
    setVersioningId(null);
    if (!file || !documentId) return;

    setBusyId(documentId);
    try {
      const uploaded = await uploadFile(file, "other");
      if (!uploaded) return;

      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: uploaded.path,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to upload new version");
        return;
      }
      toast.success("New version uploaded");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDownload(documentId: string) {
    setBusyId(documentId);
    try {
      const res = await fetch(`/api/documents/${documentId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to download document");
        return;
      }
      window.open(data.signedUrl, "_blank");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(documentId: string) {
    setBusyId(documentId);
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Unable to delete document");
        return;
      }
      toast.success("Document deleted");
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={category} onValueChange={(value) => setCategory(value as OrgDocumentCategory)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {DOCUMENT_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
          <input ref={versionInputRef} type="file" className="hidden" onChange={handleNewVersion} />
          <Button size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload document
          </Button>
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileStack}
          title="No documents yet"
          description="Upload contracts, policies, and payer agreements to keep them in one place."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium">
                  {doc.fileName}
                  {doc.version > 1 && <span className="ml-1.5 text-xs text-muted-foreground">v{doc.version}</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {DOCUMENT_CATEGORY_LABELS[doc.category]} · {formatBytes(doc.fileSize)} · {doc.uploadedByName} ·{" "}
                  {new Date(doc.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={busyId === doc.id} onClick={() => handleDownload(doc.id)}>
                  <Download className="h-4 w-4" />
                </Button>
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === doc.id}
                      onClick={() => {
                        setVersioningId(doc.id);
                        versionInputRef.current?.click();
                      }}
                      title="Upload new version"
                    >
                      {busyId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" disabled={busyId === doc.id} onClick={() => handleDelete(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
