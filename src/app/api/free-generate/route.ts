import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 55000,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const instruction    = (formData.get('instruction')    as string) || ''
    const rules          = (formData.get('rules')          as string) || ''
    const contents       = (formData.get('contents')       as string) || ''
    const charLimit      = Number(formData.get('charLimit') || 400)
    const tone           = (formData.get('tone')           as string) || 'desu'
    const perspective    = (formData.get('perspective')    as string) || 'third'
    const companyContext = (formData.get('companyContext') as string) || ''
    const imageFile      = formData.get('image') as File | null

    const toneLabel = tone === 'desu' ? '「です・ます」調（敬体）' : '「だ・である」調（常体）'
    const perspLabel = perspective === 'third'
      ? '第三者表記（客観的なライター・第三者視点で記述。「私たち」「弊社」等の自社表現は禁止）'
      : '自社表記（「私たち」「弊社」等の一人称で記述）'

    const companyBlock = companyContext
      ? `\n\n【会社情報（必ず原稿に自然に盛り込むこと）】\n${companyContext}`
      : ''

    const instructionBlock = instruction.trim()
      ? `\n\n【AIへの指示】\n${instruction}`
      : ''

    const rulesBlock = rules.trim()
      ? `\n\n【制限・ルール（厳守）】\n${rules}`
      : ''

    const contentsBlock = contents.trim()
      ? `\n\n【盛り込んでほしい内容】\n${contents}`
      : ''

    const promptText = `以下の指示に従って原稿を生成してください。${companyBlock}${instructionBlock}${rulesBlock}${contentsBlock}

【文体ルール（絶対厳守）】
・口調：${toneLabel}で統一すること。
・表記視点：${perspLabel}
・指定された文字数（${charLimit}文字以内）を厳守すること。出力前に文字数を確認し、超えていれば削ること。
・確認作業・文字数報告・コメントは出力に含めないこと。原稿テキストのみを出力すること。`

    const contentBlocks: Anthropic.ContentBlockParam[] = []

    if (imageFile && imageFile.size > 0) {
      const base64 = Buffer.from(await imageFile.arrayBuffer()).toString('base64')
      const mt = (imageFile.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      contentBlocks.push({ type: 'image', source: { type: 'base64', media_type: mt, data: base64 } })
      contentBlocks.push({ type: 'text', text: `[添付画像: ${imageFile.name}]\n` })
    }

    contentBlocks.push({ type: 'text', text: promptText })

    const response = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `あなたはプロのコピーライターです。ユーザーの指示に従い、指定の文体・表記視点・文字数で原稿を生成します。
原稿テキストのみを出力し、説明・コメント・文字数確認は一切出力しません。`,
      messages: [{ role: 'user', content: contentBlocks }],
    })

    const text = response.content.find(b => b.type === 'text')
    return NextResponse.json({ manuscript: text?.type === 'text' ? text.text.trim() : '' })
  } catch (err) {
    console.error('free-generate error:', err)
    return NextResponse.json({ error: '生成中にエラーが発生しました' }, { status: 500 })
  }
}
