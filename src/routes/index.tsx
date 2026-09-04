import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Building2, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useCurrentUser, homePathFor } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartServe — Hospitality Operations Platform" },
      {
        name: "description",
        content:
          "SmartServe is the multi-tenant operations platform for restaurants, cafés, bars and hotels: branches, staff, subscriptions and analytics in one place.",
      },
      { property: "og:title", content: "SmartServe — Hospitality Operations Platform" },
      {
        property: "og:description",
        content: "Run restaurants, cafés, bars and hotels from one premium control center.",
      },
    ],
  }),
  component: Landing,
});

const pillars = [
  { icon: Building2, title: "Multi-branch by design", text: "One organization, many locations. Every client's data stays isolated." },
  { icon: ShieldCheck, title: "Roles & security first", text: "Super Admin, Platform Admin and Client Admin with row-level isolation." },
  { icon: BarChart3, title: "Analytics that matter", text: "Revenue, orders, top products and Smart Alerts out of the box." },
  { icon: Sparkles, title: "Ready for what's next", text: "QR menus, KDS, inventory, M-Pesa and AI insights plug in as modules." },
];

function Landing() {
  const { data: user, isLoading } = useCurrentUser();
  const target = homePathFor(user);

  return (
    <div className="min-h-screen gradient-navy text-navy-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo dark subtitle="Hospitality OS" />
        <div className="flex items-center gap-2">
          {!isLoading && user ? (
            <Button variant="gold" asChild>
              <Link to={target}>Open dashboard <ArrowRight /></Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button variant="gold" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>Start free trial</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:pt-20">
        <div className="max-w-3xl animate-fade-up">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Foundation V1
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            The operating system for <span className="gradient-gold-text">modern hospitality</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-sidebar-muted">
            SmartServe gives restaurant groups, cafés, bars and hotels one secure platform for branches,
            staff, subscriptions and live performance — with a control center built for the people who run it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" asChild>
              <Link to="/auth" search={{ mode: "signup" }}>Create your workspace <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-sidebar-border bg-transparent text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <div
              key={p.title}
              className="animate-fade-up rounded-2xl border border-sidebar-border bg-sidebar-accent/30 p-5 backdrop-blur"
              style={{ animationDelay: `${i * 70 + 120}ms` }}
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <p.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-sidebar-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
