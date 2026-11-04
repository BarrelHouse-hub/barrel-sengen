# バレルハウス 宣言ボード

やりたいことを宣言して、飲みながら報告する。バレルハウスのメンバー向けアプリです。
スマホのブラウザで開いて「ホーム画面に追加」すると、アプリとして使えます。

## できること

- **ボード**: みんなの宣言を手書き風のカードで並べる。ジャンルで絞り込み、「乾杯」で応援する
- **宣言する**: やること・期限・本気度（ガチ／ゆるく）・ジャンル・貸してほしい力を書いて貼る
- **力を貸して**: 「貸してほしい力」がある宣言に「手伝える」「知り合いを紹介」で手を挙げる
- **報告**: 自分の宣言を「達成した」「できなかった」で報告。達成旅行と「なんでできなかったんだろうね会」
- **宣言の詳細**: コメント・ツッコミ、手を挙げた人の一覧
- **登録**: ニックネームと合言葉だけ（合言葉はお店で口頭で伝える）
- **たるまる（マスコット・仮）**: 宣言の「進捗どう？」、期限まぢか・期限切れのひと声、達成のお祝い、好みに合うほかの人の宣言の紹介を「お便り」で届ける。通知をオンにするとスマホにも届く（iPhone はホーム画面に追加したアプリから）

## 技術

- Next.js 16（App Router・Cache Components）＋ Tailwind CSS 4
- データベース: Neon Postgres（Vercel Marketplace）。テーブルは初回アクセス時に自動で作られる（`src/lib/db.ts`）
- ホスティング: Vercel（プロジェクト名 `barrel-sengen`）

## 手元で動かす

```bash
npm install
vercel link --project barrel-sengen   # 初回だけ。Vercel のチームに招待されている必要あり
vercel env pull .env.local --yes      # DATABASE_URL などを取ってくる
npm run dev
```

必要な環境変数（中身はコミットしない）:

| 名前 | 用途 |
|---|---|
| `DATABASE_URL` | Neon の接続先（Neon 連携で自動設定） |
| `BARREL_PASSCODE` | 登録の合言葉 |
| `SESSION_SECRET` | ログインのクッキーに署名する鍵 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | スマホ通知（Web Push）の鍵 |
| `CRON_SECRET` | 毎日のお便り作成（Vercel Cron）を呼べるのを Vercel だけにする合言葉 |

## 開発の進め方

- `main` に直接 push しない。ブランチを切ってプルリクを出す
- ブランチ名の例: `feat/notify-weekly`, `fix/cheer-count`
- プルリクを出す前に `npm run lint` と `npm run build` が通ることを確認する

## ファイルの地図

| 場所 | 中身 |
|---|---|
| `src/app/(main)/` | ログイン後の画面（ボード・宣言する・力を貸して・報告・詳細） |
| `src/app/join/` | 登録画面 |
| `src/app/actions.ts` | 書き込み処理（宣言・乾杯・手を挙げる・コメント・報告） |
| `src/lib/data.ts` | 読み込みのクエリ |
| `src/lib/session.ts` | ログイン状態 |
| `src/proxy.ts` | 未ログインなら登録画面へ回す |
| `src/lib/mascot.ts` | たるまるのセリフと、いつ何を届けるかのルール |
| `src/app/api/cron/mascot/` | 毎日 19:00（日本時間）に全員分のお便りを作って通知する（`vercel.json`） |
| `public/sw.js` | スマホ通知を受け取る Service Worker |
