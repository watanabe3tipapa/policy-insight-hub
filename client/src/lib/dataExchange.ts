import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

export const PORTABLE_DB_FORMAT = "policy-insight-hub-sqlite";
export const PORTABLE_DB_VERSION = "1.0";
export const portableTables = [
  "hub_metadata",
  "hub_manifest",
  "data_sources",
  "policy_indicators",
  "indicator_observations",
  "collection_runs",
  "source_candidates",
  "policy_sources",
  "policy_essences",
  "policy_contexts",
  "policy_reviews",
] as const;

type DateLike = Date | string | null | undefined;
type DataSourceRow = { id: number; name: string; policyArea: string; owner: string; updateFrequency: string; sourceUrl: string | null; description: string | null; lastUpdatedAt: DateLike };
type IndicatorRow = { id: number; name: string; policyArea: string; definition: string; calculation: string | null; unit: string; targetValue: number | null; targetDirection: string; dataSourceId: number | null; lastUpdatedAt: DateLike };
type ObservationRow = { indicatorId: number; observedAt: DateLike; value: number; note: string | null };
type CollectionRunRow = { id: number; provider: string; requestUrl: string; requestMode: string; instruction: string | null; status: string; resultSummary: string | null; resultUrl: string | null; errorMessage: string | null; createdAt: DateLike; completedAt: DateLike };
type SourceCandidateRow = { id: number; collectionRunId: number | null; name: string; candidateUrl: string | null; description: string | null; suggestedPolicyArea: string | null; status: string; createdAt: DateLike; reviewedAt: DateLike };
type PolicySourceRow = { id: number; name: string; organization: string; sourceType: string; reliabilityTier: string; sourceUrl: string; countryOrRegion: string | null; language: string | null; verificationStatus: string; publishedAt: DateLike; retrievedAt: DateLike };
type PolicyEssenceRow = { id: number; sourceId: number; sourceCandidateId: number | null; title: string; country: string; region: string; policyDomain: string; policyObjective: string; policySummary: string; targetPopulation: string | null; implementationDesign: string | null; evidenceType: string; evaluationMethod: string | null; resultSummary: string | null; outcomeInterpretation: string | null; status: string; publishedAt: DateLike; collectedAt: DateLike; context: { socialContext: string | null; equityConsiderations: string | null; institutionalContext: string | null; implementationCapacity: string | null; riskFactors: string | null; transferabilityNotes: string | null } | null; review: { evidenceTransparency: string; designCredibility: string; contextFit: string; equityImpact: string; transferability: string; limitations: string | null; reviewerNote: string | null } | null };

export type PortableDataset = {
  sources: DataSourceRow[];
  indicators: IndicatorRow[];
  observations: ObservationRow[];
  collectionRuns: CollectionRunRow[];
  sourceCandidates: SourceCandidateRow[];
  policySources: PolicySourceRow[];
  policyEssences: PolicyEssenceRow[];
};

export type PortablePreview = {
  compatible: boolean;
  format: string | null;
  version: string | null;
  exportedAt: string | null;
  errors: string[];
  counts: Record<string, number>;
};

let sqlPromise: Promise<SqlJsStatic> | null = null;

async function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () =>
        typeof window === "undefined"
          ? new URL("../../../node_modules/sql.js/dist/sql-wasm.wasm", import.meta.url).pathname
          : wasmUrl,
    });
  }
  return sqlPromise;
}

const dateText = (value: DateLike) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
};

function run(db: Database, query: string, values: (string | number | null)[] = []) {
  db.run(query, values);
}

