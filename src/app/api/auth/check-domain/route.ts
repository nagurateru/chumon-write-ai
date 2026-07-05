import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * ホームページURL重複チェック API
 * - マスターキードメインはホワイトリストで複数登録を許可（バックエンドのみ保持）
 * - それ以外は DB のユニーク制約と RPC で重複を検証
 */

// 運営が個別発行する特例ドメイン（ホームページなしの会社向け）
const MASTER_KEY_DOMAINS = new Set([
  'no-hp.example.com',
])

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function extractDomain(url: string): string | null {
  try {
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    const { hostname } = new URL(normalized)
    return hostname.toLowerCase() || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get('url') ?? ''
  const domain = extractDomain(rawUrl)

  if (!domain) {
    return NextResponse.json({ available: false, error: '有効なURLを入力してください（例: https://www.example.co.jp）' })
  }

  // マスターキードメインは重複チェックをスキップ
  if (MASTER_KEY_DOMAINS.has(domain)) {
    return NextResponse.json({ available: true, domain })
  }

  const { data, error } = await supabase.rpc('is_domain_available', { input_domain: domain })

  if (error) {
    console.error('is_domain_available RPC error:', error)
    return NextResponse.json({ available: false, error: 'サーバーエラーが発生しました' })
  }

  return NextResponse.json({ available: data as boolean, domain })
}
