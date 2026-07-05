'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suumo-green-light to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-[120px] h-[120px] mb-4">
            <img
              src="/logo.png"
              alt="注文住宅ライトAI"
              className="w-full h-full object-contain"
              onError={e => {
                const t = e.currentTarget
                t.style.display = 'none'
                t.nextElementSibling?.classList.remove('hidden')
              }}
            />
            <div className="hidden w-[120px] h-[120px] bg-suumo-green rounded-2xl shadow-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">W.ai</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">注文住宅ライトAI</h1>
          <p className="text-gray-500 mt-1 text-sm">ログインしてください</p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="label">メールアドレス</label>
              <input
                type="email"
                className="input-field"
                placeholder="company@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
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
                autoComplete="current-password"
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
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link href="/register" className="text-suumo-green font-semibold hover:underline">
                新規登録
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
