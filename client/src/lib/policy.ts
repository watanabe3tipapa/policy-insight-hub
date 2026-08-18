export type FreshnessStatus = "current" | "warning" | "stale" | "unknown";

export const frequencyLabels = {
  daily: "日次",
  monthly: "月次",
  quarterly: "四半期",
  annual: "年次",
  irregular: "不定期",
} as const;

export const directionLabels = {
  increase: "増加を目標",
  decrease: "減少を目標",
  maintain: "維持を目標",
} as const;

export const reviewStatusLabels = {
  scheduled: "予定",
  completed: "実施済み",
  closed: "クローズ",
} as const;

export const actionStatusLabels = {
  open: "未着手",
  in_progress: "進行中",
  completed: "完了",
} as const;

export function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
}

export function formatDate(value: Date | string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  const date = asDate(value);
  if (!date) return "未登録";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  }).format(date);
}

export function toDateInput(value: Date | string | null | undefined) {
  const date = asDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

export function toDateTimeLocalInput(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.valueOf() - offset).toISOString().slice(0, 16);
}

export function freshnessFor(
  value: Date | string | null | undefined,
  frequency?: keyof typeof frequencyLabels,
): FreshnessStatus {
  const date = asDate(value);
  if (!date) return "unknown";
  const ageDays = (Date.now() - date.valueOf()) / 86_400_000;
  const warningDays = frequency === "daily" ? 2 : frequency === "monthly" ? 40 : frequency === "quarterly" ? 120 : frequency === "annual" ? 400 : 90;
  if (ageDays > warningDays * 1.6) return "stale";
  if (ageDays > warningDays) return "warning";
  return "current";
}

export function downloadData(filename: string, data: Record<string, unknown>[], format: "csv" | "json") {
  const payload =
    format === "json"
      ? JSON.stringify(data, null, 2)
      : toCsv(data);
  const blob = new Blob([payload], { type: format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.${format}`;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const fields = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${[fields.join(","), ...rows.map(row => fields.map(field => escape(row[field])).join(","))].join("\n")}`;
}
