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
    const obj = trimmed.match(/\{[\s\S]*\}/)
    if (obj) return JSON.parse(obj[0])
    throw new Error('JSON parse failed')
  }
}

// ── 全タブ共通ベースルール ──────────────────────────────────────────────────
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
⚡「完全」「完璧」「絶対」「万全」「確実に・必ず」（合理的根拠があれば可）
◯「安心」「安全」「完備」（提示対象に対して100%の場合）

C-3. 最上級・他社優位を意味する表現
× 「一流」（客観的根拠なし）
⚠️「日本一」「業界一」「NO.1」「最大規模」「唯一」「オンリーワン」（調査データの出典明記が必須）
⚠️「最高・最◯」「究極の」「世界水準」（根拠となる事実の併記が必須）
⚡「パイオニア」「大手」「屈指の」「高品質」（客観的・具体的事実があれば使用可）

C-4. 比較・価格表現
× 「格安」「特安」「激安」「割安」「掘出し物」「お値打ち」（有利誤認の恐れ）
⚠️「お得」「特別価格」（キャンペーン内容と条件の表記が必須）
◯「お手頃」「リーズナブル」「無料」「0円」「手の届く価格」「良心的な価格」

■ D. 文体・表現スタイルの参考
文体参考サンプルが提供されている場合は、そのトーン・語彙・言い回し・文章のリズムを忠実に模倣すること。
`.trim()

// ── メイン POST ハンドラ ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, eventCategory, freeText, eventBody, companyContext } = body as {
      type:            'basic' | 'spots' | 'reviews'
      eventCategory:   string
      freeText?:       string
      eventBody?:      string
      companyContext?: string
    }

    const styleSamples = loadFile('style_samples.txt')
    const styleBlock   = styleSamples ? `\n\n【文体参考】\n---\n${styleSamples}\n---` : ''
    const companyBlock = companyContext ? `\n\n【会社情報】\n${companyContext}` : ''

    if (type === 'basic') {
      return await generateBasic({ eventCategory, freeText: freeText ?? '', companyBlock, styleBlock })
    }
    if (type === 'spots') {
      return await generateSpots({ eventCategory, eventBody: eventBody ?? '', companyBlock, styleBlock })
    }
    if (type === 'reviews') {
      return await generateReviews({ eventCategory, eventBody: eventBody ?? '', companyBlock, styleBlock })
    }
    return NextResponse.json({ error: '不正なリクエストタイプです' }, { status: 400 })
  } catch (e: unknown) {
    console.error('event-campaign error:', e)
    return NextResponse.json({ error: '生成中にエラーが発生しました' }, { status: 500 })
  }
}

// ── ② 基本情報・参加特典 生成 ─────────────────────────────────────────────
async function generateBasic({ eventCategory, freeText, companyBlock, styleBlock }: {
  eventCategory: string
  freeText:      string
  companyBlock:  string
  styleBlock:    string
}): Promise<NextResponse> {
  // カテゴリ別 → 汎用 の順でfew-shot読込
  const fewshot = loadFile(`event_fewshot_${eventCategory}.txt`) || loadFile('event_fewshot.txt')
  const fewshotBlock = fewshot ? `\n\n【他社事例（Few-Shot参考）】\n---\n${fewshot}\n---` : ''

  const userInputBlock = freeText.trim()
    ? `\n\n【最優先参照：ユーザー入力情報】\n以下のテキストをイベントタイトル・特長・詳細開催内容・参加特典すべての生成ベースとして最優先で組み込み、肉付けして原稿を作成すること：\n${freeText}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用イベント・キャンペーン原稿の専門コピーライターです。

【文体ルール（絶対厳守）】
・必ず「です・ます」調（敬体）で出力すること。「だ・である」調（常体）は絶対に禁止。

【ユーザー入力情報の優先参照ルール（最優先）】
・ユーザーがイベントの具体的な内容やアピールしたいことを入力している場合は、その文章・エピソード・条件を最優先で原稿（タイトル・特長・詳細開催内容・参加特典）のベースとして組み込み、肉付けして原稿を生成すること。
・入力が空白（未入力）の場合は、選択されたイベントジャンルの標準的な他社事例をベースに自動生成すること。

【文字数ハードリミット（絶対厳守）】
・イベントタイトル：全角80文字以内。文末の句点「。」は絶対に禁止。
・イベント特長：全角40文字以内。
・詳細開催内容（本文）：全角650文字以内。文章の途中での改行は絶対に禁止（1行の連続した文章にすること）。
・参加特典（4パターン）：タイトル各50文字以内 / 本文各150文字以内。改行禁止。

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"title":"イベントタイトル（80文字以内・文末句点なし）","feature":"イベント特長（40文字以内）","body":"詳細開催内容（650文字以内・改行なし・1行連続）","bonusPatterns":[{"title":"特典パターン1タイトル（50文字以内）","body":"特典パターン1本文（150文字以内・改行なし）"},{"title":"特典パターン2タイトル","body":"特典パターン2本文"},{"title":"特典パターン3タイトル","body":"特典パターン3本文"},{"title":"特典パターン4タイトル","body":"特典パターン4本文"}]}

