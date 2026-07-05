'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PAGE_TABS, type PageTabKey } from '@/lib/types'
import { PLANS } from '@/lib/plans'
import MhReportTab from '@/components/MhReportTab'
import EventCampaignTab from '@/components/EventCampaignTab'
import FreeCreationTab from '@/components/FreeCreationTab'
import { TAB_ICONS } from '@/lib/icons'

// ── 定数 ─────────────────────────────────────────────────────────────────
const SPLIT_RESULT_LIMITS: Record<string, { catchLimit: number; bodyLimit: number }> = {
  company:  { catchLimit: 40, bodyLimit: 500 },
  strength: { catchLimit: 40, bodyLimit: 200 },
  store:    { catchLimit: 40, bodyLimit: 200 },
}

const STRENGTH_CATEGORY_GROUPS = [
  {
    group: '人気の価格帯',
    options: [
      { value: 'lowcost',   label: 'ローコスト' },
      { value: 'highgrade', label: 'ハイグレード' },
    ],
  },
  {
    group: '対応内容',
    options: [
      { value: 'afterservice',    label: 'アフターフォロー充実' },
      { value: 'land_search',     label: '土地探しの相談可' },
      { value: 'home_loan',       label: '提携の住宅ローン紹介可' },
      { value: 'fp_consult',      label: 'フィナンシャルプランナーに相談可' },
      { value: 'interior_coord',  label: 'インテリアコーディネーターに相談可' },
      { value: 'self_build',      label: '自社施工' },
      { value: 'architect',       label: '建築家に相談可' },
      { value: 'exterior_design', label: 'こだわりの外観デザイン提案可' },
      { value: 'interior_design', label: 'こだわりの内観デザイン提案可' },
      { value: 'semi_order',      label: 'セミオーダーメイド提案可' },
    ],
  },
  {
    group: '性能',
    options: [
      { value: 'quake_resistant', label: '耐震・免震・制震' },
      { value: 'insulation',      label: '高気密・高断熱' },
      { value: 'eco',             label: '省エネ・創エネ・エコ(eco)' },
      { value: 'zeh',             label: 'ZEH・Nearly ZEH' },
      { value: 'air_system',      label: '全館空調' },
      { value: 'soundproof',      label: '防音・遮音' },
      { value: 'ventilation',     label: '通風・採光' },
    ],
  },
  {
    group: '階数・広さ',
    options: [
      { value: 'hiraya',      label: '平屋' },
      { value: 'three_story', label: '3階建て以上' },
      { value: 'basement',    label: '地下室あり' },
      { value: 'small_lot',   label: '狭小住宅・変形地' },
    ],
  },
  {
    group: 'ライフスタイル',
    options: [
      { value: 'easy_housework', label: '家事がラク' },
      { value: 'child_friendly', label: '子育てしやすい' },
      { value: 'dual_income',    label: '共働き世帯に配慮' },
      { value: 'with_pet',       label: 'ペットと暮らす' },
      { value: 'rich_storage',   label: '収納充実' },
      { value: 'young_owners',   label: '20代30代で建てる' },
      { value: 'two_family',     label: '二世帯で暮らす' },
      { value: 'rental_mixed',   label: '賃貸・店舗併用' },
      { value: 'barrier_free',   label: 'バリアフリー・ユニバーサルデザイン' },
      { value: 'hobby_home',     label: '趣味と暮らす家' },
    ],
  },
  {
    group: 'テイスト・素材',
    options: [
      { value: 'wa_modern',        label: '和モダン' },
      { value: 'japanese_style',   label: '和風' },
      { value: 'wood_house',       label: '木の家' },
      { value: 'concrete',         label: 'コンクリート' },
      { value: 'imported_house',   label: '輸入住宅' },
      { value: 'natural_material', label: '自然素材・無垢素材' },
      { value: 'domestic_wood',    label: '国産材・地元材' },
    ],
  },
] as const

