# policy-insight-hub

[![Version](https://img.shields.io/badge/version-v1.0.0-blue.svg)](https://github.com/watanabe3tipapa/policy-insight-hub)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/policy-insight-hub.svg)](https://github.com/watanabe3tipapa/policy-insight-hub/issues)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**EBPM。政策データを、たゆまず集め、構造化し、共有可能にする。**

policy-insight-hub は、Evidence-Based Policy Making（EBPM・証拠に基づく政策立案）のための
**政策データ・ハブ**です。データ台帳・指標辞書・時系列観測値・レビュー記録・国際政策エッセンスを
一つの構造で管理し、外部の Kitesurf Worker による情報収集と起動時ステイル更新で
「常に最新のエビデンス」を保ちます。データ交換は標準の SQLite .db 形式で分析ツールへ持ち出せます。

[日本語](README.md) | [English](README_EN.md)

## コンセプト

### なぜ「共有可能な政策データ・ハブ」なのか

EBPM は「政策をエビデンスで設計し、検証する」ことです。しかし、データ・定義・判断の履歴が
バラバラのままでは、実務にエビデンスは浸透しません。このツールは、それらを
「台帳 → 辞書 → 観測 → 記録 → 評価」の一つの構造に結びつけ、誰でも再現・共有できるようにします。

| 営み | policy-insight-hub の対応物 |
|---|---|
| 根拠の所在を明らかにする | データ台帳（出典・所有者・更新日） |
| KPI の意味と来歴を共通化する | 指標辞書（定義・計算式・目標・データソース紐付け） |
| 実測値を継続して追跡する | 時系列観測値の政策ダッシュボード（Recharts グラフ） |
| 判断過程を記録して学習を継承する | レビュー記録（議題・所見・アクション追跡） |
| 外部情報を常に最新に保つ | Kitesurf Worker 連携 + 起動時ステイル検知 |
| 国際的なエビデンスを評価軸で比較する | 政策エッセンス（信頼性・文脈・公平性など5評価軸） |
| エビデンスを分析ツールへ持ち運ぶ | SQLite .db データ交換 |

### 考察: EBPM ツールに求められる前提

1. **根拠の所在を明示する** — 出典・来歴・更新時刻をコードとデータで追跡可能にする
2. **定義を共通化する** — 同じ名称でも定義が違えば比較できない。辞書で前提を揃える
3. **判断過程を残す** — 担当変更後も政策改善の学習を継承できる
4. **鮮度を保つ** — データ源は静かに壊れ続ける。起動時ステイル検知と更新で「常に最新」を保つ
5. **失敗しても止まらない** — DB 未接続・取得失敗は明示的なスキップとして吸収し、サーバー起動を妨げない
6. **ロールを守る** — Manus OAuth 認証 + 管理者 / 一般ユーザーで書き込みを制御する

## 特徴

- **政策ダッシュボード**: 登録済み時系列を Recharts の折れ線・棒グラフで可視化
- **データ台帳**: 登録・一覧・検索・編集・最終更新日表示・CSV/JSON エクスポート
- **指標辞書**: 定義・計算式・目標・データソース紐付け・鮮度バッジ・CSV/JSON エクスポート
- **レビュー記録**: 定例レビューの議題・所見・アクションアイテム・担当者・ステータスを追跡
- **情報収集（Kitesurf 連携）**: Worker URL の設定・収集ログ・データ台帳候補の採否管理
- **起動時ステイル更新**: 鮮度判定 → 15分リースによる重複実行防止 → 監査状態を保存し管理画面に反映
- **国際EBPM政策エッセンス**: 根拠透明性・設計信頼性・文脈適合性・公平性影響・移転可能性の5評価軸で比較
- **データ交換（SQLite .db）**: 正規化した標準形式で出力し、ブラウザ内で形式と収録件数を検証（サーバー送信なし）
- **認証とロール制御**: Manus OAuth + tRPC プロシージャ単位の管理者 / 一般ユーザー制御
- **モダンSPA**: Vite + React 19 + TypeScript + tRPC v11 + drizzle-orm（Cloudflare D1）

## クイックスタート

### 前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---|---|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |

#### pnpm の導入（Volta を使う場合 / 使わない場合）

このリポジトリは `package.json` の `packageManager` で **`pnpm@10.4.1+sha512...`** を固定しています。
`pnpm --version` が `Volta error: Could not locate executable` で失敗する場合は、以下のいずれかで導入してください。

**Volta を使う場合**

```bash
volta install pnpm@10.4.1
```

Volta は `packageManager` に固定されたバージョンを shim から解決します。固定版が未導入だと上記エラーになるため、
必ず `volta install` で同じバージョンを導入してください。

**Volta を使わない場合**

```bash
# corepack（Node.js 同梱）で packageManager の固定版を自動取得
corepack enable pnpm

# または npm 経由で任意のバージョンを導入
npm install -g pnpm@10.4.1
```

> **備考**: リポジトリの `package.json` の `pnpm.onlyBuiltDependencies` には `@tailwindcss/oxide` / `esbuild` / `workerd` が
> 登録されています（pnpm 10 でデフォルト化された「ビルドスクリプトのブロック」を解除するため）。導入後に
> `pnpm rebuild` が必要な場合は上記 3 パッケージが対象です。

### 1. リポジトリを取得する

```bash
git clone https://github.com/watanabe3tipapa/policy-insight-hub.git
cd policy-insight-hub
```

### 2. インストールして起動する

```bash
pnpm install
pnpm dev        # 開発: http://localhost:3000
pnpm build && pnpm start   # 本番: http://localhost:3000
```

### 3. 認証を有効化する

Manus OAuth を使うための環境変数を `.env.example` を参考に設定します（実値は環境に応じて）：

```bash
export VITE_APP_ID=...           # Manus OAuth のアプリ ID
export VITE_OAUTH_PORTAL_URL=... # OAuth ポータル URL
export JWT_SECRET=...            # セッション JWT の署名キー（シークレット）
```

## 環境変数

| 変数 | 説明 |
|---|---|
| `VITE_APP_ID` | Manus OAuth のアプリ ID（未設定ならログイン不可） |
| `VITE_OAUTH_PORTAL_URL` | Manus OAuth ポータル URL（`/app-auth` 起点） |
| `OAUTH_SERVER_URL` | OAuth API のベース URL（既定 `https://api.manus.im`） |
| `SPA_ORIGIN` | 分割デプロイ時の SPA オリジン（OAuth コールバックのリダイレクト先、例: `https://watanabe3tipapa.github.io`） |
| `OWNER_OPEN_ID` | 管理者（admin ロール）の openId |
| `BUILT_IN_FORGE_API_URL` | Forge API の URL（既定 `https://forge.manus.ai`） |
| `JWT_SECRET` | セッション JWT の署名キー（シークレット、コミット禁止） |
| `BUILT_IN_FORGE_API_KEY` | Forge API キー（シークレット、コミット禁止） |
| `PORT` | ローカルサーバーの優先ポート（既定 3000） |

## クライアントビルド時変数

| 変数 | 説明 |
|---|---|
| `VITE_API_URL` | API ベース URL（例: Cloudflare Worker の `/api/trpc`。未設定なら同オリジン `/api/trpc`） |
| `VITE_BASE_PATH` | カスタムドメイン使用時の静的 base（既定 `/policy-insight-hub/`） |
| `VITE_ANALYTICS_ENDPOINT` | Umami アナリティクスのエンドポイント（ビルド時設定時のみ注入） |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami の website ID（同上） |

## アーキテクチャ

```
policy-insight-hub/
├── client/                 # React 19 SPA（GitHub Pages で静的配信）
│   ├── src/
│   │   ├── pages/          # PolicyDashboard / DataSources / Indicators / Reviews /
│   │   │                   # KitesurfIntegration / PolicyEssences / DataExchange
│   │   ├── components/     # DashboardLayout / PageFrame / FreshnessBadge / ui（shadcn 系）など
│   │   ├── lib/            # trpc.ts / dataExchange.ts（SQLite .db 交換）
│   │   └── _core/          # hooks/useAuth.ts（OAuth セッション）
│   └── public/             # 404.html（深層リンクの hash 復元） / runtime/
├── server/                 # API（Cloudflare Worker + Node アダプタで共通 fetch ハンドラ）
│   ├── _core/              # handler.ts / trpc.ts / context.ts / oauth.ts / sdk.ts / env.ts / index.ts
│   ├── worker/index.ts     # Cloudflare Worker エントリ
│   ├── routers/            # policy / kitesurf / internationalPolicy
│   ├── db.ts               # D1 ヘルパー（bindD1Database で binding 注入）
│   └── startupRefresh.ts   # 起動時ステイル検知・Kitesurf 更新
├── shared/                 # const.ts（cookie / OAuth 定数） / types.ts
├── drizzle/                # schema.ts / 0000_talented_blade.sql（マイグレーション）
├── scripts/                # capture-screens.mjs（画面表示検証）
└── docs/                   # 設計ノート
```

## API

tRPC（`/api/trpc`）:

| namespace | procedure | 内容 |
|---|---|---|
| `system` | `health` / `notifyOwner` | 稼働確認 / オーナー通知 |
| `auth` | `me` / `logout` | セッション取得 / ログアウト |
| `policy.dataSources` | `list` / `create` / `update` | データ台帳 |
| `policy.indicators` | `list` / `create` / `update` | 指標辞書 |
| `policy.indicators.observations` | `list` / `create` | 時系列観測値 |
| `policy.reviews` | `list` / `create` / `update` / `delete` | レビュー記録 |
| `policy.reviews.actions` | `create` / `update` / `delete` | レビューアクション |
| `kitesurf` | `config` / `startupAudit` / `saveConfig` / `updateRefreshSettings` / `runs` / `candidates` / `createRun` / `updateRun` / `createCandidate` / `updateCandidate` | 情報収集・起動時更新 |
| `internationalPolicy.sources` | `list` / `create` | 国際政策の出典 |
| `internationalPolicy.essences` | `list` / `create` | 政策エッセンス |
| `internationalPolicy.contexts` | `upsert` | 社会的文脈 |
| `internationalPolicy.reviews` | `upsert` | 評価レビュー |

その他の HTTP ルート:

| エンドポイント | 内容 |
|---|---|
| `/api/oauth/callback` | Manus OAuth のコールバック |
| `/manus-storage/*` | ストレージプロキシ |

## Cloudflare Worker 連携

policy-insight-hub は **GitHub Pages（SPA）+ Cloudflare Workers（API）+ Cloudflare D1（SQLite）** の構成です。

- **起動時ステイル更新**: 最終成功から `staleAfterHours` を超えた場合のみサーバー起動時に
  Kitesurf Worker の `POST /collect` を実行。15分リースで重複実行を防止し、
  監査状態（`lastStartupCheckAt` / `lastStartupOutcome` / `lastStartupMessage`）を D1 に保存して管理画面へ反映します
- **wrangler.toml**: `server/worker/index.ts` を `main` に設定。D1 binding は
  `wrangler d1 create policy-insight-hub` で作成した `database_id` を入力して有効化します
- **シークレット**: `JWT_SECRET` と `BUILT_IN_FORGE_API_KEY` はコミットせず
  `wrangler secret put` で設定します

```bash
pnpm worker:dev       # ローカルで Worker を開発
pnpm worker:deploy    # Worker をデプロイ
pnpm db:migrate       # D1 へマイグレーション適用（--remote）
```

## ドキュメント

- [DEV-MEMO](DEV-MEMO.md) — 開発メモ（技術スタック・設定値・実装履歴）

## テスト

```sh
pnpm check        # 型検査（tsc --noEmit）
pnpm test         # Vitest（26 tests: 業務 API / 起動時更新 / マイグレーション再現 / データ交換）
pnpm screenshot   # Playwright による全ページの表示検証（screenshots/ に出力）
```

## ライセンス

MIT License。詳細は [LICENSE](LICENSE) を参照。

## 連絡先

GitHub: [https://github.com/watanabe3tipapa/policy-insight-hub](https://github.com/watanabe3tipapa/policy-insight-hub)