"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { Flame, Menu } from "lucide-react";
import Logo from "@/components/common/Logo";
import { UserNav } from "@/components/common/UserNav";
import { AppNav } from "./AppNav";

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useUser();

  return (
    <div className="app-shell-bg min-h-screen" data-ui="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="app-shell-chrome sticky top-4 z-40 mb-4 flex items-center justify-between rounded-[28px] px-4 py-3 sm:px-5 lg:hidden">
          <Link href="/workouts" className="flex items-center gap-3 text-slate-950">
            <Logo isMobile />
            <div>
              <p className="font-montserrat text-sm font-semibold tracking-[-0.03em]">Workout Tracker</p>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-app-shell-muted)]">App shell</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/workouts/active"
              className="inline-flex h-10 items-center rounded-full bg-slate-950 px-4 text-xs font-semibold text-white"
            >
              Resume
            </Link>
            {user ? (
              <UserNav
                image={user.imageUrl}
                name={user.fullName ?? "Account"}
                email={user.primaryEmailAddress?.emailAddress ?? "No email"}
              />
            ) : (
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-700"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[304px_minmax(0,1fr)]">
          <aside className="hidden lg:block" data-ui="app-shell-sidebar">
            <div className="app-shell-panel app-shell-chrome sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col rounded-[34px] p-5">
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="grid gap-3">
                  <Link href="/workouts" className="inline-flex items-center gap-3 text-slate-950">
                    <Logo />
                  </Link>
                  <div className="grid gap-1">
                    <p className="font-montserrat text-lg font-semibold tracking-[-0.04em] text-slate-950">
                      Training hub
                    </p>
                    <p className="max-w-[18rem] text-sm leading-6 text-[var(--color-app-shell-muted)]">
                      One authenticated layout path for planning, logging, sharing, and competition.
                    </p>
                  </div>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl app-shell-warm-gradient text-white shadow-[0_16px_30px_rgba(190,93,34,0.22)]">
                  <Flame className="h-5 w-5" />
                </span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AppNav />
              </div>
            </div>
          </aside>

          <div className="min-w-0" data-ui="app-shell-main">
            <div className="app-shell-panel rounded-[34px] border-white/55 px-4 py-4 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
              <header
                data-ui="app-shell-header"
                className="app-shell-chrome mb-5 hidden items-center justify-between rounded-[28px] px-5 py-4 lg:flex"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-app-shell-accent-strong)]">
                    Authenticated workspace
                  </p>
                  <h1 className="mt-1 font-montserrat text-2xl font-semibold tracking-[-0.05em] text-slate-950">
                    Move through the app without rewriting chrome per page.
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/workouts/active"
                    className="inline-flex h-11 items-center rounded-full border border-white/70 bg-white/82 px-4 text-sm font-semibold text-slate-700 transition hover:bg-white"
                  >
                    Resume active workout
                  </Link>
                  {user ? (
                    <UserNav
                      image={user.imageUrl}
                      name={user.fullName ?? "Account"}
                      email={user.primaryEmailAddress?.emailAddress ?? "No email"}
                    />
                  ) : null}
                </div>
              </header>

              <main data-ui="app-shell-content" className="min-h-[60vh]">
                {children}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
