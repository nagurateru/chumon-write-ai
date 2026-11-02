import { createClient } from '@/lib/supabase/server'
import { MONTHLY_LIMIT, countMonthlyUsage } from '@/lib/usage'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profileRes, monthlyCount] = await Promise.all([
    supabase.from('company_profiles').select('*').eq('user_id', user?.id).single(),
    user ? countMonthlyUsage(supabase, user.id) : Promise.resolve(0),
  ])

  const profile       = profileRes.data
  const companyName   = profile?.company_name || user?.user_metadata?.company_name || '未設定'
  const hasProfile    = !!(profile?.strengths || profile?.homepage_text || profile?.features || profile?.custom_prompt)
  const remaining     = Math.max(0, MONTHLY_LIMIT - monthlyCount)

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

      {/* STEP3: 使用状況 */}
      <div className="card">
        <h2 className="text-base font-bold text-gray-900 mb-4">今月の使用状況</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">今月の利用限度生成回数</p>
            <p className="text-lg font-bold text-gray-800">月{MONTHLY_LIMIT}回</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">今月の使用回数</p>
            <p className="text-lg font-bold text-suumo-green">{monthlyCount}回</p>
            <p className={`text-xs mt-1 font-semibold ${remaining === 0 ? 'text-red-500' : 'text-gray-400'}`}>
              残り{remaining}回
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">※ 生成回数は毎月1日にリセットされます</p>
      </div>

      {/* 上限到達案内 */}
      {remaining === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div>
            <p className="font-semibold text-red-800">今月の生成回数の上限に達しました</p>
            <p className="text-sm text-red-700 mt-1">翌月1日にリセットされます。</p>
          </div>
        </div>
      )}
    </div>
  )
}
