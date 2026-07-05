import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

function extractText(html: string): string {
  // スクリプト・スタイル・コメントを除去
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')

  // main / article タグが存在すればその中身に絞る
  const mainMatch = text.match(/<(?:main|article)[^>]*>([\s\S]*?)<\/(?:main|article)>/i)
  if (mainMatch) text = mainMatch[1]

  // 意味のあるタグからテキストを抽出
  const lines: string[] = []
  const tagRe = /<(h[1-6]|p|li|td|th|figcaption|dt|dd)[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(text)) !== null) {
    const content = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (content.length > 8) lines.push(content)
  }

  if (lines.length > 0) {
    return lines.join('\n').slice(0, 6000)
  }

  // フォールバック：全タグを除去
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000)
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

    const body = await req.json()
    const rawUrls: unknown[] = Array.isArray(body?.urls) ? body.urls : []
    const urls = rawUrls
      .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
      .slice(0, 5)

    if (urls.length === 0) {
      return NextResponse.json({ error: '有効なURLがありません（http または https で始まるURLを入力してください）' }, { status: 400 })
    }

    const results: { url: string; text: string; error?: string }[] = []

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
          },
          signal: AbortSignal.timeout(12000),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const contentType = res.headers.get('content-type') || ''
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
          throw new Error('HTMLページではありません')
        }

        const html = await res.text()
        const extracted = extractText(html)
        if (!extracted) throw new Error('テキストを取得できませんでした')

        results.push({ url, text: extracted })
      } catch (e) {
        results.push({ url, text: '', error: e instanceof Error ? e.message : 'エラー' })
      }
    }

    const successful = results.filter((r) => r.text)
    const failed = results.filter((r) => !r.text)

    const combinedText = successful
      .map((r) => {
        const domain = new URL(r.url).hostname
        return `▼ ${domain} より取得\n${r.text}`
      })
      .join('\n\n---\n\n')

    return NextResponse.json({
      text: combinedText,
      successCount: successful.length,
      failedUrls: failed.map((r) => ({ url: r.url, error: r.error })),
    })
  } catch (error) {
    console.error('Scrape API error:', error)
    return NextResponse.json({ error: 'スクレイピング処理中にエラーが発生しました' }, { status: 500 })
  }
}
