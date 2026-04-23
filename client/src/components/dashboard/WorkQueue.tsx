import { cn } from "@/lib/utils";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { ComponentType } from "react";

export interface WorkQueueItem {
  id: string;
  urgency: "critical" | "warning" | "info" | "ok";
  icon: ComponentType<{ className?: string }>;
  label: string;
  count: number;
  value?: string;
  href: string;
}

const URGENCY_STYLES: Record<WorkQueueItem["urgency"], string> = {
  critical: "border-l-red-500 bg-destructive/10/40",
  warning: "border-l-amber-400 bg-amber-50/30",
  info: "border-l-sky-400 bg-sky-50/30",
  ok: "border-l-emerald-400 bg-emerald-50/30",
};

const URGENCY_COUNT_STYLES: Record<WorkQueueItem["urgency"], string> = {
  critical: "text-destructive font-bold",
  warning: "text-amber-700 font-semibold",
  info: "text-sky-700 font-medium",
  ok: "text-emerald-700 font-medium",
};

export function WorkQueue({ items }: { items: WorkQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-5 text-muted-foreground">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <span className="text-sm">All clear — no urgent items.</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {items.map(item => (
        <Link key={item.id} href={item.href}>
          <div
            className={cn(
              "flex items-center gap-3 px-4 py-3 border-l-[3px] cursor-pointer",
              "hover:brightness-95 transition-all group",
              URGENCY_STYLES[item.urgency]
            )}
          >
            <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-sm text-foreground">{item.label}</span>
            {item.value && (
              <span className="text-sm text-muted-foreground font-mono">
                {item.value}
              </span>
            )}
            <span
              className={cn(
                "text-base min-w-[1.5rem] text-right",
                URGENCY_COUNT_STYLES[item.urgency]
              )}
            >
              {item.count}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}
