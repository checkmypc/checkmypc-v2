import { Link } from "@tanstack/react-router";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { CITIES } from "@/lib/services";

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm text-sm text-muted transition-colors hover:text-primary focus-visible:text-primary";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-16 border-t border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-8 px-4 py-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_.7fr] lg:gap-x-10 lg:py-11">
        <div className="min-w-0">
          <Logo />
          <p className="mt-3 max-w-sm text-sm font-medium text-fg">{t("foot.tag")}</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{t("foot.support")}</p>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold leading-5 text-primary">{t("foot.serviceHighlight")}</p>
          </div>
        </div>

        <nav aria-labelledby="footer-platform">
          <h2 id="footer-platform" className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
            {t("foot.platform")}
          </h2>
          <div className="flex flex-col">
            <Link to="/products" search={{}} className={linkClass}>{t("nav.components")}</Link>
            <Link to="/compare" search={{}} className={linkClass}>{t("nav.compare")}</Link>
            <Link to="/builder" className={linkClass}>{t("nav.builder")}</Link>
            <Link to="/prebuilts" className={linkClass}>{t("nav.prebuilts")}</Link>
            <Link to="/used" className={linkClass}>{t("nav.used")}</Link>
            <Link to="/deals" className={linkClass}>{t("nav.deals")}</Link>
            <Link to="/guides" className={linkClass}>{t("nav.guides")}</Link>
          </div>
        </nav>

        <nav aria-labelledby="footer-services">
          <h2 id="footer-services" className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
            {t("foot.services")}
          </h2>
          <div className="flex flex-col">
            <Link to="/inspection" className={linkClass}>{t("nav.inspection")}</Link>
            <Link to="/assembly" className={linkClass}>{t("nav.assembly")}</Link>
            <Link to="/cleaning" className={linkClass}>{t("nav.cleaning")}</Link>
            <Link to="/contact" className={linkClass}>{t("nav.contact")}</Link>
            <Link to="/admin" className={`${linkClass} gap-1`}>
              Ops console <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <section aria-labelledby="footer-cities">
          <h2 id="footer-cities" className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">
            {t("foot.cities")}
          </h2>
          <ul className="flex flex-col gap-1 text-sm text-fg">
            {CITIES.map((city) => <li key={city} className="min-h-8 py-1">{city}</li>)}
          </ul>
        </section>
      </div>
      <div className="border-t border-border px-4 py-4">
        <p className="mx-auto max-w-6xl text-xs leading-5 text-muted">{t("foot.legal")}</p>
      </div>
    </footer>
  );
}
