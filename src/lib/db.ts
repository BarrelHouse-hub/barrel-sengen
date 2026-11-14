import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null
let _ready: Promise<void> | null = null

async function migrate(sql: NeonQueryFunction<false, false>) {
  await sql`create table if not exists members (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    created_at timestamptz not null default now()
  )`
  await sql`create table if not exists declarations (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references members(id) on delete cascade,
    what text not null,
    due date,
    cat text not null,
    mode text not null,
    need text not null default '',
    status text not null default 'doing',
    created_at timestamptz not null default now(),
    reported_at timestamptz
  )`
  await sql`create table if not exists cheers (
    decl_id uuid not null references declarations(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    primary key (decl_id, member_id)
  )`
  await sql`create table if not exists offers (
    decl_id uuid not null references declarations(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    kind text not null,
    created_at timestamptz not null default now(),
    primary key (decl_id, member_id, kind)
  )`
  await sql`create table if not exists comments (
    id uuid primary key default gen_random_uuid(),
    decl_id uuid not null references declarations(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now()
  )`
  await sql`alter table members add column if not exists mascot_checked_at timestamptz`
  await sql`create table if not exists mascot_messages (
    id uuid primary key default gen_random_uuid(),
    member_id uuid not null references members(id) on delete cascade,
    kind text not null,
    decl_id uuid references declarations(id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now(),
    read_at timestamptz
  )`
  await sql`create index if not exists mascot_messages_member on mascot_messages (member_id, created_at desc)`
  // だれのアクションで届いたお便りか（紹介・手伝える・コメント・乾杯）
  await sql`alter table mascot_messages add column if not exists actor_id uuid references members(id) on delete cascade`
  // 同じ人・同じ宣言・同じ種類のお知らせは1回だけ（コメントは毎回）
  await sql`create unique index if not exists mascot_messages_reaction_once
    on mascot_messages (member_id, decl_id, kind, actor_id)
    where kind in ('intro', 'help', 'cheer')`
  await sql`create table if not exists push_subscriptions (
    endpoint text primary key,
    member_id uuid not null references members(id) on delete cascade,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  )`
  // 2週間サイクル（ラウンド）
  await sql`create table if not exists rounds (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    deadline date not null,
    meetup_at timestamptz,
    meetup_place text not null default '',
    meetup_map_url text not null default '',
    note text not null default '',
    created_by uuid references members(id) on delete set null,
    created_at timestamptz not null default now()
  )`
  await sql`alter table declarations add column if not exists round_id uuid references rounds(id) on delete set null`
  await sql`alter table members add column if not exists is_admin boolean not null default false`
  // ラウンドの告知・リマインドは、同じ人に同じ種類を1回だけ
  await sql`alter table mascot_messages add column if not exists round_id uuid references rounds(id) on delete cascade`
  await sql`create unique index if not exists mascot_messages_round_once
    on mascot_messages (member_id, round_id, kind)
    where round_id is not null`
  // 成果物の提出（宣言ごとに1つ。出し直すと中身を差し替える）
  await sql`create table if not exists submissions (
    decl_id uuid primary key references declarations(id) on delete cascade,
    member_id uuid not null references members(id) on delete cascade,
    body text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`
  // 写真（最大3枚）と PDF（1つ）。中身は Vercel Blob（非公開）に置き、ここにはその場所だけ
  await sql`create table if not exists submission_files (
    id uuid primary key default gen_random_uuid(),
    decl_id uuid not null references submissions(decl_id) on delete cascade,
    pathname text not null unique,
    content_type text not null,
    size integer not null,
    position integer not null default 0
  )`
  // たるまるの声かけの頻度（more: 3日おき / normal: 週1 / less: 期限の知らせだけ）
  await sql`alter table members add column if not exists checkin_freq text not null default 'normal'`
  // 「調子どう？」への返事（good / stuck / tired）。ボードには出さない
  await sql`alter table mascot_messages add column if not exists reply text`
  await sql`alter table mascot_messages add column if not exists replied_at timestamptz`
}

/** Returns the SQL client, creating the tables once per server instance. */
export async function db() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL が設定されていません（Neon を接続してください）')
    _sql = neon(url)
  }
  if (!_ready) {
    _ready = migrate(_sql).catch((e) => {
      _ready = null
      throw e
    })
  }
  await _ready
  return _sql
}
