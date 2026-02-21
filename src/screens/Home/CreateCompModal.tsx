import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { PinInput } from '../../components/ui/PinInput'
import { simpleHash } from '../../lib/hash'
import { useAuth } from '../../hooks/useAuth'

interface CreateCompModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (code: string, competitionName: string) => void
}

export function CreateCompModal({ isOpen, onClose, onSuccess }: CreateCompModalProps) {
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const { createCompetition, createState } = useAuth()

  const handleClose = () => {
    if (createState.loading) return
    setName('')
    setNickname('')
    setPin('')
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !nickname.trim() || pin.length < 4) return

    const pinHash = simpleHash(pin)
    const result = await createCompetition({
      name: name.trim(),
      nickname: nickname.trim(),
      pinHash,
    })

    if (result) {
      setName('')
      setNickname('')
      setPin('')
      onSuccess(result.code, name.trim())
    }
  }

  const isValid = name.trim().length > 0 && nickname.trim().length > 0 && pin.length === 4

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="bottom-sheet"
      title="Crea nuova gara"
      subtitle="Invita i partecipanti con il codice gara che riceverai."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome della gara"
          placeholder="es. Cena di Capodanno"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={createState.loading}
          maxLength={80}
        />

        <Input
          label="Il tuo soprannome (admin)"
          placeholder="es. Chef Mario"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          disabled={createState.loading}
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
            disabled={createState.loading}
          />
          <p className="text-[0.72rem] text-ink-light text-center">
            Usalo per rientrare nella gara
          </p>
        </div>

        {createState.error && (
          <p className="text-[0.85rem] text-ember text-center">{createState.error}</p>
        )}

        <Button
          type="submit"
          variant="ember"
          size="full"
          disabled={!isValid || createState.loading}
          className="mt-2"
        >
          {createState.loading ? 'Creazione...' : '✨ Crea gara'}
        </Button>
      </form>
    </Modal>
  )
}
