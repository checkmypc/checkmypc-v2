import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  ShieldCheck,
  Store,
  TrendingUp,
  Wallet,
  Wrench,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { KindBadge, StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KIND_LABEL, OPEN_STATUSES, STATUS_LABEL, bookingRevenue, useOps } from "@/lib/ops";
import { dh } from "@/lib/utils";
import type { BookingStatus, ServiceKind } from "@/lib/types";

export const Route = createFileRoute("/admin/")({ component: AdminHome });

function AdminHome() {
  const bookings = useOps((s) => s.bookings);
  const products = useOps((s) => s.products);
  const listings = useOps((s) => s.listings);
  const reports = useOps((s) => s.reports);
  const activity = useOps((s) => s.activity);
  const team = useOps((s) => s.team);

  const open = bookings.filter((b) => OPEN_STATUSES.includes(b.status ?? "new"));
  const done = bookings.filter((b) => b.status === "done");
  const revenue = bookingRevenue(bookings);
  const pendingListings = listings.filter((l) => !l.inspected).length;
  const storeCount = new Set(
    products.flatMap((product) =>
      product.offers.map((offer) => offer.store.trim()).filter(Boolean),
    ),
  ).size;
  const priceUpdateCount = products.reduce((total, product) => total + product.history.length, 0);

  const byKind = (["inspection", "assembly", "cleaning"] as ServiceKind[]).map((k) => ({
    name: KIND_LABEL[k],
    count: bookings.filter((b) => b.kind === k).length,
    done: bookings.filter((b) => b.kind === k && b.status === "done").length,
  }));

  const byStatus = (Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => ({
    name: STATUS_LABEL[s],
    n: bookings.filter((b) => (b.status ?? "new") === s).length,
  }));

  const kpis = [
    {
      label: "Total products",
      value: String(products.length),
      hint: "Items in catalogue",
      icon: Boxes,
      to: "/admin/catalog",
      tone: "primary",
    },
    {
      label: "Total stores",
      value: String(storeCount),
      hint: "Across current offers",
      icon: Store,
      to: "/admin/catalog",
      tone: "neutral",
    },
    {
      label: "Price updates",
      value: String(priceUpdateCount),
      hint: "Historical price records",
      icon: TrendingUp,
      to: "/admin/catalog",
      tone: "success",
    },
    {
      label: "Total inspections",
      value: String(reports.length),
      hint: "Inspection reports",
      icon: ClipboardCheck,
      to: "/admin/reports",
      tone: "neutral",
    },
  ] as const;
  const operations = [
    {
      label: "Open jobs",
      value: String(open.length),
      hint: `${bookings.length} total requests`,
      icon: ClipboardList,
    },
    {
      label: "Completed",
      value: String(done.length),
      hint: "Paid / closed inspections & builds",
      icon: ShieldCheck,
    },
    {
      label: "Closed revenue",
      value: dh(revenue),
      hint: "Sum of done jobs (quoted / paid)",
      icon: Wallet,
    },
    {
      label: "Live SKUs",
      value: String(products.length),
      hint: `${listings.length} used · ${reports.length} reports`,
      icon: Wrench,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
            Operations overview
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-[2rem]">
            Full access desk
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Every booking, price and inspection report for CHECKMYPC. Casablanca, Rabat, Agadir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/admin/bookings">New job</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/accessories">Manage accessories</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/used">Write report</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link to="/admin/reports">PDF reports</Link>
          </Button>
        </div>
      </div>

      <section aria-label="Key metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              to={k.to}
              className="group min-w-0 rounded-2xl focus-visible:outline-offset-4"
            >
              <Card className="h-full rounded-2xl p-4 transition-[box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[var(--shadow-border-hover)] sm:p-5">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-muted">{k.label}</p>
                  <span
                    className={[
                      "grid size-10 shrink-0 place-items-center rounded-xl",
                      k.tone === "primary" && "bg-primary/12 text-primary",
                      k.tone === "success" && "bg-ok/12 text-ok",
                      k.tone === "neutral" && "bg-surface-2 text-muted",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.8} />
                  </span>
                </div>
                <p className="font-display text-3xl font-semibold tracking-tight tabular-nums">
                  {k.value}
                </p>
                <p className="mt-1 text-xs text-muted">{k.hint}</p>
              </Card>
            </Link>
          );
        })}
      </section>

      <section aria-label="Service performance" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {operations.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="min-w-0 rounded-xl p-3.5 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-muted">{item.label}</p>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                  <Icon className="size-4" />
                </span>
              </div>
              <p className="mt-2 font-display text-xl font-semibold tabular-nums">{item.value}</p>
              <p className="mt-0.5 min-h-8 text-[11px] leading-4 text-muted">{item.hint}</p>
            </Card>
          );
        })}
      </section>

      <section aria-label="Service analytics" className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Jobs by service</h2>
          <p className="mb-4 text-xs text-muted">All-time in this console</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byKind} barCategoryGap="28%">
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--fg)",
                  }}
                />
                <Bar dataKey="count" name="All" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="done" name="Done" fill="var(--ok)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold">Pipeline</h2>
          <p className="mb-4 text-xs text-muted">
            {pendingListings} used listing{pendingListings === 1 ? "" : "s"} waiting for a check
          </p>
          <ul className="space-y-2">
            {byStatus.map((row) => (
              <li key={row.name} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-muted">{row.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${bookings.length ? (row.n / bookings.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-6 text-end font-mono tabular-nums">{row.n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            {team.filter((t) => t.active).length} active technicians
          </p>
        </Card>
      </section>

      <section
        aria-label="Recent operations"
        className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]"
      >
        <Card className="min-w-0 overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="font-display text-base font-semibold">Latest requests</h2>
              <p className="mt-1 text-xs text-muted">Recent service bookings</p>
            </div>
            <Link
              to="/admin/bookings"
              className="rounded-lg px-2 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              All bookings
            </Link>
          </div>
          <div className="divide-y divide-border">
            {bookings.slice(0, 6).map((b) => (
              <Link
                key={b.id}
                to="/admin/bookings"
                className="flex min-h-[68px] flex-wrap items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted">
                    {b.city} · {new Date(b.createdAt).toLocaleString("fr-MA")}
                  </p>
                </div>
                <KindBadge kind={b.kind} />
                <StatusBadge status={b.status ?? "new"} />
                <span className="font-mono text-xs tabular-nums text-muted">
                  {dh(b.quotedPrice || 0)}
                </span>
              </Link>
            ))}
            {bookings.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted">No booking requests yet.</p>
            )}
          </div>
        </Card>
        <Card className="min-w-0 rounded-2xl p-0">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">Recent activity</h2>
            <p className="mt-1 text-xs text-muted">Latest updates across the operations desk</p>
          </div>
          <ol className="divide-y divide-border px-5">
            {activity.slice(0, 8).map((a) => (
              <li key={a.id} className="flex gap-3 py-3.5 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="break-words">{a.text}</p>
                  <time className="mt-1 block text-xs text-muted" dateTime={a.at}>
                    {new Date(a.at).toLocaleString("fr-MA")}
                  </time>
                </div>
              </li>
            ))}
            {activity.length === 0 && (
              <li className="py-8 text-center text-sm text-muted">
                Activity will show here as updates are made.
              </li>
            )}
          </ol>
          <Button asChild variant="ghost" size="sm" className="m-3">
            <Link to="/admin/catalog">
              Edit catalogue <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </Card>
      </section>
    </div>
  );
}
