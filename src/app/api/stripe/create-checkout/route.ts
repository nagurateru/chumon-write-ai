import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PLANS } from '@/lib/plans'
import { createChildCoupon, generateReferralCode } from '@/lib/referral'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const VALID_PRICE_IDS = new Set([PLANS.basic.priceId, PLANS.pro.priceId])
const OPERATOR_CODES = (process.env.OPERATOR_DISCOUNT_CODES ?? '')
  .split(',').map(c => c.trim().toUpperCase()).filter(Boolean)

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const { priceId, referralCode } = await req.json()
    if (!priceId || !VALID_PRICE_IDS.has(priceId)) {
      return NextResponse.json({ error: '無効な価格IDです' }, { status: 400 })
    }

    // 既存レコード取得（pending_referral_code も含める）
    let { data: sub } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id, referral_code, referred_by_user_id, pending_referral_code')
      .eq('user_id', user.id)
      .single()

    let customerId = sub?.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      const code = sub?.referral_code ?? generateReferralCode()
      await supabase.from('user_subscriptions').upsert({
        user_id: user.id,
        stripe_customer_id: customerId,
        plan_type: 'free',
        subscription_status: 'inactive',
        referral_code: code,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      sub = { stripe_customer_id: customerId, referral_code: code, referred_by_user_id: null, pending_referral_code: null }
    }

    // ── 招待コードの確定（リクエスト優先 → DBの pending にフォールバック） ────
    const discounts: { coupon: string }[] = []
    let validatedReferralCode: string | null = null

    if (!sub?.referred_by_user_id) {
      const codeCandidate = referralCode?.toUpperCase().trim() || sub?.pending_referral_code || null

      if (codeCandidate) {
        const { data: referrer } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('referral_code', codeCandidate)
          .neq('user_id', user.id)
          .single()

        if (referrer) {
          const childCouponId = await createChildCoupon()
          discounts.push({ coupon: childCouponId })
          validatedReferralCode = codeCandidate
        } else if (OPERATOR_CODES.includes(codeCandidate)) {
          // 運営発行の割引コード：子クーポンを適用（親への還元なし）
          const childCouponId = await createChildCoupon()
          discounts.push({ coupon: childCouponId })
          validatedReferralCode = codeCandidate
        }
      }
    }

    // ── Stripe Checkout セッション作成 ──────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${appUrl}/dashboard?payment=success`,
      cancel_url: `${appUrl}/pricing?payment=canceled`,
      locale: 'ja',
      // Webhook が user_id と referral_code を DB SELECT なしに取得できるように埋め込む
      metadata: {
        supabase_user_id: user.id,
        referral_code: validatedReferralCode ?? '',
      },
    }
    if (discounts.length > 0) {
      sessionParams.discounts = discounts
    }

    const session = await stripe.checkout.sessions.create(sessionParams)

    // pending_referral_code を DB に永続化（まだ保存されていない場合も含む）
    if (validatedReferralCode) {
      await supabase.from('user_subscriptions')
        .update({ pending_referral_code: validatedReferralCode })
        .eq('user_id', user.id)
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return NextResponse.json({ error: '決済セッションの作成に失敗しました' }, { status: 500 })
  }
}
