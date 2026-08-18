import { describe, expect, it } from "vitest";
import { buildPortableDatabase, inspectPortableDatabase, PORTABLE_DB_FORMAT, portableTables } from "./dataExchange";

describe("portable SQLite exchange", () => {
  it("writes a standard SQLite database containing collection and international-policy records", async () => {
    const bytes = await buildPortableDatabase({
      sources: [{ id: 1, name: "統計ポータル", policyArea: "社会保護", owner: "統計局", updateFrequency: "annual", sourceUrl: "https://example.org/data", description: "公開統計", lastUpdatedAt: new Date("2026-01-01T00:00:00Z") }],
      indicators: [{ id: 2, name: "到達率", policyArea: "社会保護", definition: "対象者の到達割合", calculation: "受給者 / 対象者", unit: "%", targetValue: 80, targetDirection: "increase", dataSourceId: 1, lastUpdatedAt: new Date("2026-01-01T00:00:00Z") }],
      observations: [{ indicatorId: 2, observedAt: new Date("2026-01-01T00:00:00Z"), value: 72, note: "年次値" }],
      collectionRuns: [{ id: 3, provider: "kitesurf", requestUrl: "https://example.org/report", requestMode: "simple", instruction: null, status: "succeeded", resultSummary: "公開資料を発見", resultUrl: null, errorMessage: null, createdAt: new Date("2026-01-02T00:00:00Z"), completedAt: new Date("2026-01-02T00:01:00Z") }],
      sourceCandidates: [{ id: 4, collectionRunId: 3, name: "評価報告書", candidateUrl: "https://example.org/report", description: "公開評価", suggestedPolicyArea: "社会保護", status: "accepted", createdAt: new Date("2026-01-02T00:01:00Z"), reviewedAt: new Date("2026-01-02T00:02:00Z") }],
      policySources: [{ id: 5, name: "独立評価", organization: "国際機関", sourceType: "international_org", reliabilityTier: "independent_evaluation", sourceUrl: "https://example.org/evaluation", countryOrRegion: "Global", language: "English", verificationStatus: "verified", publishedAt: new Date("2025-12-01T00:00:00Z"), retrievedAt: new Date("2026-01-02T00:00:00Z") }],
      policyEssences: [{ id: 6, sourceId: 5, sourceCandidateId: 4, title: "社会保護到達政策", country: "Testland", region: "Global", policyDomain: "社会保護", policyObjective: "到達率を高める", policySummary: "地域窓口を活用する。", targetPopulation: "低所得世帯", implementationDesign: "地域連携", evidenceType: "mixed", evaluationMethod: "混合手法", resultSummary: "到達率が改善", outcomeInterpretation: "文脈を要確認", status: "reviewed", publishedAt: new Date("2025-12-01T00:00:00Z"), collectedAt: new Date("2026-01-02T00:00:00Z"), context: { socialContext: "都市部と地方部の格差", equityConsiderations: "交通弱者への配慮", institutionalContext: "地方自治体が実施", implementationCapacity: "現場人員が必要", riskFactors: "予算制約", transferabilityNotes: "地域制度の確認が必要" }, review: { evidenceTransparency: "high", designCredibility: "medium", contextFit: "medium", equityImpact: "positive", transferability: "medium", limitations: "短期評価", reviewerNote: "継続監視が必要" } }],
    });
    const header = new TextDecoder().decode(bytes.slice(0, 15));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const preview = await inspectPortableDatabase(buffer);

    expect(header).toContain("SQLite format 3");
    expect(preview.compatible).toBe(true);
    expect(preview.format).toBe(PORTABLE_DB_FORMAT);
    expect(preview.counts.policy_essences).toBe(1);
    expect(preview.counts.policy_reviews).toBe(1);
    expect(portableTables).toContain("policy_contexts");
  });
});
