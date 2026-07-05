import Stripe from 'stripe'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLANS } from '@/lib/plans'
import { createParentCoupon, addDiscountToSubscription, removeDiscountFromSubscription } from '@/lib/referral'

export const maxDuration = 30

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const OPERATOR_CODES = (process.env.OPERATOR_DISCOUNT_CODES ?? '')
  .split(',').map(c => c.trim().toUpperCase()).filter(Boolean)

// anon クライアント（Webhook 用）
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const PRICE_TO_PLAN: Record<string, 'basic' | 'pro'> = {
  [PLANS.basic.priceId!]: 'basic',
  [PLANS.pro.priceId!]:   'pro',
}

async function updateSubscription(customerId: string, patch: Record<string, string | number | null>) {
  const { error } = await supabase
    .from('user_subscriptions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)
  if (error) {
    console.error('[webhook] updateSubscription error:', JSON.stringify(error))
  } else {
    console.log('[webhook] updateSubscription OK for customer:', customerId)
  }
}

/**
 * checkout 完了時の紹介特典付与
 * referralCode は Stripe セッション metadata から渡す（DB SELECT 不要）
 */
async function handleReferralOnConversion(
  refereeUserId: string,
  refereeSubId: string,
  referralCode: string
) {
  console.log('[referral] start:', { refereeUserId, refereeSubId, referralCode })

  if (!referralCode) {
    console.log('[referral] no referral code, skip')
    return
  }

  // ── 既適用チェック ────────────────────────────────────────────────────
  const { data: refereeSub, error: refereeErr } = await supabase
    .from('user_subscriptions')
    .select('referred_by_user_id')
    .eq('user_id', refereeUserId)
    .single()

  console.log('[referral] refereeSub:', JSON.stringify(refereeSub), 'err:', JSON.stringify(refereeErr))

  if (refereeSub?.referred_by_user_id) {
    console.log('[referral] already referred, skip')
    return
  }

  // ── 紹介者（親）の特定 ───────────────────────────────────────────────
  const { data: referrerSub, error: referrerErr } = await supabase
    .from('user_subscriptions')
    .select('user_id, stripe_subscription_id, referral_count, referral_deposit_jpy')
    .eq('referral_code', referralCode)
    .single()

  console.log('[referral] referrerSub:', JSON.stringify(referrerSub), 'err:', JSON.stringify(referrerErr))

  if (!referrerSub) {
    if (OPERATOR_CODES.includes(referralCode.toUpperCase())) {
      // 運営発行コード：Stripeの割引は既に適用済み。pending_referral_codeをクリアするのみ
      console.log('[referral] operator code used:', referralCode, '— Stripe discount already applied at checkout')
      await supabase.from('user_subscriptions').update({
        pending_referral_code: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', refereeUserId)
    } else {
      console.error('[referral] referrer not found for code:', referralCode, '— migration 007/008 が未適用の可能性があります')
    }
    return
  }
  if (referrerSub.user_id === refereeUserId) {
    console.warn('[referral] self-referral detected, skip')
    return
  }

  // ── 紹介者（親）への Stripe クーポン付与 ─────────────────────────────
  let referrerCouponId: string | null = null
  if (referrerSub.stripe_subscription_id) {
    try {
      referrerCouponId = await createParentCoupon()
      await addDiscountToSubscription(referrerSub.stripe_subscription_id, referrerCouponId)
      console.log('[referral] parent coupon applied:', referrerCouponId, 'to sub:', referrerSub.stripe_subscription_id)
    } catch (e) {
      console.error('[referral] parent coupon error:', e)
    }
  } else {
    console.log('[referral] referrer has no Stripe subscription — coupon skipped, deposit still credited')
  }

  // ── referral_records に記録（UNIQUE 制約で二重付与を防ぐ） ───────────
  const { error: recErr } = await supabase.from('referral_records').insert({
    referrer_user_id:          referrerSub.user_id,
    referee_user_id:           refereeUserId,
    referee_subscription_id:   refereeSubId,
    referrer_stripe_coupon_id: referrerCouponId,
    status: 'active',
  })
  if (recErr) {
    console.error('[referral] referral_records insert error:', JSON.stringify(recErr))
    // 二重付与の場合はクーポンを取り消す
    if (referrerCouponId && referrerSub.stripe_subscription_id) {
      try { await removeDiscountFromSubscription(referrerSub.stripe_subscription_id, referrerCouponId) }
      catch (_) { /* ignore */ }
    }
    return
  }
  console.log('[referral] referral_records inserted OK')

  // ── 紹介者（親）の count / deposit を更新 ────────────────────────────
  const { error: refUpdErr } = await supabase.from('user_subscriptions').update({
    referral_count:       (referrerSub.referral_count ?? 0) + 1,
    referral_deposit_jpy: (referrerSub.referral_deposit_jpy ?? 0) + 24000,
    updated_at:           new Date().toISOString(),
  }).eq('user_id', referrerSub.user_id)

  if (refUpdErr) {
    console.error('[referral] referrer update error:', JSON.stringify(refUpdErr))
  } else {
    console.log('[referral] referrer deposit/count updated OK')
  }

  // ── 被招待者（子）の deposit を設定 ──────────────────────────────────
  const { error: childUpdErr } = await supabase.from('user_subscriptions').update({
    referred_by_user_id:   referrerSub.user_id,
    pending_referral_code: null,
    child_deposit_jpy:     24000,
    updated_at:            new Date().toISOString(),
  }).eq('user_id', refereeUserId)

  if (childUpdErr) {
    console.error('[referral] child update error:', JSON.stringify(childUpdErr))
  } else {
    console.log('[referral] child deposit updated OK')
  }
}

/** サブスク解約時の紹介特典削除 */
async function handleReferralOnCancellation(cancelledSubId: string) {
  const { data: record, error: recErr } = await supabase
    .from('referral_records')
    .select('*')
    .eq('referee_subscription_id', cancelledSubId)
    .eq('status', 'active')
    .single()

  if (recErr || !record) {
    console.log('[referral] no active referral_records for sub:', cancelledSubId)
    return
  }

  if (record.referrer_stripe_coupon_id) {
    const { data: referrerSub } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, referral_count, referral_deposit_jpy')
      .eq('user_id', record.referrer_user_id)
      .single()

    if (referrerSub?.stripe_subscription_id) {
      try {
        await removeDiscountFromSubscription(
          referrerSub.stripe_subscription_id,
          record.referrer_stripe_coupon_id
        )
      } catch (e) {
        console.error('[referral] remove coupon error:', e)
      }
    }

    await supabase.from('user_subscriptions').update({
      referral_count:       Math.max(0, (referrerSub?.referral_count ?? 1) - 1),
      referral_deposit_jpy: Math.max(0, (referrerSub?.referral_deposit_jpy ?? 24000) - 24000),
      updated_at:           new Date().toISOString(),
    }).eq('user_id', record.referrer_user_id)
  }

  await supabase.from('user_subscriptions').update({
    child_deposit_jpy: 0,
    updated_at:        new Date().toISOString(),
  }).eq('user_id', record.referee_user_id)

  await supabase.from('referral_records').update({
    status:     'cancelled',
    updated_at: new Date().toISOString(),
  }).eq('id', record.id)

  console.log('[referral] cancellation processed for sub:', cancelledSubId)
}

export async function POST(req: NextRequest) {
  const body   = await req.text()
  const sig    = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event

  if (!secret || secret === 'whsec_placeholder') {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET が未設定です。本番前に必ず設定してください。')
    try { event = JSON.parse(body) as Stripe.Event }
    catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }) }
  } else {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret)
    } catch (err) {
      console.error('[webhook] Signature verification failed. secret prefix:', secret.substring(0, 8))
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  console.log('[webhook] received event:', event.type)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session        = event.data.object as Stripe.Checkout.Session
        const customerId     = session.customer as string
        const subscriptionId = session.subscription as string
        const refereeUserId  = session.metadata?.supabase_user_id
        const referralCode   = session.metadata?.referral_code ?? ''

        console.log('[webhook] checkout.session.completed:', { customerId, subscriptionId, refereeUserId, referralCode })

        // プランを更新
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId  = subscription.items.data[0].price.id
        const planType = PRICE_TO_PLAN[priceId] ?? 'basic'
        await updateSubscription(customerId, {
          stripe_subscription_id: subscriptionId,
          plan_type:              planType,
          subscription_status:    'active',
        })

        // 紹介特典付与
        if (refereeUserId) {
          await handleReferralOnConversion(refereeUserId, subscriptionId, referralCode)
        } else {
          console.warn('[webhook] supabase_user_id が metadata にありません。session.id:', session.id)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub      = event.data.object as Stripe.Subscription
        const priceId  = sub.items.data[0].price.id
        const planType = PRICE_TO_PLAN[priceId] ?? 'basic'
        await updateSubscription(sub.customer as string, {
          plan_type:           planType,
          subscription_status: sub.status === 'active' ? 'active' : 'inactive',
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await updateSubscription(sub.customer as string, {
          stripe_subscription_id: null,
          plan_type:              'free',
          subscription_status:    'inactive',
        })
        await handleReferralOnCancellation(sub.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await updateSubscription(invoice.customer as string, { subscription_status: 'inactive' })
        break
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
