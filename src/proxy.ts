import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 認証なしでアクセスできるパス
const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/signup-contact',
  '/terms',
  '/privacy',
  '/commercial-transaction',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api/ は認証チェック・リダイレクト一切なし（Stripe Webhook を含む）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === 'your_supabase_project_url_here' ||
    !supabaseUrl.startsWith('http')
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 未ログイン かつ 非公開ページ → ログイン画面へ
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ログイン済みでログイン・登録画面にアクセスした場合 → ダッシュボードへ
  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * /api/ と Next.js の静的アセットを除外したすべてのパスにマッチ。
     * /api/ を除外することで /api/stripe/webhook は完全にスキップされる。
     */
    '/((?!api/|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
