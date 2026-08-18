# 起動時ステイル検知とKitesurf更新

Policy Insight Hubは、サーバーが起動した時点でKitesurf収集データの鮮度を確認する。**直近の成功した収集から24時間を超過**している場合のみ、設定済みWorkerの`POST /collect`へ更新要求を送る。

| 条件 | 動作 |
|---|---|
| Worker URL未設定 | 更新を行わず、アプリは通常どおり起動する。 |
| 直近成功から24時間以内 | `skipped`として監査状態を更新し、Workerを呼び出さない。 |
| 24時間超過または成功記録なし | Workerへ更新要求を送信し、収集ログを`running`として作成する。 |
| 同一時刻に複数起動 | DB上の15分間リースで一つの実行だけが更新を取得する。 |
| Worker失敗・タイムアウト | 監査状態と収集ログを`failed`として残すが、サーバー起動は停止しない。 |

Workerには次のJSONを送る。

```json
{
  "trigger": "startup_stale_check",
  "format": "policy-insight-hub.v1",
  "requestedAt": "UTC ISO 8601"
}
```

Workerは任意で`summary`、`resultUrl`、`candidates`を返せる。`candidates`は`name`、`url`、`description`、`policyArea`を持つ公開資料候補の配列であり、Hubは候補としてのみ保存する。外部出力が出典確認や政策エッセンスの公開を自動的に指示することはない。
