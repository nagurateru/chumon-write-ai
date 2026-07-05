import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full">
        {children}
      </main>
      <Footer />
    </div>
  )
}
