'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function CompanyProfilePage() {
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [scraping,   setScraping]   = useState(false)
  const [scrapeResult, setScrapeResult] = useState<{ success: number; failed: { url: string; error?: string }[] } | null>(null)
  const [profileId,  setProfileId]  = useState<string | null>(null)

  const [companyName,    setCompanyName]    = useState('')
  const [urls,           setUrls]           = useState<string[]>([''])
  const [peopleStrength, setPeopleStrength] = useState('')   // ①人についての良さ (strengths)
  const [productStrength,setProductStrength]= useState('')   // ②商品についての良さ (homepage_text)
  const [companyStrength,setCompanyStrength]= useState('')   // ③会社についての良さ (features)
  const [appealContent,  setAppealContent]  = useState('')   // ④特にアピールしたい内容 (custom_prompt)

  const supabase = createClient()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setProfileId(data.id)
        setCompanyName(data.company_name || '')
        setPeopleStrength(data.strengths || '')
        setProductStrength(data.homepage_text || '')
        setCompanyStrength(data.features || '')
        setAppealContent(data.custom_prompt || '')
        try {
          const savedUrls = JSON.parse(data.source_urls || '[]')
          setUrls(Array.isArray(savedUrls) && savedUrls.length > 0 ? savedUrls : [''])
        } catch {
          setUrls([''])
        }
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  const addUrl = () => { if (urls.length < 5) setUrls(prev => [...prev, '']) }
  const removeUrl = (i: number) => { setUrls(prev => prev.length <= 1 ? [''] : prev.filter((_, idx) => idx !== i)) }
  const updateUrl = (i: number, value: string) => { setUrls(prev => prev.map((u, idx) => idx === i ? value : u)) }

  const handleScrape = async () => {
    const validUrls = urls.filter(u => u.trim().startsWith('http'))
    if (validUrls.length === 0) {
      alert('http または https で始まるURLを1件以上入力してください')
      return
    }

    setScraping(true)
    setScrapeResult(null)

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: validUrls }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'エラーが発生しました')

      if (data.text) {
        setPeopleStrength(prev => {
          const sep = prev.trim() ? '\n\n---\n\n' : ''
          return prev + sep + data.text
        })
      }
      setScrapeResult({ success: data.successCount, failed: data.failedUrls || [] })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'スクレイピングに失敗しました')
    } finally {
      setScraping(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cleanUrls = urls.filter(u => u.trim().startsWith('http'))

    const profileData = {
      user_id:       user.id,
      company_name:  companyName,
      strengths:     peopleStrength,
      homepage_text: productStrength,
      features:      companyStrength,
      custom_prompt: appealContent,
      source_urls:   JSON.stringify(cleanUrls),
      updated_at:    new Date().toISOString(),
    }

    if (profileId) {
      await supabase.from('company_profiles').update(profileData).eq('id', profileId)
    } else {
      const { data } = await supabase
        .from('company_profiles')
        .insert(profileData)
        .select()
        .single()
      if (data) setProfileId(data.id)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-lg">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">会社の強み設定</h1>
        <p className="text-gray-500 mt-1 text-sm">
          ここに入力・保存した内容が、AI原稿生成時のベースデータとして毎回自動で読み込まれます。
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 基本情報 */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-4">基本情報</h2>
          <div>
            <label className="label">会社名</label>
            <input
              type="text"
              className="input-field"
              placeholder="○○工務店"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>
        </div>

        {/* URLから自動取得 */}
        <div className="card border-blue-100 bg-blue-50">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-base font-semibold text-gray-800">URLから情報を自動取得</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">最大5件</span>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            自社HPなどのURLを入力して「情報を取得」を押すと、テキストを自動で抽出し「①人についての良さ」欄に追記します。
          </p>

          <div className="space-y-2">
            {urls.map((url, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}</span>
                <input
                  type="url"
                  className="input-field flex-1"
                  placeholder="https://example.com"
                  value={url}
                  onChange={e => updateUrl(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >✕</button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            {urls.length < 5 && (
              <button type="button" onClick={addUrl} className="text-sm text-blue-600 hover:underline">
                + URLを追加
              </button>
            )}
            <button
              type="button"
              onClick={handleScrape}
              disabled={scraping}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              {scraping ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  取得中...
                </>
              ) : 'URLから情報を自動取得'}
            </button>
          </div>

          {scrapeResult && (
            <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${scrapeResult.success > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              {scrapeResult.success > 0 && (
                <p className="text-green-700">✓ {scrapeResult.success}件のURLから情報を取得し、「①人についての良さ」欄に追記しました</p>
              )}
              {scrapeResult.failed.map((f, i) => (
                <p key={i} className="text-red-600 mt-0.5">✕ 取得失敗: {new URL(f.url).hostname}（{f.error}）</p>
              ))}
            </div>
          )}
        </div>

        {/* ①人についての良さ */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">①人についての良さ</h2>
          <p className="text-xs text-gray-500 mb-4">
            スタッフの人柄・対応力・チーム体制など「人」に関する強みを記述してください
          </p>
          <textarea
            className="input-field resize-y"
            rows={6}
            placeholder={`例：\n・創業30年のベテランスタッフが丁寧に対応\n・女性コーディネーターが在籍、インテリア相談も安心\n・担当者が引き渡しまで一貫して対応`}
            value={peopleStrength}
            onChange={e => setPeopleStrength(e.target.value)}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{peopleStrength.length}文字</p>
        </div>

        {/* ②商品についての良さ */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">②商品についての良さ</h2>
          <p className="text-xs text-gray-500 mb-4">
            提供する住宅・商品・サービスの強みや特徴を記述してください
          </p>
          <textarea
            className="input-field resize-y"
            rows={6}
            placeholder={`例：\n・ZEH基準の高断熱・高気密住宅が主力\n・設計自由度が高いフルオーダー対応\n・国産無垢材を使用した自然素材住宅`}
            value={productStrength}
            onChange={e => setProductStrength(e.target.value)}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{productStrength.length}文字</p>
        </div>

        {/* ③会社についての良さ */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">③会社についての良さ</h2>
          <p className="text-xs text-gray-500 mb-4">
            会社の歴史・実績・体制・受賞歴など「会社」としての強みを記述してください
          </p>
          <textarea
            className="input-field resize-y"
            rows={5}
            placeholder={`例：\n・地域密着で創業30年の実績\n・年間施工棟数50棟以上\n・お客様満足度94%（自社アンケートより）`}
            value={companyStrength}
            onChange={e => setCompanyStrength(e.target.value)}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{companyStrength.length}文字</p>
        </div>

        {/* ④特にアピールしたい内容 */}
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-1">④特にアピールしたい内容</h2>
          <p className="text-xs text-gray-500 mb-4">
            AIに特に意識させたいキーワードや、最近力を入れていること、訴求したい内容を記述してください
          </p>
          <textarea
            className="input-field resize-y"
            rows={5}
            placeholder={`例：\n・今年から「長期優良住宅」の標準対応を開始\n・子育て世代のお客様が多く、子供目線の設計が得意\n・省エネ補助金（こどもエコすまい）の活用実績多数`}
            value={appealContent}
            onChange={e => setAppealContent(e.target.value)}
          />
          <p className="text-right text-xs text-gray-400 mt-1">{appealContent.length}文字</p>
        </div>

        {/* 保存ボタン */}
        <div className="flex items-center gap-4">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '保存中...' : '設定を保存する'}
          </button>
          {saved && (
            <span className="text-suumo-green font-medium text-sm">✓ 保存しました</span>
          )}
        </div>
      </form>
    </div>
  )
}
