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
- **アプリとして使う**: ボードにホーム画面への追加方法を案内。圏外のときは案内ページを表示
- **通知**: 自分の宣言に乾杯・手を挙げる・コメントがあるとプッシュ通知（「報告」画面でオン／オフ。iPhone はホーム画面に追加した人だけ）

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
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | プッシュ通知の公開鍵（`npx web-push generate-vapid-keys` で作る。未設定なら通知は無効） |
| `VAPID_PRIVATE_KEY` | プッシュ通知の秘密鍵 |
| `VAPID_SUBJECT` | 通知の送信元（`mailto:...` か `https://...`。未設定ならサイトの URL） |

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
| `src/lib/push.ts` | プッシュ通知の送信 |
| `public/sw.js` | Service Worker（圏外の案内・通知の受信） |
