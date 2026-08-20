# DEV-MEMO

Policy Insight Hub の実装メモ。作業を進めるたびにこのファイルに追録していく。

## 概要・アーキテクチャ

EBPM 政策データ（データ台帳・指標辞書・観測値・レビュー記録・国際政策エッセンス）を管理する SPA + API アプリ。

**デプロイ分離構成（確定）**
- Client: **GitHub Pages**（静的配信、`https://watanabe3tipapa.github.io/policy-insight-hub/` サブパス）
- Server API: **Cloudflare Worker**（`server/worker/index.ts` エントリ、`wrangler.toml`）
- 情報収集: **Kitesurf Worker**（既存外部 Worker、`workerUrl` 設定で接続）
- DB: **Cloudflare D1**（SQLite）。MySQL/Hyperdrive 案は破棄。

クライアントは `VITE_API_URL`（ビルド時に設定）で Worker API を指す。未設定時は同オリジン `/api/trpc` にフォールバック（ローカル実行用）。

## 技術スタック

| 領域 | 技術 |
| --- | --- |
| フロント | React 19 + TypeScript + Vite 7 |
| ルーティング | wouter（history mode、`@/components` に base 設定なし → ルートパスでマッチ） |
| UI | Tailwind CSS v4、shadcn/ui 系（Radix）、lucide-react、recharts、sonner |
| API クライアント | @trpc/client v11 + @tanstack/react-query v5、superjson transformer |
| サーバー | Express（Node アダプタ、ローカル用）+ Cloudflare Worker（fetch ハンドラ共有） |
| ORM | drizzle-orm + drizzle-kit（SQLite / D1） |
| 認証 | Manus OAuth（外部ポータル）+ jose セッション JWT |
| テスト | Vitest（node 環境） |
| DB 検証 | sql.js（in-memory SQLite、マイグレーション再現テスト） |
| スクリーンショット | Playwright（chromium） |

## ディレクトリ構成

```
client/            # React SPA（vite root = client/）
  src/pages/       # PolicyDashboard, DataSources, Indicators, Reviews,
                   # KitesurfIntegration, PolicyEssences, DataExchange
  src/components/  # DashboardLayout, AIChatBox（削除せず維持）, ui/ など
  src/lib/         # trpc.ts, dataExchange.ts（SQLite .db 交換）
  src/_core/       # hooks/useAuth.ts
  public/404.html  # GH Pages 深層リンク → hash へのリライト
  public/runtime/  # debug-collector.js 等（旧 __manus__ からリネーム）
server/            # API
  _core/           # handler.ts, context.ts, trpc.ts, env.ts, oauth.ts,
                   # sdk.ts, cookies.ts, index.ts（Node）, vite.ts, storageProxy.ts
  worker/index.ts  # Cloudflare Worker エントリ
  routers/         # policy, kitesurf, internationalPolicy
  db.ts            # D1 ヘルパー（bindD1Database で binding 注入）
  startupRefresh.ts # 起動時鮮度判定・Kitesurf 更新
shared/            # const.ts（cookie/OAuth 定数）, types.ts
drizzle/           # schema.ts, 0000_talented_blade.sql, meta/
scripts/           # capture-screens.mjs（スクリーンショット検証）
screenshots/       # 検証用スクリーンショット出力
```

## 主要設定値

### 環境変数（server/_core/env.ts → `configureEnv()` で注入）
Node エントリは `process.env`、Worker エントリは bindings を渡す。

| 変数 | 用途 |
| --- | --- |
| `VITE_APP_ID` | Manus OAuth のアプリ ID |
| `JWT_SECRET` | セッション JWT 署名（シークレット、`wrangler secret put`） |
| `OAUTH_SERVER_URL` | `https://api.manus.im` |
| `OWNER_OPEN_ID` | 管理者（admin ロール）の openId。未指定は空 |
| `BUILT_IN_FORGE_API_URL` | `https://forge.manus.ai` |
| `BUILT_IN_FORGE_API_KEY` | シークレット（`wrangler secret put`） |
| `SPA_ORIGIN` | 分割デプロイ時の SPA オリジン（OAuth コールバックのリダイレクト先） |
| `VITE_OAUTH_PORTAL_URL` | OAuth ポータル（`/app-auth` 起点） |
| `VITE_API_URL` | クライアントが API を指す URL（ビルド時） |
| `VITE_ANALYTICS_ENDPOINT` / `VITE_ANALYTICS_WEBSITE_ID` | Umami アナリティクス（ビルド時設定時のみ index.html から注入） |
| `PORT` | ローカル Node サーバー優先ポート（既定 3000、使用中なら +19 まで探索） |

