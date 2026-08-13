# AkiMatch — かしこい日程調整

回答が増えるたびに「まだ参加できる候補」だけを次の人へ表示する、複数人向けの日程調整Webアプリです。完全一致する時間がなくなっても停止せず、参加できない人数が最も少ない時間を候補として復活させます。

## 実装機能

- 開始日から7〜60日分の日付を自動生成（初期値30日）
- 1時間単位、`空いている / 参加しづらい / 参加できない` の3段階入力
- 回答ごとの段階的AND絞り込み
- 完全一致が消えた場合の最小衝突フォールバック
- 1〜4時間の連続時間判定
- 参加不可を強く、参加困難を弱く避ける決定論的ランキング
- 同じ参加者だけに負担が偏りにくい公平性ペナルティ
- 候補時間だけを表示し、必要に応じて全日程へ切り替え
- PCは5日ずつのグリッド、スマートフォンは1日ずつの縦型入力
- 回答者別の内訳を確認できる結果画面
- 最小衝突モードをすぐ確認できる「デモを試す」機能
- APIキー・ログイン・外部DBなしで動くPrototype

## 主な構成

```text
app/
  page.tsx                 トップページ
  create/page.tsx          日程調整作成
  schedule/[id]/page.tsx   参加者登録・予定入力
  result/[id]/page.tsx     結果ランキング
components/schedule/       日程入力・候補・結果UI
lib/scheduling/            候補抽出・連続時間・衝突・スコアリング
lib/storage/               差し替え可能なRepositoryとPrototype保存実装
lib/ai/                    将来の自然言語入力用インターフェース
types/                     Schedule / Participant / Availability型
```

## 起動と確認

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
```

## データ保存

Neon PostgreSQLへ保存し、共有URLを別端末から開いても同じ日程と回答を読み込めます。旧バージョンでブラウザに保存した日程は「過去の日程」を初めて開いたときに共有DBへ移行します。

## Vercel

GitHubリポジトリをVercelへ接続し、Framework PresetをNext.jsにしてデプロイできます。Vercel MarketplaceからNeonを接続し、NeonのSQL Editorで`neon/schema.sql`を実行してください。接続時にVercelへ`DATABASE_URL`が自動設定されます。手動接続の場合は、Neonの接続文字列を`DATABASE_URL`へ設定します。接続情報はサーバーAPIだけで利用し、ブラウザへ公開しません。

## 次フェーズ

- リアルタイム同期
- 回答編集、主催者管理、締切
- 自然言語から予定へ変換するAI実装とUndo
- Google Calendar / Outlook Calendar連携
- タイムゾーン、通知、PWA
