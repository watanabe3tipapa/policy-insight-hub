import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { FreshnessBadge } from "@/components/FreshnessBadge";
import { PageFrame } from "@/components/PageFrame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadData, formatDate, frequencyLabels, toDateInput } from "@/lib/policy";
import { trpc } from "@/lib/trpc";
import { Download, ExternalLink, FileJson, Pencil, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

type SourceForm = {
  name: string;
  policyArea: string;
  owner: string;
  updateFrequency: "daily" | "monthly" | "quarterly" | "annual" | "irregular";
  sourceUrl: string;
  description: string;
  lastUpdatedAt: string;
};

const emptyForm: SourceForm = { name: "", policyArea: "", owner: "", updateFrequency: "monthly", sourceUrl: "", description: "", lastUpdatedAt: "" };

export default function DataSources() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const sourceQuery = useMemo(() => search.trim() ? { search: search.trim() } : undefined, [search]);
  const sourcesQuery = trpc.policy.sources.list.useQuery(sourceQuery);
  const sources = sourcesQuery.data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SourceForm>(emptyForm);
  const createSource = trpc.policy.sources.create.useMutation({
    onSuccess: async () => { await utils.policy.sources.list.invalidate(); setDialogOpen(false); toast.success("データソースを登録しました。"); },
    onError: error => toast.error(error.message),
  });
  const updateSource = trpc.policy.sources.update.useMutation({
    onSuccess: async () => { await utils.policy.sources.list.invalidate(); setDialogOpen(false); toast.success("データソースを更新しました。"); },
    onError: error => toast.error(error.message),
  });
  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (source: (typeof sources)[number]) => {
    setEditingId(source.id);
    setForm({ name: source.name, policyArea: source.policyArea, owner: source.owner, updateFrequency: source.updateFrequency, sourceUrl: source.sourceUrl ?? "", description: source.description ?? "", lastUpdatedAt: toDateInput(source.lastUpdatedAt) });
    setDialogOpen(true);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, description: form.description || null, lastUpdatedAt: form.lastUpdatedAt ? new Date(`${form.lastUpdatedAt}T00:00:00`) : null };
    if (editingId) updateSource.mutate({ id: editingId, ...payload }); else createSource.mutate(payload);
  };
  const exportRows = sources.map(source => ({
    id: source.id,
    名称: source.name,
    政策テーマ: source.policyArea,
    所管: source.owner,
    更新頻度: frequencyLabels[source.updateFrequency],
    URL: source.sourceUrl ?? "",
    説明: source.description ?? "",
    最終更新日: formatDate(source.lastUpdatedAt),
  }));

  return (
    <PageFrame eyebrow="Data Registry / 02" title="データ台帳" description="政策テーマごとに、根拠となるデータの所管、更新周期、利用先を台帳化します。台帳情報は指標辞書とダッシュボードのデータ来歴に連携されます。" actions={<div className="flex flex-wrap gap-2"><Button variant="outline" className="blueprint-secondary h-9 text-xs" disabled={!sources.length} onClick={() => downloadData("policy-data-sources", exportRows, "csv")}><Download className="mr-1.5 h-3.5 w-3.5" />CSV</Button><Button variant="outline" className="blueprint-secondary h-9 text-xs" disabled={!sources.length} onClick={() => downloadData("policy-data-sources", exportRows, "json")}><FileJson className="mr-1.5 h-3.5 w-3.5" />JSON</Button>{isAdmin ? <Button className="blueprint-primary h-9 text-xs" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" />データソースを登録</Button> : null}</div>}>
      <section className="blueprint-panel p-5 md:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-100/70">Source register</p><h2 className="mt-1 text-lg font-bold text-white">登録済みデータソース</h2></div><div className="relative w-full md:w-80"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-cyan-100/55" /><Input className="blueprint-input h-9 pl-9 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder="名称・政策テーマ・所管を検索" />{search ? <button className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-100/60" onClick={() => setSearch("")} aria-label="検索を消去"><X className="h-3.5 w-3.5" /></button> : null}</div></div>
        <div className="relative z-10 mt-5 overflow-x-auto tech-table"><table className="w-full min-w-[890px] text-left text-xs"><thead><tr><th className="px-4 py-3">データソース</th><th className="px-4 py-3">政策テーマ</th><th className="px-4 py-3">所管 / 更新頻度</th><th className="px-4 py-3">鮮度</th><th className="px-4 py-3">出典</th>{isAdmin ? <th className="px-4 py-3 text-right">操作</th> : null}</tr></thead><tbody>{sourcesQuery.isLoading ? <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-blue-100/60">台帳を読み込んでいます…</td></tr> : sources.length ? sources.map(source => <tr key={source.id}><td className="px-4 py-4"><p className="font-semibold text-white">{source.name}</p><p className="mt-1 max-w-sm truncate text-[11px] text-blue-100/60">{source.description || "説明は未登録です"}</p></td><td className="px-4 py-4 text-blue-100/80">{source.policyArea}</td><td className="px-4 py-4"><p>{source.owner}</p><p className="mt-1 font-mono text-[10px] text-cyan-100/65">{frequencyLabels[source.updateFrequency]}</p></td><td className="px-4 py-4"><FreshnessBadge updatedAt={source.lastUpdatedAt} frequency={source.updateFrequency} /></td><td className="px-4 py-4">{source.sourceUrl ? <a className="inline-flex items-center gap-1 text-cyan-200 underline decoration-cyan-200/40 underline-offset-4 hover:text-white" href={source.sourceUrl} target="_blank" rel="noreferrer">参照 <ExternalLink className="h-3 w-3" /></a> : <span className="text-blue-100/45">未登録</span>}</td>{isAdmin ? <td className="px-4 py-4 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-cyan-100 hover:bg-white/10 hover:text-white" onClick={() => openEdit(source)} aria-label={`${source.name}を編集`}><Pencil className="h-3.5 w-3.5" /></Button></td> : null}</tr>) : <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center"><p className="font-semibold text-cyan-50">該当するデータソースがありません</p><p className="mt-2 text-xs text-blue-100/60">管理者は右上の「データソースを登録」から、データの来歴を登録できます。</p></td></tr>}</tbody></table></div>
      </section>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[92vh] overflow-y-auto border-cyan-100/30 bg-[#082763] text-white sm:max-w-2xl"><DialogHeader><DialogTitle>{editingId ? "データソースを編集" : "データソースを登録"}</DialogTitle><DialogDescription className="text-blue-100/65">データの所管と更新の責任を明確にする情報を登録します。</DialogDescription></DialogHeader><form className="grid gap-4" onSubmit={submit}><div className="grid gap-4 md:grid-cols-2"><Field label="名称"><Input className="blueprint-input" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} required /></Field><Field label="政策テーマ"><Input className="blueprint-input" value={form.policyArea} onChange={event => setForm({ ...form, policyArea: event.target.value })} required /></Field><Field label="所管"><Input className="blueprint-input" value={form.owner} onChange={event => setForm({ ...form, owner: event.target.value })} required /></Field><Field label="更新頻度"><select className="blueprint-input h-10 w-full px-3 text-sm" value={form.updateFrequency} onChange={event => setForm({ ...form, updateFrequency: event.target.value as SourceForm["updateFrequency"] })}>{Object.entries(frequencyLabels).map(([key, label]) => <option className="bg-[#082763]" key={key} value={key}>{label}</option>)}</select></Field><Field label="最終更新日"><Input className="blueprint-input" type="date" value={form.lastUpdatedAt} onChange={event => setForm({ ...form, lastUpdatedAt: event.target.value })} /></Field><Field label="URL"><Input className="blueprint-input" type="url" placeholder="https://" value={form.sourceUrl} onChange={event => setForm({ ...form, sourceUrl: event.target.value })} /></Field></div><Field label="説明"><Textarea className="blueprint-input min-h-24" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="収録内容、利用条件、留意点など" /></Field><Button type="submit" className="blueprint-primary mt-1" disabled={createSource.isPending || updateSource.isPending}>{editingId ? "更新を保存" : "登録する"}</Button></form></DialogContent></Dialog>
    </PageFrame>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-2"><span className="field-label">{label}</span>{children}</label>; }
