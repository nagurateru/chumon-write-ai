-- Webhook は anon クライアントを使用するため、
-- referral_code を持つ行と referral_records の読み取りを許可する

-- user_subscriptions: anon が referral_code で紹介者を検索できるようにする
CREATE POLICY "Allow anon select referral rows" ON public.user_subscriptions
  FOR SELECT TO anon
  USING (referral_code IS NOT NULL);

-- referral_records: anon が解約時に紹介レコードを読めるようにする
CREATE POLICY "Allow anon select referral records" ON public.referral_records
  FOR SELECT TO anon
  USING (true);
