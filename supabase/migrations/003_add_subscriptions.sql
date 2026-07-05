-- user_subscriptions テーブル（Stripe決済ステータス管理）
create table if not exists public.user_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id    text unique,
  stripe_subscription_id text,
  plan_type             text not null default 'free',   -- free | basic | pro
  subscription_status   text not null default 'inactive', -- active | inactive
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id)
);

alter table public.user_subscriptions enable row level security;

-- ユーザーは自分のサブスクを読める
create policy "Users can view own subscription" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- 認証済みユーザーは自分のレコードを作成できる（初回チェックアウト時）
create policy "Users can insert own subscription" on public.user_subscriptions
  for insert with check (auth.uid() = user_id);

-- Stripe Webhookからの更新を許可（stripe_customer_id で特定）
create policy "Allow webhook updates" on public.user_subscriptions
  for update using (true);
