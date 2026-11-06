import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BadgeAlert,
  Check,
  ChevronDown,
  CircuitBoard,
  Cpu,
  Fan,
  HardDrive,
  PlugZap,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BookingForm } from "@/components/booking-form";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SAMPLE_REPORT } from "@/lib/used";
import { INSPECTION, livePackages } from "@/lib/services";
import { useOps } from "@/lib/ops";
import { dh } from "@/lib/utils";

export const Route = createFileRoute("/inspection")({ component: InspectionPage });

const CHECKLIST_GROUPS: { title: string; icon: LucideIcon; checks: number[] }[] = [
  { title: "inspection.groupCpuGpu", icon: Cpu, checks: [0, 1] },
  { title: "inspection.groupMemoryStorage", icon: HardDrive, checks: [2, 3] },
  { title: "inspection.groupBoardPsu", icon: CircuitBoard, checks: [4, 5] },
  { title: "inspection.groupCoolingPhysical", icon: Fan, checks: [6, 7] },
  { title: "inspection.groupConnectivityValue", icon: PlugZap, checks: [8, 9] },
];

function InspectionPage() {
  const { t } = useI18n();
  const livePackagePrices = useOps((s) => s.packagePrices);
  const packages = livePackages(INSPECTION.packages);
  const defaultPackage = packages.find((pkg) => pkg.id === "inspect-standard")?.id ?? packages[0]?.id ?? "";
  const [selectedPackage, setSelectedPackage] = useState(defaultPackage);
  const [showStickyBook, setShowStickyBook] = useState(true);
  const bookingSection = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = bookingSection.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBook(!entry.isIntersecting),
      { threshold: 0.08 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function scrollToBooking(packageId?: string) {
    if (packageId) setSelectedPackage(packageId);
    bookingSection.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }

  const storageResult = SAMPLE_REPORT.hardware.find(([part]) => part === "Storage");
  const storageHealth = storageResult?.[2].match(/SMART\s+(\d+%)/i)?.[1] ?? "—";
  const verifiedParts = SAMPLE_REPORT.hardware.filter(([, , result]) =>
    /match|serial|stable|smart/i.test(result),
  ).length;

  return (
    <main className="inspection-page">
      <section className="inspection-hero">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <p className="inspection-eyebrow">{t("nav.inspection")}</p>
          <h1 className="inspection-title">{t("svc.inspect")}</h1>
          <p className="inspection-intro">{t("svc.inspectDesc")}</p>
        </div>
      </section>

      <div className="inspection-layout mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-7 lg:py-9">
        <section
          ref={bookingSection}
          id="inspection-booking"
          className="inspection-booking scroll-mt-24"
          aria-labelledby="inspection-booking-title"
        >
          <div className="inspection-booking-heading">
            <div>
              <p className="inspection-eyebrow">{t("inspection.bookingEyebrow")}</p>
              <h2 id="inspection-booking-title">{t("nav.book")}</h2>
            </div>
            <span className="inspection-booking-step-note">
              {t("inspection.bookingSecure")}
            </span>
          </div>
          <BookingForm
            kind="inspection"
            packages={packages}
            extra="listing"
            twoStep
            packageId={selectedPackage}
            onPackageChange={setSelectedPackage}
          />
        </section>

        <div className="inspection-details">
          <section className="inspection-verdicts" aria-label={t("inspection.verdictTitle")}>
            {INSPECTION.verdicts.map((verdict) => {
              const isBuy = verdict.id === "BUY";
              const isDont = verdict.id === "DONT";
              const Icon = isBuy ? ShieldCheck : isDont ? BadgeAlert : Check;
              return (
                <article
                  key={verdict.id}
                  className="inspection-verdict-card"
                  data-verdict={verdict.id}
                >
                  <span className="inspection-verdict-icon">
                    <Icon aria-hidden="true" />
                  </span>
                  <h2>{verdict.label === "DONT" ? t("inspection.dontBuy") : verdict.label}</h2>
                  <p>{t(`inspection.verdict.${verdict.id}`)}</p>
                </article>
              );
            })}
          </section>

          <section className="inspection-section">
            <div className="inspection-section-heading">
              <div>
                <p className="inspection-eyebrow">{t("inspection.methodEyebrow")}</p>
                <h2>{t("inspection.checklistTitle")}</h2>
              </div>
              <span className="inspection-count">{INSPECTION.checklist.length} {t("inspection.checks")}</span>
            </div>
            <div className="inspection-checklist">
              {CHECKLIST_GROUPS.map(({ title, icon: Icon, checks }, index) => (
                <details key={title} className="inspection-check-group" open={index === 0}>
                  <summary>
                    <span className="inspection-group-icon"><Icon aria-hidden="true" /></span>
                    <span className="inspection-group-title">{t(title)}</span>
                    <span className="inspection-group-count">{checks.length}</span>
                    <ChevronDown className="inspection-group-chevron" aria-hidden="true" />
                  </summary>
                  <ul>
                    {checks.map((check) => (
                      <li key={INSPECTION.checklist[check]}>
                        <Check aria-hidden="true" />
                        <span>{INSPECTION.checklist[check]}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section className="inspection-section">
            <div className="inspection-section-heading">
              <div>
                <p className="inspection-eyebrow">{t("inspection.clearPricing")}</p>
                <h2>{t("inspection.packagesTitle")}</h2>
              </div>
            </div>
            <div className="inspection-offers">
              {packages.map((pkg, index) => (
                <article key={pkg.id} className="inspection-offer-card">
                  <div className="inspection-offer-topline">
                    <span className="inspection-offer-index">0{index + 1}</span>
                    <span className="inspection-offer-duration">{pkg.duration}</span>
                  </div>
                  <h3>{pkg.name}</h3>
                  <p className="inspection-offer-description">
                    {t(index === 0 ? "inspection.standardSummary" : "inspection.benchSummary")}
                  </p>
                  <p className="inspection-offer-price">
                    <strong>{dh(livePackagePrices[pkg.id] ?? pkg.price)}</strong>
                    <span>DH</span>
                  </p>
                  <ul>
                    {pkg.includes.slice(0, 4).map((feature) => (
                      <li key={feature}>
                        <Check aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`inspection-offer-cta ${
                      selectedPackage === pkg.id
                        ? "border-[#007BFF] bg-[#007BFF] text-white hover:border-[#007BFF] hover:bg-[#007BFF]"
                        : "border-gray-300 bg-white text-[#1d1d1f] hover:border-gray-400 hover:bg-white"
                    }`}
                    variant="outline"
                    aria-pressed={selectedPackage === pkg.id}
                    onClick={() => scrollToBooking(pkg.id)}
                  >
                    {t("inspection.choosePackage")}
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="inspection-report-card">
            <div className="inspection-report-header">
              <div>
                <p className="inspection-eyebrow">{t("inspection.sampleEyebrow")}</p>
                <h2>{t("inspection.sampleTitle")}</h2>
              </div>
              <span className="inspection-report-verdict" data-verdict={SAMPLE_REPORT.verdict}>
                {SAMPLE_REPORT.verdict === "NEGOTIATE" ? t("inspection.negotiate") : SAMPLE_REPORT.verdict}
              </span>
            </div>
            <p className="inspection-report-model">{SAMPLE_REPORT.title.replace("Sample report · ", "")}</p>
            <div className="inspection-report-summary">
              <div>
                <span>{t("inspection.componentsVerified")}</span>
                <strong>{verifiedParts}/{SAMPLE_REPORT.hardware.length}</strong>
              </div>
              <div>
                <span>{t("inspection.cpuLoad")}</span>
                <strong>{SAMPLE_REPORT.temps.cpuLoad}°C</strong>
              </div>
              <div>
                <span>{t("inspection.gpuLoad")}</span>
                <strong>{SAMPLE_REPORT.temps.gpuLoad}°C</strong>
              </div>
              <div>
                <span>{t("inspection.storageHealth")}</span>
                <strong>{storageHealth}</strong>
              </div>
            </div>
            <div className="inspection-report-valuation">
              <span>{t("inspection.fairValue")}</span>
              <strong>{dh(SAMPLE_REPORT.fairValue)}</strong>
              <span>{t("inspection.suggestedOffer")}</span>
              <strong>{dh(SAMPLE_REPORT.suggestOffer)}</strong>
            </div>
            <Button asChild variant="soft" className="inspection-report-link">
              <Link to="/reports/$id" params={{ id: "rep-4060" }}>
                {t("inspection.viewSample")}
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </Button>
          </section>
        </div>
      </div>

      {showStickyBook && (
        <div className="inspection-sticky-book">
          <Button className="w-full" onClick={() => scrollToBooking()}>
            {t("nav.book")}
          </Button>
        </div>
      )}
    </main>
  );
}
