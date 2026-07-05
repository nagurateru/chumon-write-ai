-- 招待コードの検証のため、認証済みユーザーが
-- referral_code を持つ他ユーザーのレコードを参照できるようにする
CREATE POLICY "Allow referral code validation" ON public.user_subscriptions
  FOR SELECT TO authenticated
  USING (referral_code IS NOT NULL);
