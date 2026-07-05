import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const maxDuration = 60

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 55000,
})

function loadStyleSamples(): string {
  try {
    const content = readFileSync(join(process.cwd(), 'style_samples.txt'), 'utf-8')
    return content.trim()
  } catch {
    return ''
  }
}

// ── 全タブ共通ベースルール ────────────────────────────────────────────────
const COMMON_BASE_RULES = `
【全原稿生成 共通ベースルール（厳守）】

■ A. 会社情報の反映（最優先）
ユーザーから提供される【会社情報】（会社名・強み・会社紹介文・物件特徴）を必ず原稿に反映させること。
汎用的な表現だけにならないよう、その会社固有の強みや特徴が読者に伝わる原稿を作成すること。
会社情報が未設定の場合は、提供されたその他の情報をもとに最善の原稿を生成すること。

■ B. 文字数制限の絶対厳守【最優先・最終警告】
各出力セクションで指定された文字数制限は、句読点・記号・スペースを含めて絶対に1文字も超えてはならない。
「〇〇文字程度」という表現もすべて「絶対に超えてはならない最大上限（以内）」として処理すること。
1文字でも超過した場合、システムエラーが発生しサービスが破綻するため、超過は絶対に許されない。

【出力前の必須内部チェックプロセス】
STEP1：文章を生成したら、ユーザーに出力する前に内部で1文字ずつ厳密に文字数をカウントする。
STEP2：1文字でも超過している、またはギリギリで超過リスクがあると判断した場合は、表現を削る・言い換えるなどして上限の80〜95%の安全な範囲に収まるよう内部でリライトする。
STEP3：「確実に文字数制限以内に収まっている」と確信できた完成原稿のみを出力する。
文字数の確認・計算作業・内部チェックの過程は出力に含めないこと。

■ C. 不動産広告 表現規定（景品表示法・宅建業法・公取規約遵守）
以下の規定を厳守すること。ユーザーから支給された訴求内容であっても、禁止表現（×）は絶対に使用せず、適切な表現に言い換えること。

記号の定義：◯ そのまま表記可 ／ ⚠️ 根拠・データの併記が必須 ／ ⚡ 客観的根拠があれば使用可（根拠表記は任意） ／ × 使用禁止

C-1. あおり表現・選別表現
× 「特集」（商品企画との誤認を招くため不可）
⚡「いよいよあと〜」「今が建て時」「ラストチャンス」「超◯◯」「わずか・希少の」「限定・特別に」（事実・根拠がある場合のみ）
⚠️「特典」（内容を必ず併記）
⚡「特別」「特選」「厳選」（合理的な選別基準がある場合のみ）
◯「締切迫る」

C-2. 欠陥がない・安全を意味する表現
⚠️「保証」（内容・条件の明示が必須）
⚡「完全」「完璧」「絶対」「万全」「確実に・必ず」（合理的根拠があれば可。「〜を目指します」などの非断定はそのまま可）
◯「安心」「安全」「完備」（提示対象に対して100%の場合）

C-3. 最上級・他社優位を意味する表現
× 「一流」（客観的根拠なし）
⚠️「日本一」「業界一」「日本初」「トップ」「一番」「NO.1」「最大規模」「当社だけ」「他に類をみない」「唯一」「オンリーワン」（調査データの出典明記が必須。他社を恣意的に低める表現は不可）
⚠️「最高・最◯」「一級」「特級」「究極の」「極」「世界水準」（根拠となる事実の併記が必須）
⚡「最高級」「最◯級」「最◯クラス」（客観的・具体的事実を保有している場合は可）
⚠️「最新」（いつの時点かを必ず併記。「先進」はそのまま可）
⚡「パイオニア」「草分け」「大手」「屈指の」「抜群」「高級」「ハイグレード」「優良」「良質」「上質」「高品質」「高スペック」（客観的・具体的事実があれば使用可）

C-4. 比較・価格表現
× 「家賃並みで手が届く」（個人差があるため不可）
× 「買得」「格安」「特安」「低価格」「ロープライス」「安値」「バーゲンセール」「破格値」「激安」「割安」「お得感たっぷり」「低額」「掘出し物」「お値打ち」（有利誤認の恐れ）
⚠️「光熱費がお得になった・安くなった」→「光熱費が節約できた」に言い換え。数値・条件の併記があれば可
⚠️「お得」「特別価格」「特別値下げ」（キャンペーン内容と条件の表記が必須）
◯「お手頃」「リーズナブル」「無料」「0円」「低予算」「手の届く価格」「お求めやすい価格」「価格を抑えた」「手に入れやすい」「良心的な価格」「低コスト」「ローコスト」「コスト低減」「グレードアップ」

■ D. 文体・表現スタイルの参考
文体参考サンプルが提供されている場合は、そのトーン・語彙・言い回し・文章のリズムを忠実に模倣すること。
単に内容をなぞるのではなく、サンプルから読み取れる表現の癖・強調のしかた・改行の流れまで再現すること。
`.trim()

