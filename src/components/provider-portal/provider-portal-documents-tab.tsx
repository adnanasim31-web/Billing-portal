"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export interface ProviderPortalDocumentRow {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProviderPortalDocumentsTab({ documents }: { documents: ProviderPortalDocumentRow[] }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    try {
      const urlRes = await fetch("/api/provider/documents/upload-url", {
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
        .from("organization-documents")
        .uploadToSignedUrl(urlData.path, urlData.token, file);
      if (uploadError) {
        toast.error(uploadError.message);
        return;
      }

      const recordRes = await fetch("/api/provider/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          filePath: urlData.path,
          fileSize: file.size,
          mimeType: file.type || "application/octet-stream",
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

  async function handleDelete(documentId: string) {
    setDeletingId(documentId);
    try {
      const res = await fetch(`/api/provider/documents/${documentId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Unable to delete document");
        return;
      }
      toast.success("Document deleted");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
          description="Upload your license, DEA registration, malpractice insurance, or other credentialing documents so the billing office has them on file."
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
                    {formatBytes(doc.fileSize)} · {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
                  <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={deletingId === doc.id}
                  onClick={() => handleDelete(doc.id)}
                >
                  {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
