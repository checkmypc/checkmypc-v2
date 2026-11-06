import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Boxes,
  Bell,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useOps } from "@/lib/ops";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { to: "/admin/catalog", label: "Catalogue", icon: Boxes },
  { to: "/admin/used", label: "Used & reports", icon: ShieldCheck },
  { to: "/admin/reports", label: "PDF reports", icon: FileDown },
  { to: "/admin/prebuilts", label: "Prebuilts", icon: MonitorSmartphone },
  { to: "/admin/services", label: "Services", icon: Wrench },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;

const NAV_GROUPS = [
  { label: "Workspace", items: NAV.slice(1, 7) },
  { label: "Administration", items: NAV.slice(7) },
] as const;

export function AdminShell() {
  const hydrate = useOps((s) => s.hydrate);
  const hydrated = useOps((s) => s.hydrated);
  const unlocked = useOps((s) => s.unlocked);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    if (isLogin && unlocked) {
      void navigate({ to: "/admin" });
    } else if (!isLogin && !unlocked) {
      void navigate({ to: "/admin/login" });
    }
  }, [hydrated, isLogin, unlocked, navigate]);

  if (!hydrated) {
    return (
      <div className="grid min-h-svh place-items-center bg-navy text-on-navy">
        <p className="text-sm text-on-navy-muted">Loading console…</p>
      </div>
    );
  }
  if (isLogin) return <Outlet />;
  if (!unlocked) {
    return (
      <div className="grid min-h-svh place-items-center bg-navy text-on-navy">
        <p className="text-sm text-on-navy-muted">Redirecting to sign in…</p>
      </div>
    );
  }
  return <AdminFrame />;
}

