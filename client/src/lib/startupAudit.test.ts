import { describe, expect, it } from "vitest";
import { formatStartupOutcome, toStartupAuditView } from "./startupAudit";

describe("startup audit presentation", () => {
  it("renders persisted startup outcomes for the collection management view", () => {
    expect(formatStartupOutcome("succeeded")).toBe("更新完了");
    expect(formatStartupOutcome("failed")).toBe("更新失敗");
    expect(formatStartupOutcome("skipped_fresh")).toBe("最新のため未実行");
    expect(formatStartupOutcome("skipped_leased")).toBe("別プロセスが更新中");
  });

  it("keeps the persisted audit message and timestamp for the collection view", () => {
    const checkedAt = new Date("2026-08-18T00:00:00.000Z");
    expect(toStartupAuditView({ lastStartupCheckAt: checkedAt, lastStartupOutcome: "succeeded", lastStartupMessage: "2件の候補を受信しました。" })).toEqual({ label: "更新完了", checkedAt, message: "2件の候補を受信しました。" });
  });
});
