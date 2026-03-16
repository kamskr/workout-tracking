import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AppBadge } from "./AppBadge";

type HeaderElementProps = Omit<ComponentPropsWithoutRef<"header">, "title">;

interface PageHeaderProps extends HeaderElementProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  align?: "start" | "center";
}

const alignClasses: Record<NonNullable<PageHeaderProps["align"]>, string> = {
  start: "items-start text-left",
  center: "items-center text-center",
};

export function PageHeader({
  className,
  title,
  subtitle,
  eyebrow,
  actions,
  meta,
  badge,
  align = "start",
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-ui="page-header"
      className={cn(
        "app-page-header app-page-section grid gap-5 rounded-[32px] border border-white/55 bg-[linear-gradient(145deg,rgba(255,252,248,0.96),rgba(255,241,231,0.88))] px-5 py-6 shadow-[0_24px_56px_rgba(91,43,15,0.1)] backdrop-blur-xl sm:px-7 sm:py-7",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className={cn("flex min-w-0 flex-1 flex-col gap-3", alignClasses[align])}>
          {(eyebrow || badge) && (
            <div className="app-page-header-topline flex flex-wrap items-center gap-2">
              {eyebrow ? (
                <span className="app-page-eyebrow">{eyebrow}</span>
              ) : (
                <AppBadge tone="accent" size="sm">
                  Overview
                </AppBadge>
              )}
              {badge}
            </div>
          )}

          <div className="grid gap-2">
            <h1 className="app-page-title text-balance text-[clamp(2rem,4vw,3.75rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-slate-950">
              {title}
            </h1>
            {subtitle ? (
              <p className="app-page-subtitle max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>

          {meta ? <div className="app-page-meta flex flex-wrap gap-2">{meta}</div> : null}
        </div>

        {actions ? (
          <div
            data-ui="page-header-actions"
            className="app-page-actions flex shrink-0 flex-wrap items-center gap-3 lg:justify-end"
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;
