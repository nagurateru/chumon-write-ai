export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  strengths: string
  homepage_text: string
  features: string
  custom_prompt: string
  created_at: string
  updated_at: string
}

export interface GeneratedManuscript {
  id: string
  user_id: string
  manuscript_type: string
  content: string
  image_description?: string
  created_at: string
}

export const PAGE_TABS = [
  {
    key: 'company' as const,
    label: '会社概要',
    icon: '🏢',
    description: '会社の強みやこだわりをアピール',
    outputLabel: '■ キャッチコピー（40文字以内）＋ ■ 本文（500文字以内）',
    multipleImages: false,
    placeholder: '「会社の強み設定」の内容に加えて、特にアピールしたい要素を追加入力してください。\n例：最近手がけた施工スタイル、受賞歴、お客様の声、新しいサービスなど',
  },
  {
    key: 'strength' as const,
    label: '強みこだわり',
    icon: '⭐',
    description: 'SUUMO企業検索軸40種類のカテゴリに応じた強みをPR',
    outputLabel: '■ キャッチコピー（40文字以内）＋ ■ 本文（200文字以内）',
    multipleImages: false,
    placeholder: 'その他の補足情報（任意）',
  },
  {
    key: 'construction' as const,
    label: '建築実例',
    icon: '🏠',
    description: '施工事例の写真に解説文を個別生成',
    outputLabel: '各写真の見どころ解説文（100〜150文字）',
    multipleImages: true,
    placeholder: '施工事例の特徴、使用素材、施主様のご要望など（任意）',
  },
  {
    key: 'modelhouse' as const,
    label: 'モデルハウス',
    icon: '🏡',
    description: 'MHレポート：基本情報・見どころ・感想を一括生成',
    outputLabel: '基本情報 / 見どころ（4パターン）/ 感想（5個）',
    multipleImages: false,
    placeholder: '',
  },
  {
    key: 'event' as const,
    label: 'イベント',
    icon: '📅',
    description: '基本情報・特典・見どころ・感想を一括生成',
    outputLabel: '基本情報 / 参加特典（4P）/ 見どころ（2P）/ 感想（5P）',
    multipleImages: false,
    placeholder: '',
  },
  {
    key: 'store' as const,
    label: '店舗概要',
    icon: '🏪',
    description: 'アクセス・スタッフ・対応エリア紹介',
    outputLabel: '■ 挨拶キャッチ（40文字以内）＋ ■ 本文（200文字以内）',
    multipleImages: false,
    placeholder: '店舗名、所在地、スタッフ人数、対応エリア、駐車場情報など',
  },
  {
    key: 'free' as const,
    label: 'フリー作成',
    icon: '✏️',
    description: '自由に指定してAIに原稿を生成させる',
    outputLabel: '指定内容に応じた原稿',
    multipleImages: false,
    placeholder: '',
  },
] as const

export type PageTabKey = (typeof PAGE_TABS)[number]['key']
export type PageTab = (typeof PAGE_TABS)[number]