const STRENGTH_CATEGORY_HINTS: Record<string, string> = {
  lowcost:           '💰 価格帯・坪単価の併記が必須。「1000万円台」等の価格帯表現を本文に含めます。',
  highgrade:         '✨ 価格帯・坪単価の併記が必須。「3000万円以上」等の価格帯表現を本文に含めます。',
  afterservice:      '🔧 点検・保証・サポート体制の充実を具体的にPRします。',
  land_search:       '🗺️ 土地探しのサポートをPR。特定物件の価格・所在は記載しません。',
  home_loan:         '🏦 提携ローンの旨をPR。具体的な金融機関名は記載しません。',
  fp_consult:        '📊 「FP（ファイナンシャルプランナー）」と資格名を明記。返済シミュレーション額は記載しません。',
  interior_coord:    '🎨 インテリアコーディネーターによるプロ提案をPRします。',
  self_build:        '🏗️ 自社施工による品質管理・コスト・アフターサービスの強みをPRします。',
  architect:         '📐 建築家との連携によるデザイン性・設計自由度の高さをPRします。',
  exterior_design:   '🏠 外観デザインへのこだわりと豊富な提案力をPRします。',
  interior_design:   '🛋️ 内装デザインへのこだわりと空間提案力をPRします。',
  semi_order:        '📋 セミオーダーの自由度とコストバランスの良さをPRします。',
  quake_resistant:   '🏚️ 耐震・免震・制震構造の安心感をPRします。',
  insulation:        '🌡️ 高気密・高断熱による快適な住環境と健康への配慮をPRします。',
  eco:               '🌿 省エネ機能をPR。「安くなる」は「節約できる」に言い換えます。',
  zeh:               '☀️ ZEH対応の省エネ性能をPR。補助金額の断定は避けます。',
  air_system:        '💨 全館空調による快適性・省エネ性をPRします。',
  soundproof:        '🔇 防音・遮音性能と具体的な生活シーンへの活用をPRします。',
  ventilation:       '🌬️ 自然の風と光を活かした設計の工夫をPRします。',
  hiraya:            '🏡 ワンフロアの動線・開放感・バリアフリーなど平屋の魅力をPRします。',
  three_story:       '🏙️ 3階建て以上の敷地活用・独立性・眺望の良さをPRします。',
  basement:          '🏗️ 地下室の多様な活用方法（書斎・シアター等）をPRします。',
  small_lot:         '📏 「敷地面積30坪以下」の明記が必須。狭小・変形地の設計力をPRします。',
  easy_housework:    '🧺 家事動線・収納・設備で家事が楽になる設計をPRします。',
  child_friendly:    '👶 子供の安全・見守りやすさ・学習スペース等をPRします。',
  dual_income:       '👫 時短家事・宅配ボックス・動線設計で共働き世帯を応援するPRをします。',
  with_pet:          '🐾 ペット専用スペース・素材・設備の工夫をPRします。',
  rich_storage:      '📦 ウォークインクローゼット・パントリー等の充実した収納をPRします。',
  young_owners:      '🏠 冒頭に「[夫30歳＋妻＋子供2人]（全角スペース）」形式の年齢表記が必須です。',
  two_family:        '👨‍👩‍👧‍👦 形態（完全分離型等）を明示して二世帯住宅の魅力をPRします。',
  rental_mixed:      '🏢 「店舗併用」または「賃貸併用」の旨を明記。入居者募集の表現は不可。',
  barrier_free:      '♿ 段差解消・手すり・車椅子対応等のバリアフリー仕様をPRします。',
  hobby_home:        '🎸 趣味に特化した専用スペース・設備の魅力をPRします。',
  wa_modern:         '⛩️ 和の伝統美と現代デザインの融合をPRします。',
  japanese_style:    '🎋 縁側・欄間・床の間等の和建築の美しさをPRします。',
  wood_house:        '🌳 木の温もり・調湿効果・経年変化の美しさをPRします。',
  concrete:          '🏢 コンクリートの重厚感・耐久性・デザイン自由度をPRします。',
  imported_house:    '🏘️ 欧米スタイルの輸入住宅の魅力と施工技術のこだわりをPRします。',
  natural_material:  '🌿 「天然素材」等を使う場合は具体的根拠（ヒノキ100%等）の併記が必要です。',
  domestic_wood:     '🌲 「天然素材」等を使う場合は具体的根拠の併記が必要。地域材の品質をPRします。',
}

function parseCompanyResult(raw: string): { catchCopy: string; mainText: string } {
  const mainIdx = raw.search(/■\s*本文/)
  if (mainIdx === -1) return { catchCopy: raw.trim(), mainText: '' }
  return {
    catchCopy: raw.slice(0, mainIdx).replace(/■\s*[^\n]+\n?/, '').trim(),
    mainText:  raw.slice(mainIdx).replace(/■\s*本文[^\n]*\n?/, '').trim(),
  }
}

