import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const maxDuration = 60

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 55000,
})

interface TitleBody {
  title: string
  body:  string
}

function loadFile(name: string): string {
  try {
    return readFileSync(join(process.cwd(), name), 'utf-8').trim()
  } catch {
    return ''
  }
}

function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim()
  const m = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  try {
    return JSON.parse(m ? m[1].trim() : trimmed)
  } catch {
    // last-resort: extract first {...} or [...] block
    const obj = trimmed.match(/\{[\s\S]*\}/)
    if (obj) return JSON.parse(obj[0])
    throw new Error('JSON parse failed')
  }
}

// ── 全タブ共通ベースルール（generate/route.ts と同一）────────────────────
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

// ── メイン POST ハンドラ ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, companyContext, featureText, scheduleText, reviewText, imageFilenames, patternImageFilenames } = body as {
      type:                   'basic' | 'patterns' | 'reviews'
      companyContext?:        string
      featureText?:           string
      scheduleText?:          string
      reviewText?:            string
      imageFilenames?:        string[]
      patternImageFilenames?: string[]
    }

    const styleSamples = loadFile('style_samples.txt')
    const styleBlock   = styleSamples ? `\n\n【文体参考】\n---\n${styleSamples}\n---` : ''
    const companyBlock = companyContext ? `\n\n【会社情報】\n${companyContext}` : ''

    if (type === 'basic') {
      return await generateBasic({ companyBlock, featureText: featureText ?? '', imageFilenames: imageFilenames ?? [], styleBlock })
    }
    if (type === 'patterns') {
      return await generatePatterns({ companyBlock, scheduleText: scheduleText ?? '', patternImageFilenames: patternImageFilenames ?? [], styleBlock })
    }
    if (type === 'reviews') {
      return await generateReviews({ companyBlock, reviewText: reviewText ?? '', styleBlock })
    }
    return NextResponse.json({ error: '不正なリクエストタイプです' }, { status: 400 })
  } catch (e: unknown) {
    console.error('mh-report error:', e)
    return NextResponse.json({ error: '生成中にエラーが発生しました' }, { status: 500 })
  }
}

// ── ② 基本情報生成 ──────────────────────────────────────────────────────
async function generateBasic({ companyBlock, featureText, imageFilenames, styleBlock }: {
  companyBlock:   string
  featureText:    string
  imageFilenames: string[]
  styleBlock:     string
}): Promise<NextResponse> {
  const filesBlock   = imageFilenames.length > 0
    ? `\n【アップロード画像ファイル名一覧】\n${imageFilenames.map((n, i) => `写真${i + 1}：${n}`).join('\n')}`
    : ''
  const featureBlock = featureText.trim()
    ? `\n【モデルハウスの特徴・アピールポイント】\n${featureText}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用モデルハウス紹介原稿の専門コピーライターです。

【文体ルール（絶対厳守）】
・「だ・である」調（常体）かつ第三者表記（会社名・物件名を主語とした客観的表現）で出力すること。
・「です・ます」調（敬体）は絶対に禁止。

【基本情報 文字数ハードリミット（絶対厳守）】
・モデルハウス名：全角50文字以内。
・キャッチ：全角40文字以内。改行および文末句点「。」は絶対に禁止。
・本文キャッチ：全角40文字以内。改行および文末句点「。」は絶対に禁止。
・本文：全角400文字以内。文章の途中での改行は絶対に禁止（1行の連続した文章にすること）。

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"name":"モデルハウス名（50文字以内）","catch":"キャッチ（40文字以内・改行なし・文末句点なし）","bodyCatch":"本文キャッチ（40文字以内・改行なし・文末句点なし）","body":"本文（400文字以内・改行なし・1行連続）"}

${COMMON_BASE_RULES}${styleBlock}`

  const userPrompt = `モデルハウスの基本情報原稿を生成してください。${companyBlock}${filesBlock}${featureBlock}

上記の情報をもとに、SUUMO掲載用モデルハウス名・キャッチ・本文キャッチ・本文をJSON形式で出力してください。`

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 900,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw  = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const json = parseModelJson(raw) as Record<string, string>

  return NextResponse.json({
    name:      json.name      ?? '',
    catch:     json.catch     ?? '',
    bodyCatch: json.bodyCatch ?? '',
    body:      json.body      ?? '',
  })
}