function createPortableSchema(db: Database) {
  db.run("PRAGMA foreign_keys = ON");
  db.run(`CREATE TABLE hub_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)`);
  db.run(`CREATE TABLE hub_manifest (table_name TEXT PRIMARY KEY NOT NULL, row_count INTEGER NOT NULL, description TEXT NOT NULL)`);
  db.run(`CREATE TABLE data_sources (
    source_key TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, policy_area TEXT NOT NULL, owner_org TEXT NOT NULL,
    update_frequency TEXT NOT NULL, source_url TEXT, description TEXT, last_updated_at TEXT
  )`);
  db.run(`CREATE TABLE policy_indicators (
    indicator_key TEXT PRIMARY KEY NOT NULL, source_key TEXT REFERENCES data_sources(source_key), name TEXT NOT NULL,
    policy_area TEXT NOT NULL, definition TEXT NOT NULL, calculation TEXT, unit TEXT NOT NULL, target_value REAL,
    target_direction TEXT NOT NULL, last_updated_at TEXT
  )`);
  db.run(`CREATE TABLE indicator_observations (
    indicator_key TEXT NOT NULL REFERENCES policy_indicators(indicator_key), observed_at TEXT NOT NULL,
    value REAL NOT NULL, note TEXT, PRIMARY KEY (indicator_key, observed_at)
  )`);
  db.run(`CREATE TABLE collection_runs (
    run_key TEXT PRIMARY KEY NOT NULL, provider TEXT NOT NULL, request_url TEXT NOT NULL, request_mode TEXT NOT NULL,
    instruction TEXT, status TEXT NOT NULL, result_summary TEXT, result_url TEXT, error_message TEXT,
    requested_at TEXT NOT NULL, completed_at TEXT
  )`);
  db.run(`CREATE TABLE source_candidates (
    candidate_key TEXT PRIMARY KEY NOT NULL, run_key TEXT REFERENCES collection_runs(run_key), name TEXT NOT NULL,
    candidate_url TEXT, description TEXT, suggested_policy_area TEXT, status TEXT NOT NULL,
    captured_at TEXT NOT NULL, reviewed_at TEXT
  )`);
  db.run(`CREATE TABLE policy_sources (
    policy_source_key TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, organization TEXT NOT NULL, source_type TEXT NOT NULL,
    reliability_tier TEXT NOT NULL, source_url TEXT NOT NULL, country_or_region TEXT, language TEXT,
    verification_status TEXT NOT NULL, published_at TEXT, retrieved_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE policy_essences (
    policy_key TEXT PRIMARY KEY NOT NULL, policy_source_key TEXT NOT NULL REFERENCES policy_sources(policy_source_key),
    candidate_key TEXT REFERENCES source_candidates(candidate_key), title TEXT NOT NULL, country TEXT NOT NULL, region TEXT NOT NULL,
    policy_domain TEXT NOT NULL, policy_objective TEXT NOT NULL, policy_summary TEXT NOT NULL, target_population TEXT,
    implementation_design TEXT, evidence_type TEXT NOT NULL, evaluation_method TEXT, result_summary TEXT,
    outcome_interpretation TEXT, status TEXT NOT NULL, published_at TEXT, collected_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE policy_contexts (
    policy_key TEXT PRIMARY KEY NOT NULL REFERENCES policy_essences(policy_key), social_context TEXT, equity_considerations TEXT,
    institutional_context TEXT, implementation_capacity TEXT, risk_factors TEXT, transferability_notes TEXT
  )`);
  db.run(`CREATE TABLE policy_reviews (
    policy_key TEXT PRIMARY KEY NOT NULL REFERENCES policy_essences(policy_key), evidence_transparency TEXT NOT NULL,
    design_credibility TEXT NOT NULL, context_fit TEXT NOT NULL, equity_impact TEXT NOT NULL, transferability TEXT NOT NULL,
    limitations TEXT, reviewer_note TEXT
  )`);
}