### デプロイ（現行）
- SPA: **GitHub Pages** `https://watanabe3tipapa.github.io/policy-insight-hub/`（`.github/workflows/deploy-pages.yml` が push 時に `vite build` → Pages へ自動配信）
- API: **Cloudflare Worker** `https://policy-insight-hub-api.watanabe3ti.workers.dev`（`pnpm exec wrangler deploy`）
- DB: **D1** `policy-insight-hub`（`ac5229fc-bed8-4011-8c6b-fcda3e7274a8`、region APAC、`0000_talented_blade.sql` 適用済み）
- ビルド時 env（Pages workflow）: `VITE_APP_ID` / `VITE_OAUTH_PORTAL_URL` / `VITE_API_URL`

### vite.config.ts
- `base`: development は `/`、production は `VITE_BASE_PATH || "/policy-insight-hub/"`
- alias: `@` → `client/src`、`@shared` → `shared`
- `root` = `client/`、`publicDir` = `client/public`、`outDir` = `dist/public`（`emptyOutDir: true`）
- プラグイン: react, tailwindcss, jsx-loc, vite-plugin-manus-runtime, 独自 debug-collector
- dev server `allowedHosts`: `.manuspre.computer` ほか Manus 系ドメイン

### wrangler.toml
- `name = "policy-insight-hub-api"`、`main = "server/worker/index.ts"`、`compatibility_date = "2026-08-18"`
- `[vars]`: `VITE_APP_ID`, `OAUTH_SERVER_URL`, `OWNER_OPEN_ID`, `BUILT_IN_FORGE_API_URL`, `SPA_ORIGIN`
- D1 binding: `binding = "DB"`、`database_id = "ac5229fc-bed8-4011-8c6b-fcda3e7274a8"`、`migrations_dir = "drizzle"`（`migrations_dir` は wrangler.toml トップレベル不可・`[[d1_databases]]` 内に置く）
- `JWT_SECRET`, `BUILT_IN_FORGE_API_KEY` はシークレット（`wrangler secret put` 済み・コミット禁止）

### クロスオリジン（分割デプロイ対応）
- **CORS**: `server/_core/handler.ts` の `corsHeaders()` がリクエスト `Origin` をエコーし `Access-Control-Allow-Credentials: true` を付与。OPTIONS プリフライトは 204 を返す（`Authorization` ヘッダ許可）
- **OAuth state cookie**: SPA（GH Pages）とコールバック（Worker）が別オリジンのため、`__Host-oauth_state` を SPA からは渡せない。`POST /api/oauth/start` が nonce を受け取り Worker オリジンに state cookie を立てる（`server/_core/oauth.ts` の `handleOAuthStart`）。`client/src/const.ts` の `startLogin()` は `VITE_API_URL` 設定時のみこれを先に呼ぶ
- **コールバック後リダイレクト**: `handleOAuthCallback` の returnOrigin は `ENV.spaOrigin`（`SPA_ORIGIN`）を最優先。未設定時は従来通り state 内 redirectUri のオリジン

### drizzle.config.ts
- `dialect: "sqlite"`、`driver: "d1-http"`、`dbCredentials.wranglerConfigPath = "wrangler.toml"`
- drizzle-kit 0.31 の D1 ドライバは `d1-http` 必須（`d1` は invalid）

### 認証・cookie（shared/const.ts）
- `COOKIE_NAME = "app_session_id"`
- `OAUTH_STATE_COOKIE = "__Host-oauth_state"`（CSRF nonce、`__Host-` プレフィクスでホスト限定）
- `UNAUTHED_ERR_MSG = 'Please login (10001)'`、`NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)'`
- OAuth `state` は `{ redirectUri, nonce }` の base64。redirectUri は API origin ベース
- `ONE_YEAR_MS`（セッション寿命）、`AXIOS_TIMEOUT_MS = 30000`

