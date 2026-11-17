import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Facebook, Instagram, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import { CITIES, CONTACT } from "@/lib/services";

const linkClass =
  "inline-flex min-h-8 items-center rounded-sm text-sm text-muted transition-colors hover:text-primary focus-visible:text-primary";

export function SiteFooter() {
  const { t } = useI18n();
  const settings = useOps((s) => s.settings);
  const email = settings.email || CONTACT.email;
  const whatsappNumber = (settings.whatsapp || CONTACT.whatsapp).replace(/\D/g, "");
  const whatsappHref = `https://wa.me/${whatsappNumber}`;
  const socials = [
    {
      label: "Facebook",
      href: settings.facebook || CONTACT.facebook,
      icon: <Facebook className="size-5" />,
      style: "hover:text-[#1877f2]",
    },
    {
      label: "Instagram",
      href: settings.instagram || CONTACT.instagram,
      icon: <Instagram className="size-5" />,
      style: "hover:text-[#e1306c]",
    },
    {
      label: "TikTok",
      href: settings.tiktok || CONTACT.tiktok,
      icon: <span className="social-icon-mask social-icon-mask--tiktok" aria-hidden="true" />,
      style: "hover:text-fg",
    },
    {
      label: "WhatsApp",
      href: whatsappHref,
      icon: <span className="social-icon-mask social-icon-mask--whatsapp" aria-hidden="true" />,
      style: "hover:text-[#25d366]",
    },
    {
      label: "Email",
      href: `mailto:${email}`,
      icon: <Mail className="size-5" />,
      style: "hover:text-primary",
    },
  ];

  return (
    <footer className="mt-16 border-t border-border bg-surface/80 backdrop-blur-xl">
      <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-8 px-4 py-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-x-10 lg:py-11">
        <div className="min-w-0">
          <Logo />
          <p className="mt-3 max-w-sm text-sm font-medium text-fg">{t("foot.tag")}</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted">{t("foot.support")}</p>
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm font-semibold leading-5 text-primary">
              {t("foot.serviceHighlight")}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {socials.map((social) => {
              const isExternal = social.href.startsWith("https://");
              return (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  title={social.label}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noreferrer" : undefined}
                  className={`grid size-11 place-items-center rounded-full border border-border bg-surface text-muted shadow-[var(--shadow-border)] transition-[color,border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-current hover:shadow-[var(--shadow-border-hover)] focus-visible:text-primary ${social.style}`}
                >
                  {social.icon}
                </a>
              );
            })}
          </div>
        </div>

        <nav aria-labelledby="footer-platform">
          <h2
            id="footer-platform"
            className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
          >
            {t("foot.platform")}
          </h2>
          <div className="flex flex-col">
            <Link to="/products" search={{}} className={linkClass}>
              {t("nav.components")}
            </Link>
            <Link to="/compare" search={{}} className={linkClass}>
              {t("nav.compare")}
            </Link>
            <Link to="/builder" className={linkClass}>
              {t("nav.builder")}
            </Link>
            <Link to="/prebuilts" className={linkClass}>
              {t("nav.prebuilts")}
            </Link>
            <Link to="/used" className={linkClass}>
              {t("nav.used")}
            </Link>
            <Link to="/deals" className={linkClass}>
              {t("nav.deals")}
            </Link>
            <Link to="/guides" className={linkClass}>
              {t("nav.guides")}
            </Link>
          </div>
        </nav>

        <nav aria-labelledby="footer-services">
          <h2
            id="footer-services"
            className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
          >
            {t("foot.services")}
          </h2>
          <div className="flex flex-col">
            <Link to="/inspection" className={linkClass}>
              {t("nav.inspection")}
            </Link>
            <Link to="/assembly" className={linkClass}>
              {t("nav.assembly")}
            </Link>
            <Link to="/cleaning" className={linkClass}>
              {t("nav.cleaning")}
            </Link>
            <Link to="/contact" className={linkClass}>
              {t("nav.contact")}
            </Link>
            <Link to="/admin" className={`${linkClass} gap-1`}>
              Ops console <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </nav>

        <section aria-labelledby="footer-contact">
          <h2
            id="footer-contact"
            className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase"
          >
            {t("nav.contact")}
          </h2>
          <div className="flex flex-col">
            <a href={`mailto:${email}`} className={linkClass}>
              {email}
            </a>
            <a href={whatsappHref} className={linkClass}>
              WhatsApp
            </a>
            <p className="mt-3 text-xs font-semibold tracking-wider text-muted uppercase">
              {t("foot.cities")}
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-sm text-fg">
              {CITIES.map((city) => (
                <li key={city} className="min-h-7 py-1">
                  {city}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
      <div className="border-t border-border px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-5">
            © {new Date().getFullYear()} CheckMyPC. {t("foot.legal")}
          </p>
          <nav aria-label="Legal information" className="flex flex-wrap gap-x-5 gap-y-2">
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(t("foot.privacyRequest"))}`}
              aria-label={t("foot.privacyRequest")}
              className="transition-colors hover:text-primary"
            >
              {t("foot.privacy")}
            </a>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(t("foot.termsRequest"))}`}
              aria-label={t("foot.termsRequest")}
              className="transition-colors hover:text-primary"
            >
              {t("foot.terms")}
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
