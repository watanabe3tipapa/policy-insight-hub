import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { actionStatusLabels, formatDate, reviewStatusLabels, toDateInput } from "@/lib/policy";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BarChart3, CalendarClock, Database, Plus, RefreshCw, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";

function MetricCard({ label, value, note, icon: Icon, accent = "cyan" }: { label: string; value: string | number; note: string; icon: typeof Database; accent?: "cyan" | "amber" | "violet" }) {
  const accentClasses = accent === "amber" ? "text-amber-200" : accent === "violet" ? "text-violet-200" : "text-cyan-200";
  return (
    <article className="metric-card">
      <div className="flex items-start justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-blue-100/65">{label}</p><Icon className={`h-4 w-4 ${accentClasses}`} /></div>
      <p className="mt-4 text-3xl font-bold tracking-[-0.05em] text-white">{value}</p>
      <p className="mt-2 text-xs text-blue-100/65">{note}</p>
    </article>
  );
}

export default function PolicyDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const sourcesQuery = trpc.policy.sources.list.useQuery();
  const indicatorsQuery = trpc.policy.indicators.list.useQuery();
  const reviewsQuery = trpc.policy.reviews.list.useQuery();
  const [selectedIndicatorId, setSelectedIndicatorId] = useState<number | null>(null);
  const indicators = indicatorsQuery.data ?? [];
  const effectiveIndicatorId = selectedIndicatorId ?? indicators[0]?.id ?? null;
  const observationInput = useMemo(() => effectiveIndicatorId ? { indicatorId: effectiveIndicatorId } : undefined, [effectiveIndicatorId]);
  const observationsQuery = trpc.policy.indicators.observations.list.useQuery(observationInput, { enabled: Boolean(observationInput) });
  const selectedIndicator = indicators.find(indicator => indicator.id === effectiveIndicatorId);
  const observations = observationsQuery.data ?? [];
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");
  const [observationDialogOpen, setObservationDialogOpen] = useState(false);
  const [observationDate, setObservationDate] = useState(toDateInput(new Date()));
  const [observationValue, setObservationValue] = useState("");
  const [observationNote, setObservationNote] = useState("");
  const createObservation = trpc.policy.indicators.observations.create.useMutation({
    onSuccess: async () => { await observationsQuery.refetch(); setObservationDialogOpen(false); setObservationValue(""); setObservationNote(""); toast.success("観測値を登録しました。"); },
    onError: error => toast.error(error.message),
  });
  const sources = sourcesQuery.data ?? [];
  const reviews = reviewsQuery.data ?? [];
  const openActions = reviews.flatMap(review => review.actions).filter(action => action.status !== "completed");
  const freshnessWarnings = [...sources, ...indicators].filter(item => {
    const date = item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null;
    return !date || (Date.now() - date.valueOf()) > 90 * 86_400_000;
  }).length;
  const chartData = observations.map(observation => ({ date: formatDate(observation.observedAt, { month: "short", day: "numeric" }), value: observation.value }));

  useEffect(() => {
    if (selectedIndicatorId === null && indicators[0]) setSelectedIndicatorId(indicators[0].id);
  }, [indicators, selectedIndicatorId]);

  return (
    <PageFrame
      eyebrow="Control Room / 01"
      title="政策インサイト・ダッシュボード"
      description="データの鮮度、指標の推移、レビューアクションを一つの共通画面で確認します。数値の変化だけでは結論づけず、定義と更新状況を併せて解釈してください。"
      actions={<Button variant="outline" className="blueprint-secondary h-9" onClick={() => { sourcesQuery.refetch(); indicatorsQuery.refetch(); reviewsQuery.refetch(); observationsQuery.refetch(); }}><RefreshCw className="mr-2 h-3.5 w-3.5" />最新状態を読込</Button>}
    >
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Data Sources" value={sources.length} note="登録済みデータソース" icon={Database} />
        <MetricCard label="Indicators" value={indicators.length} note="定義済み政策指標" icon={Target} accent="violet" />
        <MetricCard label="Freshness Alerts" value={freshnessWarnings} note="更新状況の要確認項目" icon={AlertTriangle} accent="amber" />
        <MetricCard label="Open Actions" value={openActions.length} note="未完了の改善アクション" icon={CalendarClock} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <article className="blueprint-panel min-h-[430px] p-5 md:p-6">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Indicator telemetry</p><h2 className="mt-1 text-lg font-bold text-white">指標の時系列モニタリング</h2></div>
            <div className="flex flex-wrap gap-2">
              <Select value={effectiveIndicatorId?.toString() ?? "none"} onValueChange={value => value !== "none" && setSelectedIndicatorId(Number(value))}>
                <SelectTrigger className="blueprint-input h-9 w-[190px] text-xs"><SelectValue placeholder="指標を選択" /></SelectTrigger>
                <SelectContent>{indicators.length ? indicators.map(indicator => <SelectItem key={indicator.id} value={String(indicator.id)}>{indicator.name}</SelectItem>) : <SelectItem value="none" disabled>登録済み指標なし</SelectItem>}</SelectContent>
              </Select>
              <Button variant="outline" className="blueprint-secondary h-9 px-3 text-xs" onClick={() => setChartMode(mode => mode === "line" ? "bar" : "line")}><BarChart3 className="mr-1.5 h-3.5 w-3.5" />{chartMode === "line" ? "棒グラフ" : "折れ線"}</Button>
            </div>
          </div>
          {selectedIndicator ? <div className="relative z-10 mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-white/10 py-3 text-xs text-blue-100/75"><span><strong className="text-cyan-100">単位</strong> {selectedIndicator.unit}</span><span><strong className="text-cyan-100">目標</strong> {selectedIndicator.targetValue ?? "未設定"}</span><FreshnessBadge updatedAt={selectedIndicator.lastUpdatedAt} /></div> : null}
          <div className="relative z-10 mt-5 h-[250px]">
            {observationsQuery.isLoading ? <div className="grid h-full place-items-center text-sm text-blue-100/65">観測値を読み込んでいます…</div> : chartData.length ? <ResponsiveContainer width="100%" height="100%">
              {chartMode === "line" ? <LineChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}><CartesianGrid stroke="rgba(196, 239, 255, .15)" vertical={false} /><XAxis dataKey="date" tick={{ fill: "#bddcf7", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#bddcf7", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#08275f", border: "1px solid rgba(189,238,255,.35)", borderRadius: 0 }} /><Legend /><Line type="monotone" dataKey="value" name={selectedIndicator?.unit ?? "値"} stroke="#9deeff" strokeWidth={2.5} dot={{ r: 3, fill: "#9deeff" }} activeDot={{ r: 5 }} /></LineChart> : <BarChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}><CartesianGrid stroke="rgba(196, 239, 255, .15)" vertical={false} /><XAxis dataKey="date" tick={{ fill: "#bddcf7", fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: "#bddcf7", fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: "#08275f", border: "1px solid rgba(189,238,255,.35)", borderRadius: 0 }} /><Bar dataKey="value" name={selectedIndicator?.unit ?? "値"} fill="#75d9f7" /></BarChart>}
            </ResponsiveContainer> : <div className="flex h-full flex-col items-center justify-center border border-dashed border-cyan-100/25 text-center"><p className="font-semibold text-cyan-50">まだ観測値がありません</p><p className="mt-2 max-w-sm text-xs leading-5 text-blue-100/60">指標辞書に登録した指標を選択し、管理者がデータ点を追加すると、ここに実測値の推移を表示します。</p></div>}
          </div>
          {isAdmin && selectedIndicator ? <Dialog open={observationDialogOpen} onOpenChange={setObservationDialogOpen}><DialogTrigger asChild><Button className="blueprint-primary relative z-10 mt-5 h-9 text-xs"><Plus className="mr-1.5 h-3.5 w-3.5" />観測値を追加</Button></DialogTrigger><DialogContent className="border-cyan-100/30 bg-[#082763] text-white sm:max-w-md"><DialogHeader><DialogTitle>観測値を追加</DialogTitle><DialogDescription className="text-blue-100/65">{selectedIndicator.name} の実測値を記録します。</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={event => { event.preventDefault(); if (!effectiveIndicatorId || !observationDate || observationValue === "") return; createObservation.mutate({ indicatorId: effectiveIndicatorId, observedAt: new Date(`${observationDate}T00:00:00`), value: Number(observationValue), note: observationNote || null }); }}><div className="grid gap-2"><Label className="field-label">観測日</Label><Input className="blueprint-input" type="date" value={observationDate} onChange={event => setObservationDate(event.target.value)} required /></div><div className="grid gap-2"><Label className="field-label">値（{selectedIndicator.unit}）</Label><Input className="blueprint-input" type="number" step="any" value={observationValue} onChange={event => setObservationValue(event.target.value)} required /></div><div className="grid gap-2"><Label className="field-label">注記</Label><Textarea className="blueprint-input min-h-20" value={observationNote} onChange={event => setObservationNote(event.target.value)} /></div><Button type="submit" className="blueprint-primary" disabled={createObservation.isPending}>保存する</Button></form></DialogContent></Dialog> : null}
        </article>

        <article className="blueprint-panel p-5 md:p-6">
          <div className="relative z-10 flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Action register</p><h2 className="mt-1 text-lg font-bold text-white">レビューの追跡</h2></div><span className="status-pill text-cyan-100">{openActions.length} OPEN</span></div>
          <div className="relative z-10 mt-5 space-y-3">
            {openActions.length ? openActions.slice(0, 4).map(action => <div key={action.id} className="border-l-2 border-cyan-200/55 bg-white/[0.035] px-3 py-3"><div className="flex justify-between gap-2"><p className="text-xs font-semibold leading-5 text-white">{action.actionItem}</p><span className="shrink-0 text-[10px] text-cyan-100/70">{actionStatusLabels[action.status]}</span></div><p className="mt-2 text-[11px] text-blue-100/65">担当: {action.assignee}　期限: {formatDate(action.dueAt)}</p></div>) : <p className="border border-dashed border-cyan-100/25 p-4 text-xs leading-5 text-blue-100/60">未完了のアクションはありません。レビュー記録から改善アクションを登録できます。</p>}
          </div>
          <div className="relative z-10 mt-6 border-t border-white/10 pt-4"><p className="font-mono text-[10px] uppercase tracking-[0.15em] text-cyan-100/60">Next review</p>{reviews[0] ? <p className="mt-2 text-sm text-white">{formatDate(reviews[0].heldAt, { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })} <span className="text-xs text-blue-100/60">/ {reviewStatusLabels[reviews[0].status]}</span></p> : <p className="mt-2 text-xs text-blue-100/60">レビューが未登録です。</p>}</div>
        </article>
      </section>

      <section className="blueprint-panel p-5 md:p-6"><div className="relative z-10 flex items-center justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Data provenance</p><h2 className="mt-1 text-lg font-bold text-white">更新状況を確認するデータソース</h2></div><span className="font-mono text-[10px] text-cyan-100/60">{sources.length} REGISTERED</span></div><div className="relative z-10 mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{sources.length ? sources.slice(0, 6).map(source => <div key={source.id} className="border border-cyan-100/15 bg-black/10 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-white">{source.name}</p><FreshnessBadge compact updatedAt={source.lastUpdatedAt} frequency={source.updateFrequency} /></div><p className="mt-2 text-xs text-blue-100/65">{source.policyArea} / {source.owner}</p></div>) : <p className="col-span-full border border-dashed border-cyan-100/25 p-5 text-center text-sm text-blue-100/60">データ台帳からデータソースを登録すると、更新状況をここで横断確認できます。</p>}</div></section>
    </PageFrame>
  );
}
