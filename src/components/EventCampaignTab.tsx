'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────

interface TitleBody {
  title: string
  body:  string
}

// ─── イベントカテゴリ一覧 ───────────────────────────────────────────────────

const EVENT_CATEGORIES = [
  'キャンペーン情報',
  'セミナー・教室',
  '宿泊体験会',
  '工場見学会',
  '設計・資金相談会',
  '新商品情報',
  '構造見学会',
  '完成見学会',
  '入居者宅見学会',
  'モデルハウス見学会',
  '土地相談会',
  'その他イベント',
] as const

// ─── Sub-components ────────────────────────────────────────────────────────

function Spinner({ size = 5 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function SectionHeading({ num, children }: { num: string; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-bold text-gray-800 border-b border-gray-200 pb-2">
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-suumo-green text-white text-sm font-bold flex-shrink-0">
        {num}
      </span>
      {children}
    </h3>
  )
}

function ImageSlot({ file, preview, label, aspect, onChange, onClear }: {
  file:     File | null
  preview:  string | null
  label:    string
  aspect:   string
  onChange: (f: File) => void
  onClear:  () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) onChange(f) }}
      onDragOver={e => e.preventDefault()}
      onClick={() => inputRef.current?.click()}
      className={`relative ${aspect} rounded-xl border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-colors ${
        preview ? 'border-suumo-green' : 'border-gray-300 hover:border-suumo-green bg-gray-50'
      }`}
    >
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onClear() }}
            className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 shadow text-xs"
          >✕</button>
        </>
      ) : (
        <div className="text-center px-2">
          <p className="text-xl text-gray-300">📷</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-tight">{label}</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f) }}
        className="hidden"
      />
    </div>
  )
}

function FilenameField({ value, onChange, copyKey, copied, onCopy }: {
  value:    string
  onChange: (v: string) => void
  copyKey:  string
  copied:   string
  onCopy:   (text: string, key: string) => void
}) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="ファイル名"
        className="flex-1 min-w-0 text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-suumo-green font-mono"
      />
      <button
        onClick={() => onCopy(value, copyKey)}
        className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 text-gray-500 flex-shrink-0"
      >
        {copied === copyKey ? '✓' : 'コピー'}
      </button>
    </div>
  )
}

