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
  await sql`create table if not exists push_subscriptions (
    endpoint text primary key,
    member_id uuid not null references members(id) on delete cascade,
    p256dh text not null,
    auth text not null,
    created_at timestamptz not null default now()
  )`
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
