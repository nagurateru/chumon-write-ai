export const metadata = { title: 'プライバシーポリシー | 注文住宅ライトAI' }

const COLLECTED: [string, string][] = [
  ['メールアドレス', '利用登録時にご入力いただきます（ログインおよび運営者からのご連絡に使用します）'],
  ['パスワード', '利用登録時にご設定いただきます（ハッシュ化して保存し、平文では保存しません）'],
  ['会社情報', '社名、ホームページURL、会社の強み・特徴等、利用者が登録・入力した事業者に関する情報'],
  ['原稿生成時の入力情報・生成履歴', '補足情報等の入力内容および生成された原稿'],
  ['アップロードされた画像', '原稿生成のためにAIサービス事業者へ送信して処理します。運営者のデータベースには保存しません'],
  ['お問い合わせ情報', 'お問い合わせフォームにご入力いただいた社名、お名前、メールアドレス、電話番号、お問い合わせ内容'],
  ['利用ログ', '生成回数、アクセス日時等。利用上限の管理、サービス改善および不正利用防止のために記録します'],
]

const PROCESSORS: [string, string, string][] = [
  ['Anthropic, PBC', 'AIによる原稿生成処理', '米国'],
  ['Supabase, Inc.', 'データベース・認証基盤', '米国（データ保存先は同社のクラウド基盤）'],
  ['Railway Corporation', 'アプリケーションのホスティング', '米国'],
  ['Resend, Inc.', 'お問い合わせメールの送信', '米国'],
]

