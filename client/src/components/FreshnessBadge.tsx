import { AlertTriangle, CheckCircle2, Clock3, HelpCircle } from "lucide-react";
import { formatDate, freshnessFor, type FreshnessStatus } from "@/lib/policy";

const statusMap: Record<FreshnessStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  current: { label: "最新", icon: CheckCircle2, className: "freshness-current" },
  warning: { label: "更新注意", icon: Clock3, className: "freshness-warning" },
  stale: { label: "更新遅延", icon: AlertTriangle, className: "freshness-stale" },
  unknown: { label: "未確認", icon: HelpCircle, className: "freshness-unknown" },
};

export function FreshnessBadge({
  updatedAt,
  frequency,
  compact = false,
}: {
  updatedAt: Date | string | null | undefined;
  frequency?: "daily" | "monthly" | "quarterly" | "annual" | "irregular";
  compact?: boolean;
}) {
  const status = freshnessFor(updatedAt, frequency);
  const config = statusMap[status];
  const Icon = config.icon;
  return (
    <span className={`freshness-badge ${config.className}`} title={`最終更新日: ${formatDate(updatedAt)}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      <span>{compact ? config.label : `${config.label} · ${formatDate(updatedAt)}`}</span>
    </span>
  );
}
