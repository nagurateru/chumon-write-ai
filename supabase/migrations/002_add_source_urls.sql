-- company_profiles に source_urls カラムを追加
alter table public.company_profiles
  add column if not exists source_urls text default '[]';