export default function PrivacyPage() {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-10">
      <header>
        <p className="text-xs text-gray-400 mb-2">制定日：2025年6月1日 ／ 最終改定日：2026年11月2日</p>
        <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          中山涼真（以下「運営者」）は、注文住宅ライトAI（以下「本サービス」）において取得する情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」）を定めます。利用者は、本サービスへの利用登録を行った時点で、本ポリシーに同意したものとみなします。
        </p>
      </header>

      <Section title="1. 基本方針">
        <p>本サービスは工務店・住宅事業者向けのサービスであり、原稿生成にあたり個人情報を必要としません。運営者が取得する情報は、主に事業者に関する情報およびサービスの利用に必要な最小限の情報に限ります。</p>
        <p>ただし、メールアドレスやお問い合わせ時のお名前等は、個人情報の保護に関する法律上の個人情報に該当する場合があるため、本ポリシーに従い適切に取り扱います。</p>
        <p>利用者は、原稿生成の入力欄に施主・顧客その他第三者の氏名、住所、電話番号等の個人情報を入力しないでください。</p>
      </Section>

      <Section title="2. 取得する情報">
        <p>本サービスでは、以下の情報を取得します。クレジットカード情報その他の決済情報は取得しません。</p>
        <table className="mt-3 w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold w-1/3">情報の種類</th>
              <th className="text-left p-3 border border-gray-200 font-semibold">内容・取得方法</th>
            </tr>
          </thead>
          <tbody>
            {COLLECTED.map(([type, method]) => (
              <tr key={type} className="even:bg-gray-50/50">
                <td className="p-3 border border-gray-200 font-medium text-gray-700">{type}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{method}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="3. 利用目的">
        <p>取得した情報は、以下の目的にのみ使用します。</p>
        <ol className="list-decimal list-inside space-y-1.5 mt-2">
          <li>本サービスのアカウント管理・認証</li>
          <li>AIによる原稿生成機能の提供</li>
          <li>利用上限（月間生成回数）の管理</li>
          <li>サービスに関するお問い合わせへの対応・サポート、および重要なお知らせのご連絡</li>
          <li>不正アクセス・不正利用の検知および防止</li>
          <li>本サービスの機能改善・品質向上のための統計的分析</li>
          <li>利用規約違反等への対応</li>
        </ol>
      </Section>

      <Section title="4. 外部事業者への委託・外国にある第三者への提供">
        <p>運営者は、本サービスの提供に必要な範囲で、以下の外部事業者に情報の取扱いを委託しています。これらの事業者はいずれも外国（米国）に所在し、取得した情報は同国のサーバー等で処理・保存されることがあります。各事業者は、それぞれの利用規約およびプライバシーポリシーに基づき情報を取り扱います。</p>
        <table className="mt-3 w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 border border-gray-200 font-semibold">委託先</th>
              <th className="text-left p-3 border border-gray-200 font-semibold">委託内容</th>
              <th className="text-left p-3 border border-gray-200 font-semibold">所在国</th>
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map(([name, purpose, country]) => (
              <tr key={name} className="even:bg-gray-50/50">
                <td className="p-3 border border-gray-200 font-medium text-gray-700">{name}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{purpose}</td>
                <td className="p-3 border border-gray-200 text-gray-600">{country}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3">米国には、日本の個人情報保護法と同等の包括的な個人情報保護に関する法律は存在しませんが、各州法等による規律があります。利用者は、利用登録をもって上記の委託および外国への情報の移転に同意したものとみなします。</p>
      </Section>

      <Section title="5. 第三者提供">
        <p>運営者は、前項の委託の場合のほか、以下の場合を除き、取得した情報を第三者に提供しません。</p>
        <ul className="list-disc list-inside space-y-1.5 mt-2">
          <li>利用者本人の同意がある場合</li>
          <li>法令に基づき、裁判所・警察・行政機関等から開示を求められた場合</li>
          <li>人の生命・身体・財産の保護のために必要な場合</li>
        </ul>
      </Section>

      <Section title="6. 安全管理措置">
        <p>運営者は、情報の漏えい・滅失・毀損の防止その他安全管理のため、以下の措置を講じています。</p>
        <ul className="list-disc list-inside space-y-1.5 mt-2">
          <li>通信の暗号化（SSL/HTTPS）</li>
          <li>パスワードのハッシュ化（平文保存なし）</li>
          <li>行レベルセキュリティ（RLS）による利用者ごとのデータの分離管理</li>
          <li>アクセス権限の最小化</li>
        </ul>
      </Section>

      <Section title="7. 情報漏えい等のリスクについて">
        <p>運営者は前項の安全管理措置を講じていますが、インターネットを利用するサービスの性質上、不正アクセス、サイバー攻撃、委託先事業者におけるシステム障害その他の事由による情報の漏えい等のリスクを完全に排除することはできません。</p>
        <p>利用者は、このリスクを理解し了承の上で本サービスを利用するものとし、利用登録をもってこれに同意したものとみなします。これらの事由により利用者に生じた損害について、運営者は、運営者の故意または重大な過失による場合を除き、責任を負いません。</p>
        <p>なお、万一情報の漏えい等が発生した場合は、法令に従い、必要な報告および利用者への通知を行います。</p>
      </Section>

      <Section title="8. Cookieの使用">
        <p>本サービスでは、ログイン状態の維持および利便性向上のためにCookieを使用します。ブラウザの設定によりCookieを無効にすることができますが、一部機能が正常に動作しない場合があります。</p>
      </Section>

      <Section title="9. 情報の保存期間">
        <p>取得した情報は、利用者が退会するまで、または法令上の保存義務期間中保持します。退会および情報削除のご依頼は、下記窓口メールアドレスまでご連絡ください。</p>
      </Section>

      <Section title="10. 開示・訂正・削除">
        <p>利用者は自身の個人情報について、開示・訂正・利用停止・削除を請求することができます。ご希望の方は下記窓口までメールにてご連絡ください。本人確認を行った上で、合理的な期間内に対応いたします。</p>
      </Section>

      <Section title="11. 未成年者について">
        <p>本サービスは事業者向けのサービスであり、18歳未満の方のご利用を想定しておりません。</p>
      </Section>

      <Section title="12. プライバシーポリシーの変更">
        <p>本ポリシーは、必要に応じて改定することがあります。改定後の本ポリシーは、本サービス上に掲示した時点から効力を生じるものとします。重要な変更がある場合は、本サービス上でのお知らせ等によりご連絡いたします。</p>
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
