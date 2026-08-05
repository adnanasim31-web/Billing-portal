"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import type { DocumentCategory } from "@/types/database.types";

export interface PortalDocumentRow {
  id: string;
  fileName: string;
  fileSize: number;
  category: DocumentCategory;
  createdAt: string;
  downloadUrl: string;
}

const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  insurance_card: "Insurance card",
  identification: "Identification",
  consent_form: "Consent form",
  medical_record: "Medical record",
  referral: "Referral",
  other: "Other",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalDocuments({ documents }: { documents: PortalDocumentRow[] }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [category, setCategory] = React.useState<DocumentCategory>("insurance_card");
  const [isUploading, setIsUploading] = React.useState(false);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const urlRes = await fetch("/api/portal/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      const urlData = await urlRes.json().catch(() => ({}));
      if (!urlRes.ok) {
        toast.error(urlData.error ?? "Unable to start upload");
        return;
      }

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("patient-documents")
        .uploadToSignedUrl(urlData.path, urlData.token, file);

      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const recordRes = await fetch("/api/portal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: urlData.path,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
          category,
        }),
      });
      const recordData = await recordRes.json().catch(() => ({}));
      if (!recordRes.ok) {
        toast.error(recordData.error ?? "Upload succeeded but saving the record failed");
        return;
      }

      toast.success("Document uploaded");
      router.refresh();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload document
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Documents shared by your provider's billing office, and anything you upload yourself (like an insurance card), will appear here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[doc.category]} · {formatBytes(doc.fileSize)} ·{" "}
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
