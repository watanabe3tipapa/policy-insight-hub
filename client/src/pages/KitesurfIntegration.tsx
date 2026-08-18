import { useEffect, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/policy";
import { toStartupAuditView } from "@/lib/startupAudit";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CircleDashed, ClipboardList, Database, ExternalLink, FileSearch2, Link2, LockKeyhole, ScanSearch, Settings2 } from "lucide-react";
import { toast } from "sonner";

const runStatusLabels = { queued: "待機", running: "実行中", succeeded: "完了", failed: "失敗" } as const;
const candidateStatusLabels = { pending: "確認待ち", accepted: "採用", rejected: "見送り" } as const;

export default function KitesurfIntegration() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const configQuery = trpc.kitesurf.config.useQuery();
  const startupAuditQuery = trpc.kitesurf.startupAudit.useQuery();
  const runsQuery = trpc.kitesurf.runs.useQuery();
  const candidatesQuery = trpc.kitesurf.candidates.useQuery();
  const [workerUrl, setWorkerUrl] = useState("");
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [staleAfterHours, setStaleAfterHours] = useState(24);
  const saveConfig = trpc.kitesurf.saveConfig.useMutation({
    onSuccess: async () => { await utils.kitesurf.config.invalidate(); toast.success("Worker接続先を保存しました。起動時の鮮度検知で使用できます。"); },
    onError: error => toast.error(error.message),
  });
  const saveRefreshSettings = trpc.kitesurf.updateRefreshSettings.useMutation({
    onSuccess: async () => { await utils.kitesurf.config.invalidate(); toast.success("起動時の鮮度検知設定を保存しました。"); },
    onError: error => toast.error(error.message),
  });
  const config = configQuery.data;
  const startupAudit = startupAuditQuery.data;
  const startupAuditView = toStartupAuditView(startupAudit);
  const runs = runsQuery.data ?? [];
  const candidates = candidatesQuery.data ?? [];
  const isReady = config?.status === "ready" && Boolean(config.workerUrl);

  useEffect(() => {
    setWorkerUrl(config?.workerUrl ?? "");
    setAutoRefreshEnabled(config?.autoRefreshEnabled !== 0);
    setStaleAfterHours(config?.staleAfterHours ?? 24);
  }, [config?.workerUrl, config?.autoRefreshEnabled, config?.staleAfterHours]);

  return (
    <PageFrame
      eyebrow="Collection Bridge / 05"
      title="情報収集 — Kitesurf連携"
      description="Cloudflare Worker上のKitesurfを、政策エビデンスの収集入口として接続します。Worker URLを設定すると、サーバー起動時にデータの鮮度を検知し、古い場合のみPOST /collectで更新します。Workerのデプロイは行いません。"
      actions={<span className={`status-pill ${isReady ? "text-emerald-200" : "text-amber-100"}`}>{isReady ? "READY / 接続先設定済み" : "SETUP / Worker URL未設定"}</span>}
    >
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,.75fr)]">
        <article className="blueprint-panel p-5 md:p-6">
          <div className="relative z-10 flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center border border-cyan-100/45 bg-cyan-200/10"><Link2 className="h-5 w-5 text-cyan-100" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Worker endpoint</p><h2 className="mt-1 text-lg font-bold text-white">Kitesurf Workerの接続先</h2><p className="mt-2 text-xs leading-5 text-blue-100/70">既存WorkerのベースURLを保存します。起動時に最終成功収集が鮮度の閾値を超えている場合だけ、このURLのPOST /collectを呼び出します。</p></div></div>
          <form className="relative z-10 mt-6 grid gap-3" onSubmit={event => { event.preventDefault(); saveConfig.mutate({ workerUrl: workerUrl.trim() || null }); }}>
            <Label className="field-label">Cloudflare Worker base URL</Label>
            <div className="flex flex-col gap-3 sm:flex-row"><Input className="blueprint-input h-10 flex-1" type="url" value={workerUrl} onChange={event => setWorkerUrl(event.target.value)} placeholder="https://your-worker.workers.dev" disabled={!isAdmin} /><Button type="submit" className="blueprint-primary h-10 shrink-0" disabled={!isAdmin || saveConfig.isPending}>{saveConfig.isPending ? "保存中…" : "接続先を保存"}</Button></div>
          </form>
          <div className="relative z-10 mt-5 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-3"><StatusInfo label="状態" value={isReady ? "設定済み" : "未設定"} icon={isReady ? CheckCircle2 : CircleDashed} /><StatusInfo label="最終確認" value={config?.lastVerifiedAt ? formatDate(config.lastVerifiedAt) : "未確認"} icon={FileSearch2} /><StatusInfo label="保存日時" value={config?.updatedAt ? formatDate(config.updatedAt) : "未保存"} icon={Settings2} /></div>
          <form className="relative z-10 mt-5 border-t border-white/10 pt-4" onSubmit={event => { event.preventDefault(); saveRefreshSettings.mutate({ autoRefreshEnabled, staleAfterHours }); }}><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="field-label">起動時ステイル検知</p><label className="mt-2 flex items-center gap-2 text-xs text-blue-100/80"><input type="checkbox" className="accent-cyan-200" checked={autoRefreshEnabled} onChange={event => setAutoRefreshEnabled(event.target.checked)} disabled={!isAdmin || !config?.workerUrl} />最終成功から指定時間を超えた場合のみ、起動時にPOST /collectを実行</label></div><div className="flex items-end gap-2"><label className="grid gap-1"><span className="field-label">鮮度の閾値（時間）</span><Input className="blueprint-input h-9 w-24" type="number" min="1" max="168" value={staleAfterHours} onChange={event => setStaleAfterHours(Math.max(1, Math.min(168, Number(event.target.value) || 24)))} disabled={!isAdmin || !config?.workerUrl} /></label><Button className="blueprint-secondary h-9 text-xs" type="submit" disabled={!isAdmin || !config?.workerUrl || saveRefreshSettings.isPending}>{saveRefreshSettings.isPending ? "保存中…" : "設定を保存"}</Button></div></div><div className="mt-3 border-l border-cyan-100/20 pl-3"><p className="field-label">前回の起動時判定</p><p className="mt-1 text-xs text-blue-100/80">{startupAuditView.label}{startupAuditView.checkedAt ? ` / ${formatDate(startupAuditView.checkedAt)}` : ""}</p>{startupAuditView.message ? <p className="mt-1 text-[11px] leading-5 text-blue-100/60">{startupAuditView.message}</p> : null}</div></form>
          {!isAdmin ? <p className="relative z-10 mt-4 flex items-center gap-2 text-xs text-amber-100/80"><LockKeyhole className="h-3.5 w-3.5" />接続先の変更は管理者のみ実行できます。</p> : null}
        </article>
        <article className="blueprint-panel p-5 md:p-6"><div className="relative z-10"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Integration contract</p><h2 className="mt-1 text-lg font-bold text-white">収集フローの設計</h2></div><ol className="relative z-10 mt-5 space-y-4">{[
          ["01", "Worker URLを保存", "Hubに既存Kitesurf Workerの接続先を登録します。"],
          ["02", "起動時に鮮度を検知", "指定時間を超えて古い場合だけ、サーバー起動時にPOST /collectの更新要求を送信します。"],
          ["03", "結果をレビュー", "収集ログとデータ台帳候補に保存し、採否を管理します。"],
        ].map(([num, title, text]) => <li key={num} className="flex gap-3"><span className="font-mono text-xs text-cyan-200">{num}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs leading-5 text-blue-100/65">{text}</p></div></li>)}</ol></article>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Collection run log</p><h2 className="mt-1 text-lg font-bold text-white">収集ログ</h2></div><span className="status-pill text-cyan-100">{runs.length} RUNS</span></div><div className="relative z-10 mt-5 space-y-2">{runs.length ? runs.map(run => <div key={run.id} className="border border-cyan-100/15 bg-black/10 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-white">{run.requestUrl}</p><span className="status-pill text-cyan-100">{runStatusLabels[run.status]}</span></div><p className="mt-2 text-[11px] text-blue-100/60">{formatDate(run.createdAt)} / {run.requestMode === "instruction" ? "指示付き収集" : "標準収集"}</p></div>) : <EmptyLog icon={ClipboardList} text="実行ログはまだありません。Workerを接続した後の収集結果はここに保存されます。" />}</div></article>
        <article className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Registry candidates</p><h2 className="mt-1 text-lg font-bold text-white">データ台帳候補</h2></div><span className="status-pill text-cyan-100">{candidates.length} CANDIDATES</span></div><div className="relative z-10 mt-5 space-y-2">{candidates.length ? candidates.map(candidate => <div key={candidate.id} className="border border-cyan-100/15 bg-black/10 p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-xs font-semibold text-white">{candidate.name}</p><span className="status-pill text-cyan-100">{candidateStatusLabels[candidate.status]}</span></div><p className="mt-2 text-[11px] text-blue-100/60">{candidate.suggestedPolicyArea ?? "政策テーマ未設定"}</p>{candidate.candidateUrl ? <a className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-200 underline decoration-cyan-100/40 underline-offset-4" href={candidate.candidateUrl} target="_blank" rel="noreferrer">候補URLを確認 <ExternalLink className="h-3 w-3" /></a> : null}</div>) : <EmptyLog icon={Database} text="収集結果から抽出されたデータソース候補は、確認待ちとしてここに保存されます。" />}</div></article>
      </section>
      <section className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-start gap-3"><ScanSearch className="mt-0.5 h-5 w-5 shrink-0 text-cyan-100" /><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Current scope</p><h2 className="mt-1 text-lg font-bold text-white">この段階で有効な機能</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-blue-100/72">Worker URLの安全な保存、起動時の鮮度判定、重複実行を防ぐリース、POST /collectによる必要時だけの更新、収集ログと台帳候補の永続化を実装しています。手動URL巡回、常時稼働プロセス、定期スケジュール、出典確認を経ない候補の自動採用は行いません。</p></div></div></section>
    </PageFrame>
  );
}

function StatusInfo({ label, value, icon: Icon }: { label: string; value: string; icon: typeof CheckCircle2 }) { return <div className="border-l border-cyan-100/20 pl-3"><div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-cyan-100/70" /><p className="field-label">{label}</p></div><p className="mt-2 text-xs font-semibold text-white">{value}</p></div>; }
function EmptyLog({ icon: Icon, text }: { icon: typeof ClipboardList; text: string }) { return <div className="border border-dashed border-cyan-100/22 p-5 text-center"><Icon className="mx-auto h-5 w-5 text-cyan-100/60" /><p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-blue-100/65">{text}</p></div>; }
