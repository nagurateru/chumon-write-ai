'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { NAV_ICONS } from '@/lib/icons'

const navItems = [
  { href: '/dashboard',       label: 'ホーム',        icon: NAV_ICONS.dashboard      },
  { href: '/company-profile', label: '会社の強み設定', icon: NAV_ICONS.companyProfile },
  { href: '/generate',        label: '原稿生成',       icon: NAV_ICONS.generate       },
  { href: '/pricing',         label: 'プラン・料金',   icon: NAV_ICONS.pricing        },
]

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          {/* ロゴ */}
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/logo-head.png"
              alt="W.ai"
              className="h-[60px] w-auto object-contain"
              onError={e => {
                const t = e.currentTarget
                t.style.display = 'none'
                const fb = t.nextElementSibling as HTMLElement | null
                if (fb) fb.style.display = 'flex'
              }}
            />
            <span className="hidden font-bold text-gray-900 text-lg items-center gap-1" style={{ display: 'none' }}>
              W.ai
            </span>
          </Link>

          {/* ナビゲーションリンク */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-suumo-green-light text-suumo-green-dark'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {item.icon({ size: 16, strokeWidth: 1.75 })}
                  <span className="hidden md:block">{item.label}</span>
                </Link>
              )
            })}

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="ml-2 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              {NAV_ICONS.logout({ size: 16, strokeWidth: 1.75 })}
              <span className="hidden md:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
