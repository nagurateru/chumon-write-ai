'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────

interface TitleBody {
  title: string
  body:  string
}

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

function ImageSlot({ file, preview, label, onChange, onClear }: {
  file:     File | null
  preview:  string | null
  label:    string
  onChange: (f: File) => void
  onClear:  () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileCopied, setFileCopied] = useState(false)

  const handleCopyFilename = () => {
    if (!file) return
    navigator.clipboard.writeText(file.name).then(() => {
      setFileCopied(true)
      setTimeout(() => setFileCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-1.5">
      <div
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) onChange(f) }}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className={`relative aspect-square rounded-xl border-2 border-dashed cursor-pointer overflow-hidden flex items-center justify-center transition-colors ${
          preview ? 'border-suumo-green' : 'border-gray-300 hover:border-suumo-green bg-gray-50'
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onClear() }}
              className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 shadow text-xs leading-none"
            >✕</button>
          </>
        ) : (
          <div className="text-center px-1">
            <p className="text-lg text-gray-300">📷</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-tight">{label}</p>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f) }}
        className="hidden"
      />
      {file && (
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] text-gray-500 truncate flex-1 font-mono leading-tight"
            title={file.name}
          >
            {file.name}
          </span>
          <button
            type="button"
            onClick={handleCopyFilename}
            className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-500 transition-colors"
          >
            {fileCopied ? '✓' : 'コピー'}
          </button>
        </div>
      )}
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

export default function MhReportTab() {
  const supabase = createClient()

  // ── ① フリーテキスト ──────────────────────────────────────────────────
  const [featureText,  setFeatureText]  = useState('')
  const [scheduleText, setScheduleText] = useState('')
  const [reviewText,   setReviewText]   = useState('')

  // ── ② メインビジュアル画像 (12スロット) ──────────────────────────────
  const [mainFiles,    setMainFiles]    = useState<(File | null)[]>(Array.from({ length: 12 }, () => null))
  const [mainPreviews, setMainPreviews] = useState<(string | null)[]>(Array.from({ length: 12 }, () => null))

  // ② 基本情報 出力
  const [mhName,      setMhName]      = useState('')
  const [mhCatch,     setMhCatch]     = useState('')
  const [mhBodyCatch, setMhBodyCatch] = useState('')
  const [mhBody,      setMhBody]      = useState('')
  const [genBasic,    setGenBasic]    = useState(false)
  const [errBasic,    setErrBasic]    = useState('')

  // ── ③ 見どころ画像 (2スロット) ───────────────────────────────────────
  const [patFiles,    setPatFiles]    = useState<(File | null)[]>(Array.from({ length: 2 }, () => null))
  const [patPreviews, setPatPreviews] = useState<(string | null)[]>(Array.from({ length: 2 }, () => null))

  // ③ 見どころ 出力 (4パターン)
  const [patterns,    setPatterns]    = useState<TitleBody[]>(Array.from({ length: 4 }, () => ({ title: '', body: '' })))
  const [genPatterns, setGenPatterns] = useState(false)
  const [errPatterns, setErrPatterns] = useState('')

  // ── ④ 間取り図画像 (6スロット) ───────────────────────────────────────
  const [floorFiles,    setFloorFiles]    = useState<(File | null)[]>(Array.from({ length: 6 }, () => null))
  const [floorPreviews, setFloorPreviews] = useState<(string | null)[]>(Array.from({ length: 6 }, () => null))

  // ── ⑤ 感想 出力 (5個) ────────────────────────────────────────────────
  const [reviews,    setReviews]    = useState<TitleBody[]>(Array.from({ length: 5 }, () => ({ title: '', body: '' })))
  const [genReviews, setGenReviews] = useState(false)
  const [errReviews, setErrReviews] = useState('')

  // コピー状態
  const [copied, setCopied] = useState('')

  // ─── ヘルパー ─────────────────────────────────────────────────────────

  const handleCopy = (text: string, key: string) => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(''), 2000)
    })
  }

  const setSlotImage = <T extends File | null>(
    arr: T[],
    setArr: (v: T[]) => void,
    prevArr: (string | null)[],
    setPrevArr: (v: (string | null)[]) => void,
    i: number,
    file: File | null,
  ) => {
    const next = [...arr] as T[]
    next[i] = file as T
    setArr(next)
    const prev = [...prevArr]
    prev[i] = file ? URL.createObjectURL(file) : null
    setPrevArr(prev)
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
      const imageFilenames = mainFiles.filter(Boolean).map(f => f!.name)

      const res = await fetch('/api/mh-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'basic', companyContext, featureText, imageFilenames }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      setMhName(data.name           ?? '')
      setMhCatch(data.catch         ?? '')
      setMhBodyCatch(data.bodyCatch ?? '')
      setMhBody(data.body           ?? '')
    } catch (e: unknown) {
      setErrBasic(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setGenBasic(false)
    }
  }

  const handleGenPatterns = async () => {
    setErrPatterns('')
    setGenPatterns(true)
    try {
      const companyContext        = await getCompanyContext()
      const patternImageFilenames = patFiles.filter(Boolean).map(f => f!.name)

      const res = await fetch('/api/mh-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'patterns', companyContext, scheduleText, patternImageFilenames }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      const pats: TitleBody[] = Array.isArray(data.patterns) ? data.patterns : []
      setPatterns([
        ...pats,
        ...Array.from({ length: Math.max(0, 4 - pats.length) }, () => ({ title: '', body: '' })),
      ].slice(0, 4))
    } catch (e: unknown) {
      setErrPatterns(e instanceof Error ? e.message : '生成に失敗しました')
    } finally {
      setGenPatterns(false)
    }
  }

  const handleGenReviews = async () => {
    setErrReviews('')
    setGenReviews(true)
    try {
      const companyContext = await getCompanyContext()

      const res = await fetch('/api/mh-report', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type: 'reviews', companyContext, reviewText }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成に失敗しました')

      const revs: TitleBody[] = Array.isArray(data.reviews) ? data.reviews : []
      setReviews([
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
    await handleGenPatterns()
    await handleGenReviews()
  }

  const updatePattern = (i: number, field: keyof TitleBody, val: string) => {
    setPatterns(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  const updateReview = (i: number, field: keyof TitleBody, val: string) => {
    setReviews(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const basicHasResult = mhName || mhCatch || mhBodyCatch || mhBody
  const patHasResult   = patterns.some(p => p.title || p.body)
  const revHasResult   = reviews.some(r => r.title || r.body)

  // ─── JSX ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10 pt-2">

      {/* ════════════════════════════════════════════════════════════════
          ① フリーテキスト入力エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <SectionHeading num="①">フリーテキスト入力エリア（全生成ボタンで参照）</SectionHeading>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card">
            <label className="label">（a）モデルハウスの特徴・アピールポイント（任意）</label>
            <textarea
              className="input-field resize-none"
              rows={6}
              value={featureText}
              onChange={e => setFeatureText(e.target.value)}
              placeholder="例：吹き抜けのある開放的なリビング、全室床暖房完備、展示品・インテリア含む特別仕様…"
            />
          </div>
          <div className="card">
            <label className="label">（b）当日の流れ、みどころ（任意）</label>
            <textarea
              className="input-field resize-none"
              rows={6}
              value={scheduleText}
              onChange={e => setScheduleText(e.target.value)}
              placeholder="例：10:00 スタッフによる概要説明、設計士が動線・素材のこだわりをご案内…"
            />
          </div>
          <div className="card">
            <label className="label">（c）参加者の感想・生の声（任意）</label>
            <textarea
              className="input-field resize-none"
              rows={6}
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              placeholder="例：収納の多さに驚いた、子供が走り回れる広さで良かった…"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ② メインビジュアル ＆ 基本情報生成エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="②">メインビジュアル ＆ 基本情報生成エリア</SectionHeading>

        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-4">画像グリッド（最大12枚）</p>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 12 }, (_, i) => (
              <ImageSlot
                key={i}
                file={mainFiles[i]}
                preview={mainPreviews[i]}
                label={`写真${i + 1}`}
                onChange={f => setSlotImage(mainFiles, setMainFiles, mainPreviews, setMainPreviews, i, f)}
                onClear={() => setSlotImage(mainFiles, setMainFiles, mainPreviews, setMainPreviews, i, null)}
              />
            ))}
          </div>
        </div>

        {errBasic && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errBasic}</div>
        )}

        {(basicHasResult || genBasic) && (
          <div className="space-y-4">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              生成結果
            </p>
            {genBasic ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <EditCard label="モデルハウス名" value={mhName} onChange={setMhName} limit={50} copyKey="mh-name" rows={2} copied={copied} onCopy={handleCopy} />
                </div>
                <EditCard label="キャッチ"    value={mhCatch}     onChange={setMhCatch}     limit={40}  copyKey="mh-catch"  rows={2} copied={copied} onCopy={handleCopy} />
                <EditCard label="本文キャッチ" value={mhBodyCatch} onChange={setMhBodyCatch} limit={40}  copyKey="mh-bcatch" rows={2} copied={copied} onCopy={handleCopy} />
                <div className="md:col-span-2">
                  <EditCard label="本文" value={mhBody} onChange={setMhBody} limit={400} copyKey="mh-body" rows={8} copied={copied} onCopy={handleCopy} />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ③ 見どころ・特徴ページ生成エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="③">見どころ・特徴ページ生成エリア</SectionHeading>

        <div className="bg-red-50 border border-red-300 rounded-lg px-4 py-3">
          <p className="text-red-700 text-sm font-bold">※ 実際の内容に合うものを利用してください</p>
          <p className="text-red-600 text-xs mt-0.5">4パターンのバリエーションが生成されます。最も適切なパターンをお選びください。</p>
        </div>

        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-4">見どころ画像（2枚）</p>
          <div className="grid grid-cols-2 gap-4" style={{ maxWidth: 260 }}>
            {Array.from({ length: 2 }, (_, i) => (
              <ImageSlot
                key={i}
                file={patFiles[i]}
                preview={patPreviews[i]}
                label={`画像${i + 1}`}
                onChange={f => setSlotImage(patFiles, setPatFiles, patPreviews, setPatPreviews, i, f)}
                onClear={() => setSlotImage(patFiles, setPatFiles, patPreviews, setPatPreviews, i, null)}
              />
            ))}
          </div>
        </div>

        {errPatterns && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errPatterns}</div>
        )}

        {(patHasResult || genPatterns) && (
          <div className="space-y-4">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              生成結果（4パターン）
            </p>
            {genPatterns ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {patterns.map((p, i) => (
                  <div key={i} className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-suumo-green text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-700">当日の流れみどころ パターン{i + 1}</span>
                    </div>
                    <EditCard label="タイトル" value={p.title} onChange={v => updatePattern(i, 'title', v)} limit={50} copyKey={`pat-title-${i}`} rows={2} copied={copied} onCopy={handleCopy} />
                    <EditCard label="本文"     value={p.body}  onChange={v => updatePattern(i, 'body',  v)} limit={150} copyKey={`pat-body-${i}`}  rows={5} copied={copied} onCopy={handleCopy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ④ 間取り図エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-4">
        <SectionHeading num="④">間取り図エリア</SectionHeading>
        <div className="card">
          <p className="text-sm font-semibold text-gray-700 mb-4">間取り図グリッド（最大6枚）</p>
          <div className="grid grid-cols-3 gap-3" style={{ maxWidth: 420 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <ImageSlot
                key={i}
                file={floorFiles[i]}
                preview={floorPreviews[i]}
                label={`間取り図${i + 1}`}
                onChange={f => setSlotImage(floorFiles, setFloorFiles, floorPreviews, setFloorPreviews, i, f)}
                onClear={() => setSlotImage(floorFiles, setFloorFiles, floorPreviews, setFloorPreviews, i, null)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          ⑤ 見学した人の感想エリア
          ════════════════════════════════════════════════════════════════ */}
      <section className="space-y-5">
        <SectionHeading num="⑤">見学した人の感想エリア</SectionHeading>

        {errReviews && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{errReviews}</div>
        )}

        {(revHasResult || genReviews) && (
          <div className="space-y-4">
            <p className="text-base font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-suumo-green rounded-full" />
              生成結果（5個）
            </p>
            {genReviews ? (
              <div className="card flex items-center justify-center py-14 text-gray-400 gap-3">
                <Spinner size={6} />AI生成中...
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {reviews.map((r, i) => (
                  <div key={i} className="card space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                      <span className="text-sm font-semibold text-gray-700">感想 {i + 1}</span>
                    </div>
                    <EditCard label="タイトル" value={r.title} onChange={v => updateReview(i, 'title', v)} limit={50} copyKey={`rev-title-${i}`} rows={2} copied={copied} onCopy={handleCopy} />
                    <EditCard label="本文"     value={r.body}  onChange={v => updateReview(i, 'body',  v)} limit={150} copyKey={`rev-body-${i}`}  rows={5} copied={copied} onCopy={handleCopy} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ════ 一括生成ボタン ════ */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleGenAll}
          disabled={genBasic || genPatterns || genReviews}
          className="btn-primary w-full py-5 text-base flex items-center justify-center gap-2"
        >
          {(genBasic || genPatterns || genReviews) ? (
            <><Spinner />AI生成中（基本情報 → 見どころ → 感想 の順で一括生成）...</>
          ) : '✨ MHレポート原稿を一括生成する（基本情報・見どころ・感想）'}
        </button>
      </div>

      <div className="h-8" />
    </div>
  )
}
