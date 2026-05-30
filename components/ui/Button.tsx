'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'gold' | 'outline' | 'ghost' | 'danger'
type Size    = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  fullWidth?: boolean
}

const V: Record<Variant, string> = {
  gold:    'bg-[#C9A84C] hover:bg-[#E8C96A] text-black font-semibold shadow-[0_0_20px_rgba(201,168,76,.3)] hover:shadow-[0_0_32px_rgba(201,168,76,.55)] active:scale-[.98]',
  outline: 'border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/10 bg-transparent',
  ghost:   'text-[#F5F5F5]/60 hover:text-[#F5F5F5] hover:bg-white/5 bg-transparent',
  danger:  'border border-[#E05252]/40 text-[#E05252] hover:bg-[#E05252]/10 bg-transparent',
}
const S: Record<Size, string> = {
  sm: 'h-8  px-3  text-xs  rounded-lg',
  md: 'h-11 px-5  text-sm  rounded-xl',
  lg: 'h-14 px-8  text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant='gold', size='md', loading, fullWidth, className='', children, disabled, ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        V[variant], S[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && (
        <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path  className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