// ── 建築実例タブ専用ハンドラ ────────────────────────────────────────────
async function handleConstruction(formData: FormData, styleSamples: string): Promise<NextResponse> {
  const additionalInfo = (formData.get('additionalInfo') as string) || ''
  const freeText       = (formData.get('freeText')       as string) || ''
  const strengths      = (formData.get('strengths')     as string) || ''
  const homepageText   = (formData.get('homepageText')  as string) || ''
  const features       = (formData.get('features')      as string) || ''
  const companyName    = (formData.get('companyName')   as string) || ''

  const companyContext = [
    companyName    && `会社名：${companyName}`,
    strengths      && `強み・アピールポイント：\n${strengths}`,
    homepageText   && `会社紹介文：\n${homepageText}`,
    features       && `取り扱い物件の特徴：\n${features}`,
  ].filter(Boolean).join('\n\n')

  const freeTextBlock = freeText.trim()
    ? `\n\n【最優先参照：ユーザー入力情報】\n以下のテキストを本文キャッチ・施主のこだわり・キャプションすべての生成ベースとして最優先で組み込み、肉付けして原稿を作成すること：\n${freeText}`
    : ''

  const styleBlock = styleSamples
    ? `\n\n【文体参考】\n---\n${styleSamples}\n---`
    : ''

  type ImageEntry = { index: number; name: string }
  const uploadedPhotos: ImageEntry[] = []
  const uploadedFloors: ImageEntry[] = []
  const contentBlocks: Anthropic.ContentBlockParam[] = []

  // 実例写真 (slot 0, 2-9 を受け取る; slot 1 は virtual)
  for (let i = 0; i <= 9; i++) {
    if (i === 1) continue
    const file = formData.get(`photo_${i}`) as File | null
    if (!file || file.size === 0) continue
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const mt = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: base64 } })
    const label = i === 0 ? 'メインビジュアル' : `サブ写真${i}`
    contentBlocks.push({ type: 'text', text: `[PHOTO_${i}: ${label} / ファイル名: ${file.name}]` })
    uploadedPhotos.push({ index: i, name: file.name })
  }

  // 間取り図
  for (let i = 0; i <= 3; i++) {
    const file = formData.get(`floor_${i}`) as File | null
    if (!file || file.size === 0) continue
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
    const mt = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
    contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: base64 } })
    contentBlocks.push({ type: 'text', text: `[FLOOR_${i}: 間取り図${i + 1} / ファイル名: ${file.name}]` })
    uploadedFloors.push({ index: i, name: file.name })
  }

  if (contentBlocks.length === 0 && !additionalInfo.trim() && !freeText.trim()) {
    return NextResponse.json({ error: '画像または補足情報を入力してください' }, { status: 400 })
  }

  // キャプション生成指示を構築
  const hasMain = uploadedPhotos.some(p => p.index === 0)
  const captionLines: string[] = []

  if (hasMain) {
    captionLines.push('===PHOTO_0===\n（PHOTO_0のメインビジュアル画像を見て、250文字以内でキャプション。客観的な第三者ライター視点で描写。改行・句点禁止）')
  }
  for (const { index } of uploadedPhotos.filter(p => p.index >= 2)) {
    captionLines.push(`===PHOTO_${index}===\n（PHOTO_${index}を見て、250文字以内でキャプション。客観的な第三者ライター視点で描写。改行・句点禁止）`)
  }
  for (const { index } of uploadedFloors) {
    captionLines.push(`===FLOOR_${index}===\n（FLOOR_${index}の間取り図を見て、100文字以内でキャプション。改行・句点禁止）`)
  }

  const promptText = `上記の画像すべてを参考にして、注文住宅の建築実例ページ用の原稿を生成してください。

【会社情報（バックグラウンド情報として参照すること）】
${companyContext || '（未設定）'}
${additionalInfo ? `\n【施主・物件の補足情報】\n${additionalInfo}` : ''}${freeTextBlock}

【文体・表現ルール（絶対厳守）】
・全文「だ・である」調（常体）で統一。「です・ます」は使用禁止。
・第三者表記（客観的なライター視点）で記述。施主・会社名は使用禁止（「施主」「建て主」等も不可）。
・会社名・ブランド名・競合他社名は一切記載禁止。
・改行禁止（各セクションは1行の連続した文章にすること）。
・禁止ワード：最高、最大、日本一、世界一、完全、絶対、万全、格安、激安、破格、一等地

【出力フォーマット（厳守）】
チェックメモ・注釈・確認コメント・文字数報告は一切出力しないこと。
マーカー（===〇〇===）と原稿テキストのみを出力すること。

===TITLE===
（本文キャッチ：50文字以内。家の空間・素材・こだわりの本質を一言で表す。改行禁止・句点禁止・社名禁止）

===OWNER_CATCH===
（施主のこだわり【本文キャッチ】：40文字以内。住まいへのこだわりや想いを短く表現。改行禁止・句点禁止・社名禁止）

===MAIN===
（施主のこだわり【本文】：550文字以内。画像から読み取れる空間・素材・工夫を客観的な第三者ライター視点で一貫した物語として記述。改行禁止）

${captionLines.join('\n\n')}

【絶対厳守の文字数リミット】
===TITLE===：50文字以内
===OWNER_CATCH===：40文字以内
===MAIN===：550文字以内
===PHOTO_*===：各250文字以内（改行・句点禁止）
===FLOOR_*===：各100文字以内（改行・句点禁止）
出力前に文字数を確認し、超えていれば削ること。確認作業自体は出力しないこと。${styleBlock}`

  contentBlocks.push({ type: 'text', text: promptText })

  const response = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 6000,
    system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。建築実例ページの原稿を生成します。
