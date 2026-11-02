-- サインアップ時に company_profiles を自動作成するトリガー
-- メール認証が有効だと signUp 直後はセッションが無く、クライアントからの INSERT が RLS で拒否されるため、
-- auth.users への INSERT と同じトランザクションで DB 側で作成する（ドメイン重複時はサインアップ自体が失敗する）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_profiles (
    user_id, company_name, homepage_url, homepage_domain,
    strengths, homepage_text, features, custom_prompt
  ) values (
    new.id,
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'homepage_url',
    lower(new.raw_user_meta_data->>'homepage_domain'),
    '', '', '', ''
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 旧方式で作成途中に失敗し、プロフィールが無いまま残ったアカウントを削除（同じメールで登録し直せるようにする）
delete from auth.users u
where not exists (select 1 from public.company_profiles p where p.user_id = u.id);
