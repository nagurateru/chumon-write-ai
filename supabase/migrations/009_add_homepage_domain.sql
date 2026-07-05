-- company_profiles にホームページURL・ドメインを追加
ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS homepage_url    TEXT,
  ADD COLUMN IF NOT EXISTS homepage_domain TEXT;

-- マスターキードメイン（ホームページなし向け特例URL）以外はドメイン重複を禁止
-- 同じドメインで複数登録 → エラー。マスターキードメインのみ複数登録を許容。
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_profiles_homepage_domain
  ON public.company_profiles (homepage_domain)
  WHERE homepage_domain IS NOT NULL
    AND homepage_domain <> 'no-hp.example.com';

-- ドメイン空き確認RPC（Security Definer でRLSをバイパスして照合）
CREATE OR REPLACE FUNCTION public.is_domain_available(input_domain TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- マスターキードメインは常に利用可能（重複登録を許可）
  IF LOWER(input_domain) = 'no-hp.example.com' THEN
    RETURN TRUE;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1 FROM public.company_profiles
    WHERE homepage_domain = LOWER(input_domain)
  );
END;
$$;

-- 未認証（登録前）でもRPCを呼び出せるように権限付与
GRANT EXECUTE ON FUNCTION public.is_domain_available(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.is_domain_available(TEXT) TO authenticated;