指定されたマーカー形式（===TITLE===など）でのみ出力し、チェックメモ・説明文・確認コメントは一切出力しません。

${COMMON_BASE_RULES}`,
    messages: [{ role: 'user', content: contentBlocks }],
  }).finalMessage()

  const textBlock = response.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    return NextResponse.json({ error: '原稿の生成に失敗しました' }, { status: 500 })
  }

  const raw = textBlock.text.trim()

  function extractSection(text: string, marker: string): string {
    const esc = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const m = text.match(new RegExp(`===\\s*${esc}\\s*===([\\s\\S]*?)(?====|$)`))
    return m ? m[1].trim() : ''
  }

  const photoCaptions: string[] = Array(10).fill('')
  const floorCaptions: string[] = Array(4).fill('')

  if (hasMain) {
    const mainCaption = extractSection(raw, 'PHOTO_0')
    photoCaptions[0] = mainCaption
    photoCaptions[1] = mainCaption  // メインビジュアル（サブ①）は同一キャプション
  }
  for (const { index } of uploadedPhotos.filter(p => p.index >= 2)) {
    photoCaptions[index] = extractSection(raw, `PHOTO_${index}`)
  }
  for (const { index } of uploadedFloors) {
    floorCaptions[index] = extractSection(raw, `FLOOR_${index}`)
  }

  return NextResponse.json({
    title:       extractSection(raw, 'TITLE'),
    ownerCatch:  extractSection(raw, 'OWNER_CATCH'),
    mainBody:    extractSection(raw, 'MAIN'),
    photoCaptions,
    floorCaptions,
  })
}

// ── その他タブ共通プロンプトビルダー ─────────────────────────────────────
type PromptSet = { system: string; user: string; maxTokens: number }

function buildPrompt(
  tab: string,
  companyContext: string,
  additionalInfo: string,
  styleSamples: string,
  category = ''
): PromptSet {
  const styleBlock = styleSamples
    ? `\n\n【文体・表現の参考文例】\n以下の文例のトーン、言い回し、表現スタイルを忠実に模倣して書いてください：\n---\n${styleSamples}\n---`
    : ''

  const ctx  = companyContext  ? `\n\n【会社情報】\n${companyContext}`  : ''
  const info = additionalInfo  ? `\n\n【追加情報・詳細】\n${additionalInfo}` : ''

  switch (tab) {
    case 'company':
      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。会社概要ページのキャッチコピーとメイン本文を作成します。

【文体ルール】
・文体は一貫して「だ・である」調（常体）で統一すること。敬体（です・ます調）は使用しないこと。

【会社概要専用フォーマット規則（絶対厳守）】
・キャッチコピー：40文字以内。改行は絶対禁止。文末に句点（。）は絶対に付けないこと。
・本文：500文字以内。改行は絶対禁止。すべて1行の連続した文章にすること。
出力前に自分で文字数を数えて確認し、超えている場合は削ること。確認作業は出力に含めないこと。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `会社概要ページ用の原稿を以下のフォーマットで作成してください。