export async function buildPortableDatabase(dataset: PortableDataset): Promise<Uint8Array> {
  const SQL = await getSql();
  const db = new SQL.Database();
  try {
    createPortableSchema(db);
    const exportedAt = new Date().toISOString();
    run(db, "INSERT INTO hub_metadata VALUES (?, ?)", ["format", PORTABLE_DB_FORMAT]);
    run(db, "INSERT INTO hub_metadata VALUES (?, ?)", ["format_version", PORTABLE_DB_VERSION]);
    run(db, "INSERT INTO hub_metadata VALUES (?, ?)", ["exported_at", exportedAt]);
    run(db, "INSERT INTO hub_metadata VALUES (?, ?)", ["timezone", "UTC"]);
    run(db, "INSERT INTO hub_metadata VALUES (?, ?)", ["encoding", "UTF-8"]);

    const sourceKeyById = new Map(dataset.sources.map(source => [source.id, `source-${source.id}`]));
    const indicatorKeyById = new Map(dataset.indicators.map(indicator => [indicator.id, `indicator-${indicator.id}`]));
    const runKeyById = new Map(dataset.collectionRuns.map(item => [item.id, `run-${item.id}`]));
    const policySourceKeyById = new Map(dataset.policySources.map(source => [source.id, `policy-source-${source.id}`]));
    const policyKeyById = new Map(dataset.policyEssences.map(policy => [policy.id, `policy-${policy.id}`]));
    db.run("BEGIN");
    dataset.sources.forEach(source => run(db, "INSERT INTO data_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      sourceKeyById.get(source.id) ?? `source-${source.id}`, source.name, source.policyArea, source.owner, source.updateFrequency,
      source.sourceUrl, source.description, dateText(source.lastUpdatedAt),
    ]));
    dataset.indicators.forEach(indicator => run(db, "INSERT INTO policy_indicators VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      indicatorKeyById.get(indicator.id) ?? `indicator-${indicator.id}`, indicator.dataSourceId ? sourceKeyById.get(indicator.dataSourceId) ?? null : null,
      indicator.name, indicator.policyArea, indicator.definition, indicator.calculation, indicator.unit, indicator.targetValue,
      indicator.targetDirection, dateText(indicator.lastUpdatedAt),
    ]));
    dataset.observations.forEach(observation => {
      const indicatorKey = indicatorKeyById.get(observation.indicatorId);
      if (indicatorKey) run(db, "INSERT OR REPLACE INTO indicator_observations VALUES (?, ?, ?, ?)", [indicatorKey, dateText(observation.observedAt), observation.value, observation.note]);
    });
    dataset.collectionRuns.forEach(item => run(db, "INSERT INTO collection_runs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      runKeyById.get(item.id) ?? `run-${item.id}`, item.provider, item.requestUrl, item.requestMode, item.instruction, item.status,
      item.resultSummary, item.resultUrl, item.errorMessage, dateText(item.createdAt) ?? exportedAt, dateText(item.completedAt),
    ]));
    dataset.sourceCandidates.forEach(candidate => run(db, "INSERT INTO source_candidates VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      `candidate-${candidate.id}`, candidate.collectionRunId ? runKeyById.get(candidate.collectionRunId) ?? null : null, candidate.name,
      candidate.candidateUrl, candidate.description, candidate.suggestedPolicyArea, candidate.status,
      dateText(candidate.createdAt) ?? exportedAt, dateText(candidate.reviewedAt),
    ]));
    dataset.policySources.forEach(source => run(db, "INSERT INTO policy_sources VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      policySourceKeyById.get(source.id) ?? `policy-source-${source.id}`, source.name, source.organization, source.sourceType,
      source.reliabilityTier, source.sourceUrl, source.countryOrRegion, source.language, source.verificationStatus,
      dateText(source.publishedAt), dateText(source.retrievedAt) ?? exportedAt,
    ]));
    dataset.policyEssences.forEach(policy => {
      const policyKey = policyKeyById.get(policy.id) ?? `policy-${policy.id}`;
      run(db, "INSERT INTO policy_essences VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        policyKey, policySourceKeyById.get(policy.sourceId) ?? null, policy.sourceCandidateId ? `candidate-${policy.sourceCandidateId}` : null,
        policy.title, policy.country, policy.region, policy.policyDomain, policy.policyObjective, policy.policySummary,
        policy.targetPopulation, policy.implementationDesign, policy.evidenceType, policy.evaluationMethod, policy.resultSummary,
        policy.outcomeInterpretation, policy.status, dateText(policy.publishedAt), dateText(policy.collectedAt) ?? exportedAt,
      ]);
      if (policy.context) run(db, "INSERT INTO policy_contexts VALUES (?, ?, ?, ?, ?, ?, ?)", [
        policyKey, policy.context.socialContext, policy.context.equityConsiderations, policy.context.institutionalContext,
        policy.context.implementationCapacity, policy.context.riskFactors, policy.context.transferabilityNotes,
      ]);
      if (policy.review) run(db, "INSERT INTO policy_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
        policyKey, policy.review.evidenceTransparency, policy.review.designCredibility, policy.review.contextFit,
        policy.review.equityImpact, policy.review.transferability, policy.review.limitations, policy.review.reviewerNote,
      ]);
    });
    const manifests: [string, number, string][] = [
      ["data_sources", dataset.sources.length, "政策データソースの来歴・更新情報"],
      ["policy_indicators", dataset.indicators.length, "政策KPIと指標定義"],
      ["indicator_observations", dataset.observations.length, "指標の観測値"],
      ["collection_runs", dataset.collectionRuns.length, "Kitesurf等の情報収集実行ログ"],
      ["source_candidates", dataset.sourceCandidates.length, "収集結果から抽出されたデータソース候補"],
      ["policy_sources", dataset.policySources.length, "国際EBPM政策の原資料と評価資料の来歴"],
      ["policy_essences", dataset.policyEssences.length, "国際EBPM政策の目的・仕組み・成果の要点"],
      ["policy_contexts", dataset.policyEssences.filter(policy => policy.context).length, "社会的・制度的文脈と移転可能性"],
      ["policy_reviews", dataset.policyEssences.filter(policy => policy.review).length, "根拠・公平性・文脈適合性の評価"],
    ];
    manifests.forEach(row => run(db, "INSERT INTO hub_manifest VALUES (?, ?, ?)", row));
    db.run("COMMIT");
    return db.export();
  } catch (error) {
    try { db.run("ROLLBACK"); } catch { /* no active transaction */ }
    throw error;
  } finally {
    db.close();
  }
}

