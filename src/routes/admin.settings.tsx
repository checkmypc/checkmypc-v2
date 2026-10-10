import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeAdminPasswordFn, createOperatorFn, listOperatorsFn } from "@/lib/api";
import { useOps } from "@/lib/ops";

type Operator = { id: string; email: string; name: string; role: string; createdAt: string };

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function explain(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  return raw.replace(/^Error:\s*/, "").slice(0, 220) || "Could not save";
}

function AdminSettings() {
  const settings = useOps((s) => s.settings);
  const patch = useOps((s) => s.patchSettings);
  const reset = useOps((s) => s.resetDemo);
  const exportJson = useOps((s) => s.exportJson);
  const importJson = useOps((s) => s.importJson);
  const adminEmail = useOps((s) => s.adminEmail);
  const [dump, setDump] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [opName, setOpName] = useState("");
  const [opEmail, setOpEmail] = useState("");
  const [opPassword, setOpPassword] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [nextPw2, setNextPw2] = useState("");
  const [busyOp, setBusyOp] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  async function refreshOperators() {
    try {
      setOperators(await listOperatorsFn());
    } catch {
      setOperators([]);
    }
  }

  useEffect(() => {
    void refreshOperators();
  }, []);

  function download() {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checkmypc-ops.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onAddOperator(e: FormEvent) {
    e.preventDefault();
    setBusyOp(true);
    try {
      await createOperatorFn({ data: { name: opName.trim() || "Operator", email: opEmail, password: opPassword } });
      toast.success("Operator added");
      setOpName("");
      setOpEmail("");
      setOpPassword("");
      await refreshOperators();
    } catch (err) {
      toast.error(explain(err));
    } finally {
      setBusyOp(false);
    }
  }

  async function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (nextPw !== nextPw2) {
      toast.error("New passwords do not match");
      return;
    }
    setBusyPw(true);
    try {
      await changeAdminPasswordFn({ data: { current: currentPw, next: nextPw } });
      toast.success("Password updated");
      setCurrentPw("");
      setNextPw("");
      setNextPw2("");
    } catch (err) {
      toast.error(explain(err));
    } finally {
      setBusyPw(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 lg:px-6">
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Console</p>
        <h1 className="font-display text-3xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Contact details and catalogue backups are stored in the database. Signed in as {adminEmail ?? "operator"}.
        </p>
      </div>

      <Card className="rounded-2xl p-5">
        <h2 className="font-display font-semibold">Contact</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="em">Email</Label>
            <Input id="em" value={settings.email} onChange={(e) => patch({ email: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ph">Phone</Label>
            <Input id="ph" value={settings.phone} onChange={(e) => patch({ phone: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="wa">WhatsApp (digits)</Label>
            <Input id="wa" value={settings.whatsapp} onChange={(e) => patch({ whatsapp: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="hr">Hours</Label>
            <Input id="hr" value={settings.hours} onChange={(e) => patch({ hours: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="font-display font-semibold">Operators</h2>
        <p className="mt-1 text-sm text-muted">
          Full desk access. Passwords are hashed on the server and never shown again.
        </p>
        <ul className="mt-3 divide-y divide-border rounded-xl bg-bg">
          {operators.map((op) => (
            <li key={op.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{op.name}</p>
                <p className="truncate text-xs text-muted">{op.email}</p>
              </div>
              <span className="text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">{op.role}</span>
            </li>
          ))}
          {operators.length === 0 && <li className="px-4 py-3 text-sm text-muted">No operators loaded.</li>}
        </ul>
        <form onSubmit={onAddOperator} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="op-name">Name</Label>
            <Input id="op-name" value={opName} onChange={(e) => setOpName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <Label htmlFor="op-email">Email</Label>
            <Input
              id="op-email"
              type="email"
              value={opEmail}
              onChange={(e) => setOpEmail(e.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="op-pw">Temporary password</Label>
            <Input
              id="op-pw"
              type="password"
              autoComplete="new-password"
              value={opPassword}
              onChange={(e) => setOpPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busyOp}>
              {busyOp ? "Adding…" : "Add operator"}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="font-display font-semibold">Change your password</h2>
        <form onSubmit={onChangePassword} className="mt-3 grid gap-3">
          <div>
            <Label htmlFor="cur-pw">Current password</Label>
            <Input
              id="cur-pw"
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="new-pw">New password</Label>
            <Input
              id="new-pw"
              type="password"
              autoComplete="new-password"
              value={nextPw}
              onChange={(e) => setNextPw(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div>
            <Label htmlFor="new-pw2">Confirm new password</Label>
            <Input
              id="new-pw2"
              type="password"
              autoComplete="new-password"
              value={nextPw2}
              onChange={(e) => setNextPw2(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={busyPw}>
            {busyPw ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="font-display font-semibold">Backup</h2>
        <p className="mt-1 text-sm text-muted">Export or import the database-backed ops snapshot.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={download}>
            Download JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(exportJson());
              toast.success("Copied");
            }}
          >
            Copy JSON
          </Button>
        </div>
        <Label className="mt-4" htmlFor="imp">
          Import JSON
        </Label>
        <textarea
          id="imp"
          value={dump}
          onChange={(e) => setDump(e.target.value)}
          className="mt-1 min-h-28 w-full rounded-md bg-bg p-3 font-mono text-xs shadow-[var(--shadow-border)]"
        />
        <Button
          className="mt-3"
          type="button"
          variant="secondary"
          onClick={() => {
            const ok = importJson(dump);
            if (!ok) toast.error("Invalid JSON");
          }}
        >
          Import
        </Button>
      </Card>

      <Card className="rounded-2xl p-5">
        <h2 className="font-display font-semibold">Reload bundled catalogue</h2>
        <p className="mt-1 text-sm text-muted">
          Replaces products, prebuilts, used listings, sample reports, technicians and service prices from the bundled seed. Does not delete customer bookings.
        </p>
        <Button
          className="mt-3"
          type="button"
          variant="danger"
          onClick={() => {
            if (window.confirm("Reload catalogue from bundled data? Bookings are kept.")) {
              reset();
            }
          }}
        >
          Reload catalogue
        </Button>
      </Card>
    </div>
  );
}