【出力フォーマット（厳守）】
チェックコメント・文字数報告・注釈は一切出力しないこと。見出しと原稿テキストのみを出力すること。

■ キャッチコピー
（1文字以上40文字以内。改行なし。文末に句点「。」なし）

■ 本文
（1文字以上500文字以内。改行なし。すべて1行の連続した文章）

---
原稿作成にあたり、以下の2種類のデータを必ず組み合わせること。

【ベースデータ：会社の基本情報・強み（設定済み情報）】
${companyContext || '（未設定。追加データをもとに作成してください）'}

【追加データ：特に伝えたい強み・補足テキスト（今回の入力）】
${additionalInfo || '（なし。ベースデータのみで作成してください）'}
---

指示：ベースデータに書かれている会社の特徴をしっかりと反映させつつ、追加データとして入力された強みの要素を文章の中に自然に盛り込んで、1つのまとまった原稿に仕上げること。

「■ キャッチコピー」「■ 本文」の見出しをつけてそれぞれ出力してください。`,
        maxTokens: 1000,
      }

    case 'modelhouse':
      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。モデルハウスページの集客用コピーを作成します。来場意欲を高める魅力的な文章を書いてください。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `モデルハウスページ用の文章を以下の2ブロックで作成してください。

【モデルハウスの魅力】（200文字程度）
実際に体験できる設計・素材・空間演出の魅力、暮らしのイメージが膨らむポイントを伝えてください。

【来場特典・来場メリット】（100文字程度）
見学に来ることで得られる特典、体験、相談できる内容などを訴求してください。${ctx}${info}

「【モデルハウスの魅力】」「【来場特典・来場メリット】」の見出しをつけてそれぞれ出力してください。`,
        maxTokens: 700,
      }

    case 'event':
      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。見学会・相談会などのイベント集客告知文を作成します。参加意欲を高める魅力的な告知文を書いてください。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `イベントページ用の告知文を以下の3ブロックで作成してください。

【イベントの見どころ】（100文字程度）
このイベントならではの体験・魅力を伝えてください。

【開催情報】
日時：【日時を入力してください】
場所：【場所を入力してください】
※上記は編集可能なプレースホルダーとして記載してください。

【参加メリット】（100文字程度）
参加することで得られる情報・体験・特典を具体的に訴求してください。${ctx}${info}

「【イベントの見どころ】」「【開催情報】」「【参加メリット】」の見出しをつけてそれぞれ出力してください。`,
        maxTokens: 700,
      }

    case 'store':
      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。店舗概要（ご挨拶）ページの挨拶文を作成します。

【文体・表記ルール（絶対厳守）】
・必ず「です・ます」調（敬体）で出力すること。「だ・である」調（常体）および第三者表記は絶対に禁止。

【店舗概要専用 文字数ハードリミット（絶対厳守）】
・■ 挨拶キャッチ：1文字以上40文字以内。
・■ 本文：1文字以上200文字以内。改行は絶対禁止（すべて1行の連続した文章にすること）。
出力前に必ず自分で文字数を数えて確認し、超えている場合は削って調整してから出力すること。確認作業は出力に含めないこと。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `店舗概要（ご挨拶）ページ用の原稿を以下のフォーマットで作成してください。

【出力フォーマット（厳守）】
チェックコメント・文字数報告・注釈・区切り線は一切出力しないこと。見出しと原稿テキストのみを出力すること。

■ 挨拶キャッチ
（1文字以上40文字以内。「です・ます」調）

■ 本文
（1文字以上200文字以内。「です・ます」調。改行なし・1行の連続した文章）

---
【会社・店舗情報（ベースデータ）】
${companyContext || '（未設定。一般的な店舗挨拶文を作成してください）'}
${additionalInfo ? `\n【優先参照：伝えたいメッセージ（ユーザー入力）】\nこの内容を最優先でベースに組み込んで生成すること：\n${additionalInfo}` : ''}
---

