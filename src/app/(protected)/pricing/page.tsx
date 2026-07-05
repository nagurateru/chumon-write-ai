'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type PlanKey } from '@/lib/plans'

type SubInfo = {
  plan_type: PlanKey
  subscription_status: string
}

type ReferralInfo = {
  referral_code: string | null
  referral_count: number
  referral_deposit_jpy: number
  child_deposit_jpy: number
  is_referred: boolean
  pending_referral_code: string | null
  monthly_parent_discount: number
  monthly_child_discount: number
  share_url: string
}

function PricingContent() {
  const searchParams = useSearchParams()
  const wasCanceled  = searchParams.get('payment') === 'canceled'
  const supabase     = createClient()

  const [sub,          setSub]          = useState<SubInfo | null>(null)
  const [referral,     setReferral]     = useState<ReferralInfo | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [loadingPlan,    setLoadingPlan]    = useState<string | null>(null)
  const [loadingPortal,  setLoadingPortal]  = useState(false)
  const [error,          setError]          = useState('')
  const [codeCopied,     setCodeCopied]     = useState(false)
  const [urlCopied,      setUrlCopied]      = useState(false)

  // 招待コード入力
  const [inputCode,    setInputCode]    = useState('')
  const [codeStatus,   setCodeStatus]   = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
  const [codeError,    setCodeError]    = useState('')
  const [appliedCode,  setAppliedCode]  = useState('')

  const codeInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [subRes, refRes] = await Promise.all([
        supabase.from('user_subscriptions')
          .select('plan_type, subscription_status')
          .eq('user_id', user.id).single(),
        fetch('/api/referral/info').then(r => r.json()),
      ])
      setSub(subRes.data as SubInfo | null)
      if (!refRes.error) {
        setReferral(refRes)
        // DB に pending_referral_code があれば state を復元（ページ遷移後も維持）
        if (refRes.pending_referral_code && !refRes.is_referred) {
          setAppliedCode(refRes.pending_referral_code)
          setInputCode(refRes.pending_referral_code)
          setCodeStatus('valid')
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleApplyCode = async () => {
    const code = inputCode.toUpperCase().trim()
    if (!code) return
    setCodeStatus('checking'); setCodeError('')
    const res  = await fetch(`/api/referral/validate?code=${code}`)
    const data = await res.json()
    if (data.valid) {
      setCodeStatus('valid'); setAppliedCode(code)
    } else {
      setCodeStatus('invalid'); setCodeError(data.error ?? '無効なコードです')
    }
  }

  const handlePortal = async () => {
    setLoadingPortal(true); setError('')
    try {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'ポータルへの接続に失敗しました')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setLoadingPortal(false)
    }
  }

  const handleSelect = async (priceId: string, planKey: string) => {
    setLoadingPlan(planKey); setError('')
    try {
      const res  = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, referralCode: appliedCode || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '決済セッションの作成に失敗しました')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setLoadingPlan(null)
    }
  }

  const copyText = async (text: string, setter: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text)
    setter(true); setTimeout(() => setter(false), 2000)
  }

  const currentPlanKey = (sub?.plan_type ?? 'free') as PlanKey
  const isActive       = sub?.subscription_status === 'active'
  const planOrder: PlanKey[] = ['free', 'basic', 'pro']

  // is_referred（決済完了後）でも割引表示を維持する
  const discountAmount = (codeStatus === 'valid' || referral?.is_referred) ? 10000 : 0

  // 現在の親割引
  const monthlyParentDiscount = referral?.monthly_parent_discount ?? 0

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* ── キャンペーンバナー ─────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-start gap-3">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="font-bold text-lg leading-snug">紹介キャンペーン実施中！</p>
            <p className="text-sm mt-1 opacity-90">
              紹介した側：<strong>24,000円分の割引デポジット獲得！</strong>（1,000円×24ヶ月）<br />
              紹介された側：<strong>毎月の利用料から10,000円の割引</strong>が適用されます。
            </p>
          </div>
        </div>
      </div>

      {/* キャンセルバナー */}
      {wasCanceled && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
          決済をキャンセルしました。いつでもプランを選択してアップグレードできます。
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">{error}</div>
      )}

      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">プラン・料金</h1>
        <p className="text-gray-500 mt-2">業務量に合わせてプランをお選びください。</p>
      </div>

      {/* ── プランカード ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {planOrder.map(key => {
          const plan      = PLANS[key]
          const isCurrent = key === currentPlanKey && (key === 'free' || isActive)
          const isPopular = key === 'basic'
          const basePriceNum = plan.price
          const discountedPrice = discountAmount > 0 && key !== 'free'
            ? basePriceNum - discountAmount
            : null

          return (
            <div key={key} className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all ${
              isCurrent   ? 'border-suumo-green bg-suumo-green-light shadow-md'
              : isPopular ? 'border-blue-300 bg-white shadow-md'
              :              'border-gray-200 bg-white'
            }`}>
              {isPopular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">人気</span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-suumo-green text-white text-xs font-bold px-3 py-1 rounded-full shadow">現在のプラン</span>
              )}

              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                <div className="mt-4 mb-5">
                  {discountedPrice !== null ? (
                    <>
                      <span className="text-sm text-gray-400 line-through mr-2">{plan.priceLabel}</span>
                      <span className="text-3xl font-bold text-suumo-green">¥{discountedPrice.toLocaleString()}</span>
                      <span className="text-sm text-gray-500"> / 月（税込）</span>
                      <div className="mt-1 inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                        🎉 招待コード -10,000円/月
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-gray-900">{plan.priceLabel}</span>
                      {plan.isMonthly && <span className="text-sm text-gray-500 ml-1">（税込）</span>}
                    </>
                  )}
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-5 ${
                  key === 'free' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                }`}>
                  ✍️ {plan.limitLabel}
                </div>

                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="text-suumo-green font-bold">✓</span>{f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                {key === 'free' ? (
                  <div className="w-full text-center py-3 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-400">
                    {isCurrent ? '現在ご利用中' : '無料プラン'}
                  </div>
                ) : isCurrent ? (
                  <div className="space-y-2">
                    <div className="w-full text-center py-3 rounded-xl border-2 border-suumo-green text-sm font-semibold text-suumo-green-dark">✓ 契約中</div>
                    <button
                      onClick={handlePortal}
                      disabled={loadingPortal}
                      className="w-full py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {loadingPortal ? '接続中...' : '💳 支払い・解約の管理'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleSelect(plan.priceId!, key)}
                    disabled={!!loadingPlan || loading}
                    className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loadingPlan === key ? (
                      <><svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>処理中...</>
                    ) : 'このプランを選択する'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 招待コード入力（されている側） ────────────────────────── */}
      {!referral?.is_referred && (
        <div className="bg-white border-2 border-dashed border-suumo-green rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">🎟 招待コードをお持ちの方</h2>
            <p className="text-sm text-gray-500 mt-1">
              招待コードを適用すると <strong className="text-suumo-green">毎月10,000円割引</strong> が適用されます。
            </p>
          </div>

          {codeStatus === 'valid' ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <span className="text-green-600 font-bold text-lg">✓</span>
              <div>
                <p className="font-semibold text-green-800">招待コード「{appliedCode}」が適用されました</p>
                <p className="text-xs text-green-700">プランを選択すると毎月-10,000円の割引が適用されます</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                ref={codeInputRef}
                type="text"
                value={inputCode}
                onChange={e => { setInputCode(e.target.value.toUpperCase()); setCodeStatus('idle'); setCodeError('') }}
                onKeyDown={e => e.key === 'Enter' && handleApplyCode()}
                placeholder="招待コードを入力（例：ABCD1234）"
                maxLength={20}
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono tracking-widest focus:outline-none focus:border-suumo-green focus:ring-2 focus:ring-suumo-green/20"
              />
              <button
                onClick={handleApplyCode}
                disabled={codeStatus === 'checking' || !inputCode}
                className="btn-primary px-5 py-3 text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
              >
                {codeStatus === 'checking' ? '確認中...' : '適用する'}
              </button>
            </div>
          )}

          {codeStatus === 'invalid' && (
            <p className="text-sm text-red-600">{codeError}</p>
          )}
        </div>
      )}

      {referral?.is_referred && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-green-800">招待特典が適用済みです</p>
            <p className="text-sm text-green-700 mt-0.5">毎月10,000円割引が有効です</p>
          </div>
        </div>
      )}

      {/* ── あなたの招待コード＆紹介状況 ──────────────────────────── */}
      {referral?.referral_code && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">🤝 あなたの招待コード</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* コード表示 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium">招待コード</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold font-mono tracking-widest text-suumo-green">
                  {referral.referral_code}
                </span>
                <button
                  onClick={() => copyText(referral.referral_code!, setCodeCopied)}
                  className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  {codeCopied ? '✓ コピー済' : 'コピー'}
                </button>
              </div>
            </div>

            {/* 紹介URL */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-xs text-gray-500 font-medium">招待リンク</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 truncate flex-1">{referral.share_url}</span>
                <button
                  onClick={() => copyText(referral.share_url, setUrlCopied)}
                  className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  {urlCopied ? '✓ コピー済' : 'コピー'}
                </button>
              </div>
            </div>
          </div>

          {/* 紹介統計 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="紹介数（契約中）" value={`${referral.referral_count}社`} highlight={referral.referral_count > 0} />
            <StatCard label="割引デポジット残高" value={`¥${referral.referral_deposit_jpy.toLocaleString()}`} highlight={referral.referral_deposit_jpy > 0} />
            <StatCard label="月々の割引額（親）" value={monthlyParentDiscount > 0 ? `-¥${monthlyParentDiscount.toLocaleString()}` : '−'} highlight={monthlyParentDiscount > 0} />
            {currentPlanKey !== 'free' && isActive && monthlyParentDiscount > 0 && (
              <StatCard
                label="今月の実質ご請求"
                value={`¥${Math.max(0, PLANS[currentPlanKey].price - monthlyParentDiscount).toLocaleString()}`}
                highlight
                sub={`通常 ¥${PLANS[currentPlanKey].price.toLocaleString()}`}
              />
            )}
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            ※ 招待した会社が有料プランを契約した時点で特典が付与されます。その会社が解約した場合、該当分の割引は終了します。
            ベーシックプランは5社紹介で毎月5,000円割引 → 実質2年間無料でご利用いただけます。
          </p>
        </div>
      )}

      {/* 注意事項 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-500 space-y-1">
        <p>・ 価格はすべて税込表示です。</p>
        <p>・ 有料プランは月次自動更新です。翌月以降はStripeより自動決済されます。</p>
        <p>・ 解約はマイページからいつでも即時可能です（月途中の日割り返金は行いません）。</p>
        <p>・ テスト決済カード番号：4242 4242 4242 4242（有効期限は未来の任意の日付）</p>
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight, sub }: { label: string; value: string; highlight?: boolean; sub?: string }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-suumo-green-light border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-suumo-green-dark' : 'text-gray-400'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function PricingPage() {
  return (
    <Suspense>
      <PricingContent />
    </Suspense>
  )
}
