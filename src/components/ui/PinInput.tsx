import { useRef, type ClipboardEvent, type KeyboardEvent, type ChangeEvent } from 'react'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete: (value: string) => void
  disabled?: boolean
}

export function PinInput({ value, onChange, onComplete, disabled = false }: PinInputProps) {
  const digits = value.padEnd(4, '').split('').slice(0, 4)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  const updatePin = (index: number, digit: string) => {
    const arr = digits.slice()
    arr[index] = digit
    const newValue = arr.join('').replace(/ /g, '')
    onChange(newValue)
    if (newValue.length === 4) {
      onComplete(newValue)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1)
    updatePin(index, digit)
    if (digit && index < 3) {
      refs[index + 1].current?.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    const arr = ['', '', '', '']
    pasted.split('').forEach((d, i) => { arr[i] = d })
    onChange(pasted)
    const focusIndex = Math.min(pasted.length, 3)
    refs[focusIndex].current?.focus()
    if (pasted.length === 4) {
      onComplete(pasted)
    }
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {refs.map((ref, i) => (
        <input
          key={i}
          ref={ref}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i] ?? ''}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            'w-[62px] h-[72px] text-center text-[2rem] font-bold',
            'bg-parchment-dark border-2 border-transparent rounded-[14px]',
            'outline-none transition-all duration-200',
            'focus:border-ember focus:bg-white',
            'disabled:opacity-50',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
