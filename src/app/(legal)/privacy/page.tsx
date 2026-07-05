export const metadata = { title: 'プライバシーポリシー | 注文住宅ライトAI' }

export default function PrivacyPage() {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-10">
      <header>
        <p className="text-xs text-gray-400 mb-2">最終更新日：2025年6月1日</p>
        <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          中山涼真（以下「運営者」）は、注文住宅ライトAI（以下「本サービス」）において取得する個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
        </p>
      </header>

      <Section title="1. 取得する情報">
        <p>本サービスでは、以下の情報を取得することがあります。</p>
        <table className="mt-3 w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold w-1/3">情報の種類</th>
              <th className="text-left p-3 border border-gray-200 font-semibold">取得方法</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['メールアドレス', '利用登録時にご入力いただきます'],
              ['パスワード（ハッシュ化）', '利用登録時にご設定いただきます（平文では保存しません）'],
              ['クレジットカード情報', '決済代行サービス Stripe に直接送信されます。運営者のサーバーには一切保存されません'],
              ['アップロードされた画像', 'AI原稿生成のために一時的に処理します。永続的な保存は行いません'],
              ['利用ログ・操作履歴', 'サービス改善および不正利用防止のために自動的に記録されます'],
            ].map(([type, method]) => (
              <tr key={type} className="even:bg-gray-50/50">
                <td className="p-3 border border-gray-200 font-medium text-gray-700">{type}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{method}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-gray-400">※ クレジットカード情報はPCI DSS準拠のStripe社が管理します。詳細は<a href="https://stripe.com/jp/privacy" target="_blank" rel="noopener noreferrer" className="text-suumo-green hover:underline">Stripeプライバシーポリシー</a>をご確認ください。</p>
      </Section>

      <Section title="2. 利用目的">
        <p>取得した個人情報は、以下の目的にのみ使用します。</p>
        <ol className="list-decimal list-inside space-y-1.5 mt-2">
          <li>本サービスのアカウント管理・認証</li>
          <li>有料プランの決済処理・サブスクリプション管理</li>
          <li>サービスに関するお問い合わせへの対応・サポート</li>
          <li>不正アクセス・不正利用の検知および防止</li>
          <li>本サービスの機能改善・品質向上のための統計的分析</li>
          <li>利用規約違反等への対応</li>
        </ol>
        <p className="mt-3">上記の目的以外に個人情報を使用することは一切ありません。</p>
      </Section>

      <Section title="3. 第三者提供">
        <p>運営者は、以下の場合を除き、利用者の個人情報を第三者に提供しません。</p>
        <ul className="list-disc list-inside space-y-1.5 mt-2">
          <li>利用者本人の同意がある場合</li>
          <li>法令に基づき、裁判所・警察・行政機関等から開示を求められた場合</li>
          <li>人の生命・身体・財産の保護のために必要な場合</li>
        </ul>
        <p className="mt-3">なお、決済処理のために Stripe, Inc. に必要な情報を提供します。これは本サービスの提供に不可欠なものであり、利用者の同意を取得した上での委託に該当します。</p>
      </Section>

      <Section title="4. 安全管理措置">
        <p>運営者は、個人情報の漏えい・滅失・毀損の防止その他安全管理のため、以下の措置を講じています。</p>
        <ul className="list-disc list-inside space-y-1.5 mt-2">
          <li>通信の暗号化（SSL/HTTPS）</li>
          <li>パスワードのハッシュ化（平文保存なし）</li>
          <li>行レベルセキュリティ（RLS）による個人データの分離管理</li>
          <li>アクセス権限の最小化</li>
        </ul>
      </Section>

      <Section title="5. Cookieの使用">
        <p>本サービスでは、ログイン状態の維持および利便性向上のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、一部機能が正常に動作しない場合があります。</p>
      </Section>

      <Section title="6. 個人情報の保存期間">
        <p>取得した個人情報は、利用者がアカウントを削除するまで、または法令上の保存義務期間中保持します。アカウント削除のリクエストは、下記窓口メールアドレスまでご連絡ください。</p>
      </Section>

      <Section title="7. 開示・訂正・削除">
        <p>利用者は自身の個人情報について、開示・訂正・利用停止・削除を請求する権利を有します。ご希望の方は下記窓口までメールにてご連絡ください。本人確認を行った上で、合理的な期間内に対応いたします。</p>
      </Section>

      <Section title="8. 未成年者について">
        <p>本サービスは、18歳未満の方のご利用を想定しておりません。18歳未満の方が個人情報を提供しようとしていることが判明した場合、その情報を削除するための合理的な措置を講じます。</p>
      </Section>

      <Section title="9. プライバシーポリシーの変更">
        <p>本ポリシーは、必要に応じて改定することがあります。重要な変更がある場合は、本サービス上でのお知らせ等によりご連絡いたします。</p>
      </Section>

      <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
        <p className="font-medium mb-1">個人情報に関するお問い合わせ窓口</p>
        <p>運営者：中山涼真</p>
        <p>メール：<a href="mailto:chumon.write.ai@gmail.com" className="text-suumo-green hover:underline">chumon.write.ai@gmail.com</a></p>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-gray-800 border-l-4 border-suumo-green pl-3">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2 pl-1">{children}</div>
    </section>
  )
}
