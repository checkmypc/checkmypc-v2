import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpenCheck,
  Boxes,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
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
  const navigate = useNavigate();
  const openCount = useOps(
    (s) => s.bookings.filter((b) => b.status !== "done" && b.status !== "cancelled").length,
  );
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  const nav = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active = "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-on-navy-muted transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/10 hover:text-on-navy active:scale-[0.98]",
              active && "bg-white/15 text-on-navy",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to === "/admin/bookings" && openCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-fg">
                {openCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-svh bg-bg text-fg lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden flex-col bg-navy text-on-navy lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-4">
          <Logo compact />
          <span className="font-display text-sm font-semibold tracking-tight">
            CHECK<span className="text-primary">MY</span>PC
          </span>
        </div>
        <p className="px-5 pt-4 text-[10px] font-semibold tracking-[0.16em] text-on-navy-muted uppercase">
          Ops desk
        </p>
        <div className="flex-1">{nav}</div>
        <div className="border-t border-white/10 p-3">
          <Link to="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-on-navy-muted transition-colors duration-200 hover:bg-white/10 hover:text-on-navy">
            <BookOpenCheck className="size-4" />
            View site
          </Link>
          <button
            type="button"
            onClick={() => {
              void (async () => {
                await lock();
                await navigate({ to: "/admin/login" });
              })();
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-on-navy-muted transition-colors duration-200 hover:bg-white/10 hover:text-on-navy"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-bg/70 px-4 backdrop-blur-xl backdrop-saturate-150 lg:px-6">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full transition-[background-color,transform] duration-200 hover:bg-surface-2 active:scale-[0.96] lg:hidden"
            onClick={() => setMenu((v) => !v)}
            aria-label="Open menu"
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">Operations</p>
            <p className="truncate text-xs text-muted">CHECK → COMPARE → BUILD → CLEAN → INSPECT → BUY</p>
          </div>
          <Button asChild variant="secondary" size="sm" className="hidden sm:inline-flex">
            <Link to="/">Open site</Link>
          </Button>
        </header>
        {menu && (
          <div className="border-b border-border bg-navy text-on-navy lg:hidden">{nav}</div>
        )}
        <div className="page-enter min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