指示：店舗の温かい雰囲気、スタッフの親しみやすさ、地域への密着度をイメージさせる挨拶文を「です・ます」調で作成すること。挨拶キャッチ40文字以内・本文200文字以内を厳守。`,
        maxTokens: 600,
      }

    case 'strength': {
      const CATEGORY_LABELS: Record<string, string> = {
        lowcost:           'ローコスト住宅',
        highgrade:         'ハイグレード住宅',
        afterservice:      'アフターフォロー充実',
        land_search:       '土地探しの相談可',
        home_loan:         '提携の住宅ローン紹介可',
        fp_consult:        'フィナンシャルプランナーに相談可',
        interior_coord:    'インテリアコーディネーターに相談可',
        self_build:        '自社施工',
        architect:         '建築家に相談可',
        exterior_design:   'こだわりの外観デザイン提案可',
        interior_design:   'こだわりの内観デザイン提案可',
        semi_order:        'セミオーダーメイド提案可',
        quake_resistant:   '耐震・免震・制震',
        insulation:        '高気密・高断熱',
        eco:               '省エネ・創エネ・エコ',
        zeh:               'ZEH・Nearly ZEH',
        air_system:        '全館空調',
        soundproof:        '防音・遮音',
        ventilation:       '通風・採光',
        hiraya:            '平屋',
        three_story:       '3階建て以上',
        basement:          '地下室あり',
        small_lot:         '狭小住宅・変形地',
        easy_housework:    '家事がラク',
        child_friendly:    '子育てしやすい',
        dual_income:       '共働き世帯に配慮',
        with_pet:          'ペットと暮らす',
        rich_storage:      '収納充実',
        young_owners:      '20代30代で建てる',
        two_family:        '二世帯で暮らす',
        rental_mixed:      '賃貸・店舗併用',
        barrier_free:      'バリアフリー・ユニバーサルデザイン',
        hobby_home:        '趣味と暮らす家',
        wa_modern:         '和モダン',
        japanese_style:    '和風',
        wood_house:        '木の家',
        concrete:          'コンクリート',
        imported_house:    '輸入住宅',
        natural_material:  '自然素材・無垢素材',
        domestic_wood:     '国産材・地元材',
      }

      const CATEGORY_INSTRUCTIONS: Record<string, string> = {
        lowcost: `【ローコスト住宅 個別規定】
価格を抑えつつも高品質な家づくりを実現する会社の姿勢を前面に出してPRすること。
入力情報に具体的な本体価格・坪単価が含まれている場合のみ、キャッチまたは本文に価格情報を記載すること。価格情報が提供されていない場合は、価格帯・坪単価を推測・創作して記載することは禁止。`,

        highgrade: `【ハイグレード住宅 個別規定】
上質な素材・設計・設備による贅沢な住まいの魅力をPRすること。
キャッチまたは本文のどちらかへ、写真の建物の「本体価格・価格帯」および「坪単価」の2つを必ず併記して表記すること（例：4500万円・110万円/坪）。「写真の建物は3000万円以上」等の価格帯表現を必ず含めること。`,

        afterservice: `【アフターフォロー充実 個別規定】
入居後の定期点検・メンテナンス・保証制度の充実度を具体的にPRすること。
「定期点検」「長期保証」「24時間対応」等の具体的なサービス内容を盛り込むこと。`,

        land_search: `【土地探しの相談可 個別規定】
土地の紹介や相談ができる旨を記載すること。
ただし、具体的な特定の土地物件の取引（価格・所在地・面積等）に関する表記は絶対に不可。「土地探しからトータルでサポート」等の表現にとどめること。`,

        home_loan: `【提携の住宅ローン紹介可 個別規定】
提携ローンがある旨を記載し、資金計画のサポートをPRすること。
ただし、具体的な金融機関名（銀行名・信用金庫名等）を表記することは絶対に禁止。`,

        fp_consult: `【フィナンシャルプランナーに相談可 個別規定】
FP（ファイナンシャルプランナー）に資金計画の相談ができる旨を記載し、資格名（FP）を明記すること。
ただし、具体的なシミュレーション返済額（月々〇〇円など）の表記は絶対に禁止。`,

        interior_coord: `【インテリアコーディネーターに相談可 個別規定】
インテリアコーディネーターによる内装・インテリア提案の魅力をPRすること。
プロの視点による空間づくりのサポート体制を具体的に伝えること。`,

        self_build: `【自社施工 個別規定】
