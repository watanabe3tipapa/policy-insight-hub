import { useRef, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { buildPortableDatabase, inspectPortableDatabase, portableTables, type PortablePreview } from "@/lib/dataExchange";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Database, Download, FileArchive, FileSearch2, HardDriveDownload, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";

const labels: Record<string, string> = {
  data_sources: "データ台帳", policy_indicators: "指標辞書", indicator_observations: "指標観測値",
  collection_runs: "収集ログ", source_candidates: "収集候補", policy_sources: "国際政策の出典",
  policy_essences: "政策エッセンス", policy_contexts: "社会的文脈", policy_reviews: "評価レビュー",
};

export default function DataExchange() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isInspecting, setIsInspecting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortablePreview | null>(null);
  const sources = trpc.policy.sources.list.useQuery();
  const indicators = trpc.policy.indicators.list.useQuery();
  const observations = trpc.policy.indicators.observations.list.useQuery();
  const runs = trpc.kitesurf.runs.useQuery();
  const candidates = trpc.kitesurf.candidates.useQuery();
  const policySources = trpc.internationalPolicy.sources.list.useQuery();
  const policyEssences = trpc.internationalPolicy.essences.list.useQuery();
  const isLoading = [sources, indicators, observations, runs, candidates, policySources, policyEssences].some(query => query.isLoading);

  const handleExport = async () => {
    if (!isAdmin || isLoading) return;
    setIsExporting(true);
    try {
      const bytes = await buildPortableDatabase({
        sources: sources.data ?? [], indicators: indicators.data ?? [], observations: observations.data ?? [],
        collectionRuns: runs.data ?? [], sourceCandidates: candidates.data ?? [], policySources: policySources.data ?? [], policyEssences: policyEssences.data ?? [],
      });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "application/vnd.sqlite3" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `policy-insight-hub-${date}.db`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("標準SQLite形式の.dbファイルを作成しました。");
    } catch {
      toast.error(".dbファイルを作成できませんでした。もう一度お試しください。");
    } finally { setIsExporting(false); }
  };

  const handleInspect = async (file?: File) => {
    if (!file || !isAdmin) return;
    if (file.size > 50 * 1024 * 1024) { toast.error("50 MB以下のSQLite .dbファイルを選択してください。"); return; }
    setIsInspecting(true);
    setSelectedFile(file.name);
    try {
      setPreview(await inspectPortableDatabase(await file.arrayBuffer()));
    } catch {
      setPreview({ compatible: false, format: null, version: null, exportedAt: null, errors: ["ファイルを読み込めませんでした。"], counts: {} });
    } finally { setIsInspecting(false); }
  };

  return (
    <PageFrame eyebrow="Portable Data / 07" title="データ交換 — SQLite .db" description="Hubで管理する政策データ、収集ログ、国際EBPM政策のエッセンスを、標準SQLite 3の単一ファイルとして持ち運びます。アプリ固有の認証情報や利用者情報は含めません。" actions={<span className="status-pill text-cyan-100">SQLite / UTF-8 / UTC</span>}>
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-100/45 bg-cyan-200/10"><Download className="h-5 w-5 text-cyan-100" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Write portable database</p><h2 className="mt-1 text-lg font-bold text-white">.dbとして書き出す</h2><p className="mt-2 text-xs leading-5 text-blue-100/70">SQLite対応の表計算・分析ツール・プログラムから直接読める、正規化したテーブル構成で出力します。各関連はアプリ内部IDではなく持ち運び可能な文字列キーで保持します。</p></div></div><div className="relative z-10 mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{portableTables.filter(table => !["hub_metadata", "hub_manifest"].includes(table)).map(table => <div key={table} className="border border-cyan-100/15 bg-black/10 p-3"><p className="text-xs font-semibold text-white">{labels[table]}</p><p className="mt-1 font-mono text-[10px] text-cyan-100/60">{table}</p></div>)}</div><div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">{isAdmin ? <Button className="blueprint-primary" onClick={handleExport} disabled={isLoading || isExporting}>{isExporting ? "生成中…" : <><HardDriveDownload className="mr-2 h-4 w-4" />.dbをダウンロード</>}</Button> : <p className="flex items-center gap-2 text-xs text-amber-100/80"><LockKeyhole className="h-3.5 w-3.5" />データの書き出しは管理者のみ実行できます。</p>}{isLoading ? <span className="text-xs text-blue-100/60">データを読み込み中…</span> : null}</div></article>
        <article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-100/45 bg-cyan-200/10"><Upload className="h-5 w-5 text-cyan-100" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Read & verify database</p><h2 className="mt-1 text-lg font-bold text-white">.dbを読み込み・検証する</h2><p className="mt-2 text-xs leading-5 text-blue-100/70">選択した.dbはブラウザ内で形式と収録件数だけを確認します。現在のHubデータを上書きしたり、サーバーへ自動送信したりしません。</p></div></div><input ref={fileRef} className="hidden" type="file" accept=".db,application/vnd.sqlite3,application/x-sqlite3" onChange={event => handleInspect(event.target.files?.[0])} /><div className="relative z-10 mt-5">{isAdmin ? <Button variant="outline" className="blueprint-secondary" onClick={() => fileRef.current?.click()} disabled={isInspecting}>{isInspecting ? "検証中…" : <><FileSearch2 className="mr-2 h-4 w-4" />.dbを選択して検証</>}</Button> : <p className="flex items-center gap-2 text-xs text-amber-100/80"><LockKeyhole className="h-3.5 w-3.5" />データ交換ファイルの検証は管理者のみ実行できます。</p>}</div><Preview selectedFile={selectedFile} preview={preview} /></article>
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)]"><article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex gap-3"><Database className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" /><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Open exchange contract</p><h2 className="mt-1 text-lg font-bold text-white">汎用データ形式としての設計</h2></div></div><div className="relative z-10 mt-5 grid gap-3 sm:grid-cols-2"><Contract title="標準形式" text="SQLite 3の.db。専用サーバー、独自ドライバ、クラウド鍵を必要としません。" /><Contract title="明示的な来歴" text="出典、発行主体、URL、時刻、評価手法、政策の適用条件を別テーブルで保持します。" /><Contract title="再利用できる関連" text="数値IDではなくsource-*、policy-*などの安定した文字列キーで関係を表します。" /><Contract title="安全な読込" text="読込時は形式名、バージョン、必須テーブル、件数を確認し、現行データを変更しません。" /></div></article><article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" /><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Data boundary</p><h2 className="mt-1 text-lg font-bold text-white">含めるもの・含めないもの</h2></div></div><div className="relative z-10 mt-5 space-y-3"><Boundary ok text="台帳、指標、時系列観測値、収集ログ、候補、国際政策エッセンスとその評価" /><Boundary ok text="出典URL、社会的文脈、公平性、移転可能性、評価の限界" /><Boundary text="OAuthセッション、利用者情報、ロール、秘密情報、内部操作履歴" /></div></article></section>
    </PageFrame>
  );
}

