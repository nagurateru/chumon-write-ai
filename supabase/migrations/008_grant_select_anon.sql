-- anon ロール（Webhook で使用）に SELECT 権限を付与
-- migration 007 の RLS ポリシーと組み合わせて参照制限を維持する
GRANT SELECT ON public.user_subscriptions TO anon;
GRANT SELECT ON public.referral_records TO anon;