自社施工であることによる品質管理・コスト管理・アフターサービスの強みをPRすること。
「職人が直接施工」「中間コストを削減」等のメリットを具体的に盛り込むこと。`,

        architect: `【建築家に相談可 個別規定】
建築家・建築士との連携による設計の自由度・デザイン性の高さをPRすること。
独自のデザイン提案力と、施主の要望を形にする提案プロセスの価値を伝えること。`,

        exterior_design: `【こだわりの外観デザイン提案可 個別規定】
外観デザインへのこだわりと提案力をPRすること。
素材・色・フォルムの選択肢の豊富さや、デザイン提案のプロセスを具体的に盛り込むこと。`,

        interior_design: `【こだわりの内観デザイン提案可 個別規定】
内装デザインへのこだわりと提案力をPRすること。
空間づくり・素材選び・照明計画等の具体的な強みを盛り込むこと。`,

        semi_order: `【セミオーダーメイド提案可 個別規定】
セミオーダーの自由度と手軽さのバランスをPRすること。
「規格住宅より自由、フルオーダーよりコストを抑えられる」等の特徴を具体的に伝えること。`,

        quake_resistant: `【耐震・免震・制震 個別規定】
地震への備えとして採用している構造・工法の特徴をPRすること。
「耐震等級」を表記する場合は客観的根拠（第三者機関の認証等）を必ず併記すること。`,

        insulation: `【高気密・高断熱 個別規定】
断熱性・気密性へのこだわり、一年中快適な住環境の実現、結露・ハウスダストの抑制など家族の健康への配慮を具体的に盛り込んでPRすること。
数値を表記する場合（UA値・C値等）は実測値または計算値の別を明記すること。`,

        eco: `【省エネ・創エネ・エコ 個別規定】
省エネ性能・太陽光発電・蓄電池等の環境配慮機能をPRすること。
「光熱費が安くなる」等の断定表現は避け、「光熱費を節約できる」「エネルギーを効率的に活用できる」等の表現を使用すること。`,

        zeh: `【ZEH・Nearly ZEH 個別規定】
ZEH（ネット・ゼロ・エネルギー・ハウス）の定義と会社の実績・対応力をPRすること。
ZEH補助金への言及は可能だが、具体的な補助金額は「補助金制度あり（要確認）」等の表現にとどめること。`,

        air_system: `【全館空調 個別規定】
全館空調システムによる快適性・省エネ性をPRすること。
「どの部屋も均一な温度」「ヒートショック対策」等の具体的なメリットを盛り込むこと。`,

        soundproof: `【防音・遮音 個別規定】
防音・遮音性能の高さと、それによる生活の快適性をPRすること。
「楽器演奏」「シアタールーム」「在宅勤務」等の具体的なライフシーンと結びつけて訴求すること。`,

        ventilation: `【通風・採光 個別規定】
自然の風と光を活かした設計の工夫をPRすること。
「24時間計画換気」「トップライト」「吹き抜け」等の具体的な設計手法を盛り込むこと。`,

        hiraya: `【平屋 個別規定】
ワンフロアならではのスムーズな動線、開放感のある空間、将来にわたるバリアフリーの安心感など、平屋住宅ならではのメリットを具体的に盛り込んでPRすること。`,

        three_story: `【3階建て以上 個別規定】
3階建て以上ならではの敷地活用の効率性・各フロアの独立性・眺望の良さをPRすること。
耐震性・構造の安全性への配慮についても触れること。`,

        basement: `【地下室あり 個別規定】
地下室ならではの活用方法（書斎・シアタールーム・ワインセラー・防音室等）の魅力をPRすること。
法的制約に関する誇大表現は避けること。`,

        small_lot: `【狭小住宅・変形地 個別規定】
狭小地・変形地でも快適な住まいを実現するための設計力・提案力をPRすること。
実例を紹介する文脈では「敷地面積30坪以下の土地に建つ実例」であることを必ず本文内に明記すること。`,

        easy_housework: `【家事がラク 個別規定】
家事動線の短さ・収納の充実・設備の使いやすさ等、家事を楽にする設計の工夫をPRすること。
「洗濯→乾燥→収納の動線が最短」「家事室・ランドリールーム」等の具体的な機能を盛り込むこと。`,

        child_friendly: `【子育てしやすい 個別規定】
子育て世帯が求める安全性・使いやすさ・見守りやすさをPRすること。
「子供の安全に配慮した設計」「リビング学習スペース」「充実の収納」等を盛り込むこと。`,

        dual_income: `【共働き世帯に配慮 個別規定】