function Preview({ selectedFile, preview }: { selectedFile: string | null; preview: PortablePreview | null }) { if (!selectedFile) return <div className="relative z-10 mt-5 border border-dashed border-cyan-100/22 p-5 text-center text-xs text-blue-100/60">.dbファイルを選択すると、形式の互換性とテーブルごとの収録件数を確認できます。</div>; if (!preview) return <div className="relative z-10 mt-5 border border-dashed border-cyan-100/22 p-5 text-center text-xs text-blue-100/60">{selectedFile} を確認しています…</div>; return <div className="relative z-10 mt-5 border border-cyan-100/20 bg-black/10 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-white">{selectedFile}</p><p className="mt-1 font-mono text-[10px] text-blue-100/55">{preview.format ?? "形式未確認"} / v{preview.version ?? "—"}</p></div>{preview.compatible ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <AlertTriangle className="h-5 w-5 text-amber-200" />}</div>{preview.compatible ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{Object.entries(preview.counts).map(([table, count]) => <div key={table} className="border border-cyan-100/15 p-2"><p className="text-[10px] text-blue-100/65">{labels[table] ?? table}</p><p className="mt-1 text-sm font-bold text-white">{count}</p></div>)}</div> : <div className="mt-4 space-y-1.5">{preview.errors.map(error => <p key={error} className="flex gap-2 text-xs leading-5 text-amber-100"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>)}</div>}</div>; }
function Contract({ title, text }: { title: string; text: string }) { return <div className="border-l border-cyan-100/30 pl-3"><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-blue-100/65">{text}</p></div>; }
function Boundary({ ok = false, text }: { ok?: boolean; text: string }) { const Icon = ok ? CheckCircle2 : AlertTriangle; return <div className="flex gap-2 text-xs leading-5 text-blue-100/70"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-emerald-300" : "text-amber-200"}`} />{text}</div>; }
