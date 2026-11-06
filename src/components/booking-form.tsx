import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookingDateTimePicker } from "@/components/ui/booking-date-time-picker";
import { SelectInput } from "@/components/ui/select-input";
import { Textarea } from "@/components/ui/textarea";
import { whatsappHref } from "@/lib/bookings";
import { ingestPublicBooking } from "@/lib/ops";
import { useI18n } from "@/lib/i18n";
import { CITIES, type Package } from "@/lib/services";
import type { ServiceKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export function BookingForm({
  kind,
  packages,
  extra,
  twoStep = false,
  packageId,
  onPackageChange,
}: {
  kind: ServiceKind;
  packages?: Package[];
  extra?: "listing" | "machine";
  twoStep?: boolean;
  packageId?: string;
  onPackageChange?: (packageId: string) => void;
}) {
  const { t } = useI18n();
  const [sent, setSent] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const packageId = String(fd.get("package") || packages?.[0]?.id || "");
    setBusy(true);
    try {
      const booking = await ingestPublicBooking({
        kind,
        name: String(fd.get("name") || ""),
        phone: String(fd.get("phone") || ""),
        email: String(fd.get("email") || "") || undefined,
        city: String(fd.get("city") || ""),
        packageId,
        notes: String(fd.get("notes") || ""),
        listingUrl: String(fd.get("listing") || ""),
        machineType: String(fd.get("machine") || ""),
        preferredDate: String(fd.get("preferredDate") || "") || undefined,
        preferredTime: String(fd.get("preferredTime") || "") || undefined,
        status: "new",
      });
      const text = [
        `CHECKMYPC — ${kind}`,
        `${booking.name} · ${booking.city}`,
        booking.packageId,
        booking.listingUrl,
        booking.notes,
      ]
        .filter(Boolean)
        .join("\n");
      setWa(whatsappHref(booking.phone, text));
      setSent(booking.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the request. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function continueToDetails() {
    const form = formRef.current;
    if (!form) return;
    const missingField = ["name", "phone"]
      .map((id) => form.elements.namedItem(id))
      .find((field): field is HTMLInputElement => field instanceof HTMLInputElement && !field.checkValidity());
    if (missingField) {
      missingField.reportValidity();
      return;
    }
    setStep(2);
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-surface p-6 shadow-[var(--shadow-border)]">
        <p className="font-display text-lg font-semibold">{t("book.sent")}</p>
        <p className="mt-1 text-sm text-muted">Ref {sent}</p>
        {wa && (
          <Button asChild className="mt-4">
            <a href={wa} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className={cn(
        "booking-form grid gap-4 rounded-xl bg-surface p-5 shadow-[var(--shadow-border)] sm:grid-cols-2",
        twoStep && "booking-form-two-step",
      )}
      data-mobile-step={step}
    >
      {twoStep && (
        <div className="booking-form-progress sm:col-span-2" aria-live="polite">
          <div className="booking-form-progress-copy">
            <span>{t("book.step")} {step} / 2</span>
            <span>{step === 1 ? t("book.stepContact") : t("book.stepDetails")}</span>
          </div>
          <div
            className="booking-form-progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={2}
            aria-valuenow={step}
            aria-label={`${t("book.step")} ${step} / 2`}
          >
            <span className={step === 2 ? "is-complete" : ""} />
          </div>
        </div>
      )}
      <div className={cn("booking-form-step", twoStep && "sm:col-span-2")} data-booking-step="1">
        <div>
          <Label htmlFor="name">{t("book.name")}</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="phone">{t("book.phone")}</Label>
          <Input id="phone" name="phone" required inputMode="tel" placeholder="06…" />
        </div>
        {!twoStep && (
          <div>
            <Label htmlFor="email">{t("book.emailOptional")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
        )}
        <div>
          <Label htmlFor="city">{t("book.city")}</Label>
          <SelectInput
            id="city"
            name="city"
            className="flex h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-border)]"
            defaultValue={CITIES[0]}
          >
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
            <option>Other (quote travel)</option>
          </SelectInput>
        </div>
      </div>
      <div className={cn("booking-form-step", twoStep && "sm:col-span-2")} data-booking-step="2">
        {twoStep && (
          <div>
            <Label htmlFor="email">{t("book.emailOptional")}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </div>
        )}
        {packages && (
          <div>
            <Label htmlFor="package">{t("book.package")}</Label>
            <SelectInput
              id="package"
              name="package"
              className="flex h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-border)]"
              value={packageId}
              defaultValue={packages[0]?.id}
              onChange={(event) => onPackageChange?.(event.target.value)}
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} DH
                </option>
              ))}
            </SelectInput>
          </div>
        )}
        {extra === "machine" && (
          <div>
            <Label htmlFor="machine">{t("book.machine")}</Label>
            <SelectInput
              id="machine"
              name="machine"
              className="flex h-11 w-full rounded-md bg-bg px-3 text-sm shadow-[var(--shadow-border)]"
            >
              <option value="desktop">{t("book.desktop")}</option>
              <option value="laptop">{t("book.laptop")}</option>
            </SelectInput>
          </div>
        )}
        {extra === "listing" && (
          <div className="sm:col-span-2">
            <Label htmlFor="listing">{t("book.listing")}</Label>
            <Input id="listing" name="listing" placeholder="https://" />
          </div>
        )}
        <div>
          <Label htmlFor="preferredDate">{t("book.preferredDate")}</Label>
          <BookingDateTimePicker
            id="preferredDate"
            name="preferredDate"
            kind="date"
            value={preferredDate}
            onValueChange={setPreferredDate}
          />
        </div>
        <div>
          <Label htmlFor="preferredTime">{t("book.preferredTime")}</Label>
          <BookingDateTimePicker
            id="preferredTime"
            name="preferredTime"
            kind="time"
            value={preferredTime}
            onValueChange={setPreferredTime}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">{t("book.notes")}</Label>
          <Textarea id="notes" name="notes" />
        </div>
      </div>
      {twoStep && (
        <div className="booking-form-step-actions sm:col-span-2">
          {step === 2 && (
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              {t("book.back")}
            </Button>
          )}
          {step === 1 && (
            <Button type="button" onClick={continueToDetails}>
              {t("book.continue")}
            </Button>
          )}
        </div>
      )}
      <div className={cn("sm:col-span-2", twoStep && "booking-form-submit")}>
        <Button type="submit" disabled={busy}>
          {busy ? "Sending…" : t("book.submit")}
        </Button>
        <p className="mt-2 text-xs text-muted">{t("est")} · Casablanca / Rabat / Agadir</p>
      </div>
    </form>
  );
}