// ── コンポーネント ────────────────────────────────────────────────────────
export default function GeneratePage() {
  const supabase  = createClient()
  const router    = useRouter()
  const [profile, setProfile]           = useState<Record<string, string> | null>(null)
  const [monthlyCount, setMonthlyCount] = useState(0)
  const [planType,  setPlanType]        = useState<string>('free')
  const [totalCount, setTotalCount]     = useState(0)
  const [subActive, setSubActive]       = useState(false)
  const [selectedTab, setSelectedTab]   = useState<PageTabKey>('company')

  // ── 単一画像タブ用 (modelhouse / event / store) ──────────────────────
  const [imageFile, setImageFile]       = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 強み・こだわりタブ ────────────────────────────────────────────────
  const [strengthPattern,      setStrengthPattern]      = useState<'A' | 'B'>('A')
  const [strengthCategory,     setStrengthCategory]     = useState('lowcost')
  const [strengthSlotFiles,    setStrengthSlotFiles]    = useState<(File | null)[]>([null, null, null])
  const [strengthSlotPreviews, setStrengthSlotPreviews] = useState<(string | null)[]>([null, null, null])
  const slotRef0 = useRef<HTMLInputElement>(null)
  const slotRef1 = useRef<HTMLInputElement>(null)
  const slotRef2 = useRef<HTMLInputElement>(null)
  const slotRefs = [slotRef0, slotRef1, slotRef2]

  // ── 建築実例タブ ──────────────────────────────────────────────────────
  const [constTitle,         setConstTitle]         = useState('')
  const [constOwnerCatch,    setConstOwnerCatch]    = useState('')
  const [constMainBody,      setConstMainBody]      = useState('')
  const [constPhotoCaptions, setConstPhotoCaptions] = useState<string[]>(Array(10).fill(''))
  const [constFloorCaptions, setConstFloorCaptions] = useState<string[]>(Array(4).fill(''))
  const [photoFiles,    setPhotoFiles]    = useState<(File | null)[]>(Array(10).fill(null))
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>(Array(10).fill(null))
  const [floorFiles,    setFloorFiles]    = useState<(File | null)[]>(Array(4).fill(null))
  const [floorPreviews, setFloorPreviews] = useState<(string | null)[]>(Array(4).fill(null))
  const [constActiveSlot, setConstActiveSlot] = useState<{ type: 'photo' | 'floor'; index: number } | null>(null)
  const constFileInputRef = useRef<HTMLInputElement>(null)

  // ── 共通 ──────────────────────────────────────────────────────────────
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [generating, setGenerating]         = useState(false)
  const [result, setResult]                 = useState<string | null>(null)
  const [catchCopy, setCatchCopy]           = useState('')
  const [mainText,  setMainText]            = useState('')
  const [error, setError]                   = useState('')
  const [copied, setCopied]                 = useState<string | null>(null)

  const currentTab    = PAGE_TABS.find(t => t.key === selectedTab)!
  const isSplitResult = selectedTab in SPLIT_RESULT_LIMITS
  const splitLimits   = SPLIT_RESULT_LIMITS[selectedTab]
  const isStore        = selectedTab === 'store'
  const isModelhouse   = selectedTab === 'modelhouse'
  const isEvent        = selectedTab === 'event'
  const isConstruction = selectedTab === 'construction'
  const isFree         = selectedTab === 'free'
  const showRightColumn = !isSplitResult && !isConstruction && !isStore && !isModelhouse && !isEvent && !isFree

  // ── データ読み込み ────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
      const [profileRes, countRes, totalRes, subRes] = await Promise.all([
        supabase.from('company_profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('generated_manuscripts').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).gte('created_at', startOfMonth),
        supabase.from('generated_manuscripts').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
        supabase.from('user_subscriptions').select('plan_type, subscription_status')
          .eq('user_id', user.id).single(),
      ])
      if (profileRes.data) setProfile(profileRes.data)
      setMonthlyCount(countRes.count || 0)
      setTotalCount(totalRes.count || 0)
      if (subRes.data) {
        setPlanType(subRes.data.plan_type || 'free')
        setSubActive(subRes.data.subscription_status === 'active')
      }
    }
    load()
  }, [])

  // ── タブ切替 ──────────────────────────────────────────────────────────
  const handleTabChange = (tab: PageTabKey) => {
    setSelectedTab(tab)
    setResult(null); setCatchCopy(''); setMainText(''); setError(''); setAdditionalInfo('')
    setImageFile(null); setImagePreview(null)
    setStrengthPattern('A'); setStrengthCategory('lowcost')
    setStrengthSlotFiles([null, null, null]); setStrengthSlotPreviews([null, null, null])
    setConstTitle(''); setConstOwnerCatch(''); setConstMainBody('')
    setConstPhotoCaptions(Array(10).fill('')); setConstFloorCaptions(Array(4).fill(''))
    setPhotoFiles(Array(10).fill(null)); setPhotoPreviews(Array(10).fill(null))
    setFloorFiles(Array(4).fill(null));  setFloorPreviews(Array(4).fill(null))
    setConstActiveSlot(null)
  }

  // ── 単一画像ハンドラ ─────────────────────────────────────────────────
  const handleSingleImageChange = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('画像サイズは5MB以下にしてください'); return }
    setError(''); setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // ── 強みタブ画像ハンドラ ─────────────────────────────────────────────
  const handleSlotImageChange = (index: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { setError('画像サイズは5MB以下にしてください'); return }
    setError('')
    setStrengthSlotFiles(prev  => { const n = [...prev]; n[index] = file; return n })
    const reader = new FileReader()
    reader.onloadend = () => setStrengthSlotPreviews(prev => { const n = [...prev]; n[index] = reader.result as string; return n })
    reader.readAsDataURL(file)
  }
  const clearStrengthSlot = (i: number) => {
    setStrengthSlotFiles(prev  => { const n = [...prev]; n[i] = null; return n })
    setStrengthSlotPreviews(prev => { const n = [...prev]; n[i] = null; return n })
  }
  const handlePatternChange = (p: 'A' | 'B') => {
    setStrengthPattern(p)
    if (p === 'B') {
      setStrengthSlotFiles(prev  => [prev[0], prev[1], null])
      setStrengthSlotPreviews(prev => [prev[0], prev[1], null])
    }
  }

  // ── 建築実例ハンドラ ─────────────────────────────────────────────────
  const openConstSlot = (type: 'photo' | 'floor', index: number) => {
    setConstActiveSlot({ type, index })
    constFileInputRef.current?.click()
  }
  const handleConstFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !constActiveSlot) { e.target.value = ''; return }
    if (file.size > 10 * 1024 * 1024) { setError('画像サイズは10MB以下にしてください'); e.target.value = ''; return }
    setError('')
    const { type, index } = constActiveSlot
    const setFiles    = type === 'photo' ? setPhotoFiles    : setFloorFiles
    const setPreviews = type === 'photo' ? setPhotoPreviews : setFloorPreviews
    setFiles(prev => { const n = [...prev]; n[index] = file; return n })
    const reader = new FileReader()
    reader.onloadend = () => setPreviews(prev => { const n = [...prev]; n[index] = reader.result as string; return n })
    reader.readAsDataURL(file)
    e.target.value = ''
  }
  const clearConstSlot = (type: 'photo' | 'floor', index: number) => {
    const setFiles    = type === 'photo' ? setPhotoFiles    : setFloorFiles
    const setPreviews = type === 'photo' ? setPhotoPreviews : setFloorPreviews
    setFiles(prev    => { const n = [...prev]; n[index] = null; return n })
    setPreviews(prev => { const n = [...prev]; n[index] = null; return n })
  }
  const updateConstPhotoCaption = (i: number, val: string) =>
    setConstPhotoCaptions(prev => { const n = [...prev]; n[i] = val; return n })
  const updateConstFloorCaption = (i: number, val: string) =>
    setConstFloorCaptions(prev => { const n = [...prev]; n[i] = val; return n })

  // ── 生成処理 ─────────────────────────────────────────────────────────
  const buildBaseFormData = () => {
    const fd = new FormData()
    fd.append('tab', selectedTab)
    fd.append('additionalInfo', additionalInfo)
    if (profile) {
      fd.append('strengths',    profile.strengths     || '')
      fd.append('homepageText', profile.homepage_text || '')
      fd.append('features',     profile.features      || '')
      fd.append('companyName',  profile.company_name  || '')
    }
    return fd
  }

  const handleGenerate = async () => {
    const isFreePlan = planType === 'free' || !subActive
    if (isFreePlan) {
      if (totalCount >= PLANS.free.limit) {
        router.push('/pricing')
        return
      }
    } else {
      const planObj = PLANS[planType as keyof typeof PLANS]
      if (planObj && monthlyCount >= planObj.limit) {
        router.push('/pricing')
        return
      }
    }

    if (isConstruction && !photoFiles[0] && !additionalInfo.trim()) {
      setError('メインビジュアルまたは補足情報を入力してください')
      return
    }
    const needsContent = !isSplitResult && !isConstruction
    if (needsContent && !imageFile && !additionalInfo.trim()) {
      setError('参考画像または詳細情報を入力してください')
      return
    }

    setGenerating(true); setError('')
    setResult(null); setCatchCopy(''); setMainText('')
    setConstTitle(''); setConstOwnerCatch(''); setConstMainBody('')
    setConstPhotoCaptions(Array(10).fill('')); setConstFloorCaptions(Array(4).fill(''))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const fd = buildBaseFormData()

      if (isConstruction) {
        // additionalInfo = 建築実例のフリーテキスト（最優先参照として送る）
        fd.append('freeText', additionalInfo)
        // 写真 (slot 1 はバーチャルなので送らない)
        photoFiles.forEach((file, i) => { if (i !== 1 && file) fd.append(`photo_${i}`, file) })
        floorFiles.forEach((file, i) => { if (file) fd.append(`floor_${i}`, file) })

        const res  = await fetch('/api/generate', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '生成に失敗しました')

        setConstTitle(data.title       || '')
        setConstOwnerCatch(data.ownerCatch || '')
        setConstMainBody(data.mainBody  || '')
        setConstPhotoCaptions(data.photoCaptions || Array(10).fill(''))
        setConstFloorCaptions(data.floorCaptions || Array(4).fill(''))
      } else {
        if (selectedTab === 'strength') fd.append('category', strengthCategory)
        else if (imageFile) fd.append('image', imageFile)

        const res  = await fetch('/api/generate', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '生成に失敗しました')

        if (isSplitResult) {
          const parsed = parseCompanyResult(data.manuscript)
          setCatchCopy(parsed.catchCopy); setMainText(parsed.mainText)
        } else {
          setResult(data.manuscript)
        }
      }

      setMonthlyCount(prev => prev + 1)
      setTotalCount(prev => prev + 1)
      if (user) {
        await supabase.from('generated_manuscripts').insert({
          user_id: user.id,
          manuscript_type: selectedTab,
          content: isConstruction ? (constTitle || additionalInfo) : (result || catchCopy),
          image_description: additionalInfo,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(key); setTimeout(() => setCopied(null), 2000)
  }

  // ── 建築実例スロットレンダラー ────────────────────────────────────────
  const renderConstPhotoSlot = (
    index: number,
    label: string,
    isVirtual = false,
    aspectClass = 'aspect-[4/3]'
  ) => {
    const preview  = isVirtual ? photoPreviews[0] : photoPreviews[index]
    const file     = isVirtual ? photoFiles[0]    : photoFiles[index]

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
        <div
          className={`relative ${aspectClass} rounded-xl border-2 border-dashed overflow-hidden ${
            isVirtual
              ? 'border-gray-200 bg-gray-50 cursor-default'
              : preview
              ? 'border-suumo-green bg-gray-50 cursor-pointer'
              : 'border-gray-300 bg-gray-50 hover:border-suumo-green transition-colors cursor-pointer'
          }`}
          onClick={isVirtual ? undefined : () => openConstSlot('photo', index)}
        >
          {preview ? (
            <>
              <img src={preview} alt={label} className="absolute inset-0 w-full h-full object-cover" />
              {isVirtual ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                  <span className="text-white text-center text-xs leading-tight">
                    メインと同じ画像<br />
                    <span className="opacity-75 text-[10px]">（メインビジュアルを参考にしてください）</span>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearConstSlot('photo', index) }}
                  className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center text-gray-500 hover:text-red-500 shadow z-10"
                >✕</button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1 p-1 text-center">
              {isVirtual ? (
                <>
                  <span className="text-lg">🖼</span>
                  <span className="text-[10px] leading-tight">メインと同じ画像<br />（メインビジュアルを参考）</span>
                </>
              ) : (
                <>
                  <span className="text-xl">📷</span>
                  <span className="text-[10px]">クリックで追加</span>
                </>
              )}
            </div>
          )}
        </div>
        {!isVirtual && file && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={() => handleCopy(file.name, `pname-${index}`)}
              className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
            >{copied === `pname-${index}` ? '✓' : 'コピー'}</button>
          </div>
        )}
      </div>
    )
  }

  const renderConstFloorSlot = (index: number) => {
    const preview = floorPreviews[index]
    const file    = floorFiles[index]
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500">間取り図 {index + 1}</p>
        <div
          className="relative aspect-[3/4] rounded-xl border-2 border-dashed overflow-hidden bg-gray-50 cursor-pointer hover:border-suumo-green transition-colors"
          onClick={() => openConstSlot('floor', index)}
        >
          {preview ? (
            <>
              <img src={preview} alt={`間取り図${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={e => { e.stopPropagation(); clearConstSlot('floor', index) }}
                className="absolute top-1 right-1 bg-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center text-gray-500 hover:text-red-500 shadow z-10"
              >✕</button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1">
              <span className="text-xl">🗺</span>
              <span className="text-[10px]">クリックで追加</span>
            </div>
          )}
        </div>
        {file && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={() => handleCopy(file.name, `fname-${index}`)}
              className="text-[10px] flex-shrink-0 px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
            >{copied === `fname-${index}` ? '✓' : 'コピー'}</button>
          </div>
        )}
      </div>
    )
  }

  // ── 文字数カウント付き編集カード（再利用ヘルパー） ─────────────────────
  const renderEditCard = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    limit: number,
    copyKey: string,
    rows = 4
  ) => (
    <div className={`rounded-xl border-2 p-4 transition-colors ${value.length > limit ? 'border-red-300 bg-red-50' : 'border-green-200 bg-suumo-green-light'}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800">{label}</h3>
        <button
          onClick={() => handleCopy(value, copyKey)}
          className="text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
        >{copied === copyKey ? '✓ コピー済み' : 'コピー'}</button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className={`w-full resize-none rounded-lg px-3 py-2 text-sm text-gray-800 bg-white/80 border focus:outline-none focus:ring-2 transition-all leading-relaxed ${value.length > limit ? 'border-red-300 focus:ring-red-200' : 'border-transparent focus:ring-green-200'}`}
      />
      <p className={`text-xs text-right mt-1 font-semibold tabular-nums ${value.length > limit ? 'text-red-600' : 'text-gray-400'}`}>
        {value.length} / {limit}文字
        {value.length > limit && <span className="ml-1">⚠️ {value.length - limit}文字超過</span>}
      </p>
    </div>
  )

  // ──────────────────────────────────────────────────────────────────────
  // JSX
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✍️ 原稿生成</h1>
          <p className="text-gray-500 mt-1 text-sm">AIが原稿を自動生成します</p>
        </div>
        <div className="flex-shrink-0 text-center bg-suumo-green-light border border-green-200 rounded-xl px-4 py-2">
          <p className="text-2xl font-bold text-suumo-green">
            {(planType === 'free' || !subActive) ? totalCount : monthlyCount}
            <span className="text-sm font-normal text-gray-400 ml-1">
              / {(planType === 'free' || !subActive)
                ? PLANS.free.limit
                : (PLANS[planType as keyof typeof PLANS]?.limit ?? 30)}回
            </span>
          </p>
          <p className="text-xs text-gray-500">
            {(planType === 'free' || !subActive) ? '累計の生成回数' : '今月の生成回数'}
          </p>
        </div>
      </div>

      {!profile?.strengths && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          ⚠️ 会社の強みが未設定です。<a href="/company-profile" className="underline ml-1 font-medium">設定する</a>と原稿の精度が上がります。
        </div>
      )}

      {/* タブ選択 */}
      <div className="card p-4">
        <div className="flex overflow-x-auto gap-2 pb-1">
          {PAGE_TABS.map(tab => {
            const isActive = selectedTab === tab.key
            const Icon = TAB_ICONS[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-shrink-0 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border-2 transition-all min-w-[110px] ${
                  isActive ? 'border-suumo-green bg-suumo-green-light' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {Icon && <Icon size={22} strokeWidth={1.75} className={isActive ? 'text-suumo-green-dark' : 'text-gray-500'} />}
                <span className={`text-xs font-semibold leading-tight text-center ${isActive ? 'text-suumo-green-dark' : 'text-gray-700'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          建築実例タブ（専用レイアウト）
          ═══════════════════════════════════════════════════════════════════ */}
      {isConstruction && (
        <div className="space-y-5">
          {/* 補足情報 */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-800 mb-1">施主・物件の補足情報（任意）</h2>
            <p className="text-xs text-gray-500 mb-3">施主の要望、こだわりポイント、使用素材・設備、対象エリアなど</p>
            <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
              💡「会社の強み設定」に保存済みの情報は自動で読み込まれます。
            </div>
            <textarea
              className="input-field resize-none"
              rows={4}
              value={additionalInfo}
              onChange={e => setAdditionalInfo(e.target.value)}
              placeholder="例：木の温もりを大切にした家。施主は30代ご夫婦。子育てを見据えた間取り。無垢材フローリング使用。"
            />
          </div>

          {/* 実例写真 */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-gray-800">実例写真</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">最大10枚</span>
            </div>

            {/* メインビジュアル */}
            <p className="text-xs font-semibold text-gray-600 mb-2">▼ メインビジュアル</p>
            <div className="mb-5">
              {renderConstPhotoSlot(0, 'メインビジュアル', false, 'aspect-[16/9]')}
            </div>

            {/* サブ写真 */}
            <p className="text-xs font-semibold text-gray-600 mb-2">▼ サブ写真（最大9枚）</p>
            <div className="grid grid-cols-3 gap-3">
              {renderConstPhotoSlot(1, 'サブ① ※メインと同じ', true)}
              {[2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                <div key={`photo-slot-${i}`}>{renderConstPhotoSlot(i, `サブ${i}`)}</div>
              ))}
            </div>
          </div>

          {/* 間取り図 */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-gray-800">間取り図</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">最大4枚</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map(i => (
                <div key={`floor-slot-${i}`}>{renderConstFloorSlot(i)}</div>
              ))}
            </div>
          </div>

          {/* 非表示ファイルインプット */}
          <input ref={constFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleConstFileChange} />

          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>}

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
                AI生成中（全画像を一括分析しています…）
              </>
            ) : '✨ 建築実例の原稿を生成する'}
          </button>

          {/* ── 生成結果 ── */}
          {(constTitle || constOwnerCatch || constMainBody || generating) && (
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
                <>
                  {/* 本文キャッチ */}
                  {renderEditCard('■ 本文キャッチ（50文字以内）', constTitle, setConstTitle, 50, 'const-title', 2)}

                  {/* 各画像のキャプション */}
                  {(() => {
                    const rows: React.ReactNode[] = []

                    // 実例写真キャプション（PHOTO_0+1 は統合ボックス、2〜9 は個別）
                    for (let i = 0; i <= 9; i++) {
                      if (i === 1) continue  // PHOTO_1 は PHOTO_0 と統合済み
                      const hasFile = !!photoFiles[i]
                      if (!hasFile && !constPhotoCaptions[i]) continue

                      const thumbnail = photoPreviews[i]
                      const filename  = photoFiles[i]?.name
                      const label     = i === 0 ? 'キャプション：メインビジュアル（サブ①）' : `キャプション：サブ${i}`
                      const caption   = constPhotoCaptions[i]
                      const limit     = 250

                      rows.push(
                        <div key={`cp-${i}`} className={`rounded-xl border-2 p-4 transition-colors ${caption.length > limit ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex gap-3">
                            {thumbnail && (
                              <div className="flex-shrink-0 w-24 space-y-1">
                                <img src={thumbnail} className="w-full aspect-[4/3] object-cover rounded-lg" alt={label} />
                                {filename && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-500 truncate flex-1">{filename}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(filename, `pn-${i}`)}
                                      className="text-[10px] flex-shrink-0 px-1 py-0.5 rounded border border-gray-200 text-gray-500"
                                    >{copied === `pn-${i}` ? '✓' : 'コピー'}</button>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-700">{label}</p>
                                <button
                                  onClick={() => handleCopy(caption, `cc-${i}`)}
                                  className="text-xs px-2 py-0.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0 ml-2"
                                >{copied === `cc-${i}` ? '✓' : 'コピー'}</button>
                              </div>
                              <textarea
                                value={caption}
                                onChange={e => updateConstPhotoCaption(i, e.target.value)}
                                rows={4}
                                className={`w-full resize-none rounded-lg px-3 py-2 text-sm text-gray-800 border focus:outline-none focus:ring-2 transition-all leading-relaxed ${caption.length > limit ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200'}`}
                              />
                              <p className={`text-xs text-right mt-1 font-semibold tabular-nums ${caption.length > limit ? 'text-red-600' : 'text-gray-400'}`}>
                                {caption.length} / {limit}文字
                                {caption.length > limit && <span className="ml-1">⚠️ {caption.length - limit}文字超過</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    // 間取り図キャプション
                    for (let i = 0; i <= 3; i++) {
                      if (!floorFiles[i] && !constFloorCaptions[i]) continue
                      const caption = constFloorCaptions[i]
                      rows.push(
                        <div key={`fc-${i}`} className={`rounded-xl border-2 p-4 transition-colors ${caption.length > 100 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
                          <div className="flex gap-3">
                            {floorPreviews[i] && (
                              <div className="flex-shrink-0 w-20 space-y-1">
                                <img src={floorPreviews[i]!} className="w-full aspect-[3/4] object-cover rounded-lg" alt={`間取り図${i + 1}`} />
                                {floorFiles[i] && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-500 truncate flex-1">{floorFiles[i]!.name}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(floorFiles[i]!.name, `fn-${i}`)}
                                      className="text-[10px] flex-shrink-0 px-1 py-0.5 rounded border border-gray-200 text-gray-500"
                                    >{copied === `fn-${i}` ? '✓' : 'コピー'}</button>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-700">キャプション：間取り図 {i + 1}</p>
                                <button
                                  onClick={() => handleCopy(caption, `fc-copy-${i}`)}
                                  className="text-xs px-2 py-0.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0 ml-2"
                                >{copied === `fc-copy-${i}` ? '✓' : 'コピー'}</button>
                              </div>
                              <textarea
                                value={caption}
                                onChange={e => updateConstFloorCaption(i, e.target.value)}
                                rows={3}
                                className={`w-full resize-none rounded-lg px-3 py-2 text-sm text-gray-800 border focus:outline-none focus:ring-2 transition-all leading-relaxed ${caption.length > 100 ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-green-200'}`}
                              />
                              <p className={`text-xs text-right mt-1 font-semibold tabular-nums ${caption.length > 100 ? 'text-red-600' : 'text-gray-400'}`}>
                                {caption.length} / 100文字
                                {caption.length > 100 && <span className="ml-1">⚠️ {caption.length - 100}文字超過</span>}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    }

                    return rows
                  })()}

                  {/* 施主のこだわり（本文キャッチ） */}
                  {renderEditCard('■ 施主のこだわり（本文キャッチ）（40文字以内）', constOwnerCatch, setConstOwnerCatch, 40, 'const-owner-catch', 2)}

                  {/* 施主のこだわり（本文） */}
                  {renderEditCard('■ 施主のこだわり（本文）（550文字以内）', constMainBody, setConstMainBody, 550, 'const-main', 12)}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          店舗概要タブ（専用2カラムレイアウト）
          ═══════════════════════════════════════════════════════════════════ */}
      {isStore && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── 左カラム: メッセージ入力 + 生成ボタン + 結果 ── */}
          <div className="space-y-5">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-1">伝えたいメッセージ（任意）</h2>
              <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                💡「会社の強み設定」に保存済みの情報は自動で読み込まれます。店舗・スタッフへの想いや伝えたいことを自由に入力してください。
              </div>
              <textarea
                className="input-field resize-none"
                rows={6}
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                placeholder="例：地域のお客様に寄り添った住まいづくりを大切にしています。ご家族の夢を一緒に形にするお手伝いができれば幸いです。"
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>}

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
              ) : '✨ 店舗概要用の原稿を生成する'}
            </button>

            {(catchCopy || mainText || generating) && (
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
                  <div className="space-y-4">
                    {renderEditCard('■ 挨拶キャッチ', catchCopy, setCatchCopy, splitLimits?.catchLimit ?? 40, 'catch', 3)}
                    {renderEditCard('■ 本文', mainText, setMainText, splitLimits?.bodyLimit ?? 200, 'main', 8)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── 右カラム: 画像 + ファイル名 ── */}
          <div className="space-y-4">
            <div className="card">
              <h2 className="text-base font-semibold text-gray-800 mb-3">店舗画像（任意）</h2>
              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) handleSingleImageChange(f) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imagePreview ? 'border-suumo-green' : 'border-gray-300 hover:border-suumo-green'}`}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="店舗画像" className="w-full max-h-52 object-cover rounded-xl" />
                    <button type="button" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 shadow">✕</button>
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-3xl mb-2">📷</p>
                    <p className="text-gray-500 text-sm">クリックまたはドラッグ＆ドロップで画像を追加</p>
                    <p className="text-gray-400 text-xs mt-1">JPG, PNG, WebP / 5MB以下</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleSingleImageChange(f) }}
                className="hidden"
              />

              {imageFile && (
                <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-3 py-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">ファイル名</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-800 flex-1 truncate font-mono">{imageFile.name}</p>
                    <button
                      onClick={() => handleCopy(imageFile.name, 'store-img')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 flex-shrink-0"
                    >{copied === 'store-img' ? '✓ コピー済み' : 'コピー'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          モデルハウスタブ（専用レイアウト: MHレポート）
          ═══════════════════════════════════════════════════════════════════ */}
      {isModelhouse && <MhReportTab />}

      {/* ═══════════════════════════════════════════════════════════════════
          イベントタブ（専用レイアウト: EventCampaignTab）
          ═══════════════════════════════════════════════════════════════════ */}
      {isEvent && <EventCampaignTab />}

      {/* ═══════════════════════════════════════════════════════════════════
          フリー作成タブ
          ═══════════════════════════════════════════════════════════════════ */}
      {isFree && <FreeCreationTab />}

      {/* ═══════════════════════════════════════════════════════════════════
          その他タブ（会社概要・強み）
          ═══════════════════════════════════════════════════════════════════ */}
      {!isConstruction && !isStore && !isModelhouse && !isEvent && !isFree && (
        <>
          <div className={`grid grid-cols-1 gap-6 ${showRightColumn ? 'lg:grid-cols-3' : ''}`}>
            {/* ── 入力カラム ── */}
            <div className={`${showRightColumn ? 'lg:col-span-2' : ''} space-y-5`}>

              {/* 強み・こだわりタブ専用UI */}
              {selectedTab === 'strength' && (
                <>
                  {/* パターン選択 */}
                  <div className="card">
                    <h2 className="text-base font-semibold text-gray-800 mb-3">画像配置パターン</h2>
                    <select
                      value={strengthPattern}
                      onChange={e => handlePatternChange(e.target.value as 'A' | 'B')}
                      className="input-field"
                    >
                      <option value="A">パターンA　横長画像3枚</option>
                      <option value="B">パターンB　横長画像1枚　縦長画像1枚</option>
                    </select>
                  </div>

                  {/* 画像スロット */}
                  <div className="card">
                    <h2 className="text-base font-semibold text-gray-800 mb-1">画像アップロード</h2>
                    <p className="text-xs text-gray-500 mb-4">アップロード後、ファイル名を下のコピーボタンでコピーできます。</p>
                    {strengthPattern === 'A' ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map(i => {
                          const file = strengthSlotFiles[i]; const preview = strengthSlotPreviews[i]
                          return (
                            <div key={i} className="space-y-1.5">
                              <p className="text-xs text-gray-500 font-medium">画像{i + 1}</p>
                              <div
                                className={`relative aspect-[16/9] rounded-xl border-2 border-dashed overflow-hidden bg-gray-50 cursor-pointer hover:border-suumo-green transition-colors ${preview ? 'border-suumo-green' : 'border-gray-300'}`}
                                onClick={() => slotRefs[i].current?.click()}
                              >
                                {preview ? (
                                  <>
                                    <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                    <button type="button" onClick={e => { e.stopPropagation(); clearStrengthSlot(i) }} className="absolute top-1.5 right-1.5 bg-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow z-10">✕</button>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1"><span className="text-2xl">📷</span><span className="text-xs">クリックで追加</span></div>
                                )}
                              </div>
                              {file && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 truncate flex-1">{file.name}</span>
                                  <button type="button" onClick={() => handleCopy(file.name, `slot-${i}`)} className="text-xs flex-shrink-0 px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500">{copied === `slot-${i}` ? '✓' : 'コピー'}</button>
                                </div>
                              )}
                              <input ref={slotRefs[i]} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSlotImageChange(i, f); e.target.value = '' }} />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex gap-3 items-start">
                        {[0, 1].map((i, pos) => {
                          const file = strengthSlotFiles[i]; const preview = strengthSlotPreviews[i]
                          return (
                            <div key={i} className={`${pos === 0 ? 'flex-[2]' : 'flex-1'} min-w-0 space-y-1.5`}>
                              <p className="text-xs text-gray-500 font-medium">{pos === 0 ? '横長画像' : '縦長画像'}</p>
                              <div
                                className={`relative ${pos === 0 ? 'aspect-[16/9]' : 'aspect-[3/4]'} rounded-xl border-2 border-dashed overflow-hidden bg-gray-50 cursor-pointer hover:border-suumo-green transition-colors ${preview ? 'border-suumo-green' : 'border-gray-300'}`}
                                onClick={() => slotRefs[i].current?.click()}
                              >
                                {preview ? (
                                  <>
                                    <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                                    <button type="button" onClick={e => { e.stopPropagation(); clearStrengthSlot(i) }} className="absolute top-1.5 right-1.5 bg-white rounded-full w-6 h-6 text-xs flex items-center justify-center shadow z-10">✕</button>
                                  </>
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-1"><span className="text-2xl">📷</span><span className="text-xs">クリックで追加</span></div>
                                )}
                              </div>
                              {file && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-500 truncate flex-1">{file.name}</span>
                                  <button type="button" onClick={() => handleCopy(file.name, `slot-${i}`)} className="text-xs flex-shrink-0 px-2 py-0.5 rounded border border-gray-200 hover:bg-gray-50 text-gray-500">{copied === `slot-${i}` ? '✓' : 'コピー'}</button>
                                </div>
                              )}
                              <input ref={slotRefs[i]} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleSlotImageChange(i, f); e.target.value = '' }} />
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* カテゴリ */}
                  <div className="card">
                    <h2 className="text-base font-semibold text-gray-800 mb-1">強み・こだわりカテゴリ</h2>
                    <p className="text-xs text-gray-500 mb-3">カテゴリに応じたAIプロンプトが自動で適用されます。</p>
                    <select value={strengthCategory} onChange={e => setStrengthCategory(e.target.value)} className="input-field">
                      {STRENGTH_CATEGORY_GROUPS.map(group => (
                        <optgroup key={group.group} label={`── ${group.group}`}>
                          {group.options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* 単一画像 (modelhouse / event / store) */}
              {!isSplitResult && selectedTab !== 'strength' && (
                <div className="card">
                  <h2 className="text-base font-semibold text-gray-800 mb-3">参考画像（任意）</h2>
                  <div
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f?.type.startsWith('image/')) handleSingleImageChange(f) }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl cursor-pointer transition-colors ${imagePreview ? 'border-suumo-green' : 'border-gray-300 hover:border-suumo-green'}`}
                  >
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="参考画像" className="w-full max-h-52 object-cover rounded-xl" />
                        <button type="button" onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null) }} className="absolute top-2 right-2 bg-white rounded-full w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 shadow">✕</button>
                      </div>
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-3xl mb-2">📷</p>
                        <p className="text-gray-500 text-sm">クリックまたはドラッグ＆ドロップで画像を追加</p>
                        <p className="text-gray-400 text-xs mt-1">JPG, PNG, WebP / 5MB以下</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleSingleImageChange(f) }} className="hidden" />
                </div>
              )}

              {/* 追加情報テキストエリア */}
              <div className="card">
                <h2 className="text-base font-semibold text-gray-800 mb-1">
                  {selectedTab === 'company'
                    ? '特に伝えたい強み・補足テキスト（任意）'
                    : selectedTab === 'strength'
                    ? '特にアピールしたい内容・補足（任意）'
                    : '詳細情報（任意）'}
                </h2>
                {(selectedTab === 'company' || selectedTab === 'strength') && (
                  <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
                    💡「会社の強み設定」に保存済みの情報は自動で読み込まれます。ここには<strong>追加でアピールしたい内容</strong>だけを入力してください。
                  </div>
                )}
                <p className="text-xs text-gray-500 mb-3">{currentTab.placeholder}</p>
                <textarea
                  className="input-field resize-none"
                  rows={selectedTab === 'company' || selectedTab === 'strength' ? 6 : 5}
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  placeholder={currentTab.placeholder}
                />
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">{error}</div>}

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
                ) : `✨ ${currentTab.label}用の原稿を生成する`}
              </button>

              {/* 2分割結果（company / strength）: ボタンの直下に表示 */}
              {isSplitResult && (catchCopy || mainText || generating) && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {renderEditCard('■ キャッチコピー', catchCopy, setCatchCopy, splitLimits.catchLimit, 'catch', 3)}
                      {renderEditCard('■ 本文', mainText, setMainText, splitLimits.bodyLimit, 'main', 12)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── 右カラム（結果）: modelhouse / event / store ── */}
            {showRightColumn && (
              <div>
                <div className="card min-h-64">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-800">生成結果</h2>
                  </div>
                  {result ? (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button onClick={() => handleCopy(result, 'single')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                          {copied === 'single' ? '✓ コピー済み' : 'コピー'}
                        </button>
                      </div>
                      <div className="bg-suumo-green-light border border-green-200 rounded-lg p-4">
                        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm">{result}</p>
                      </div>
                      <p className="text-xs text-gray-400 text-right">{result.length}文字</p>
                    </div>
                  ) : generating ? (
                    <div className="flex items-center justify-center h-40 text-gray-400 text-sm gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      AI生成中...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 text-gray-300 text-sm">
                      生成ボタンを押すと結果がここに表示されます
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  )
}
