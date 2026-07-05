import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const { companyName, name, email, phone, message } = await req.json()

    if (!companyName || !name || !email || !message) {
      return NextResponse.json({ error: '必須項目が入力されていません' }, { status: 400 })
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
      port:   Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || process.env.CONTACT_EMAIL || 'chumon.write.ai@gmail.com',
        pass: process.env.SMTP_PASS,
      },
    })

    const mailOptions = {
      from:    `"注文住宅Write.ai お問い合わせ" <${process.env.SMTP_USER || 'chumon.write.ai@gmail.com'}>`,
      to:      'chumon.write.ai@gmail.com',
      subject: `【お問い合わせ】${companyName} / ${name}`,
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
  <tr><th style="background:#f5f5f5;">社名</th><td>${companyName}</td></tr>
  <tr><th style="background:#f5f5f5;">名前</th><td>${name}</td></tr>
  <tr><th style="background:#f5f5f5;">メールアドレス</th><td>${email}</td></tr>
  <tr><th style="background:#f5f5f5;">電話番号</th><td>${phone || '未記入'}</td></tr>
</table>
<h3>問い合わせ内容</h3>
<pre style="background:#f9f9f9;padding:16px;border-radius:8px;">${message}</pre>
      `,
    }

    if (process.env.SMTP_PASS) {
      await transporter.sendMail(mailOptions)
    } else {
      // SMTP 未設定時はログ出力（本番環境では SMTP_PASS を設定してください）
      console.log('[CONTACT FORM]', mailOptions)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Contact form error:', err)
    return NextResponse.json({ error: '送信中にエラーが発生しました' }, { status: 500 })
  }
}
