import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  fullWidth?: boolean
}

const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none transition'
const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'bg-surface text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-400 border border-border',
  ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100 focus:ring-neutral-300',
  danger: 'bg-danger-600 text-white hover:bg-danger-700 focus:ring-danger-500',
}

export function Button({ variant = 'primary', className = '', fullWidth, ...props }: ButtonProps) {
  const w = fullWidth ? 'w-full' : ''
  return <button className={[base, variants[variant], w, className].join(' ')} {...props} />
}