## データモデル（drizzle/schema.ts、SQLite / D1）

13 テーブル（`drizzle/0000_talented_blade.sql` が適用済みマイグレーション）:

users / data_sources / indicators / indicator_observations / reviews / review_actions / kitesurf_configs / collection_runs / source_candidates / policy_sources / policy_essences / policy_contexts / policy_reviews

- `kitesurf_configs` は起動時更新用カラムを持つ: `autoRefreshEnabled`, `staleAfterHours`, `lastStartupCheckAt`, `lastStartupOutcome`, `lastStartupMessage`, `lastStartupRefreshAt`, `startupRefreshLeaseUntil`
- DB ヘルパーは D1 制約対応: `returning({ id })`、`onConflictDoUpdate`、`updatedAt` は手動更新（D1 はタイムスタンプ自動更新なし）

## 認証・アクセス制御

- tRPC プロシージャ: `publicProcedure` / `protectedProcedure`（要ログイン）/ `adminProcedure`（要 admin ロール）
- `auth.me` は `ctx.user`（DB User）を返す。クライアントは `useAuth()` で `isAuthenticated` / `user.role === "admin"` を参照
- 未認証で保護 API を叩くと `UNAUTHED_ERR_MSG`。クライアントの `main.tsx` が Query/Mutation キャッシュのエラーを監視し、未認証なら `startLogin()` へ
- ログアウト: `auth.logout` が Set-Cookie（maxAge -1）でセッションを破棄

## サーバー起動時更新（server/startupRefresh.ts）

- `isKitesurfDataStale(lastSuccess, staleAfterHours, now)`: 最終成功から閾値時間超で stale
- Kitesurf Worker の `POST {workerUrl}/collect` を呼ぶ（`/collect` 末尾補正）
- 重複実行防止: `acquireKitesurfStartupLease` で `startupRefreshLeaseUntil`（15 分）を CAS 的に取得、失敗は `skipped_leased`
- 分岐: `skipped_fresh` / `skipped_unconfigured` / `skipped_leased` / `succeeded` / `failed`（`recordKitesurfStartupState` で監査状態を保存）
- DB 未接続・設定取得失敗は明示的にスキップし、サーバー起動を妨げない

## コマンド（package.json scripts）

| コマンド | 内容 |
| --- | --- |
| `pnpm dev` | ローカル開発（tsx watch、Vite + Express） |
| `pnpm build` | vite build + esbuild で `dist/` に Node サーバーと `dist/public/` に SPA |
| `pnpm start` | 本番ビルドを Node で実行（`NODE_ENV=production`） |
| `pnpm check` | `tsc --noEmit` |
| `pnpm test` | Vitest 実行（26 テスト） |
| `pnpm db:generate` | drizzle-kit generate（マイグレーション生成） |
| `pnpm db:migrate` | `wrangler d1 migrations apply policy-insight-hub --remote` |
| `pnpm worker:dev` / `worker:deploy` | wrangler dev / deploy |
| `pnpm screenshot` | Playwright で全ページのスクリーンショット検証 |

## テスト

- サーバー: tRPC を fetch ベースの `createContext` で叩く統合テスト
  - `auth.logout`, `policy.access`, `internationalPolicy.access`, `kitesurf.access`, `kitesurf.startupAudit`, `startupRefresh`（安全分岐の回帰）
- マイグレーション再現: `server/migration.test.ts` — `drizzle/0000_talented_blade.sql` を sql.js の in-memory DB に適用し、13 テーブルと `kitesurf_configs` 起動時更新カラムの存在を assert
- クライアント: `dataExchange.test.ts`, `startupAudit.test.ts`
- tsconfig の `exclude` は `**/*.test.ts` を含む（tsc はテストを型検査しない）

## 画面スクリーンショット検証（scripts/capture-screens.mjs）

