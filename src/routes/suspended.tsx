import { createFileRoute, Link } from "@tanstack/react-router";
import { LockKeyhole, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useCurrentUser, useSignOut } from "@/lib/auth/use-auth";

export const Route = createFileRoute("/suspended")({
  head: () => ({
    meta: [
      { title: "Account suspended — SmartServe" },
      { name: "description", content: "This SmartServe account is currently suspended. Your data is safe." },
      { property: "og:title", content: "Account suspended — SmartServe" },
      { property: "og:description", content: "This account is suspended. Data is preserved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SuspendedPage,
});

function SuspendedPage() {
  const { data: user } = useCurrentUser();
  const signOut = useSignOut();
  const orgName = user?.organization?.name;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-navy px-6 text-navy-foreground">
      <Logo dark className="mb-10" />
      <div className="w-full max-w-md rounded-2xl border border-sidebar-border bg-sidebar-accent/40 p-8 text-center backdrop-blur">
        <span className="mx-auto mb-5 inline-flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
          <LockKeyhole className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">Account suspended</h1>
        <p className="mt-3 text-sm text-sidebar-muted">
          {orgName ? <><span className="font-semibold text-navy-foreground">{orgName}</span>'s</> : "This"} SmartServe
          subscription is currently suspended. All of your branches, staff, menus and history are safely
          preserved and will be restored the moment the account is reactivated.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button variant="gold" asChild>
            <a href="mailto:billing@smartserve.app"><Mail /> Contact billing support</a>
          </Button>
          <Button variant="ghost" className="text-navy-foreground hover:bg-sidebar-accent hover:text-navy-foreground" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
      {user?.isPlatformAdmin && (
        <p className="mt-6 text-xs text-sidebar-muted">
          You're a platform admin. <Link to="/admin" className="text-gold underline-offset-4 hover:underline">Go to Control Center</Link>
        </p>
      )}
    </div>
  );
}
