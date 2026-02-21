import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'

interface CompCreatedScreenProps {
  code: string
  competitionName: string
  onBack: () => void
}

export function CompCreatedScreen({ code, competitionName, onBack }: CompCreatedScreenProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text (older browsers)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[900] flex flex-col items-center justify-center text-center px-6"
      style={{ background: 'var(--color-ink)' }}
    >
      {/* Success icon */}
      <div className="text-[3rem] mb-4 animate-flicker">🎉</div>

      <h2
        className="font-display text-parchment mb-1 leading-tight"
        style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)' }}
      >
        Gara creata!
      </h2>

      <p className="text-parchment/60 text-[0.88rem] mb-8 max-w-xs">
        {competitionName}
      </p>

      {/* Competition code display */}
      <div
        className="rounded-[20px] px-8 py-6 mb-3 text-center"
        style={{
          background: 'rgba(201,153,31,0.10)',
          border: '1.5px solid rgba(201,153,31,0.30)',
        }}
      >
        <p className="text-[0.68rem] uppercase tracking-[0.18em] text-gold/70 mb-2">
          Codice gara
        </p>
        <p
          className="font-display text-gold font-bold tracking-[0.25em]"
          style={{ fontSize: 'clamp(2.4rem, 10vw, 3.6rem)' }}
        >
          {code}
        </p>
        <p className="text-[0.72rem] text-parchment/50 mt-2">
          Condividi questo codice con i partecipanti
        </p>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-[0.82rem] text-parchment/60 hover:text-gold transition-colors duration-200 mb-8 py-2 px-4"
      >
        {copied ? '✓ Copiato!' : '📋 Copia codice'}
      </button>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          variant="ember"
          size="full"
          onClick={() => navigate(`/admin/${code}`)}
        >
          👑 Vai al pannello admin
        </Button>
        <Button
          variant="ghost-light"
          size="full"
          onClick={onBack}
        >
          Torna alla home
        </Button>
      </div>
    </div>
  )
}
