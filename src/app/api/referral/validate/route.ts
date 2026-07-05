import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const OPERATOR_CODES = (process.env.OPERATOR_DISCOUNT_CODES ?? '')
  .split(',').map(c => c.trim().toUpperCase()).filter(Boolean)

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ valid: false, error: '認証が必要です' })

    const code = req.nextUrl.searchParams.get('code')?.toUpperCase().trim()
    if (!code || code.length < 4) {
      return NextResponse.json({ valid: false, error: 'コードを入力してください' })
    }

    // 運営発行の割引コードチェック
    if (OPERATOR_CODES.includes(code)) {
      const { data: mySub } = await supabase
        .from('user_subscriptions')
        .select('referred_by_user_id')
        .eq('user_id', user.id)
        .single()
      if (mySub?.referred_by_user_id) {
        return NextResponse.json({ valid: false, error: '既に割引コードを使用済みです' })
      }
      await supabase.from('user_subscriptions')
        .update({ pending_referral_code: code, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
      return NextResponse.json({ valid: true })
    }

    // 招待コードを持つユーザーを検索
    const { data: referrer } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('referral_code', code)
      .single()

    if (!referrer) {
      return NextResponse.json({ valid: false, error: '有効な招待コードが見つかりません' })
    }
    if (referrer.user_id === user.id) {
      return NextResponse.json({ valid: false, error: '自分の招待コードは使用できません' })
    }

    // 自分が既に招待コードを使い済みか確認
    const { data: mySub } = await supabase
      .from('user_subscriptions')
      .select('referred_by_user_id')
      .eq('user_id', user.id)
      .single()

    if (mySub?.referred_by_user_id) {
      return NextResponse.json({ valid: false, error: '既に招待コードを使用済みです' })
    }

    // ✅ 有効なら即 DB に保存（ページ遷移しても消えないように）
    await supabase
      .from('user_subscriptions')
      .update({
        pending_referral_code: code,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return NextResponse.json({ valid: true })
  } catch (err) {
    console.error('Referral validate error:', err)
    return NextResponse.json({ valid: false, error: 'サーバーエラーが発生しました' })
  }
}
