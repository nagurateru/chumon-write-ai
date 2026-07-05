import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

/** JS 側でのコード生成（DB レコードが既存でコードが null の場合に使用） */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/** 招待した側（親）のクーポンIDを返す（環境変数優先、なければ動的作成） */
export async function createParentCoupon(): Promise<string> {
  const envId = process.env.STRIPE_PARENT_REFERRAL_COUPON_ID
  if (envId) return envId
  const coupon = await stripe.coupons.create({
    amount_off: 1000,
    currency: 'jpy',
    duration: 'repeating',
    duration_in_months: 24,
    name: '紹介特典 -1,000円/月（24ヶ月）',
  })
  return coupon.id
}

/** 招待された側（子）のクーポンIDを返す（環境変数優先、なければ動的作成） */
export async function createChildCoupon(): Promise<string> {
  const envId = process.env.STRIPE_CHILD_REFERRAL_COUPON_ID
  if (envId) return envId
  const coupon = await stripe.coupons.create({
    amount_off: 10000,
    currency: 'jpy',
    duration: 'forever',
    name: '招待コード割引 -10,000円/月',
  })
  return coupon.id
}

/** サブスクリプションの既存 discounts からクーポン ID 一覧を取得
 *  Stripe SDK v22 では Discount オブジェクトのクーポンは d.source.coupon に格納される */
async function getSubscriptionCouponIds(subscriptionId: string): Promise<string[]> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const discounts = (sub.discounts ?? []) as Array<string | Stripe.Discount>
  return discounts
    .map(d => {
      if (typeof d === 'string') return d
      const coupon = (d.source as { coupon?: string | { id: string } | null })?.coupon
      if (!coupon) return null
      return typeof coupon === 'string' ? coupon : coupon.id
    })
    .filter((id): id is string => !!id)
}

/** サブスクリプションに新しいクーポンを追加（既存は保持） */
export async function addDiscountToSubscription(
  subscriptionId: string,
  couponId: string
): Promise<void> {
  const existing = await getSubscriptionCouponIds(subscriptionId)
  await stripe.subscriptions.update(subscriptionId, {
    discounts: [...existing.map(c => ({ coupon: c })), { coupon: couponId }],
  })
}

/** サブスクリプションから特定のクーポンを除去 */
export async function removeDiscountFromSubscription(
  subscriptionId: string,
  couponId: string
): Promise<void> {
  const existing = await getSubscriptionCouponIds(subscriptionId)
  const updated = existing.filter(c => c !== couponId).map(c => ({ coupon: c }))
  await stripe.subscriptions.update(subscriptionId, { discounts: updated })
}
