import { useState, useEffect } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PinInput } from '../../components/ui/PinInput'
import { simpleHash } from '../../lib/hash'
import { useAuth } from '../../hooks/useAuth'

interface JoinCompModalProps {
  isOpen: boolean
  onClose: () => void
  /** Pre-filled code from deep link */
  initialCode?: string
}

export function JoinCompModal({ isOpen, onClose, initialCode }: JoinCompModalProps) {
  const [code, setCode] = useState(initialCode ?? '')
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const { joinCompetition, joinState } = useAuth()

  // Sync initialCode when modal opens or initialCode changes
  useEffect(() => {
    if (isOpen && initialCode) {
      setCode(initialCode.toUpperCase())
    }
  }, [isOpen, initialCode])

  const handleClose = () => {
    if (joinState.loading) return
    setCode(initialCode ?? '')
    setNickname('')
    setPin('')
    onClose()
  }

  const handleCodeChange = (value: string) => {
    // Uppercase alphanumeric only, max 6 chars
    setCode(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6 || !nickname.trim() || pin.length < 4) return

    const pinHash = simpleHash(pin)
    const result = await joinCompetition({
      code: code.toUpperCase(),
      nickname: nickname.trim(),
      pinHash,
    })

    if (result) {
      // Navigation is handled inside useAuth.joinCompetition
      setCode(initialCode ?? '')
      setNickname('')
      setPin('')
      onClose()
    }
  }

  const isCodeReadOnly = Boolean(initialCode)
  const isValid = code.length === 6 && nickname.trim().length > 0 && pin.length === 4

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="bottom-sheet"
      title="Entra in una gara"
      subtitle="Inserisci il codice che ti ha dato l'admin."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Codice gara (6 caratteri)"
          placeholder="es. ABC123"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          disabled={joinState.loading || isCodeReadOnly}
          maxLength={6}
          className={isCodeReadOnly ? 'opacity-70 cursor-not-allowed' : ''}
          style={{ letterSpacing: '0.15em', textTransform: 'uppercase' }}
        />

        <Input
          label="Il tuo soprannome"
          placeholder="es. Chef Mario"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={joinState.loading}
          maxLength={40}
        />

        <div className="flex flex-col gap-2">
          <p className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            PIN segreto (4 cifre)
          </p>
          <PinInput
            value={pin}
            onChange={setPin}
            onComplete={setPin}
            disabled={joinState.loading}
          />
          <p className="text-[0.72rem] text-ink-light text-center">
            Scegli un PIN che ricorderai per rientrare
          </p>
        </div>

        {joinState.error && (
          <p className="text-[0.85rem] text-ember text-center">{joinState.error}</p>
        )}

        <Button
          type="submit"
          variant="ember"
          size="full"
          disabled={!isValid || joinState.loading}
          className="mt-2"
        >
          {joinState.loading ? 'Accesso...' : '🔗 Entra in gara'}
        </Button>
      </form>
    </Modal>
  )
}