function AdminFrame() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lock = useOps((s) => s.lock);
  const adminEmail = useOps((s) => s.adminEmail);
  const openCount = useOps(
    (s) => s.bookings.filter((b) => b.status !== "done" && b.status !== "cancelled").length,
  );
  const { theme, setTheme } = useI18n();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");

  const title =
    NAV.find((item) =>
      "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to),
    )?.label ?? "Operations";
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? NAV.filter((item) => item.label.toLowerCase().includes(term)) : [];
  }, [query]);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  async function signOut() {
    await lock();
    await navigate({ to: "/admin/login" });
  }

  function navigation() {
    return (
      <nav aria-label="Admin navigation" className="flex flex-col gap-5">
        <div className="px-3">
          <NavLink item={NAV[0]} pathname={pathname} />
        </div>
        {NAV_GROUPS.map((group) => (
          <section key={group.label} aria-label={group.label}>
            <h2 className="px-5 pb-2 text-[10px] font-semibold tracking-[0.16em] text-on-navy-muted/75 uppercase">
              {group.label}
            </h2>
            <div className="flex flex-col gap-1 px-3">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  item={item}
                  pathname={pathname}
                  badge={item.to === "/admin/bookings" ? openCount : undefined}
                />
              ))}
            </div>
          </section>
        ))}
      </nav>
    );
  }

  function footerLinks() {
    return (
      <>
        <Link
          to="/"
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-on-navy-muted transition-[background-color,color] duration-200 hover:bg-white/10 hover:text-on-navy"
        >
          <BookOpenCheck className="size-4 shrink-0" />
          View site
        </Link>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-start text-sm text-on-navy-muted transition-[background-color,color] duration-200 hover:bg-white/10 hover:text-on-navy"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </>
    );
  }

  return (
    <div className="admin-frame min-h-svh bg-bg text-fg lg:grid lg:grid-cols-[252px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col bg-navy text-on-navy lg:flex">
        <Link
          to="/admin"
          aria-label="CHECKMYPC operations overview"
          className="flex h-[72px] shrink-0 items-center gap-3 border-b border-white/10 px-5"
        >
          <Logo compact />
          <span className="font-display text-sm font-semibold tracking-tight">
            CHECK<span className="text-primary">MY</span>PC
          </span>
        </Link>
        <div className="min-h-0 flex-1 overflow-y-auto py-5">{navigation()}</div>
        <div className="shrink-0 border-t border-white/10 p-3">{footerLinks()}</div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-bg/85 px-3 backdrop-blur-xl backdrop-saturate-150 sm:px-5 lg:px-7">
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-offset-2 lg:hidden"
            onClick={() => setMenu((value) => !value)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
            aria-controls="admin-mobile-navigation"
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-muted">CHECKMYPC · Operations</p>
            <p className="truncate font-display text-sm font-semibold">{title}</p>
          </div>

          <div className="relative hidden w-full max-w-[260px] md:block">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setQuery("");
              }}
              placeholder="Search pages…"
              aria-label="Search admin pages"
              aria-autocomplete="list"
              aria-controls="admin-search-results"
              className="h-10 w-full rounded-xl border border-border bg-surface ps-9 pe-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[border-color,box-shadow] placeholder:text-muted focus-visible:border-primary focus-visible:shadow-[var(--shadow-border-hover)]"
            />
            {searchResults.length > 0 && (
              <div
                id="admin-search-results"
                role="listbox"
                aria-label="Admin pages"
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[var(--shadow-border-hover)]"
              >
                {searchResults.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      role="option"
                      aria-selected={pathname === item.to}
                      onClick={() => setQuery("")}
                      className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
            {query.trim() && searchResults.length === 0 && (
              <p
                role="status"
                className="absolute inset-x-0 top-[calc(100%+0.5rem)] rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted shadow-[var(--shadow-border)]"
              >
                No admin pages found.
              </p>
            )}
          </div>

          <Link
            to="/admin/bookings"
            aria-label={openCount ? `${openCount} open bookings` : "Bookings"}
            className="relative grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <Bell className="size-[18px]" />
            {openCount > 0 && (
              <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-bg" />
            )}
          </Link>
          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <Link
            to="/admin/settings"
            aria-label={`Admin profile${adminEmail ? `: ${adminEmail}` : ""}`}
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-xl p-1 transition-colors hover:bg-surface-2"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {(adminEmail?.trim().charAt(0) || "A").toUpperCase()}
            </span>
            <span className="hidden max-w-36 truncate text-xs font-medium xl:block">
              {adminEmail || "Administrator"}
            </span>
          </Link>
          <Button asChild variant="secondary" size="sm" className="hidden xl:inline-flex">
            <Link to="/">Open site</Link>
          </Button>
        </header>

        <main className="admin-content page-enter min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      <div
        className={cn("fixed inset-0 z-50 lg:hidden", !menu && "pointer-events-none")}
        aria-hidden={!menu}
        inert={!menu}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/45 transition-opacity duration-200",
            menu ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMenu(false)}
          aria-label="Close navigation"
          tabIndex={menu ? 0 : -1}
        />
        <div
          id="admin-mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          className={cn(
            "absolute inset-y-0 start-0 flex w-[min(84vw,300px)] flex-col bg-navy text-on-navy shadow-[var(--shadow-border)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            menu ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link
              to="/admin"
              className="flex items-center gap-3"
              aria-label="CHECKMYPC operations overview"
            >
              <Logo compact />
              <span className="font-display text-sm font-semibold tracking-tight">
                CHECK<span className="text-primary">MY</span>PC
              </span>
            </Link>
            <button
              type="button"
              className="grid size-10 place-items-center rounded-xl text-on-navy-muted transition-colors hover:bg-white/10 hover:text-on-navy"
              onClick={() => setMenu(false)}
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-5">{navigation()}</div>
          <div className="shrink-0 border-t border-white/10 p-3">{footerLinks()}</div>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  badge,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  badge?: number;
}) {
  const Icon = item.icon;
  const active =
    "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium text-on-navy-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/10 hover:text-on-navy active:scale-[0.98]",
        active && "bg-white/12 text-on-navy shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
      )}
    >
      <Icon className="size-[17px] shrink-0" strokeWidth={1.8} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-fg">
          {badge}
        </span>
      )}
    </Link>
  );
}
