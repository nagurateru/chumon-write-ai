'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function FreeCreationTab() {
  const supabase = createClient()

  const [instruction,  setInstruction]  = useState('')
  const [rules,        setRules]        = useState('')
  const [contents,     setContents]     = useState('')
  const [charLimit,    setCharLimit]    = useState<number>(400)
  const [tone,         setTone]         = useState<'desu' | 'da'>('desu')
  const [perspective,  setPerspective]  = useState<'third' | 'first'>('third')
  const [imageFile,    setImageFile]    = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [generating,   setGenerating]   = useState(false)
  const [result,       setResult]       = useState('')
  const [error,        setError]        = useState('')
  const [copied,       setCopied]       = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleGenerate = async () => {
    if (!instruction.trim() && !contents.trim()) {
      setError('AIへの指示または盛り込んでほしい内容を入力してください')
      return
    }

    setGenerating(true)
    setError('')
    setResult('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('company_profiles')
        .select('company_name, strengths, homepage_text, features, custom_prompt')
        .eq('user_id', user?.id ?? '')
        .single()

      const companyContext = [
        profile?.company_name && `会社名：${profile.company_name}`,
        profile?.strengths    && `①人についての良さ：\n${profile.strengths}`,
        profile?.homepage_text && `②商品についての良さ：\n${profile.homepage_text}`,
        profile?.features     && `③会社についての良さ：\n${profile.features}`,
        profile?.custom_prompt && `④特にアピールしたい内容：\n${profile.custom_prompt}`,
      ].filter(Boolean).join('\n\n')

      const fd = new FormData()
      fd.append('instruction',    instruction)
      fd.append('rules',          rules)
      fd.append('contents',       contents)
      fd.append('charLimit',      String(charLimit))
      fd.append('tone',           tone)
      fd.append('perspective',    perspective)
      fd.append('companyContext', companyContext)
      if (imageFile) fd.append('image', imageFile)

      const res  = await fetch('/api/free-generate', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '生成に失敗しました')
      setResult(data.manuscript || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-2">フリー作成</h2>
        <p className="text-xs text-gray-500">
          各ページで思うように作成できなかった原稿や、別のサイトに使いたい場合に好きなように原稿生成できます。
        </p>
      </div>

      <div className="card space-y-5">
        {/* AIへの指示 */}
        <div>
          <label className="label">AIへの指示</label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="例：モデルハウスの紹介文を作成してください。見学者が来たくなるような文章でお願いします。"
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
          />
        </div>

        {/* 制限・ルール */}
        <div>
          <label className="label">制限・ルール（任意）</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="例：競合他社名は使わないこと。価格を具体的に書かないこと。"
            value={rules}
            onChange={e => setRules(e.target.value)}
          />
        </div>

        {/* 盛り込んでほしい内容 */}
        <div>
          <label className="label">盛り込んでほしい内容（任意）</label>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="例：リビングが広い・自然素材を使っている・子育て世代に人気・土日祝も見学可能"
            value={contents}
            onChange={e => setContents(e.target.value)}
          />
        </div>

        {/* 文字数・口調・表記視点 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">文字数指定</label>
            <input
              type="number"
              className="input-field"
              min={50}
              max={2000}
              value={charLimit}
              onChange={e => setCharLimit(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="label">口調</label>
            <select
              className="input-field"
              value={tone}
              onChange={e => setTone(e.target.value as 'desu' | 'da')}
            >
              <option value="desu">です・ます調（敬体）</option>
              <option value="da">だ・である調（常体）</option>
            </select>
          </div>
          <div>
            <label className="label">表記視点</label>
            <select
              className="input-field"
              value={perspective}
              onChange={e => setPerspective(e.target.value as 'third' | 'first')}
            >
              <option value="third">第三者表記（客観的なライター視点）</option>
              <option value="first">自社表記（会社・私たちとして）</option>
            </select>
          </div>
        </div>

        {/* 画像アップロード */}
        <div>
          <label className="label">画像（任意）</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
          {imagePreview ? (
            <div className="relative w-40">
              <img src={imagePreview} alt="preview" className="w-40 aspect-[4/3] object-cover rounded-xl border" />
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 text-xs flex items-center justify-center text-gray-500 hover:text-red-500 shadow"
              >✕</button>
              <p className="text-[10px] text-gray-500 mt-1 truncate">{imageFile?.name}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-40 aspect-[4/3] rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-suumo-green transition-colors"
            >
              <span className="text-xl">+</span>
              <span className="text-xs">画像を追加</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
      >
        {generating ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            AI生成中...
          </>
        ) : '✨ 原稿を生成する'}
      </button>

      {(result || generating) && (
        <div className="space-y-4 pt-2">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-5 bg-suumo-green rounded-full" />
            生成結果
          </h2>
          {generating ? (
            <div className="card flex items-center justify-center py-12 text-gray-400 gap-3">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              AI生成中...
            </div>
          ) : (
            <div className="rounded-xl border-2 border-green-200 bg-suumo-green-light p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-800">生成原稿</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{result.length}文字</span>
                  <button
                    onClick={handleCopy}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
                  >{copied ? '✓ コピー済み' : 'コピー'}</button>
                </div>
              </div>
              <textarea
                value={result}
                onChange={e => setResult(e.target.value)}
                rows={10}
                className="w-full resize-none rounded-lg px-3 py-2 text-sm text-gray-800 bg-white/80 border border-transparent focus:outline-none focus:ring-2 focus:ring-green-200 leading-relaxed"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
