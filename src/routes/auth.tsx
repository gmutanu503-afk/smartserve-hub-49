import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, MailCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { fetchCurrentUser, homePathFor, currentUserQueryKey } from "@/lib/auth/use-auth";
import { useQueryClient } from "@tanstack/react-query";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  invite: z.string().optional(),
});

type InvitePreview = { organization_name: string; email: string; role: string; expires_at: string; status: string };

const ROLE_COPY: Record<string, string> = {
  client_admin: "Business owner / admin",
  branch_manager: "Branch manager",
  staff: "Staff member",
};

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — SmartServe" },
      { name: "description", content: "Sign in to your SmartServe workspace or start a free 14-day trial." },
      { property: "og:title", content: "Sign in — SmartServe" },
      { property: "og:description", content: "Access the SmartServe hospitality platform." },
    ],
  }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}

function AuthPage() {
  const { mode = "signin" } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [form, setForm] = useState({ fullName: "", organizationName: "", email: "", password: "" });

  const goHome = async () => {
    queryClient.removeQueries({ queryKey: currentUserQueryKey });
    const user = await fetchCurrentUser();
    navigate({ to: homePathFor(user), replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void goHome();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: form.fullName, organization_name: form.organizationName },
          },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Workspace created. Welcome to SmartServe!");
          await goHome();
        } else {
          setCheckEmail(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        await goHome();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    await goHome();
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden gradient-navy p-10 text-navy-foreground lg:flex lg:flex-col lg:justify-between">
        <Logo dark subtitle="Hospitality OS" />
        <div className="max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Control Center</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight">
            Every branch, every shift, one secure platform.
          </h2>
          <p className="mt-4 text-sidebar-muted">
            Role-based access, organization-level isolation and analytics built for hospitality operators.
          </p>
        </div>
        <p className="text-xs text-sidebar-muted">© {new Date().getFullYear()} SmartServe</p>
      </aside>

      <main className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo subtitle="Hospitality OS" />
          </div>

          {checkEmail ? (
            <div className="surface-card p-8 text-center">
              <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-gold-soft text-foreground">
                <MailCheck className="size-6" />
              </span>
              <h1 className="font-display text-xl font-bold">Confirm your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="font-semibold text-foreground">{form.email}</span>.
                Click it to activate your workspace.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setCheckEmail(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {mode === "signup" ? "Start your 14-day trial" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signup"
                  ? "Create your organization workspace. No card required."
                  : "Sign in to your SmartServe workspace."}
              </p>

              <Button variant="outline" className="mt-6 w-full" onClick={onGoogle} disabled={loading}>
                <GoogleIcon /> Continue with Google
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or continue with email <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="fullName">Your name</Label>
                      <Input id="fullName" required autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="org">Business name</Label>
                      <Input id="org" required placeholder="e.g. Savanna Grill House" value={form.organizationName} onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  {mode === "signup" ? "Create workspace" : "Sign in"}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? (
                  <>Already have an account? <Link to="/auth" search={{ mode: "signin" }} className="font-semibold text-foreground underline-offset-4 hover:underline">Sign in</Link></>
                ) : (
                  <>New to SmartServe? <Link to="/auth" search={{ mode: "signup" }} className="font-semibold text-foreground underline-offset-4 hover:underline">Start a free trial</Link></>
                )}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
