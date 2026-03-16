import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type AppBadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "ghost";
type AppBadgeSize = "sm" | "md";

export interface AppBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: AppBadgeTone;
  size?: AppBadgeSize;
}

const toneClasses: Record<AppBadgeTone, string> = {
  neutral:
    "app-badge-neutral border-white/55 bg-white/72 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
  accent:
    "app-badge-accent border-amber-200/70 bg-[linear-gradient(135deg,rgba(255,244,229,0.96),rgba(255,228,205,0.88))] text-amber-900",
  success:
    "app-badge-success border-emerald-200/70 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(209,250,229,0.88))] text-emerald-800",
  warning:
    "app-badge-warning border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(254,243,199,0.88))] text-amber-800",
  danger:
    "app-badge-danger border-rose-200/80 bg-[linear-gradient(135deg,rgba(255,241,242,0.98),rgba(255,228,230,0.9))] text-rose-700",
  ghost:
    "app-badge-ghost border-white/15 bg-white/10 text-white shadow-none",
};

const sizeClasses: Record<AppBadgeSize, string> = {
  sm: "min-h-6 px-2.5 text-[0.68rem] tracking-[0.14em]",
  md: "min-h-7 px-3 text-[0.72rem] tracking-[0.16em]",
};

export function AppBadge({
  className,
  tone = "neutral",
  size = "md",
  children,
  ...props
}: AppBadgeProps) {
  return (
    <span
      data-ui="app-badge"
      className={cn(
        "app-badge inline-flex items-center justify-center rounded-full border font-montserrat text-[0.72rem] font-semibold uppercase tracking-[0.16em] whitespace-nowrap transition-colors",
        toneClasses[tone],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default AppBadge;
