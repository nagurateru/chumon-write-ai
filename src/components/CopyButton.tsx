'use client'

import { useState } from 'react'

export default function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={className ?? 'text-xs px-2.5 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0'}
    >
      {copied ? '✓ コピーしました' : 'コピー'}
    </button>
  )
}
