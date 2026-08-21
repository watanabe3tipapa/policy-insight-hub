import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Database, BookOpenCheck, ClipboardCheck, ScanSearch, Globe2, HardDriveDownload, ArrowRight, BarChart3, Users, Lock, Sparkles } from "lucide-react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

const features = [
  {
    icon: Database,
    title: "データ台帳",
    desc: "政策データの出典・所有者・更新頻度・最終更新日を一元管理。CSV/JSON エクスポート対応。",
  },
  {
    icon: BookOpenCheck,
    title: "指標辞書",
    desc: "KPI の定義・計算式・目標値・データソース紐付けを辞書化。鮮度バッジでステータス可視化。",
  },
  {
    icon: BarChart3,
    title: "政策ダッシュボード",
    desc: "登録済み時系列を Recharts で折れ線・棒グラフ化。政策領域ごとに横断的に観測可能。",
  },
  {
    icon: ClipboardCheck,
    title: "レビュー記録",
    desc: "定例レビューの議題・所見・アクションアイテム・担当者・期日・ステータスを追跡・継承。",
  },
  {
    icon: ScanSearch,
    title: "情報収集（Kitesurf 連携）",
    desc: "外部 Worker 連携で収集ログ・候補の採否管理。起動時ステイル検知で自動鮮度更新。",
  },
  {
    icon: Globe2,
    title: "国際政策エッセンス",
    desc: "根拠透明性・設計信頼性・文脈適合性・公平性影響・移転可能性の 5 軸で国際事例を比較評価。",
  },
  {
    icon: HardDriveDownload,
    title: "データ交換（SQLite .db）",
    desc: "正規化済み標準形式で出力。ブラウザ内で形式・件数を検証し、分析ツールへ持ち出し可能。",
  },
  {
    icon: Users,
    title: "認証とロール制御",
    desc: "ユーザー名/パスワード + JWT セッション。管理者ロールで書き込み制御・監査ログ対応。",
  },
];

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const handleEnterDemo = () => {
    setLocation("/dashboard");
  };

  const handleLogin = () => {
    setLocation("/login");
  };

  return (
    <div className="min-h-screen bg-[#051228] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center border border-cyan-100/60 bg-cyan-200/10 font-mono text-sm font-bold text-cyan-50">PI</div>
            <span className="font-bold text-lg tracking-tight">Policy Insight Hub</span>
          </div>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button onClick={handleEnterDemo} className="blueprint-primary">ダッシュボードへ</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={handleLogin}>ログイン</Button>
                <Button onClick={handleEnterDemo} className="blueprint-primary">デモを体験する</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan-100/80 mb-4">
              Evidence-Based Policy Making
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
              政策データの根拠を、<br />
              <span className="text-cyan-400">共有可能な構造</span>へ。
            </h1>
            <p className="text-lg sm:text-xl text-blue-100/75 mb-10 max-w-2xl mx-auto leading-relaxed">
              データ台帳・指標辞書・時系列観測値・レビュー記録・国際政策エッセンスを<br />
              一つの構造で管理し、常に最新のエビデンスで政策決定を支援します。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={handleEnterDemo} className="blueprint-primary w-full sm:w-auto">
                <Sparkles className="mr-2 h-5 w-5" />
                デモ環境で全機能を体験
              </Button>
              <Button size="lg" variant="outline" onClick={handleLogin} className="w-full sm:w-auto">
                <Lock className="mr-2 h-5 w-5" />
                ログインして利用開始
              </Button>
            </div>
            <p className="mt-6 text-sm text-blue-100/50">
              デモモードは管理者権限で全ページにアクセスできます（データは保存されません）
            </p>
          </div>
        </section>

        <section className="border-y border-white/10 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/60 mb-2">
                Features
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
                EBPM 実務に必要な機能をすべて搭載
              </h2>
              <p className="mt-4 text-blue-100/70 max-w-2xl mx-auto">
                「台帳 → 辞書 → 観測 → 記録 → 評価」の一連の流れを、単一のハブで完結。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <Card key={feature.title} className="blueprint-card h-full border-white/10 bg-[#092763]/50">
                  <CardHeader>
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center border border-cyan-200/40 bg-cyan-300/10 text-cyan-100">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-center text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-blue-100/70">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="blueprint-panel p-8 md:p-12 lg:p-16 rounded-2xl text-center border border-cyan-100/20 bg-gradient-to-br from-blue-950/50 to-[#051228]">
              <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-cyan-400" />
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-4">
                今すぐデモ環境で体験
              </h2>
              <p className="text-blue-100/70 mb-8 max-w-xl mx-auto">
                認証不要で全機能にアクセス可能。データ台帳の登録から指標の可視化、レビュー記録まで、
                実際の操作感を確認できます。
              </p>
              <Button size="lg" onClick={handleEnterDemo} className="blueprint-primary">
                <ArrowRight className="mr-2 h-5 w-5" />
                デモ環境に入る
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100/60 mb-2">
            Policy Insight Hub
          </p>
          <p className="text-xs text-blue-100/50">
            EBPM による政策立案を、データと構造で支える。
          </p>
        </div>
      </footer>
    </div>
  );
}