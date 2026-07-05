export const metadata = { title: '特定商取引法に基づく表記 | 注文住宅ライトAI' }

const rows: [string, string][] = [
  ['販売業者の名称',       '中山涼真'],
  ['運営責任者',           '中山涼真'],
  ['所在地',               '請求があったら遅滞なく開示します'],
  ['電話番号',             '請求があったら遅滞なく開示します\n（先にメールにてお問い合わせください）'],
  ['メールアドレス',       'chumon.write.ai@gmail.com'],
  ['販売URL',              'https://（本サービスURL）'],
  ['販売価格',             'ベーシックプラン：月額 14,800円（税込）\nプロプラン：月額 17,800円（税込）\n※ 無料プランは無料でご利用いただけます'],
  ['商品代金以外の必要料金', 'インターネット接続料金（通信費）はお客様のご負担となります'],
  ['お支払方法',           'クレジットカード決済（Stripe）\nVisa、MasterCard、American Express、JCB等'],
  ['代金の支払時期',       '初月：ご登録・プラン選択時に即時決済\n翌月以降：毎月の契約更新日に自動決済（前払い）'],
  ['役務の提供時期',       '決済完了後、即座にご利用いただけます'],
  ['解約・返金について',   '解約はマイページよりいつでも即時可能です。\n解約後は当月末まで引き続きご利用いただけます。\nただし、商品の性質上、決済完了後の日割り返金・キャンセル返金は承っておりません。'],
  ['動作環境',             '最新バージョンのChrome・Safari・Firefox・Edge等のモダンブラウザ\n（Internet Explorerは非対応）'],
]

export default function CommercialTransactionPage() {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-8">
      <header>
        <p className="text-xs text-gray-400 mb-2">最終更新日：2025年6月1日</p>
        <h1 className="text-2xl font-bold text-gray-900">特定商取引法に基づく表記</h1>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          特定商取引に関する法律（昭和51年法律第57号）第11条に基づき、以下の通り表記します。
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-gray-100 last:border-0">
                <th className="text-left align-top py-4 pr-6 pl-1 font-semibold text-gray-700 whitespace-nowrap w-48 bg-gray-50/60">
                  {label}
                </th>
                <td className="align-top py-4 pl-4 text-gray-600 leading-relaxed">
                  {value.split('\n').map((line, i) => (
                    <span key={i}>
                      {label === 'メールアドレス' ? (
                        <a href={`mailto:${line}`} className="text-suumo-green hover:underline">{line}</a>
                      ) : (
                        line
                      )}
                      {i < value.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">📋 解約・返金に関するご注意</p>
        <p>本サービスはデジタルコンテンツの提供であるため、決済完了後の返金・キャンセルは原則として承っておりません。</p>
        <p>解約はマイページよりいつでも即時手続きが可能です。解約月の日割り返金は行いませんが、解約後も当月末まで有料機能をご利用いただけます。</p>
      </div>

      <div className="pt-4 border-t border-gray-100 text-sm text-gray-500">
        <p className="font-medium mb-1">お問い合わせ</p>
        <p>上記内容に関するご質問は、メールにてお問い合わせください。</p>
        <p className="mt-1">
          <a href="mailto:chumon.write.ai@gmail.com" className="text-suumo-green hover:underline">
            chumon.write.ai@gmail.com
          </a>
        </p>
      </div>
    </article>
  )
}
