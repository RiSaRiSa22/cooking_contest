import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { PinInput } from '../../components/ui/PinInput'
import { simpleHash } from '../../lib/hash'
import { useAuth } from '../../hooks/useAuth'
import type { Session } from '../../store/sessionStore'

interface ReAuthModalProps {
  isOpen: boolean
  onClose: () => void
  session: Session | null
}

export function ReAuthModal({ isOpen, onClose, session }: ReAuthModalProps) {
  const [pin, setPin] = useState('')
  const { reAuthenticate, reAuthState } = useAuth()

  const handleClose = () => {
    if (reAuthState.loading) return
    setPin('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session || pin.length < 4) return

    const pinHash = simpleHash(pin)
    const result = await reAuthenticate(session.competitionCode, pinHash)

    if (result) {
      // Navigation handled in useAuth.reAuthenticate
      setPin('')
      onClose()
    }
  }

  if (!session) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="center"
      title="Rientra nella gara"
    >
      <div className="flex flex-col gap-4">
        {/* Session info */}
        <div
          className="rounded-[14px] px-4 py-3 text-center"
          style={{
            background: 'rgba(201,153,31,0.08)',
            border: '1px solid rgba(201,153,31,0.20)',
          }}
        >
          <p className="text-[0.72rem] uppercase tracking-widest text-ink-light mb-0.5">
            {session.competitionName}
          </p>
          <p className="text-[1rem] font-semibold text-ink">{session.nickname}</p>
          <p className="text-[0.72rem] text-ink-light mt-0.5">
            {session.role === 'admin' ? '👑 Admin' : '👤 Partecipante'} · {session.competitionCode}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light text-center">
              Inserisci il tuo PIN
            </p>
            <PinInput
              value={pin}
              onChange={setPin}
              onComplete={setPin}
              disabled={reAuthState.loading}
            />
          </div>

          {reAuthState.error && (
            <p className="text-[0.85rem] text-ember text-center">{reAuthState.error}</p>
          )}

          <Button
            type="submit"
            variant="ember"
            size="full"
            disabled={pin.length < 4 || reAuthState.loading}
          >
            {reAuthState.loading ? 'Verifica...' : 'Entra'}
          </Button>
        </form>
      </div>
    </Modal>
  )
}
