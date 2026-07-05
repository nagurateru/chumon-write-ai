import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { getPlanByKey, PLANS } from '@/lib/plans'
import Link from 'next/link'
import CopyButton from '@/components/CopyButton'

const PRICE_TO_PLAN: Record<string, 'basic' | 'pro'> = {
  [PLANS.basic.priceId!]: 'basic',
  [PLANS.pro.priceId!]:   'pro',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const isPaymentSuccess = params.payment === 'success'

  if (isPaymentSuccess && user) {
    try {
      const { data: subRow } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .single()

      if (subRow?.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
        const subs = await stripe.subscriptions.list({
          customer: subRow.stripe_customer_id,
          status: 'active',
          limit: 1,
        })
        if (subs.data.length > 0) {
          const activeSub = subs.data[0]
          const priceId   = activeSub.items.data[0].price.id
          const planType  = PRICE_TO_PLAN[priceId] ?? 'basic'
          await supabase
            .from('user_subscriptions')
            .update({
              stripe_subscription_id: activeSub.id,
              plan_type: planType,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)
        }
      }
    } catch (e) {
      console.error('Stripe sync error:', e)
    }
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [profileRes, totalCountRes, monthlyCountRes, subRes] = await Promise.all([
    supabase.from('company_profiles').select('*').eq('user_id', user?.id).single(),
    supabase.from('generated_manuscripts').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
    supabase.from('generated_manuscripts').select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id).gte('created_at', startOfMonth),
    supabase.from('user_subscriptions')
      .select('plan_type, subscription_status, referral_code, referral_count, referral_deposit_jpy, child_deposit_jpy, referred_by_user_id')
      .eq('user_id', user?.id).single(),
  ])

  const profile       = profileRes.data
  const companyName   = profile?.company_name || user?.user_metadata?.company_name || '未設定'
  const hasProfile    = !!(profile?.strengths || profile?.homepage_text || profile?.features || profile?.custom_prompt)
  const totalCount   = totalCountRes.count ?? 0
  const monthlyCount = monthlyCountRes.count ?? 0

  const planType   = (subRes.data?.plan_type   ?? 'free') as string
  const isActive   = subRes.data?.subscription_status === 'active'
  const plan       = getPlanByKey(planType)
  const isFree     = planType === 'free' || !isActive
  const displayCount = isFree ? totalCount : monthlyCount
  const remaining  = isFree ? Math.max(0, plan.limit - totalCount) : Math.max(0, plan.limit - monthlyCount)

  const referralCode       = subRes.data?.referral_code    ?? null
  const referralCount      = subRes.data?.referral_count   ?? 0
  const referralDepositJpy = subRes.data?.referral_deposit_jpy ?? 0
  const isReferred         = !!subRes.data?.referred_by_user_id
  const childDepositJpy    = subRes.data?.child_deposit_jpy ?? 0
  const monthlyParentDiscount = referralCount * 1000
  const monthlyChildDiscount  = isReferred ? 10000 : 0
  const totalMonthlyDiscount  = monthlyParentDiscount + monthlyChildDiscount
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const tabs = [
    { key: 'company',      label: '会社概要' },
    { key: 'strength',     label: '強みこだわり' },
    { key: 'construction', label: '建築実例' },
    { key: 'modelhouse',   label: 'モデルハウス' },
    { key: 'event',        label: 'イベント' },
    { key: 'store',        label: '店舗概要' },
  ]

  return (
    <div className="space-y-8">
      {/* ウェルカムヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">こんにちは、{companyName} 様</h1>
        <p className="text-gray-500 mt-1">注文住宅ライトAIへようこそ。原稿生成を始めましょう。</p>
      </div>

      {isPaymentSuccess && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-5 flex items-center gap-3">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800">プランのアップグレードが完了しました！</p>
            <p className="text-sm text-green-700 mt-0.5">引き続き原稿生成をご利用ください。</p>
          </div>
        </div>
      )}

      {/* STEP1: 会社の強み設定 */}
      <div className="card border-2 border-blue-200 bg-blue-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">STEP 1</span>
          <h2 className="text-base font-bold text-gray-900">会社の強みの設定</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">AIは会社の強みを学習し原稿を作成します</p>

        {hasProfile ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <span className="text-xl font-bold">✓</span>
              <span className="font-semibold">会社の強み設定完了</span>
            </div>
            <Link href="/company-profile" className="text-sm px-4 py-2 rounded-xl border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors">
              再設定する場合はこちら
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-sm text-amber-700 font-medium">さっそく会社の強みを設定しましょう</p>
            <Link href="/company-profile" className="btn-primary text-sm flex-shrink-0">
              会社の強みを設定する →
            </Link>
          </div>
        )}
      </div>

      {/* STEP2: 原稿作成 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-suumo-green text-white text-xs font-bold px-2 py-0.5 rounded-full">STEP 2</span>
          <h2 className="text-base font-bold text-gray-900">原稿作成</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tabs.map(tab => (
            <Link
              key={tab.key}
              href={`/generate?tab=${tab.key}`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white hover:border-suumo-green hover:bg-suumo-green-light text-sm font-semibold text-gray-700 transition-all"
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* STEP3: プランと使用状況 */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4">現在のプランと使用状況</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">プラン名</p>
            <p className={`text-lg font-bold ${isFree ? 'text-gray-600' : 'text-purple-600'}`}>
              {isFree ? '無料プラン' : `${plan.name}${isActive ? '' : '（更新待ち）'}`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">今月の利用限度生成回数</p>
            <p className="text-lg font-bold text-gray-800">{plan.limitLabel}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{isFree ? '累計の使用回数' : '今月の使用回数'}</p>
            <p className="text-lg font-bold text-suumo-green">{displayCount}回</p>
            <p className={`text-xs mt-1 font-semibold ${remaining === 0 ? 'text-red-500' : 'text-gray-400'}`}>
              残り{remaining}回
            </p>
          </div>
        </div>
        <Link href="/pricing" className="inline-flex items-center gap-1 text-sm text-suumo-green font-medium hover:underline">
          アップグレードする場合はこちら →
        </Link>
      </div>

      {/* STEP4: プランとご請求 */}
      {!isFree && isActive && (
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-4">■ プランとご請求</h2>

          {isReferred && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 mb-4 text-white text-center">
              <p className="text-xl font-bold">スペシャル招待割引適応中</p>
              <p className="text-sm mt-1 opacity-90">毎月の金額から <strong>10,000円割引</strong></p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {plan.name} ｜ 定価 <span className="line-through text-gray-400">{plan.priceLabel}</span>
              {totalMonthlyDiscount > 0 && (
                <>
                  {' '}→{' '}
                  <span className="text-suumo-green font-bold text-lg">
                    ¥{Math.max(0, plan.price - totalMonthlyDiscount).toLocaleString()} / 月
                  </span>
                </>
              )}
            </p>
            {monthlyParentDiscount > 0 && (
              <p className="text-xs text-green-700">紹介特典：毎月 -¥{monthlyParentDiscount.toLocaleString()} × 24ヶ月</p>
            )}
            {monthlyChildDiscount > 0 && (
              <p className="text-xs text-green-700">招待コード特典：毎月 -¥{monthlyChildDiscount.toLocaleString()}</p>
            )}
          </div>
        </div>
      )}

      {/* STEP5: 特別紹介割引キャンペーン */}
      {referralCode && (
        <div className="card border-2 border-amber-200 bg-amber-50">
          <h2 className="text-base font-bold text-gray-900 mb-1">特別紹介割引キャンペーン</h2>
          <p className="text-sm text-amber-800 font-semibold mb-4">さらに月額の利用料を抑えたい会社様へ！</p>

          <div className="bg-white rounded-xl p-4 mb-4 border border-amber-200">
            <p className="text-base font-bold text-amber-900 mb-1">
              1社紹介につき、24,000円分の割引デポジット贈呈
            </p>
            <ul className="text-xs text-gray-600 space-y-1 mt-3">
              <li>※ 毎月の利用料から -1,000円 × 24ヶ月にて割引</li>
              <li>※ 何社でも紹介OK、ただし毎月の利用料は0円以下にはなりません</li>
              <li>※ 紹介された会社がベーシックプラン、プロプランに加入した場合に有効</li>
              <li>※ 紹介された会社が退会（無料プランになった場合）はデポジットは消失します</li>
            </ul>
          </div>

          <div className="bg-suumo-green-light border border-green-200 rounded-xl p-3 mb-4 text-sm text-green-800">
            <strong>紹介された会社もおとく！</strong> 毎月の利用料が <strong>10,000円分割引</strong>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
              <p className="text-xl font-bold text-amber-700">{referralCount}社</p>
              <p className="text-xs text-gray-500">現在の紹介会社数</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
              <p className="text-xl font-bold text-amber-700">¥{(referralCount * 24000).toLocaleString()}</p>
              <p className="text-xs text-gray-500">デポジット総額</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-amber-100">
              <p className="text-xl font-bold text-suumo-green">¥{referralDepositJpy.toLocaleString()}</p>
              <p className="text-xs text-gray-500">残デポジット金額</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-white rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-gray-500 mb-2">あなたの招待コード</p>
              <div className="flex items-center gap-3">
                <p className="text-2xl font-bold font-mono tracking-widest text-suumo-green flex-1">{referralCode}</p>
                <CopyButton text={referralCode} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 border border-amber-100">
              <p className="text-xs text-gray-500 mb-2">招待リンク</p>
              <div className="flex items-center gap-3">
                <p className="text-xs text-gray-700 break-all flex-1">{appUrl}/register?ref={referralCode}</p>
                <CopyButton text={`${appUrl}/register?ref=${referralCode}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 上限到達案内 */}
      {remaining === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-red-800">
              {isFree ? '無料プランの生成回数に達しました' : '今月の生成回数の上限に達しました'}
            </p>
            <p className="text-sm text-red-700 mt-1">
              {isFree
                ? '引き続きご利用いただくには、有料プランへのアップグレードが必要です。'
                : '翌月1日にリセットされます。今すぐ上位プランへアップグレードすることも可能です。'}
            </p>
            <Link href="/pricing" className="inline-block mt-3 btn-primary text-sm">プランを選択する →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
