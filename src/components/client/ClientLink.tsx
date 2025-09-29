'use client'
import Link from 'next/link'

export function ClientLink({
  partyId,
  fallbackHref,
  children,
  quick = false,
}: {
  partyId?: string
  fallbackHref: string
  children: React.ReactNode
  quick?: boolean
}) {
  const href = partyId ? (quick ? `/clients/(quick)/${partyId}` : `/clients/${partyId}`) : fallbackHref
  return (
    <Link href={href} className="hover:underline">
      {children}
    </Link>
  )
}
