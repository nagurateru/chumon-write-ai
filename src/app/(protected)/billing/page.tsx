'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BillingPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/pricing') }, [router])
  return null
}