export async function inspectPortableDatabase(buffer: ArrayBuffer): Promise<PortablePreview> {
  const SQL = await getSql();
  const db = new SQL.Database(new Uint8Array(buffer));
  try {
    const tableRows = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]?.values ?? [];
    const tables = new Set(tableRows.map(row => String(row[0])));
    const metadataRows = tables.has("hub_metadata") ? db.exec("SELECT key, value FROM hub_metadata")[0]?.values ?? [] : [];
    const metadata = new Map(metadataRows.map(row => [String(row[0]), String(row[1])]));
    const errors: string[] = [];
    if (metadata.get("format") !== PORTABLE_DB_FORMAT) errors.push("Policy Insight Hubのデータ交換形式ではありません。");
    if (metadata.get("format_version") !== PORTABLE_DB_VERSION) errors.push("対応していないデータ交換形式のバージョンです。");
    ["data_sources", "policy_indicators", "indicator_observations", "collection_runs", "source_candidates", "policy_sources", "policy_essences", "policy_contexts", "policy_reviews"].forEach(table => {
      if (!tables.has(table)) errors.push(`必須テーブル ${table} が見つかりません。`);
    });
    const counts: Record<string, number> = {};
    ["data_sources", "policy_indicators", "indicator_observations", "collection_runs", "source_candidates", "policy_sources", "policy_essences", "policy_contexts", "policy_reviews"].forEach(table => {
      if (tables.has(table)) counts[table] = Number(db.exec(`SELECT COUNT(*) FROM ${table}`)[0]?.values[0]?.[0] ?? 0);
    });
    return { compatible: errors.length === 0, format: metadata.get("format") ?? null, version: metadata.get("format_version") ?? null, exportedAt: metadata.get("exported_at") ?? null, errors, counts };
  } catch {
    return { compatible: false, format: null, version: null, exportedAt: null, errors: ["SQLiteデータベースとして読み込めませんでした。"], counts: {} };
  } finally {
    db.close();
  }
}
