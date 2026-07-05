import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateReferralCode } from '@/lib/referral'

/** ログインユーザーの紹介コード＋統計を返す。レコードがなければ作成する */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    // user_subscriptions レコードを取得（なければ INSERT → トリガーでコード生成）
    let { data: sub } = await supabase
      .from('user_subscriptions')
      .select('referral_code, referral_count, referral_deposit_jpy, child_deposit_jpy, referred_by_user_id, plan_type, stripe_subscription_id, pending_referral_code')
      .eq('user_id', user.id)
      .single()

    if (!sub) {
      // レコード自体がない → 作成（トリガーで referral_code が自動セット）
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: user.id })
        .select('referral_code, referral_count, referral_deposit_jpy, child_deposit_jpy, referred_by_user_id, plan_type, stripe_subscription_id, pending_referral_code')
        .single()
      sub = newSub
    } else if (!sub.referral_code) {
      // レコードはあるが古くてコードが null → アプリ側で生成して更新
      const code = generateReferralCode()
      await supabase.from('user_subscriptions').update({ referral_code: code }).eq('user_id', user.id)
      sub = { ...sub, referral_code: code }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const monthlyParentDiscount = (sub?.referral_count ?? 0) * 1000
    const monthlyChildDiscount  = sub?.referred_by_user_id ? 500 : 0

    return NextResponse.json({
      referral_code:           sub?.referral_code ?? null,
      referral_count:          sub?.referral_count ?? 0,
      referral_deposit_jpy:    sub?.referral_deposit_jpy ?? 0,
      child_deposit_jpy:       sub?.child_deposit_jpy ?? 0,
      is_referred:             !!sub?.referred_by_user_id,
      pending_referral_code:   sub?.referred_by_user_id ? null : (sub?.pending_referral_code ?? null),
      monthly_parent_discount: monthlyParentDiscount,
      monthly_child_discount:  monthlyChildDiscount,
      share_url: `${appUrl}/register?ref=${sub?.referral_code ?? ''}`,
    })
  } catch (err) {
    console.error('Referral info error:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
