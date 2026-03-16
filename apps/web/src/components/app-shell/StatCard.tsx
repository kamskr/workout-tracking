import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  trend?: ReactNode;
  icon?: ReactNode;
  emphasis?: "default" | "warm" | "cool";
}

const emphasisClasses: Record<NonNullable<StatCardProps["emphasis"]>, string> = {
  default:
    "bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,247,241,0.88))] text-slate-900",
  warm:
    "bg-[linear-gradient(145deg,rgba(255,245,235,0.98),rgba(255,228,205,0.88))] text-slate-950",
  cool: "bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(240,249,255,0.9))] text-slate-950",
};

export function StatCard({
  className,
  label,
  value,
  description,
  trend,
  icon,
  emphasis = "default",
  ...props
}: StatCardProps) {
  return (
    <div
      data-ui="stat-card"
      className={cn(
        "app-stat-card rounded-[24px] border border-white/60 p-4 shadow-[0_18px_36px_rgba(83,37,10,0.08)] backdrop-blur-xl sm:p-5",
        emphasisClasses[emphasis],
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="app-stat-label text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {label}
          </p>
          <p className="app-stat-value mt-3 text-[clamp(1.65rem,3vw,2.3rem)] font-semibold leading-none tracking-[-0.06em] text-inherit">
            {value}
          </p>
          {description ? (
            <p className="app-stat-description mt-2 text-sm leading-6 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>
        {icon ? (
          <div className="app-stat-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/72 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            {icon}
          </div>
        ) : null}
      </div>
      {trend ? <div className="app-stat-trend mt-4">{trend}</div> : null}
    </div>
  );
}

export default StatCard;
