import React from 'react'

type Props = {
  children: React.ReactNode
  color?: 'gray' | 'blue' | 'green' | 'red' | 'yellow'
  className?: string
}

const palette: Record<NonNullable<Props['color']>, string> = {
  gray: 'bg-gray-100 text-gray-800 ring-gray-200',
  blue: 'bg-blue-100 text-blue-800 ring-blue-200',
  green: 'bg-green-100 text-green-800 ring-green-200',
  red: 'bg-red-100 text-red-800 ring-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
}

export function Badge({ children, color = 'gray', className = '' }: Props) {
  return (
    <span className={[
      'inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
      palette[color],
      className,
    ].join(' ')}>
      {children}
    </span>
  )
}