- ビルド済み SPA（`dist/public`）を `http://localhost:4719` で配信
- `/api/trpc**` を HTTP 層でモック（**superjson.serialize 形式**で返却。プレーンオブジェクトは superjson.deserialize が undefined にするため必須）
- 深層リンクは `404.html` と同様に `/policy-insight-hub/index.html#<route>` へアクセスし、index.html の hash 復元スクリプトで wouter のルートパスへ変換
- `auth.me` → 管理者ユーザー（モック）、`*.list` → `[]`、config/startupAudit → `null` を返し、認証済み管理 UI の空状態を撮影
- 検証は**ページ本体限定のテキストマーカー**（サイドバー項目と重複しない）で判定
  - 例: `/sources` →「データソースがありません」、`/indicators` →「登録済みの指標がありません」など
- 出力: `screenshots/*.png`（7 ルート）

## 実装履歴（この回までの主要変更）

- **v1.1.1**: リポジトリを public 化、GitHub Pages を有効化（`build_type: workflow`）。Pages デプロイワークフローの actions を Node 24 対応の最新メジャーへ更新（`checkout`→v5 / `setup-node`→v5 / `pnpm/action-setup`→v6 / `upload-pages-artifact`→v5 / `deploy-pages`→v5）。`capture-screens.mjs` に Playwright bundled chromium 未対応時のシステム Chrome フォールバックを追加。package.json の version を v1.1.1 に更新

- **動作検証とドキュメント整合**: `pnpm install`/`check`/`test`/`build` を完走（test 26 件）。package.json の `pnpm.onlyBuiltDependencies` に `@tailwindcss/oxide`/`esbuild`/`workerd` を追加（pnpm 10 のビルドスクリプトブロック解除）。index.html の Umami タグを「設定時のみ注入」のガード付きに変更（未設定時は壊れた `<script src="%VITE_ANALYTICS_ENDPOINT%/umami">` がビルド出力に残る問題を解消）。`.env.example` に `SPA_ORIGIN` と `VITE_ANALYTICS_*` を追記。README(ja/en)・DEV-MEMO のテスト数（22→26）と useAuth パス（`_core/useAuth.ts` → `_core/hooks/useAuth.ts`）を実装と一致させた。README(ja/en) の前提条件に「Volta を使う場合 / 使わない場合」の pnpm 導入解説を追記（`volta install pnpm@10.4.1` 未導入時の shim エラー対策）

- 未使用サーバーヘルパー/クライアント削除（dataApi, heartbeat, llm, map, imageGeneration, voiceTranscription, ManusDialog, Map, Home, ComponentShowcase）
- `adminProcedure` を `server/_core/trpc.ts` に統合、`reviews.update/delete/actions.delete` を router+db に追加
- `main.tsx` の `/api/trpc` を `VITE_API_URL` 化、OAuth `redirectUri` を API origin ベース化
- サーバーを fetch 化（共通 `handler.ts` + Node エントリ + Worker エントリ）
- DB を MySQL → SQLite/D1 移植（`drizzle-orm/d1` + `bindD1Database` 注入）、`mysql2` 依存削除
- `.manus/`→`.runtime/`、`__manus__`→`runtime/`、`.manus-logs`→`.runtime-logs` にリネーム
- `template.json`、ルート/`client/public`/`dist/public` の `.gitkeep` 削除
- **初回デプロイ（v1.0.0）**: wrangler 追加、Worker デプロイ、D1 作成 + マイグレーション適用、シークレット設定、GitHub Pages 有効化 + `deploy-pages.yml`（push 時自動配信）
- **クロスオリジン対応**: CORS（Origin エコー + credentials）、`POST /api/oauth/start`（state cookie を API オリジンに発行）、`SPA_ORIGIN` によるコールバック後リダイレクト。`startLogin` は `VITE_API_URL` 設定時に `oauth/start` を先に呼ぶ
- **Pages ワークフロー修正**: `pnpm/action-setup` に `version` を明示すると package.json の `packageManager` と競合（`ERR_PNPM_BAD_PM_VERSION`）→ `version` を省略し packageManager を参照させる

## 備考・注意点

- `AIChatBox.tsx` は残す（削除しない）
- tRPC バッチは URL が `/api/trpc/<path1>,<path2>?batch=1`（コンマ連結）になる
- Playwright の `page.route` は 1 リクエストに対し最初にマッチした 1 ハンドラのみ実行。API モックと catch-all を分けると順序問題を起こしやすいため、**単一の catch-all 内で分岐**する設計にしている
- D1 は `drizzle-orm/d1` の `.returning()` / `.onConflictDoUpdate()` を使う