// ── ③ 見どころ4パターン生成 ─────────────────────────────────────────────
async function generatePatterns({ companyBlock, scheduleText, patternImageFilenames, styleBlock }: {
  companyBlock:          string
  scheduleText:          string
  patternImageFilenames: string[]
  styleBlock:            string
}): Promise<NextResponse> {
  const fewshotData  = loadFile('mh_fewshot.txt')
  const fewshotBlock = fewshotData ? `\n\n【他社事例（Few-Shot参考）】\n---\n${fewshotData}\n---` : ''
  const filesBlock   = patternImageFilenames.length > 0
    ? `\n【見どころ画像ファイル名】\n${patternImageFilenames.map((n, i) => `画像${i + 1}：${n}`).join('\n')}`
    : ''
  const scheduleBlock = scheduleText.trim()
    ? `\n【当日の流れ・みどころ情報】\n${scheduleText}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用モデルハウスの見どころ・特徴ページの専門コピーライターです。

【文体ルール（絶対厳守）】
・「だ・である」調（常体）かつ第三者表記で出力すること。
・「です・ます」調（敬体）は絶対に禁止。

【見どころページ 文字数ハードリミット（絶対厳守）】
・タイトル：各50文字以内。
・本文：各150文字以内。改行は絶対に禁止（すべて1行の連続した文章にすること）。

【バリエーション要件（必須）】
4つのパターンはそれぞれ異なるトーン＆マナーで作成すること。
パターン1：機能・仕様の訴求（性能・スペック視点）
パターン2：感情・体験の訴求（感動・驚き視点）
パターン3：ライフスタイルの訴求（暮らし・日常シーン視点）
パターン4：家族・人物の訴求（家族構成・具体的シーン視点）

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"patterns":[{"title":"パターン1タイトル（50文字以内）","body":"パターン1本文（150文字以内・改行なし）"},{"title":"パターン2タイトル","body":"パターン2本文"},{"title":"パターン3タイトル","body":"パターン3本文"},{"title":"パターン4タイトル","body":"パターン4本文"}]}

${COMMON_BASE_RULES}${fewshotBlock}${styleBlock}`

  const userPrompt = `当日の流れ・みどころを4パターンのバリエーションで生成してください。${companyBlock}${filesBlock}${scheduleBlock}

トーン＆マナーを変えた4つのバリエーションをJSON形式で出力してください。`

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1800,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw  = msg.content[0].type === 'text' ? msg.content[0].text : '{"patterns":[]}'
  const json = parseModelJson(raw) as { patterns: TitleBody[] }

  return NextResponse.json({ patterns: json.patterns ?? [] })
}

// ── ⑤ 見学者感想5個生成 ────────────────────────────────────────────────
async function generateReviews({ companyBlock, reviewText, styleBlock }: {
  companyBlock: string
  reviewText:   string
  styleBlock:   string
}): Promise<NextResponse> {
  const reviewBlock = reviewText.trim()
    ? `\n【参加者の感想・生の声（参考）】\n${reviewText}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用モデルハウスの見学者感想を生成する専門コピーライターです。

【文体ルール（絶対厳守）】
・「だ・である」調（常体）かつ第三者表記で出力すること。
・「です・ます」調（敬体）は絶対に禁止。

【感想 文字数ハードリミット（絶対厳守）】
・タイトル：各50文字以内。
・本文：各150文字以内。改行は絶対に禁止（すべて1行の連続した文章にすること）。

【バリエーション要件（必須）】
5つの感想は属性・視点・シーンを変えてバリエーション豊かに作成すること。
感想1：20〜30代夫婦（子育て世代）視点
感想2：育ち盛りの子供がいる家族視点
感想3：40〜50代・建て替え検討者視点
感想4：収納・家事動線重視の主婦視点
感想5：定年後・ゆったり暮らしを検討するシニア視点

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"reviews":[{"title":"感想1タイトル（50文字以内）","body":"感想1本文（150文字以内・改行なし）"},{"title":"感想2タイトル","body":"感想2本文"},{"title":"感想3タイトル","body":"感想3本文"},{"title":"感想4タイトル","body":"感想4本文"},{"title":"感想5タイトル","body":"感想5本文"}]}

${COMMON_BASE_RULES}${styleBlock}`

  const userPrompt = `モデルハウス見学者の感想を5個生成してください。${companyBlock}${reviewBlock}

リアルな見学者の声として、バリエーション豊かな5つの感想セットをJSON形式で出力してください。`

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 1800,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw  = msg.content[0].type === 'text' ? msg.content[0].text : '{"reviews":[]}'
  const json = parseModelJson(raw) as { reviews: TitleBody[] }

  return NextResponse.json({ reviews: json.reviews ?? [] })
}
