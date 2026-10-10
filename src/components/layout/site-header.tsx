import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LANGS, useI18n } from "@/lib/i18n";
import { partCount, useBuild } from "@/lib/store";
import { cn } from "@/lib/utils";

const LINKS = [
  { to: "/products", key: "nav.components" },
  { to: "/compare", key: "nav.compare" },
  { to: "/builder", key: "nav.builder" },
  { to: "/prebuilts", key: "nav.prebuilts" },
  { to: "/used", key: "nav.used" },
  { to: "/inspection", key: "nav.inspection" },
  { to: "/guides", key: "nav.guides" },
] as const;

export function SiteHeader() {
  const { t, lang, setLang, theme, setTheme } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [drawerReady, setDrawerReady] = useState(false);
  const slots = useBuild((s) => s.slots);
  const n = partCount(slots);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    setDrawerReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/70 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96]" aria-label="CHECKMYPC home">
          <Logo />
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-2 text-sm font-medium text-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-2 hover:text-fg active:scale-[0.96]",
                pathname === l.to && "bg-surface-2 text-fg",
              )}
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <Link
            to="/search"
            className="grid size-11 place-items-center rounded-full text-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-2 hover:text-fg active:scale-[0.96]"
            aria-label={t("nav.search")}
          >
            <Search className="size-4" />
          </Link>
          <Link
            to="/builder"
            className="relative hidden size-11 place-items-center rounded-full text-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-2 hover:text-fg active:scale-[0.96] sm:grid"
            aria-label={t("nav.mybuild")}
          >
            <span className="font-display text-xs font-semibold">PC</span>
            {n > 0 && (
              <span className="absolute top-1.5 end-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-fg">
                {n}
              </span>
            )}
          </Link>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-2 hover:text-fg active:scale-[0.96]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}
          >
            <span className="relative grid size-4 place-items-center">
              <Sun
                className={cn(
                  "absolute size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                  theme === "dark" ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]",
                )}
              />
              <Moon
                className={cn(
                  "size-4 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                  theme === "dark" ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none",
                )}
              />
            </span>
          </button>
          <select
            className="hidden h-11 rounded-full bg-surface px-3 text-xs font-medium text-fg shadow-[var(--shadow-border)] transition-[box-shadow] duration-200 sm:block"
            value={lang}
            onChange={(e) => setLang(e.target.value as typeof lang)}
            aria-label="Language"
          >
            {LANGS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link to="/inspection">{t("nav.book")}</Link>
          </Button>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-fg transition-[background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.96] lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            <span className="relative grid size-5 place-items-center">
              <X
                className={cn(
                  "absolute size-5 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                  open ? "scale-100 opacity-100 blur-none" : "scale-[0.25] opacity-0 blur-[4px]",
                )}
              />
              <Menu
                className={cn(
                  "size-5 transition-[opacity,transform,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
                  open ? "scale-[0.25] opacity-0 blur-[4px]" : "scale-100 opacity-100 blur-none",
                )}
              />
            </span>
          </button>
        </div>
      </div>
      </header>
      {drawerReady &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-50 lg:hidden",
              !open && "pointer-events-none",
            )}
            aria-hidden={!open}
            inert={!open}
          >
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-black/45 transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "opacity-100" : "opacity-0",
            )}
            onClick={() => setOpen(false)}
            aria-label={t("nav.close")}
            tabIndex={open ? 0 : -1}
          />
          <nav
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.menu")}
            className={cn(
              "absolute inset-y-0 right-0 flex w-[min(80vw,24rem)] flex-col overflow-y-auto border-s border-border bg-surface px-4 pb-6 pt-4 shadow-[var(--shadow-border)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "translate-x-0" : "translate-x-full",
            )}
          >
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <Logo />
              <button
                type="button"
                className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                onClick={() => setOpen(false)}
                aria-label={t("nav.close")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-xl px-3 py-3 text-sm font-medium text-fg transition-colors duration-200 hover:bg-surface-2",
                    pathname === l.to && "bg-surface-2 text-primary",
                  )}
                >
                  {t(l.key)}
                </Link>
              ))}
              <Link
                to="/assembly"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 hover:bg-surface-2"
              >
                {t("nav.assembly")}
              </Link>
              <Link
                to="/cleaning"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 hover:bg-surface-2"
              >
                {t("nav.cleaning")}
              </Link>
              <Link
                to="/deals"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 hover:bg-surface-2"
              >
                {t("nav.deals")}
              </Link>
              <Link
                to="/contact"
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium transition-colors duration-200 hover:bg-surface-2"
              >
                {t("nav.contact")}
              </Link>
              <div className="mt-2 flex gap-2">
                <select
                  className="h-11 min-w-0 flex-1 rounded-full bg-bg px-3 text-sm shadow-[var(--shadow-border)]"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as typeof lang)}
                >
                  {LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <Button asChild className="flex-1">
                  <Link to="/inspection" onClick={() => setOpen(false)}>
                    {t("nav.book")}
                  </Link>
                </Button>
              </div>
            </div>
            </nav>
          </div>,
        document.body,
      )}
    </>
  );
}