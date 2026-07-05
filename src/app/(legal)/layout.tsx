import Link from 'next/link'
import Footer from '@/components/Footer'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-base font-bold text-suumo-green hover:opacity-80 transition-opacity">
            SUUMO原稿AIツール
          </Link>
          <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            ← ダッシュボードに戻る
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto px-4 py-10 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
