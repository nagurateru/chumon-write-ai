import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-gray-400">© 2026 W.ai All Rights Reserved.</p>
        <nav className="flex items-center gap-5 flex-wrap justify-center">
          <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            利用規約
          </Link>
          <Link href="/contact" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            お問い合わせはこちら
          </Link>
          <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            プライバシーポリシー
          </Link>
          <Link href="/commercial-transaction" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            特定商取引法に基づく表記
          </Link>
        </nav>
      </div>
    </footer>
  )
}