共働き家庭の生活スタイルに合わせた動線設計・収納・設備の充実をPRすること。
「帰宅後すぐに手洗い」「宅配ボックス」「家事の時短」等の具体的なメリットを盛り込むこと。`,

        with_pet: `【ペットと暮らす 個別規定】
ペットと人が共に快適に暮らすための設計・素材・設備の工夫をPRすること。
「ペット用洗い場」「滑り止めフロア」「ドッグラン」等の具体的な設備・仕様を盛り込むこと。`,

        rich_storage: `【収納充実 個別規定】
収納量の多さと使いやすさ、片付けやすい暮らしを実現する設計をPRすること。
「ウォークインクローゼット」「シューズクローク」「パントリー」等の具体的な収納仕様を盛り込むこと。`,

        young_owners: `【20代30代で建てる 個別規定】
若い世代が家を建てることのメリット・会社のサポート体制をPRすること。
本文の冒頭に世帯主の年齢や年代の構成を必ず表記すること。表記方法は「[夫30歳＋妻＋子供2人]　本文内容〜」という形式を厳守すること（[]の後ろは全角スペース）。`,

        two_family: `【二世帯で暮らす 個別規定】
二世帯住宅ならではの「親世帯・子世帯それぞれのプライバシーの確保」と「助け合いのしやすさ」をPRすること。
「完全分離型・部分共用型・完全共用型」のいずれかの形態を明確にして訴求すること。`,

        rental_mixed: `【賃貸・店舗併用 個別規定】
本文またはキャッチ内に「店舗併用住宅である旨」または「賃貸併用住宅である旨」を必ず明確に記載すること。
ただし、店舗の電話番号等のアクションへの誘導や、入居者募集につながる直接的なPR表現（「入居者募集中」等）は絶対に禁止。`,

        barrier_free: `【バリアフリー・ユニバーサルデザイン 個別規定】
高齢者・障がいのある方・すべての世代が快適に暮らせるバリアフリー設計の充実をPRすること。
「段差解消」「手すり設置」「車椅子対応の廊下幅」等の具体的な仕様を盛り込むこと。`,

        hobby_home: `【趣味と暮らす家 個別規定】
特定の趣味（音楽・映画・DIY・ゴルフ等）を楽しめる専用スペースや設備の魅力をPRすること。
趣味のジャンルに応じた具体的な設備・空間の特徴を盛り込むこと。`,

        wa_modern: `【和モダン 個別規定】
和の伝統美と現代のデザイン・機能性を融合させた住まいの魅力をPRすること。
「格子」「坪庭」「無垢材」「左官仕上げ」等の和の要素と、モダンなデザインの融合を具体的に表現すること。`,

        japanese_style: `【和風 個別規定】
日本の伝統的な建築様式・素材・空間の美しさをPRすること。
「縁側」「欄間」「床の間」「真壁」等の和建築の要素を具体的に盛り込むこと。`,

        wood_house: `【木の家 個別規定】
木材の温もり・自然の風合い・調湿効果など、木の家ならではの魅力をPRすること。
「無垢材」「木の香り」「経年変化の美しさ」等の具体的な特徴を盛り込むこと。`,

        concrete: `【コンクリート 個別規定】
コンクリートならではの重厚感・耐久性・デザインの自由度をPRすること。
「打ちっぱなし」「RC造」「耐火性」「メンテナンス性」等の具体的な特徴を盛り込むこと。`,

        imported_house: `【輸入住宅 個別規定】
輸入住宅ならではのデザイン・素材・工法の特徴と魅力をPRすること。
「北米スタイル」「欧州テイスト」「輸入素材」等の具体的な特徴と施工技術のこだわりを盛り込むこと。`,

        natural_material: `【自然素材・無垢素材 個別規定】
自然素材・無垢材の美しさと健康への配慮をPRすること。
自然素材等の効果・効用に関わる誇大表現は避けること。「天然素材」「健康素材」という言葉を使用する場合は、必ずその具体的な根拠（ヒノキを100%使用など）を併記すること。`,

        domestic_wood: `【国産材・地元材 個別規定】
