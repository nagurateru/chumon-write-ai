-- SUUMO原稿生成アプリ 初期テーブル定義

-- 会社プロフィールテーブル
create table if not exists public.company_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  company_name text,
  strengths text,
  homepage_text text,
  features text,
  custom_prompt text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id)
);

-- 生成済み原稿テーブル
create table if not exists public.generated_manuscripts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  manuscript_type text not null,
  content text not null,
  image_description text,
  created_at timestamptz default now() not null
);

-- Row Level Security (RLS) を有効化
alter table public.company_profiles enable row level security;
alter table public.generated_manuscripts enable row level security;

-- company_profiles のポリシー
create policy "自分のプロフィールのみ参照可能"
  on public.company_profiles for select
  using (auth.uid() = user_id);

create policy "自分のプロフィールのみ作成可能"
  on public.company_profiles for insert
  with check (auth.uid() = user_id);

create policy "自分のプロフィールのみ更新可能"
  on public.company_profiles for update
  using (auth.uid() = user_id);

-- generated_manuscripts のポリシー
create policy "自分の原稿のみ参照可能"
  on public.generated_manuscripts for select
  using (auth.uid() = user_id);

create policy "自分の原稿のみ作成可能"
  on public.generated_manuscripts for insert
  with check (auth.uid() = user_id);

create policy "自分の原稿のみ削除可能"
  on public.generated_manuscripts for delete
  using (auth.uid() = user_id);

-- インデックス
create index if not exists company_profiles_user_id_idx on public.company_profiles(user_id);
create index if not exists generated_manuscripts_user_id_idx on public.generated_manuscripts(user_id);
create index if not exists generated_manuscripts_created_at_idx on public.generated_manuscripts(created_at desc);
