"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PortalReceiptPrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
      <Download className="h-4 w-4" />
      Download / print
    </Button>
  );
}
