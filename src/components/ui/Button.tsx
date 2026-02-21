import { type ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'ember' | 'gold' | 'sage' | 'ghost-light' | 'ghost-dark'
type ButtonSize = 'default' | 'sm' | 'full'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantStyles: Record<ButtonVariant, { className: string; style?: React.CSSProperties }> = {
  ember: {
    className: 'bg-gradient-to-b from-ember to-ember-light text-white font-semibold',
    style: { boxShadow: '0 6px 28px rgba(196,75,27,.35)' },
  },
  gold: {
    className: 'bg-gradient-to-b from-gold to-gold-light text-ink font-semibold',
    style: { boxShadow: '0 6px 28px rgba(201,153,31,.3)' },
  },
  sage: {
    className: 'bg-gradient-to-b from-sage to-sage-light text-white font-semibold',
  },
  'ghost-light': {
    className: 'text-white font-semibold border',
    style: {
      background: 'rgba(255,255,255,0.12)',
      borderColor: 'rgba(255,255,255,0.30)',
    },
  },
  'ghost-dark': {
    className: 'bg-parchment-dark text-ink font-semibold border border-parchment-deep',
  },
}

const sizeStyles: Record<ButtonSize, string> = {
  default: 'px-7 py-4 text-[0.95rem]',
  sm:      'px-5 py-2.5 text-[0.85rem]',
  full:    'px-7 py-4 text-[0.95rem] w-full',
}

export function Button({
  variant = 'ember',
  size = 'default',
  className = '',
  style,
  children,
  ...props
}: ButtonProps) {
  const { className: variantClass, style: variantStyle } = variantStyles[variant]
  const sizeClass = sizeStyles[size]

  return (
    <button
      className={[
        'rounded-[50px] cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2',
        'hover:-translate-y-0.5 active:translate-y-0',
        variantClass,
        sizeClass,
        className,
      ].join(' ')}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
