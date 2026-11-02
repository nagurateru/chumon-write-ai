import { NextRequest, NextResponse } from 'next/server'

// Railway の Hobby プランは SMTP が使えないため、Resend の HTTP API で送信する
const CONTACT_TO   = process.env.CONTACT_EMAIL || 'teru.nagura@gmail.com'
// 独自ドメイン未認証の Resend では送信元は onboarding@resend.dev 固定
const CONTACT_FROM = process.env.CONTACT_FROM  || '注文住宅Write.ai お問い合わせ <onboarding@resend.dev>'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function POST(req: NextRequest) {
  try {
    const { companyName, name, email, phone, message } = await req.json()

    if (!companyName || !name || !email || !message) {
      return NextResponse.json({ error: '必須項目が入力されていません' }, { status: 400 })
    }

    const h = (v: string) => escapeHtml(String(v))
    const mail = {
      from:     CONTACT_FROM,
      to:       [CONTACT_TO],
      reply_to: email,
      subject:  `【お問い合わせ】${companyName} / ${name}`,
      text: `
お問い合わせが届きました。

【社名】${companyName}
【名前】${name}
【メールアドレス】${email}
【電話番号】${phone || '未記入'}

【問い合わせ内容】
${message}
      `.trim(),
      html: `
<h2>お問い合わせが届きました</h2>
<table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
  <tr><th style="background:#f5f5f5;">社名</th><td>${h(companyName)}</td></tr>
  <tr><th style="background:#f5f5f5;">名前</th><td>${h(name)}</td></tr>
  <tr><th style="background:#f5f5f5;">メールアドレス</th><td>${h(email)}</td></tr>
  <tr><th style="background:#f5f5f5;">電話番号</th><td>${h(phone || '未記入')}</td></tr>
</table>
<h3>問い合わせ内容</h3>
<pre style="background:#f9f9f9;padding:16px;border-radius:8px;">${h(message)}</pre>
      `,
    }

    if (!process.env.RESEND_API_KEY) {
      // 開発環境ではログ出力のみ。本番で未設定なら送信失敗として扱う（届かないのに成功表示にしない）
      console.log('[CONTACT FORM]', mail)
      if (process.env.NODE_ENV === 'production') {
        console.error('RESEND_API_KEY is not set')
        return NextResponse.json({ error: '送信中にエラーが発生しました' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body:   JSON.stringify(mail),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text())
      return NextResponse.json({ error: '送信中にエラーが発生しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: '送信中にエラーが発生しました' }, { status: 500 })
  }
}
