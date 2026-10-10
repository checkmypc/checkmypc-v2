import { FileDown, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { InspectionReport } from "@/lib/used";

export function ReportPdfButton({
  report,
  variant = "secondary",
  size = "sm",
  label = "Download PDF",
}: {
  report: InspectionReport;
  variant?: "default" | "secondary" | "outline" | "ghost" | "soft";
  size?: "default" | "sm" | "lg";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const { downloadInspectionPdf } = await import("@/lib/report-pdf");
      const { filename } = await downloadInspectionPdf(report);
      toast.success(`Saved ${filename}`);
    } catch {
      toast.error("Could not generate the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={busy}
      onClick={() => void onClick()}
      data-testid="download-inspection-pdf"
    >
      {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      {busy ? "Generating…" : label}
    </Button>
  );
}
