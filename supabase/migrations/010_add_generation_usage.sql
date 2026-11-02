-- generation_usage テーブル（月間生成回数の管理）
-- 原稿履歴（generated_manuscripts）はユーザーが削除できるため、回数カウントは専用テーブルで行う
create table if not exists public.generation_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,  -- company | strength | construction | modelhouse | event | store | free など
  created_at timestamptz not null default now()
);

alter table public.generation_usage enable row level security;

-- 自分の使用履歴のみ参照・記録できる（更新・削除は不可）
create policy "Users can view own usage" on public.generation_usage
  for select using (auth.uid() = user_id);

create policy "Users can insert own usage" on public.generation_usage
  for insert with check (auth.uid() = user_id);

create index if not exists generation_usage_user_created_idx
  on public.generation_usage (user_id, created_at desc);

GRANT SELECT, INSERT ON public.generation_usage TO authenticated;
