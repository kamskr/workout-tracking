"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, ChevronRight, Dumbbell, LayoutTemplate, Medal, Trophy, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/exercises", label: "Exercises", icon: Activity },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/feed", label: "Feed", icon: Users },
] as const;

const secondaryNav = [
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/leaderboards", label: "Leaderboards", icon: Medal },
  { href: "/challenges", label: "Challenges", icon: Trophy },
  { href: "/profile/setup", label: "Profile", icon: User, match: ["/profile"] },
] as const;

function isCurrentPath(pathname: string, href: string, match?: readonly string[]) {
  if (href === "/workouts") {
    return pathname === href || pathname.startsWith("/workouts/");
  }

  if (match?.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: readonly { href: string; label: string; icon: React.ComponentType<{ className?: string }>; match?: readonly string[] }[];
  pathname: string;
}) {
  return (
    <div className="grid gap-3">
      <p className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--color-app-shell-muted)]">
        {title}
      </p>
      <div className="grid gap-2">
        {items.map((item) => {
          const active = isCurrentPath(pathname, item.href, item.match);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-ui="app-nav-link"
              data-active={active ? "true" : "false"}
              className={cn(
                "group flex items-center justify-between rounded-[22px] border px-4 py-3 transition-all duration-200",
                active
                  ? "border-white/70 bg-white/88 text-slate-950 shadow-[0_18px_38px_rgba(74,32,11,0.12)]"
                  : "border-transparent bg-white/40 text-slate-600 hover:border-white/55 hover:bg-white/72 hover:text-slate-900",
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-2xl transition-colors",
                    active
                      ? "app-shell-warm-gradient text-white shadow-[0_12px_26px_rgba(190,93,34,0.25)]"
                      : "bg-white/80 text-[var(--color-app-shell-muted)] group-hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-montserrat text-sm font-semibold tracking-[-0.02em]">
                  {item.label}
                </span>
              </span>
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  active
                    ? "translate-x-0 text-[var(--color-app-shell-accent-strong)]"
                    : "-translate-x-1 text-slate-300 group-hover:translate-x-0 group-hover:text-slate-400",
                )}
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="App navigation"
      data-ui="app-nav"
      className="grid gap-6"
    >
      <NavSection title="Train" items={primaryNav} pathname={pathname} />
      <NavSection title="Compete" items={secondaryNav} pathname={pathname} />
      <div className="app-shell-surface-soft rounded-[26px] border border-white/60 px-4 py-4 shadow-[0_18px_36px_rgba(87,40,14,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-app-shell-accent-strong)]">
          Quick start
        </p>
        <p className="mt-2 font-montserrat text-sm font-semibold text-slate-900">
          Jump back into today’s training session.
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--color-app-shell-muted)]">
          Active workouts and group sessions stay one tap away without mixing them into the public marketing nav.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/workouts/active"
            className="inline-flex items-center rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Active workout
          </Link>
          <Link
            href="/workouts"
            className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-white"
          >
            History
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default AppNav;
