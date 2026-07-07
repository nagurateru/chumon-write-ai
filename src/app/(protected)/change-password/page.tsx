'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で設定してください')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('パスワードの更新に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  return (
    <div className="max-w-md mx-auto mt-12 px-4">
      <div className="card shadow-lg">
        <h1 className="text-xl font-bold text-gray-900 mb-6">パスワードを変更</h1>

        {done ? (
          <p className="text-green-600 text-center">パスワードを更新しました。ダッシュボードへ移動します...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">新しいパスワード</label>
              <input
                type="password"
                className="input-field"
                placeholder="8文字以上"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">パスワード（確認）</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
            <button
              type="button"
              className="w-full py-3 text-sm text-gray-500 hover:text-gray-700"
              onClick={() => router.push('/dashboard')}
            >
              キャンセル
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
