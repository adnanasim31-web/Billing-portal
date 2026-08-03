"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function InviteLinkDialog({
  url,
  onOpenChange,
  description,
}: {
  url: string | null;
  onOpenChange: (open: boolean) => void;
  description: string;
}) {
  async function handleCopy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <Dialog open={!!url} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite link</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input readOnly value={url ?? ""} />
          <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
