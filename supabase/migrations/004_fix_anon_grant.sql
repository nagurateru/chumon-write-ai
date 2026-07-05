-- anon ロール（Stripe Webhook）に UPDATE 権限を追加
-- デフォルトでは anon ロールにテーブルの UPDATE Grant が付与されていないため
grant update on public.user_subscriptions to anon;

-- 認証済みユーザーが自分のサブスクを更新できるポリシーを追加
-- （決済成功後の同期処理で使用）
create policy "Users can update own subscription" on public.user_subscriptions
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
