import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Mark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminLogin, adminSignup, getAdminSession } from "@/lib/api";
import { useOps } from "@/lib/ops";

export const Route = createFileRoute("/admin/login")({ component: AdminLoginPage });

function explain(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const text = raw.replace(/^Error:\s*/g, "").trim();
  if (/unauthorized/i.test(text)) return "Session expired. Sign in again.";
  if (/already exists/i.test(text)) return "An admin account already exists. Sign in instead.";
  if (/invalid email or password/i.test(text)) return "Email or password is incorrect.";
  if (/current password/i.test(text)) return text;
  if (/at least 8/i.test(text) || /invalid.*email/i.test(text) || /validation/i.test(text)) {
    return "Enter a valid email and a password of at least 8 characters.";
  }
  return text && text.length < 220 ? text : "Could not continue. Try again.";
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const hydrate = useOps((s) => s.hydrate);
  const [mode, setMode] = useState<"loading" | "setup" | "signin">("loading");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getAdminSession()
      .then((s) => setMode(s.needsSetup ? "setup" : "signin"))
      .catch(() => setMode("signin"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (mode === "setup") {
        if (password !== confirm) {
          setErr("Passwords do not match.");
          return;
        }
        await adminSignup({ data: { name: name.trim() || "Operator", email, password } });
      } else {
        await adminLogin({ data: { email, password } });
      }
      await hydrate();
      await navigate({ to: "/admin" });
    } catch (error) {
      const message = explain(error);
      setErr(message);
      if (/already exists/i.test(message)) setMode("signin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-navy text-on-navy">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_58%)]" />
      <div className="relative mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Mark className="size-10 text-primary" />
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">CHECKMYPC</p>
            <p className="text-xs text-on-navy-muted">Operations console</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="page-enter rounded-3xl bg-surface/95 p-6 text-fg shadow-[var(--shadow-border)] backdrop-blur-xl">
          {mode === "loading" ? (
            <p className="text-sm text-muted">Loading sign in…</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold">
                {mode === "setup" ? "Create admin account" : "Admin sign in"}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {mode === "setup"
                  ? "No operator exists yet. Create the first admin account to open the desk. Credentials stay on the server."
                  : "Use the operator email and password. Sessions are stored in a secure HTTP-only cookie."}
              </p>
              <div className="mt-5 grid gap-3">
                {mode === "setup" && (
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      className="bg-bg"
                      onChange={(e) => setName(e.target.value)}
                      placeholder="CHECKMYPC operator"
                      minLength={2}
                      required
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    className="bg-bg"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === "setup" ? "new-password" : "current-password"}
                    value={password}
                    className="bg-bg"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                {mode === "setup" && (
                  <div>
                    <Label htmlFor="confirm">Confirm password</Label>
                    <Input
                      id="confirm"
                      name="confirm"
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      className="bg-bg"
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                )}
                {err && <p className="text-xs text-danger">{err}</p>}
              </div>
              <Button type="submit" className="mt-5 w-full" disabled={busy}>
                {busy ? (mode === "setup" ? "Creating account…" : "Signing in…") : mode === "setup" ? "Create admin account" : "Sign in"}
              </Button>
              {mode === "signin" && (
                <p className="mt-3 text-center text-xs text-muted">
                  Need another operator? Sign in first, then add them in Settings.
                </p>
              )}
            </>
          )}
        </form>
        <Link to="/" className="mt-6 text-center text-sm text-on-navy-muted hover:text-on-navy">
          Back to CHECKMYPC.MA
        </Link>
      </div>
    </div>
  );
}