import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadMediaFn } from "@/lib/api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

export function ImageUpload({
  onUploaded,
  label = "Add photo",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      toast.error("Use JPEG, PNG or WebP");
      return;
    }
    if (file.size > 4_500_000) {
      toast.error("Max 4.5 MB per photo");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readDataUrl(file);
      const saved = await uploadMediaFn({
        data: {
          filename: file.name,
          contentType: file.type as (typeof ALLOWED)[number],
          dataBase64: dataUrl,
        },
      });
      onUploaded(saved.url);
      toast.success("Photo added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button asChild variant="secondary" size="sm" disabled={busy}>
      <label className={busy ? "pointer-events-none opacity-60" : "cursor-pointer"}>
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
      </label>
    </Button>
  );
}

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
