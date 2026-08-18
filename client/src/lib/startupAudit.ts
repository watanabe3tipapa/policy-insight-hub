export const startupOutcomeLabels: Record<string, string> = {
  idle: "未実行",
  skipped_fresh: "最新のため未実行",
  skipped_unconfigured: "設定不足のため未実行",
  skipped_leased: "別プロセスが更新中",
  refreshing: "更新中",
  succeeded: "更新完了",
  failed: "更新失敗",
};

export function formatStartupOutcome(outcome: string | null | undefined) {
  return startupOutcomeLabels[outcome ?? "idle"] ?? "未実行";
}

export type StartupAuditView = {
  lastStartupCheckAt: Date | null;
  lastStartupOutcome: string | null;
  lastStartupMessage: string | null;
};

export function toStartupAuditView(audit: StartupAuditView | null | undefined) {
  return {
    label: formatStartupOutcome(audit?.lastStartupOutcome),
    checkedAt: audit?.lastStartupCheckAt ?? null,
    message: audit?.lastStartupMessage ?? null,
  };
}