${COMMON_BASE_RULES}${fewshotBlock}${styleBlock}`

  const userPrompt = `以下の情報をもとに、SUUMO掲載用イベント・キャンペーンの基本情報原稿を生成してください。

【イベントジャンル】${eventCategory}${userInputBlock}${companyBlock}

イベントタイトル・イベント特長・詳細開催内容・参加特典（4パターン）をJSON形式で出力してください。
参加特典はバリエーション豊かな4つの異なるパターンで生成してください。`

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2000,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw  = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
  const json = parseModelJson(raw) as {
    title:          string
    feature:        string
    body:           string
    bonusPatterns:  TitleBody[]
  }

  return NextResponse.json({
    title:         json.title         ?? '',
    feature:       json.feature       ?? '',
    body:          json.body          ?? '',
    bonusPatterns: json.bonusPatterns ?? [],
  })
}

// ── ③ 当日の流れ・見どころ 生成 ──────────────────────────────────────────
async function generateSpots({ eventCategory, eventBody, companyBlock, styleBlock }: {
  eventCategory: string
  eventBody:     string
  companyBlock:  string
  styleBlock:    string
}): Promise<NextResponse> {
  const bodyBlock = eventBody.trim()
    ? `\n\n【参照：詳細開催内容（本文）】\n${eventBody}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用イベントの「当日の流れ・見どころ」ページの専門コピーライターです。

【文体ルール（絶対厳守）】
・必ず「です・ます」調（敬体）で出力すること。「だ・である」調（常体）は絶対に禁止。

【文字数ハードリミット（絶対厳守）】
・タイトル：各50文字以内。
・本文：各150文字以内。改行は絶対に禁止（すべて1行の連続した文章にすること）。

【生成要件】
・詳細開催内容（本文）の文脈に完全に合致する2つの独立したセットを生成すること。
・セット1とセット2は異なるスポット・シーンを紹介すること（重複禁止）。

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"spots":[{"title":"見どころ1タイトル（50文字以内）","body":"見どころ1本文（150文字以内・改行なし）"},{"title":"見どころ2タイトル","body":"見どころ2本文"}]}

${COMMON_BASE_RULES}${styleBlock}`

  const userPrompt = `以下の情報をもとに、当日の流れ・見どころを2セット生成してください。

【イベントカテゴリ】${eventCategory}${companyBlock}${bodyBlock}

本文の内容・文脈に合致した、異なるシーン・スポットを紹介する2セットをJSON形式で出力してください。`

  const msg = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 700,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userPrompt }],
  })

  const raw  = msg.content[0].type === 'text' ? msg.content[0].text : '{"spots":[]}'
  const json = parseModelJson(raw) as { spots: TitleBody[] }

  return NextResponse.json({ spots: json.spots ?? [] })
}

// ── ④ 参加者の感想 生成 ────────────────────────────────────────────────────
async function generateReviews({ eventCategory, eventBody, companyBlock, styleBlock }: {
  eventCategory: string
  eventBody:     string
  companyBlock:  string
  styleBlock:    string
}): Promise<NextResponse> {
  const bodyBlock = eventBody.trim()
    ? `\n\n【参照：詳細開催内容（本文）】\n${eventBody}`
    : ''

  const systemPrompt = `あなたはSUUMO掲載用イベントの「参加者の感想」ページの専門コピーライターです。

【文体ルール（絶対厳守）】
・必ず「です・ます」調（敬体）で出力すること。「だ・である」調（常体）は絶対に禁止。

【文字数ハードリミット（絶対厳守）】
・タイトル：各50文字以内。
・本文：各150文字以内。改行は絶対に禁止（すべて1行の連続した文章にすること）。

【生成要件】
・イベント内容（見学会・セミナー等）のテーマに合わせたリアルな参加者の声として5つ生成すること。
・各感想は属性・視点・印象を変えてバリエーション豊かに作成すること。
  感想1：20〜30代夫婦（子育て計画中）視点
  感想2：育ち盛りの子供がいる家族視点
  感想3：40〜50代・建て替え検討者視点
  感想4：家事効率・収納重視の主婦視点
  感想5：定年後の住み替えを検討するシニア視点

【出力形式（厳守）】
純粋なJSONのみを返すこと。マークダウンのコードブロックや説明文は一切付けないこと。

{"reviews":[{"title":"感想1タイトル（50文字以内）","body":"感想1本文（150文字以内・改行なし）"},{"title":"感想2タイトル","body":"感想2本文"},{"title":"感想3タイトル","body":"感想3本文"},{"title":"感想4タイトル","body":"感想4本文"},{"title":"感想5タイトル","body":"感想5本文"}]}

${COMMON_BASE_RULES}${styleBlock}`

  const userPrompt = `以下の情報をもとに、イベント参加者の感想を5個生成してください。

【イベントカテゴリ】${eventCategory}${companyBlock}${bodyBlock}

リアルで多様な属性の参加者の声として、5つの感想セットをJSON形式で出力してください。`

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
