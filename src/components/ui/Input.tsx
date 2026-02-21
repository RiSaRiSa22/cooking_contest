import { type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'w-full px-4 py-3.5 text-[0.95rem]',
          'bg-parchment-dark border-[1.5px] border-parchment-deep rounded-[12px]',
          'text-ink outline-none transition-all duration-200',
          'focus:border-ember focus:shadow-[0_0_0_3px_rgba(196,75,27,.12)]',
          className,
        ].join(' ')}
        {...props}
      />
    </div>
  )
}
