import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { CITIES } from "@/lib/services";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">{t("foot.tag")}</p>
          <p className="mt-2 font-display text-sm text-primary">{t("brand.darija")}</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{t("foot.platform")}</h4>
          <div className="flex flex-col gap-1 text-sm">
            <Link to="/products" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.components")}
            </Link>
            <Link to="/compare" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.compare")}
            </Link>
            <Link to="/builder" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.builder")}
            </Link>
            <Link to="/prebuilts" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.prebuilts")}
            </Link>
            <Link to="/used" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.used")}
            </Link>
            <Link to="/deals" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.deals")}
            </Link>
            <Link to="/guides" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.guides")}
            </Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{t("foot.services")}</h4>
          <div className="flex flex-col gap-1 text-sm">
            <Link to="/inspection" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.inspection")}
            </Link>
            <Link to="/assembly" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.assembly")}
            </Link>
            <Link to="/cleaning" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.cleaning")}
            </Link>
            <Link to="/contact" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              {t("nav.contact")}
            </Link>
            <Link to="/admin" className="rounded-lg py-1.5 transition-colors duration-200 hover:text-primary">
              Ops console
            </Link>
          </div>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-semibold tracking-wider text-muted uppercase">{t("foot.cities")}</h4>
          <ul className="flex flex-col gap-2 text-sm text-fg">
            {CITIES.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5">
        <p className="mx-auto max-w-6xl text-xs text-muted">{t("foot.legal")}</p>
      </div>
    </footer>
  );
}