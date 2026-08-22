# policy-insight-hub

[![Version](https://img.shields.io/badge/version-v1.1.1-blue.svg)](https://github.com/watanabe3tipapa/policy-insight-hub)
[![Issues](https://img.shields.io/github/issues/watanabe3tipapa/policy-insight-hub.svg)](https://github.com/watanabe3tipapa/policy-insight-hub/issues)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

状態: 調整中

**EBPM。政策データを、たゆまず集め、構造化し、共有可能にする。**

policy-insight-hub は、Evidence-Based Policy Making（EBPM／証拠に基づく政策立案）のための
政策データ・ハブです。データ台帳、指標辞書、時系列観測値、レビュー記録、国際政策エッセンスを
一つの構造で管理し、外部 Worker による情報収集と起動時ステイル更新でデータの鮮度を保ちます。

[日本語](README.md) | [English](README_EN.md)

目次

- 概要
- コンセプト
- 主な機能
- クイックスタート
  - 前提条件
  - リポジトリ取得
  - インストールと起動
  - デモモード
  - 認証の有効化
- 環境変数
- クライアントビルド時変数
- アーキテクチャ
- API（tRPC）
- Cloudflare Worker 連携
- ドキュメント
- テスト
- 開発・保守状態
- ライセンス
- 連絡先

概要

policy-insight-hub は、データ台帳 → 指標辞書 → 観測 → レビュー → 評価 のワークフローを
一貫したデータ構造で管理することを目的としたSPAとAPIの組み合わせプロジェクトです。
収集したデータは SQLite 形式でのエクスポートに対応し、分析ツールへ持ち出せます。

コンセプト

- 根拠の所在（出典・所有者・更新日）を明示し追跡可能にする
- 指標定義を共通化して比較・再現を可能にする
- 判断過程（レビュー記録）を残して組織学習を支援する
- 起動時ステイル検知と外部 Worker による収集で鮮度を保つ
- DB 未接続や外部取得失敗があってもサーバー起動を妨げない設計
- 管理者ロールで書き込みを制御（認証・ロール制御の仕組みあり）

主な機能

- 政策ダッシュボード（Recharts による時系列可視化）
- データ台帳（登録・検索・編集・CSV/JSON エクスポート）
- 指標辞書（定義・計算式・目標・データソース紐付け）
- レビュー記録（議題・所見・アクション・担当・ステータス）
- 情報収集連携（Kitesurf Worker）と起動時ステイル更新
- 国際EBPM政策エッセンス（5評価軸での比較）
- SQLite .db 形式でのデータ交換（ブラウザ内で検証可能）
- 認証（管理者パスワードログイン）と tRPC ベースのプロシージャ単位アクセス制御
- モダンSPA（Vite + React 19 + TypeScript + tRPC v11 + drizzle-orm + Cloudflare D1）

クイックスタート

前提条件

| ツール | 必要バージョン | 確認コマンド |
|---|---:|---|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |

pnpm の導入については本リポジトリの package.json が `pnpm@10.4.1+sha512...` を固定しています。
Volta を利用するか corepack / npm で pnpm を導入してください（詳細は元 README を参照）。

リポジトリを取得する

```bash
git clone https://github.com/watanabe3tipapa/policy-insight-hub.git
cd policy-insight-hub
```

インストールして起動する

```bash
pnpm install
pnpm dev        # 開発: http://localhost:3000
pnpm build && pnpm start   # 本番: http://localhost:3000
```

デモモード（認証なしで全画面確認・LP用）

```bash
VITE_DEMO_MODE=true pnpm dev
```
- 管理者ユーザー「Demo User」として自動ログインし、全ページへアクセス可能になります
- ローカル開発専用の挙動です。本番ビルド/デプロイでは `VITE_DEMO_MODE` を `false` のままにしてください

注意: ルート（`/`）だけの表示では登録・編集等の操作はできません。デモモードで `/dashboard` 等の画面を確認してください。

認証を有効化する

ユーザー名 + パスワードログインのため、`.env.example` を参考に必要な環境変数を設定します（実値は環境に応じて）。

```bash
export ADMIN_USERNAME=admin   # 初回ログイン時に admin ロールになるユーザー名
export JWT_SECRET=...         # セッション JWT の署名キー（シークレット）
```

環境変数

| 変数 | 説明 |
|---|---|
| `ADMIN_USERNAME` | 初回ログイン時に admin ロールで自動作成されるユーザー名 |
| `BUILT_IN_FORGE_API_URL` | Forge API の URL（既定 `https://forge.manus.ai`） |
| `JWT_SECRET` | セッション JWT の署名キー（シークレット、コミット禁止） |
| `BUILT_IN_FORGE_API_KEY` | Forge API キー（シークレット、コミット禁止） |
| `PORT` | ローカルサーバーの優先ポート（既定 3000） |

クライアントビルド時変数

| 変数 | 説明 |
|---|---|
| `VITE_API_URL` | API ベース URL（例: Cloudflare Worker の `/api/trpc`。未設定なら同オリジン `/api/trpc`） |
| `VITE_BASE_PATH` | カスタムドメイン使用時の静的 base（既定 `/policy-insight-hub/`） |
| `VITE_ANALYTICS_ENDPOINT` | Umami アナリティクスのエンドポイント（ビルド時設定時のみ注入） |
| `VITE_ANALYTICS_WEBSITE_ID` | Umami の website ID（同上） |
| `VITE_DEMO_MODE` | `true` で認証をバイパスしデモユーザーで全機能アクセス可能（ローカル開発専用） |

アーキテクチャ

主要なディレクトリ構成（抜粋）:

```
policy-insight-hub/
├── client/                 # React SPA（GitHub Pages で静的配信）
│   ├── src/
│   │   ├── pages/          # Dashboard / DataSources / Indicators / Reviews / ...
│   │   ├── components/
│   │   ├── lib/            # trpc.ts / dataExchange.ts（SQLite .db 交換）
│   │   └── _core/          # hooks/useAuth.ts（パスワードセッション）
├── server/                 # API（Cloudflare Worker + Node アダプタ）
│   ├── _core/              # handler.ts / trpc.ts / context.ts / sdk.ts / env.ts
│   ├── worker/index.ts     # Cloudflare Worker エントリ
│   ├── routers/            # policy / kitesurf / internationalPolicy
│   ├── db.ts               # D1 ヘルパー
│   └── startupRefresh.ts   # 起動時ステイル検知・Kitesurf 更新
├── shared/
├── drizzle/                # schema / マイグレーション
├── scripts/
└── docs/
```

API（tRPC）

主な namespace と procedures（README に記載の一覧）:

- system: health / notifyOwner
- auth: me / login / logout
- policy.dataSources: list / create / update
- policy.indicators: list / create / update
- policy.indicators.observations: list / create
- policy.reviews: list / create / update / delete
- policy.reviews.actions: create / update / delete
- kitesurf: config / startupAudit / saveConfig / updateRefreshSettings / runs / candidates / createRun / updateRun / createCandidate / updateCandidate
- internationalPolicy.sources: list / create
- internationalPolicy.essences: list / create
- internationalPolicy.contexts: upsert
- internationalPolicy.reviews: upsert

その他の HTTP ルート:

- `/manus-storage/*` — ストレージプロキシ

Cloudflare Worker 連携

本プロジェクトは GitHub Pages（SPA）と Cloudflare Workers（API）および Cloudflare D1（SQLite）を組み合わせた構成です。

主なポイント:
- 起動時ステイル更新: 最終成功から設定時間（staleAfterHours）を超えた場合にのみ起動時に外部 Worker（Kitesurf）へ収集を依頼し、15分リースで重複実行を防止。監査状態を D1 に保存して管理画面へ反映します。
- wrangler.toml: `server/worker/index.ts` を Worker エントリに設定。D1 binding は `wrangler d1 create policy-insight-hub` で作成した database_id を用います。
- シークレット: `JWT_SECRET` と `BUILT_IN_FORGE_API_KEY` はコミット禁止で、wrangler の secret 等で設定する想定です。

パッケージに定義されたスクリプト（抜粋）:

- pnpm dev — 開発用サーバー起動
- pnpm build / pnpm start — 本番ビルドと起動
- pnpm worker:dev / pnpm worker:deploy — Worker 開発・デプロイ
- pnpm db:migrate — D1 マイグレーション適用（wrangler 経由）

ドキュメント

- DEV-MEMO（開発メモ）: 開発ノートや設計情報を含みます。リポジトリ内の DEV-MEMO.md を参照してください。

テスト

README に記載されているテスト関連コマンド:

```sh
pnpm check        # 型検査（tsc --noEmit）
pnpm test         # Vitest（テスト群）
pnpm screenshot   # Playwright による表示検証（screenshots/ に出力）
```

開発・保守状態

- リポジトリ説明は「調整中」となっています。ドキュメントやコードにはデプロイ・ローカル実行に必要な手順・変数が記載されています。
- 実行時に必要なシークレットや D1 の binding、wrangler の設定などは環境ごとに設定する必要があります。

ライセンス

MIT License — 詳細はリポジトリの LICENSE ファイルを参照してください。

連絡先

GitHub: https://github.com/watanabe3tipapa/policy-insight-hub

ホームページ（デモ／ドキュメント公開先）: https://watanabe3tipapa.github.io/policy-insight-hub/