国産材・地域材の品質・安全性・地域経済への貢献をPRすること。
「天然素材」「健康素材」という言葉を使用する場合は、必ずその具体的な根拠（ヒノキを100%使用など）を併記すること。`,
      }

      const catLabel       = CATEGORY_LABELS[category]       || 'こだわりの家づくり'
      const catInstruction = CATEGORY_INSTRUCTIONS[category] || ''

      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。会社の「強み・こだわり」を訴求するページのコピーを作成します。

【文体・表記ルール（絶対厳守）】
・文体は一貫して「だ・である」調（常体）、かつ「第三者表記」で統一すること。敬体（です・ます調）・自社目線（「私たちは〜」等）は使用しないこと。

【強み・こだわりページ 文字数ハードリミット（絶対厳守）】
・■ キャッチコピー：1文字以上40文字以内。改行は絶対禁止。文末に句点（。）は絶対に付けないこと。
・■ 本文：1文字以上200文字以内。改行は絶対禁止（すべて1行の連続した文章にすること）。
出力前に必ず自分で文字数を数えて確認し、超えている場合は削って調整してから出力すること。確認作業は出力に含めないこと。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `「${catLabel}」の強みをアピールするページ用の原稿を作成してください。

【出力フォーマット（厳守）】
チェックコメント・文字数報告・注釈・説明文・区切り線は一切出力しないこと。見出しと原稿テキストのみを出力すること。

■ キャッチコピー
（1文字以上40文字以内。改行なし。文末句点なし）

■ 本文
（1文字以上200文字以内。改行なし。1行の連続した文章）

---
【ベースデータ：会社の基本情報・強み（最優先で反映すること）】
${companyContext || '（未設定。カテゴリの特性をもとに作成してください）'}
${additionalInfo ? `\n【最優先アピール内容（ユーザー入力）】\nこの内容を最優先でベース・具体的エピソードとして必ず原稿に盛り込むこと：\n${additionalInfo}` : ''}
---

${catInstruction}

指示：ベースデータの会社の特徴を反映させながら、${catLabel}の魅力を前面に押し出すこと。キャッチ40文字以内・本文200文字以内を厳守。`,
        maxTokens: 600,
      }
    }

    default:
      return {
        system: `あなたは注文住宅会社のウェブサイト専門のプロコピーライターです。

${COMMON_BASE_RULES}${styleBlock}`,
        user: `ウェブサイト用の魅力的な原稿を作成してください。${ctx}${info}`,
        maxTokens: 600,
      }
  }
}

// ── メインPOSTハンドラ ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const tab = formData.get('tab') as string

    const styleSamples = loadStyleSamples()

    // 建築実例タブは専用ハンドラへ
    if (tab === 'construction') {
      return await handleConstruction(formData, styleSamples)
    }

    // ── その他タブの共通処理 ──────────────────────────────────────────
    const additionalInfo = (formData.get('additionalInfo') as string) || ''
    const strengths      = (formData.get('strengths')     as string) || ''
    const homepageText   = (formData.get('homepageText')  as string) || ''
    const features       = (formData.get('features')      as string) || ''
    const companyName    = (formData.get('companyName')   as string) || ''
    const category       = (formData.get('category')      as string) || ''
    const imageFile      = formData.get('image') as File | null

    const companyContext = [
      companyName    && `会社名：${companyName}`,
      strengths      && `強み・アピールポイント：\n${strengths}`,
      homepageText   && `会社紹介文：\n${homepageText}`,
      features       && `取り扱い物件の特徴：\n${features}`,
    ].filter(Boolean).join('\n\n')

    const { system, user: userText, maxTokens } = buildPrompt(tab, companyContext, additionalInfo, styleSamples, category)

    const contentBlocks: Anthropic.ContentBlockParam[] = []

    if (imageFile && imageFile.size > 0) {
      const base64 = Buffer.from(await imageFile.arrayBuffer()).toString('base64')
      const mediaType = (imageFile.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } })
    }

    contentBlocks.push({ type: 'text', text: userText })

    const response = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: contentBlocks }],
    }).finalMessage()

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: '原稿の生成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ manuscript: textBlock.text.trim() })
  } catch (error) {
    console.error('Generate API error:', error)
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'APIキーが無効です。.env.local の ANTHROPIC_API_KEY を確認してください。' }, { status: 401 })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'APIの利用制限に達しました。しばらく待ってから再試行してください。' }, { status: 429 })
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI生成エラー: ${error.message}` }, { status: error.status || 500 })
    }
    return NextResponse.json({ error: '予期せぬエラーが発生しました。もう一度お試しください。' }, { status: 500 })
  }
}
