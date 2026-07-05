-- ① user_subscriptions に紹介関連フィールドを追加
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS pending_referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referral_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_deposit_jpy INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_deposit_jpy INTEGER NOT NULL DEFAULT 0;

-- ② 紹介コード自動生成トリガー（INSERT 時に referral_code = NULL なら生成）
CREATE OR REPLACE FUNCTION public.fn_generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code TEXT;
  i INT;
BEGIN
  IF NEW.referral_code IS NULL THEN
    LOOP
      new_code := '';
      FOR i IN 1..8 LOOP
        new_code := new_code || SUBSTR(chars, (FLOOR(RANDOM() * 32)::INT + 1), 1);
      END LOOP;
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.user_subscriptions WHERE referral_code = new_code
      );
    END LOOP;
    NEW.referral_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_referral_code ON public.user_subscriptions;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.fn_generate_referral_code();

-- ③ referral_records テーブル（誰が誰を紹介したかを管理）
CREATE TABLE IF NOT EXISTS public.referral_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id),
  referee_user_id  UUID NOT NULL REFERENCES auth.users(id),
  referee_subscription_id TEXT,
  referrer_stripe_coupon_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referee_user_id)
);

ALTER TABLE public.referral_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referral records" ON public.referral_records
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referee_user_id);

CREATE POLICY "Allow webhook insert on referral_records" ON public.referral_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow webhook update on referral_records" ON public.referral_records
  FOR UPDATE USING (true);

GRANT INSERT, UPDATE ON public.referral_records TO anon;
GRANT SELECT ON public.referral_records TO authenticated;
