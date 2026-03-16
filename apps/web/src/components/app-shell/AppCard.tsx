import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tone?: "default" | "raised" | "subtle" | "highlight";
  padding?: "sm" | "md" | "lg";
  interactive?: boolean;
}

const toneClasses: Record<NonNullable<AppCardProps["tone"]>, string> = {
  default: "app-card-default bg-[var(--app-card-bg)] text-slate-900",
  raised: "app-card-raised bg-[var(--app-card-bg-strong)] text-slate-950 shadow-[0_28px_60px_rgba(70,34,13,0.12)]",
  subtle: "app-card-subtle bg-white/58 text-slate-800 shadow-[0_14px_30px_rgba(70,34,13,0.06)]",
  highlight:
    "app-card-highlight bg-[linear-gradient(160deg,rgba(255,247,237,0.98),rgba(255,232,214,0.92))] text-slate-950 shadow-[0_26px_52px_rgba(120,56,18,0.16)]",
};

const paddingClasses: Record<NonNullable<AppCardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-7",
};

export function AppCard({
  className,
  children,
  tone = "default",
  padding = "md",
  interactive = false,
  ...props
}: AppCardProps) {
  return (
    <div
      data-ui="app-card"
      className={cn(
        "app-card app-card-surface relative overflow-hidden rounded-[28px] border border-[var(--app-card-border)] backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-200",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18),rgba(255,255,255,0.65))]",
        interactive &&
          "hover:-translate-y-0.5 hover:border-[var(--app-card-border-strong)] hover:shadow-[0_24px_48px_rgba(70,34,13,0.12)]",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default AppCard;
