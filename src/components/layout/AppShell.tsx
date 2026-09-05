import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronsUpDown, LogOut, Menu, Search, UserCircle2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, useSignOut, type CurrentUser } from "@/lib/auth/use-auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  exact?: boolean;
  comingSoon?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

interface AppShellProps {
  user: CurrentUser;
  groups: NavGroup[];
  subtitle: string;
  contextLabel?: string;
  children: ReactNode;
  banner?: ReactNode;
}

function NavLinks({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.label && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              if (item.comingSoon) {
                return (
                  <li key={item.to}>
                    <div
                      aria-disabled
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-muted/70"
                    >
                      <item.icon className="size-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      <span className="rounded-full border border-sidebar-border px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider">
                        Soon
                      </span>
                    </div>
                  </li>
                );
              }
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-gold" aria-hidden />
                    )}
                    <item.icon className={cn("size-4 shrink-0", active && "text-gold")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarContent({
  groups,
  subtitle,
  user,
  onNavigate,
}: {
  groups: NavGroup[];
  subtitle: string;
  user: CurrentUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-5 py-5">
        <Logo dark subtitle={subtitle} />
      </div>
      <NavLinks groups={groups} {...(onNavigate ? { onNavigate } : {})} />
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2.5">
          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-gold-foreground">
            {initials(user.profile?.full_name || user.email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
              {user.profile?.full_name || user.email}
            </p>
            <p className="truncate text-[11px] text-sidebar-muted">
              {user.primaryRole ? ROLE_LABELS[user.primaryRole] : "Member"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ user, groups, subtitle, contextLabel, children, banner }: AppShellProps) {
  const [open, setOpen] = useState(false);
  const signOut = useSignOut();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarContent groups={groups} subtitle={subtitle} user={user} />
      </aside>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent groups={groups} subtitle={subtitle} user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu />
          </Button>
          <div className="hidden min-w-0 items-center gap-2 md:flex">
            {contextLabel && (
              <Badge variant="gold" className="max-w-[260px] truncate">
                {contextLabel}
              </Badge>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search…"
                aria-label="Search"
                className="h-9 w-56 rounded-lg border bg-background pl-9 pr-3 text-sm outline-none transition focus:gold-ring"
              />
            </div>
            <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
              <Bell />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" aria-hidden />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {initials(user.profile?.full_name || user.email)}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-sm md:inline">
                    {user.profile?.full_name || user.email}
                  </span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p className="truncate text-sm font-semibold">{user.profile?.full_name || "Account"}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={user.isPlatformAdmin ? "/admin/settings" : "/app/settings"}>
                    <UserCircle2 className="mr-2 size-4" /> Profile & settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {banner}
        <main className="flex-1 px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
