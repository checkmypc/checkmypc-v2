import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadMediaFn } from "@/lib/api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"] as const;

export function ImageUpload({
  onUploaded,
  label = "Add photo",
  multiple = false,
  maxFiles,
}: {
  onUploaded: (url: string) => void;
  label?: string;
  multiple?: boolean;
  maxFiles?: number;
}) {
  const [busy, setBusy] = useState(false);

  async function uploadFile(file: File) {
    if (!ALLOWED.includes(file.type as (typeof ALLOWED)[number])) {
      throw new Error("Use JPEG, PNG or WebP");
    }
    if (file.size > 4_500_000) {
      throw new Error(`${file.name}: max 4.5 MB per photo`);
    }
    const dataUrl = await readDataUrl(file);
    const saved = await uploadMediaFn({
      data: {
        filename: file.name,
        contentType: file.type as (typeof ALLOWED)[number],
        dataBase64: dataUrl,
      },
    });
    onUploaded(saved.url);
  }

  async function onFiles(files: File[]) {
    if (!files.length) return;
    if (maxFiles !== undefined && files.length > maxFiles) {
      toast.error(`Select no more than ${maxFiles} ${maxFiles === 1 ? "image" : "images"}`);
      return;
    }
    setBusy(true);
    let uploaded = 0;
    for (const file of files) {
      try {
        await uploadFile(file);
        uploaded += 1;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}`);
      }
    }
    if (uploaded === 1) toast.success("Photo added");
    else if (uploaded > 1) toast.success(`${uploaded} photos added`);
    setBusy(false);
  }

  return (
    <Button asChild variant="secondary" size="sm" disabled={busy}>
      <label className={busy ? "pointer-events-none opacity-60" : "cursor-pointer"}>
        {busy ? "Uploading…" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            void onFiles(files);
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
