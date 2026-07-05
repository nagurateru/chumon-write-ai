'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SignupContactPage() {
  const [companyName, setCompanyName] = useState('')
  const [name,        setName]        = useState('')
  const [email,       setEmail]       = useState('')
  const [phone,       setPhone]       = useState('')
  const [message,     setMessage]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [error,       setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ companyName, name, email, phone, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '送信に失敗しました')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信中にエラーが発生しました')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suumo-green-light to-white p-4">
        <div className="card text-center max-w-md w-full shadow-lg">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">お問い合わせを受け付けました</h2>
          <p className="text-gray-600 text-sm mb-6">
            内容を確認後、担当者よりご連絡いたします。<br />
            しばらくお待ちください。
          </p>
          <Link href="/register" className="btn-primary inline-block">
            登録ページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-suumo-green-light to-white py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">お問い合わせ</h1>
          <p className="text-gray-500 mt-2 text-sm">
            登録用URLの発行など、ご不明な点はこちらよりお問い合わせください。
          </p>
        </div>

        <div className="card shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">社名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="○○工務店"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">名前 <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="山田 太郎"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">メールアドレス <span className="text-red-500">*</span></label>
              <input
                type="email"
                className="input-field"
                placeholder="contact@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">電話番号</label>
              <input
                type="tel"
                className="input-field"
                placeholder="03-0000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="label">問い合わせ内容 <span className="text-red-500">*</span></label>
              <textarea
                className="input-field resize-none"
                rows={6}
                placeholder="ご質問・ご要望をご記入ください"
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
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
              disabled={submitting}
            >
              {submitting ? '送信中...' : '送信する'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <Link href="/register" className="text-sm text-suumo-green hover:underline">
              ← 登録ページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
