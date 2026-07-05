'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function extractDomain(url: string): string | null {
  try {
    const normalized = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    const { hostname } = new URL(normalized)
    return hostname.toLowerCase() || null
  } catch {
    return null
  }
}

export default function RegisterPage() {
  const [companyName,     setCompanyName]     = useState('')
  const [email,           setEmail]           = useState('')
  const [homepageUrl,     setHomepageUrl]     = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState(false)
  const router  = useRouter()
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }

    const domain = extractDomain(homepageUrl)
    if (!domain) {
      setError('ホームページURLが正しくありません。https:// から始まるURLを入力してください。')
      return
    }

    setLoading(true)

    try {
      const checkRes = await fetch(`/api/auth/check-domain?url=${encodeURIComponent(homepageUrl)}`)
      const checkData = await checkRes.json()

      if (checkData.error && !checkData.available) {
        setError(checkData.error)
        setLoading(false)
        return
      }

      if (!checkData.available) {
        setError('このホームページURLは既に登録されています。既存のアカウントでログインするか、管理者にお問い合わせください。')
        setLoading(false)
        return
      }
    } catch {
      setError('通信エラーが発生しました。しばらくしてからお試しください。')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName },
      },
    })

    if (signUpError) {
      setError('登録に失敗しました。別のメールアドレスをお試しください。')
      setLoading(false)
      return
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('company_profiles').insert({
        user_id:         data.user.id,
        company_name:    companyName,
        homepage_url:    homepageUrl.trim(),
        homepage_domain: domain,
        strengths:       '',
        homepage_text:   '',
        features:        '',
        custom_prompt:   '',
      })

      if (profileError) {
        if (profileError.code === '23505') {
          setError('このホームページURLは既に登録されています。既存のアカウントでログインするか、管理者にお問い合わせください。')
        } else {
          setError('プロフィールの作成に失敗しました。管理者にお問い合わせください。')
        }
        setLoading(false)
        return
      }
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 3000)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suumo-green-light to-white">
        <div className="card text-center max-w-md w-full shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">登録が完了しました！</h2>
          <p className="text-gray-600 text-sm">
            確認メールをお送りしました。<br />
            メールの認証後、ログインしてください。<br />
            <span className="text-gray-400">（3秒後にログイン画面へ移動します）</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suumo-green-light to-white py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[120px] h-[120px] mb-4">
            <img
              src="/logo.png"
              alt="注文住宅Write.ai"
              className="w-full h-full object-contain"
              onError={e => { e.currentTarget.style.display = 'none' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">新規アカウント登録</h1>
          <p className="text-gray-500 mt-1 text-sm">法人アカウントを作成します</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="label">会社名</label>
              <input
                type="text"
                className="input-field"
                placeholder="○○工務店"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
              <p className="text-xs mt-1.5 text-red-400 font-medium">
                ※株式会社や（株）は不要です
              </p>
            </div>

            <div>
              <label className="label">会社ドメインのメールアドレス</label>
              <input
                type="email"
                className="input-field"
                placeholder="company@your-domain.co.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">
                ホームページURL
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="url"
                className="input-field"
                placeholder="https://www.example.co.jp"
                value={homepageUrl}
                onChange={(e) => setHomepageUrl(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                ※ 自社のトップページURLを入力してください。
                ポータルサイト（SUUMO・HOME'S 等）のURLは無効です。
              </p>
              <p className="text-xs text-gray-500 mt-1.5">
                ホームページがない場合は、
                <Link
                  href="/signup-contact"
                  className="text-suumo-green underline hover:opacity-80"
                >
                  お問い合わせはこちら
                </Link>
                {' '}からご連絡ください。確認後、登録用URLを発行いたします。
              </p>
            </div>

            <div>
              <label className="label">パスワード</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="label">パスワード（確認）</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 text-base"
              disabled={loading}
            >
              {loading ? '確認中...' : 'アカウントを作成'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-suumo-green font-semibold hover:underline">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