function EditCard({ label, value, onChange, limit, copyKey, rows, copied, onCopy }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  limit:    number
  copyKey:  string
  rows:     number
  copied:   string
  onCopy:   (text: string, key: string) => void
}) {
  const count = value.length
  const over  = count > limit

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-gray-600">{label}</label>
        <button
          onClick={() => onCopy(value, copyKey)}
          className="text-xs px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500"
        >
          {copied === copyKey ? '✓ コピー済み' : 'コピー'}
        </button>
      </div>
      <textarea
        className={`input-field resize-none text-sm leading-relaxed ${over ? 'border-red-400 bg-red-50' : ''}`}
        rows={rows}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      <p className={`text-xs text-right ${over ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
        {count} / {limit}文字
      </p>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function EventCampaignTab() {
  const supabase = createClient()

  // ── ① カテゴリ & フリーテキスト & 画像 ─────────────────────────────────
  const [eventCategory, setEventCategory] = useState<string>(EVENT_CATEGORIES[0])
  const [freeText,      setFreeText]      = useState('')

  // メイン画像 (1枚)
  const [mainFile,     setMainFile]     = useState<File | null>(null)
  const [mainPreview,  setMainPreview]  = useState<string | null>(null)
  const [mainFilename, setMainFilename] = useState('')

  // サブ画像 (4枚)
  const [subFiles,     setSubFiles]     = useState<(File | null)[]>(Array.from({ length: 4 }, () => null))
  const [subPreviews,  setSubPreviews]  = useState<(string | null)[]>(Array.from({ length: 4 }, () => null))
  const [subFilenames, setSubFilenames] = useState<string[]>(Array.from({ length: 4 }, () => ''))

  // ── ② 基本情報 & 参加特典 ──────────────────────────────────────────────
  const [eventTitle,    setEventTitle]    = useState('')
  const [eventFeature,  setEventFeature]  = useState('')
  const [eventBody,     setEventBody]     = useState('')
  const [bonusPatterns, setBonusPatterns] = useState<TitleBody[]>(
    Array.from({ length: 4 }, () => ({ title: '', body: '' }))
  )
  const [genBasic,  setGenBasic]  = useState(false)
  const [errBasic,  setErrBasic]  = useState('')

  // ── ③ 当日の流れ・見どころ ─────────────────────────────────────────────
  const [spotFiles,     setSpotFiles]     = useState<(File | null)[]>(Array.from({ length: 2 }, () => null))
  const [spotPreviews,  setSpotPreviews]  = useState<(string | null)[]>(Array.from({ length: 2 }, () => null))
  const [spotFilenames, setSpotFilenames] = useState<string[]>(Array.from({ length: 2 }, () => ''))

  const [spotSets,   setSpotSets]   = useState<TitleBody[]>(Array.from({ length: 2 }, () => ({ title: '', body: '' })))
  const [genSpots,   setGenSpots]   = useState(false)
  const [errSpots,   setErrSpots]   = useState('')

  // ── ④ 参加者の感想 ─────────────────────────────────────────────────────
  const [reviewSets,  setReviewSets]  = useState<TitleBody[]>(Array.from({ length: 5 }, () => ({ title: '', body: '' })))
  const [genReviews,  setGenReviews]  = useState(false)
  const [errReviews,  setErrReviews]  = useState('')

  const [copied, setCopied] = useState('')

  // ─── ヘルパー ─────────────────────────────────────────────────────────

  const handleCopy = (text: string, key: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const setSubImage = (i: number, f: File | null) => {
    setSubFiles(prev  => { const n = [...prev];  n[i] = f; return n })
    setSubPreviews(prev => { const n = [...prev]; n[i] = f ? URL.createObjectURL(f) : null; return n })
    setSubFilenames(prev => { const n = [...prev]; n[i] = f ? f.name : ''; return n })
  }

  const setSpotImage = (i: number, f: File | null) => {
    setSpotFiles(prev    => { const n = [...prev]; n[i] = f; return n })
    setSpotPreviews(prev => { const n = [...prev]; n[i] = f ? URL.createObjectURL(f) : null; return n })
    setSpotFilenames(prev => { const n = [...prev]; n[i] = f ? f.name : ''; return n })
  }

  const getCompanyContext = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return ''
    const { data: profile } = await supabase.from('company_profiles').select('*').eq('user_id', user.id).single()
    if (!profile) return ''
    return [
      profile.company_name  && `会社名：${profile.company_name}`,
      profile.strengths     && `強み・アピールポイント：\n${profile.strengths}`,
      profile.homepage_text && `会社紹介文：\n${profile.homepage_text}`,
      profile.features      && `取り扱い物件の特徴：\n${profile.features}`,
    ].filter(Boolean).join('\n\n')
  }

  // ─── 生成ハンドラ ─────────────────────────────────────────────────────

  const handleGenBasic = async () => {
    setErrBasic('')
    setGenBasic(true)
    try {
      const companyContext = await getCompanyContext()
      const res = await fetch('/api/event-campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'basic', eventCategory, freeText, companyContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      setEventTitle(data.title     ?? '')
      setEventFeature(data.feature ?? '')
      setEventBody(data.body       ?? '')

      const pats: TitleBody[] = Array.isArray(data.bonusPatterns) ? data.bonusPatterns : []
      setBonusPatterns([
        ...pats,
        ...Array.from({ length: Math.max(0, 4 - pats.length) }, () => ({ title: '', body: '' })),
      ].slice(0, 4))
    } catch (e: unknown) {
      setErrBasic(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setGenBasic(false)
    }
  }

  const handleGenSpots = async () => {
    setErrSpots('')
    setGenSpots(true)
    try {
      const companyContext = await getCompanyContext()
      const res = await fetch('/api/event-campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'spots', eventCategory, eventBody, companyContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      const spots: TitleBody[] = Array.isArray(data.spots) ? data.spots : []
      setSpotSets([
        ...spots,
        ...Array.from({ length: Math.max(0, 2 - spots.length) }, () => ({ title: '', body: '' })),
      ].slice(0, 2))
    } catch (e: unknown) {
      setErrSpots(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setGenSpots(false)
    }
  }

  const handleGenReviews = async () => {
    setErrReviews('')
    setGenReviews(true)
    try {
      const companyContext = await getCompanyContext()
      const res = await fetch('/api/event-campaign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'reviews', eventCategory, eventBody, companyContext }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      const revs: TitleBody[] = Array.isArray(data.reviews) ? data.reviews : []
      setReviewSets([
        ...revs,
        ...Array.from({ length: Math.max(0, 5 - revs.length) }, () => ({ title: '', body: '' })),
      ].slice(0, 5))
    } catch (e: unknown) {
      setErrReviews(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setGenReviews(false)
    }
  }

  const handleGenAll = async () => {
    await handleGenBasic()
    await handleGenSpots()
    await handleGenReviews()
  }

  const updateBonus = (i: number, field: keyof TitleBody, val: string) => {
    setBonusPatterns(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  const updateSpot = (i: number, field: keyof TitleBody, val: string) => {
    setSpotSets(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }
  const updateReview = (i: number, field: keyof TitleBody, val: string) => {
    setReviewSets(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  const basicHasResult = eventTitle || eventFeature || eventBody
  const spotsHasResult = spotSets.some(s => s.title || s.body)
  const revsHasResult  = reviewSets.some(r => r.title || r.body)

  // ─── JSX ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 pt-2">

      {/* ════════════════════════════════════════════════════════════════
          ① イベントカテゴリ選択 ＆ 画像エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="①">イベントカテゴリ選択 ＆ 画像エリア</SectionHeading>

        {/* カテゴリ選択 */}
        <div className="card">
          <label className="label">イベントカテゴリ</label>
          <select
            value={eventCategory}
            onChange={e => setEventCategory(e.target.value)}
            className="input-field"
          >
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-500">
            選択されたカテゴリに応じたプロンプトが自動で適用されます。
          </p>
        </div>

        {/* フリーテキスト入力欄 */}
        <div className="card">
          <label className="label">イベントの具体的な内容・アピールしたいこと（任意）</label>
          <div className="mb-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            💡 入力した内容はイベント基本情報（タイトル・特長・本文・参加特典）の生成に最優先で反映されます。未入力の場合は選択ジャンルの標準事例をベースに自動生成します。
          </div>
          <textarea
            className="input-field resize-none"
            rows={5}
            value={freeText}
            onChange={e => setFreeText(e.target.value)}
            placeholder={`例：${eventCategory}を開催します。○月○日（土）10:00〜17:00、○○市○○町にて。来場特典として○○をプレゼント。定員○組限定でご予約受付中。`}
          />
        </div>

        {/* メイン画像 (1枚・大) */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-700">メイン画像（1枚）</p>
          <ImageSlot
            file={mainFile}
            preview={mainPreview}
            label="メイン画像"
            aspect="aspect-[16/7]"
            onChange={f => { setMainFile(f); setMainPreview(URL.createObjectURL(f)); setMainFilename(f.name) }}
            onClear={() => { setMainFile(null); setMainPreview(null); setMainFilename('') }}
          />
          <FilenameField
            value={mainFilename}
            onChange={setMainFilename}
            copyKey="main-fname"
            copied={copied}
            onCopy={handleCopy}
          />
        </div>

        {/* サブ画像 (4枚・小) */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-700">追加画像（4枚）</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i}>
                <ImageSlot
                  file={subFiles[i]}
                  preview={subPreviews[i]}
                  label={`追加${i + 1}`}
                  aspect="aspect-square"
                  onChange={f => setSubImage(i, f)}
                  onClear={() => setSubImage(i, null)}
                />
                <FilenameField
                  value={subFilenames[i]}
                  onChange={v => setSubFilenames(prev => { const n = [...prev]; n[i] = v; return n })}
                  copyKey={`sub-fname-${i}`}
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ② 基本情報 ＆ 参加特典 生成エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="②">基本情報 ＆ 参加特典 生成エリア</SectionHeading>

        {errBasic && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errBasic}</div>
        )}

        {(basicHasResult || genBasic) && (
          <div className="space-y-5">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              基本情報 生成結果
            </p>
            {genBasic ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card space-y-4">
                  <EditCard label="イベントタイトル" value={eventTitle}   onChange={setEventTitle}   limit={80}  copyKey="ev-title"   rows={2} copied={copied} onCopy={handleCopy} />
                  <EditCard label="イベント特長"     value={eventFeature} onChange={setEventFeature} limit={40}  copyKey="ev-feature" rows={2} copied={copied} onCopy={handleCopy} />
                  <EditCard label="詳細開催内容（本文）" value={eventBody} onChange={setEventBody}   limit={650} copyKey="ev-body"    rows={10} copied={copied} onCopy={handleCopy} />
                </div>
              </div>
            )}

            {/* 参加特典 4パターン */}
            {!genBasic && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-suumo-green rounded-full" />
                    参加特典（4パターン）
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <p className="text-amber-800 text-xs font-semibold">
                    ※ 他社事例を参考に複数パターン生成しています。内容に合うものを選択して使用してください。
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {bonusPatterns.map((p, i) => (
                    <div key={i} className="card space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-suumo-green text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <span className="text-sm font-semibold text-gray-700">参加特典 パターン{i + 1}</span>
                      </div>
                      <EditCard label="タイトル" value={p.title} onChange={v => updateBonus(i, 'title', v)} limit={50}  copyKey={`bon-title-${i}`} rows={2} copied={copied} onCopy={handleCopy} />
                      <EditCard label="本文"     value={p.body}  onChange={v => updateBonus(i, 'body',  v)} limit={150} copyKey={`bon-body-${i}`}  rows={5} copied={copied} onCopy={handleCopy} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ③ 当日の流れ・見どころエリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="③">当日の流れ・見どころエリア</SectionHeading>

        {/* 見どころ画像 2枚 */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold text-gray-700">見どころ画像（2枚）</p>
          <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 360 }}>
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i}>
                <ImageSlot
                  file={spotFiles[i]}
                  preview={spotPreviews[i]}
                  label={`見どころ画像${i + 1}`}
                  aspect="aspect-square"
                  onChange={f => setSpotImage(i, f)}
                  onClear={() => setSpotImage(i, null)}
                />
                <FilenameField
                  value={spotFilenames[i]}
                  onChange={v => setSpotFilenames(prev => { const n = [...prev]; n[i] = v; return n })}
                  copyKey={`spot-fname-${i}`}
                  copied={copied}
                  onCopy={handleCopy}
                />
              </div>
            ))}
          </div>
        </div>

        {!eventBody.trim() && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-blue-700 text-sm">
            💡 ②の「基本情報の原稿を生成する」を先に実行すると、本文を参照してより精度の高い見どころが生成されます。
          </div>
        )}

        {errSpots && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errSpots}</div>
        )}

        {(spotsHasResult || genSpots) && (
          <div className="space-y-4">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              当日の流れ・見どころ 生成結果
            </p>
            {genSpots ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {spotSets.map((s, i) => (
                  <div key={i} className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-suumo-green text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        当日の流れみどころ セット{i + 1}
                        {spotFilenames[i] && <span className="ml-1.5 text-xs text-gray-400 font-normal font-mono">（{spotFilenames[i]}）</span>}
                      </span>
                    </div>
                    <EditCard label="タイトル" value={s.title} onChange={v => updateSpot(i, 'title', v)} limit={50}  copyKey={`spot-title-${i}`} rows={2} copied={copied} onCopy={handleCopy} />
                    <EditCard label="本文"     value={s.body}  onChange={v => updateSpot(i, 'body',  v)} limit={150} copyKey={`spot-body-${i}`}  rows={5} copied={copied} onCopy={handleCopy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ④ 参加者の感想エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="④">参加者の感想エリア</SectionHeading>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-amber-800 text-xs font-semibold">
            ※ 本文の内容に合う感想を生成しています。選択して使用してください。
          </p>
        </div>

        {!eventBody.trim() && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-blue-700 text-sm">
            💡 ②の「基本情報の原稿を生成する」を先に実行すると、本文を参照してより精度の高い感想が生成されます。
          </div>
        )}

        {errReviews && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errReviews}</div>
        )}

        {(revsHasResult || genReviews) && (
          <div className="space-y-4">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              参加者の感想 生成結果
            </p>
            {genReviews ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {reviewSets.map((r, i) => (
                  <div key={i} className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-700">感想 {i + 1}</span>
                    </div>
                    <EditCard label="タイトル" value={r.title} onChange={v => updateReview(i, 'title', v)} limit={50}  copyKey={`rev-title-${i}`} rows={2} copied={copied} onCopy={handleCopy} />
                    <EditCard label="本文"     value={r.body}  onChange={v => updateReview(i, 'body',  v)} limit={150} copyKey={`rev-body-${i}`}  rows={5} copied={copied} onCopy={handleCopy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleGenAll}
          disabled={genBasic || genSpots || genReviews}
          className="btn-primary w-full py-5 text-base flex items-center justify-center gap-2"
        >
          {(genBasic || genSpots || genReviews) ? (
            <><Spinner />AI生成中（基本情報 → 見どころ → 感想 の順で一括生成）...</>
          ) : '✨ イベント原稿を一括生成する（基本情報・見どころ・感想）'}
        </button>
      </div>

      <div className="h-8" />
    </div>
  )
}
