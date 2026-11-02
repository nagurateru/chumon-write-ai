import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MONTHLY_LIMIT, countMonthlyUsage } from '@/lib/usage'

type Authed = { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }

/** ログイン必須。未ログインなら 401 レスポンスを返す */
export async function requireUser(): Promise<Authed | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })
  return { supabase, userId: user.id }
}

/** ログイン＋月間上限チェック。上限到達なら 429 レスポンスを返す */
export async function requireQuota(): Promise<Authed | NextResponse> {
  const auth = await requireUser()
  if (auth instanceof NextResponse) return auth
  const used = await countMonthlyUsage(auth.supabase, auth.userId)
  if (used >= MONTHLY_LIMIT) {
    return NextResponse.json(
      { error: `今月の生成回数の上限（${MONTHLY_LIMIT}回）に達しました。翌月1日にリセットされます。` },
      { status: 429 },
    )
  }
  return auth
}

/** 生成に成功したレスポンスのときだけ使用回数を1回記録する */
export async function recordIfOk(res: NextResponse, { supabase, userId }: Authed, kind: string): Promise<NextResponse> {
  if (res.ok) {
    const { error } = await supabase.from('generation_usage').insert({ user_id: userId, kind })
    if (error) console.error('usage record error:', error)
  }
  return res
}
