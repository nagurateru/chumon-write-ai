export const metadata = { title: '利用規約 | 注文住宅ライトAI' }

export default function TermsPage() {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-10">
      <header>
        <p className="text-xs text-gray-400 mb-2">最終更新日：2025年6月1日</p>
        <h1 className="text-2xl font-bold text-gray-900">利用規約</h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          本利用規約（以下「本規約」）は、中山涼真（以下「運営者」）が提供する注文住宅ライトAI（以下「本サービス」）の利用条件を定めるものです。本サービスを利用することで、本規約に同意したものとみなします。
        </p>
      </header>

      <Section title="第1条（定義）">
        <p>本規約において、以下の用語はそれぞれ以下の意味を持ちます。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>「本サービス」とは、運営者が提供する工務店向けAIコンテンツ生成サブスクリプションサービスをいいます。</li>
          <li>「利用者」とは、本サービスに登録し利用するすべての者をいいます。</li>
          <li>「生成コンテンツ」とは、本サービスのAI機能によって生成された文章・キャッチコピー等をいいます。</li>
        </ul>
      </Section>

      <Section title="第2条（利用登録）">
        <p>本サービスの利用を希望する方は、本規約に同意の上、所定の方法により利用登録を行うものとします。運営者は、以下に該当すると判断した場合、登録を拒否することがあります。</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>虚偽の情報を登録した場合</li>
          <li>本規約に違反したことがある者からの申請の場合</li>
          <li>その他、運営者が不適切と判断した場合</li>
        </ul>
      </Section>

      <Section title="第3条（禁止事項）">
        <p>利用者は、本サービスの利用にあたり、以下の行為を行ってはなりません。</p>
        <ol className="list-decimal list-inside space-y-1.5 mt-2">
          <li>不正アクセス、または不正アクセスを試みる行為</li>
          <li>アカウントの第三者への貸与・共有・譲渡</li>
          <li>本サービスへの自動的なアクセス・スクレイピング・クローリング</li>
          <li>本サービスを通じて生成したコンテンツを無断で第三者に再販・転売する行為</li>
          <li>本サービスのサーバーやネットワークに過大な負荷をかける行為</li>
          <li>法令または公序良俗に違反する行為</li>
          <li>その他、運営者が不適切と判断する行為</li>
        </ol>
      </Section>

      <Section title="第4条（サービスの変更・中断・終了）">
        <p>運営者は、利用者への事前通知なしに、本サービスの内容の変更、一時的な中断、または提供の終了を行うことがあります。これらによって利用者に生じた損害について、運営者は一切の責任を負いません。</p>
      </Section>

      <Section title="第5条（生成コンテンツに関する免責）">
        <p>本サービスが提供するAIによる生成コンテンツは、情報提供を目的としたものであり、正確性・完全性・適合性・特定目的への適合性等について、運営者は一切の保証をしません。生成コンテンツの利用は利用者の自己責任において行うものとし、これに関連して生じた損害について、運営者は一切の責任を負いません。</p>
        <p className="mt-2">利用者は、SUUMOその他の媒体への入稿に際し、生成コンテンツを自身の責任において確認・編集した上で使用するものとします。</p>
      </Section>

      <Section title="第6条（料金・お支払い）">
        <p>本サービスの利用料金は、各プランのページに表示する金額（税込）とします。利用者はStripeを通じてクレジットカードにより料金をお支払いいただきます。</p>
        <p className="mt-2">有料プランの料金は、毎月の契約更新日に自動的に決済されます。決済が完了した場合、当該月の料金はいかなる理由においても返金いたしません。</p>
      </Section>

      <Section title="第7条（解約）">
        <p>利用者はいつでもマイページより本サービスの有料プランを解約することができます。解約の効力は解約手続き完了時点から発生しますが、月の途中で解約した場合でも、当月分の料金については日割り計算による返金は行いません。解約後は月末まで有料機能をご利用いただけます。</p>
      </Section>

      <Section title="第8条（知的財産権）">
        <p>本サービス上のシステム・UI・ロジック等に関する知的財産権は運営者に帰属します。利用者が本サービスを通じて生成したコンテンツの著作権は、利用者に帰属します。</p>
      </Section>

      <Section title="第9条（個人情報の取扱い）">
        <p>利用者の個人情報の取扱いについては、別途定める「プライバシーポリシー」に従います。</p>
      </Section>

      <Section title="第10条（規約の変更）">
        <p>運営者は、必要と判断した場合に本規約を変更することがあります。変更後の規約は、本サービス上に掲示した時点から効力を生じるものとします。利用者は変更後も本サービスを利用し続けることにより、変更に同意したものとみなします。</p>
      </Section>

      <Section title="第11条（準拠法・管轄裁判所）">
        <p>本規約の解釈にあたっては日本法を準拠法とし、本サービスに関連して生じた紛争については、運営者の所在地を管轄する裁判所を専属的合意管轄とします。</p>
      </Section>

      <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
        <p>お問い合わせ：<a href="mailto:chumon.write.ai@gmail.com" className="text-suumo-green hover:underline">chumon.write.ai@gmail.com</a></p>
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
