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
- 候補時間だけを初期表示し、必要に応じて月間カレンダーで全日程へ切り替え
- 曜日（複数選択・平日・週末・一週間）と日付範囲・時間帯による一括入力
- 日単位の一括入力、同じ曜日へのコピー、一括操作の1段階Undo
- PCは候補グリッド、スマートフォンは候補の縦型入力。全日程は端末を問わず7列カレンダー
- 回答者別の内訳を確認できる結果画面
- 期間内の全候補を月ごとに俯瞰し、日別の全候補を開ける結果カレンダー
- 自然文からAvailabilityとPreferenceを分離し、30日分を確認後に反映する「AIおまかせ入力」
- AI下書きの月間プレビュー、AIラベル、手動入力優先、1段階Undo
- 最小衝突モードをすぐ確認できる「デモを試す」機能
- AI未設定時も通常入力・一括入力・結果表示はすべて利用可能

## 主な構成

```text
app/
  page.tsx                 トップページ
  create/page.tsx          日程調整作成
  schedule/[id]/page.tsx   参加者登録・予定入力
  result/[id]/page.tsx     おすすめ10件
  result/[id]/all/page.tsx 期間内の全候補カレンダー
components/schedule/       日程入力・候補・結果UI
lib/scheduling/            候補抽出・連続時間・衝突・スコアリング
lib/storage/               差し替え可能なRepositoryとPrototype保存実装
lib/ai/                    AI用の型・Zod schema・prompt・設定
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

## AIおまかせ入力

回答画面で普段の生活や予定を文章で入力すると、サーバー側のOpenAI APIが構造化ルールへ変換します。結果は月間カレンダーで確認でき、ユーザーが「この内容を反映」を押すまで回答stateやDBへ反映されません。AIと手動設定が重なった場合は手動設定を維持します。

VercelのProject Settings → Environment Variablesへ`OPENAI_API_KEY`を設定してください。モデルを変更する場合だけ`OPENAI_MODEL`を設定します（未設定時は`gpt-4o-mini`）。キーが未設定でもAI以外の機能は通常どおり動作します。

## Vercel

GitHubリポジトリをVercelへ接続し、Framework PresetをNext.jsにしてデプロイできます。Vercel MarketplaceからNeonを接続し、NeonのSQL Editorで`neon/schema.sql`を実行してください。接続時にVercelへ`DATABASE_URL`が自動設定されます。手動接続の場合は、Neonの接続文字列を`DATABASE_URL`へ設定します。接続情報はサーバーAPIだけで利用し、ブラウザへ公開しません。

## 次フェーズ

- リアルタイム同期
- 回答編集、主催者管理、締切
- AIとの複数ターン会話・確認質問
- AIによる最終候補の理由説明
- Google Calendar / Outlook Calendar連携
- タイムゾーン、通知、PWA
