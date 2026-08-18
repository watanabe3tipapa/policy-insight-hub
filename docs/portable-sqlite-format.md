# Policy Insight Hub Portable SQLite Format

Policy Insight Hubは、収集済みの政策データを**標準SQLite 3**の`.db`ファイルとして交換する。データベース固有のID、利用者情報、認証情報、操作セッションは含めない。文字列はUTF-8、時刻はUTCのISO 8601文字列で保存する。

| テーブル | 用途 | 主な識別子 |
|---|---|---|
| `hub_metadata` | 形式名、形式バージョン、出力日時、文字コード | `key` |
| `hub_manifest` | データ表ごとの行数と説明 | `table_name` |
| `data_sources` | 政策データソースの来歴、所管、更新頻度 | `source_key` |
| `policy_indicators` | KPI・指標の定義、目標、データソース参照 | `indicator_key` |
| `indicator_observations` | 指標の時系列観測値 | `indicator_key + observed_at` |
| `collection_runs` | Kitesurf等の収集処理の結果履歴 | `run_key` |
| `source_candidates` | 収集結果から抽出した台帳登録候補 | `candidate_key` |
| `policy_sources` | 国際EBPM政策の原資料・独立評価の来歴 | `policy_source_key` |
| `policy_essences` | 政策目的、仕組み、根拠、成果のエッセンス | `policy_key` |
| `policy_contexts` | 社会・制度・実装・公平性の文脈 | `policy_key` |
| `policy_reviews` | 根拠透明性、設計信頼性、文脈適合性、公平性、移転可能性のレビュー | `policy_key` |

> 形式識別子は`policy-insight-hub-sqlite`、初版は`1.0`である。受取側は`hub_metadata`の`format`と`format_version`を確認してからデータを読む。

外部ツールはSQLiteの標準ドライバで直接読み取れる。関係はアプリ内部の数値IDではなく、持ち運び可能な`source-*`、`indicator-*`、`run-*`、`policy-*`の文字列キーで表現する。これにより、異なるデータベース環境で読み書きした後でも元の関連を維持できる。
