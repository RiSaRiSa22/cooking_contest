import { useState } from 'react'
import { useParams } from 'react-router'
import { useCompetitionStore } from '../../../store/competitionStore'
import { useSessionStore } from '../../../store/sessionStore'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { useToast } from '../../../components/ui/Toast'
import { ConfirmModal } from '../modals/ConfirmModal'

// Toast wrapper — current Toast only accepts string message
function useAppToast() {
  const { show } = useToast()
  return { showToast: (msg: string, _type?: 'success' | 'error') => show(msg) }
}

type PhaseAction = 'advance' | 'reset' | null

const PHASE_LABELS: Record<string, string> = {
  preparation: 'Preparazione',
  voting: 'Votazione',
  finished: 'Conclusa',
}

const PHASE_COLORS: Record<string, string> = {
  preparation: 'var(--color-sage)',
  voting: 'var(--color-ember)',
  finished: 'var(--color-gold)',
}

function getAdvanceButtonText(phase: string): string {
  if (phase === 'preparation') return 'Avvia votazione 🗳️'
  if (phase === 'voting') return 'Concludi gara 🏆'
  return 'Gara conclusa'
}

function getAdvanceConfirmMessage(phase: string): string {
  if (phase === 'preparation') {
    return 'Vuoi avviare la votazione? I partecipanti non potranno più modificare i piatti.'
  }
  return 'Vuoi concludere la gara? La classifica finale sarà visibile a tutti.'
}

export function SettingsTab() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const competition = useCompetitionStore((s) => s.competition)
  const dishes = useCompetitionStore((s) => s.dishes)
  const participants = useCompetitionStore((s) => s.participants)
  const dishScores = useCompetitionStore((s) => s.dishScores)
  const updatePhase = useCompetitionStore((s) => s.updatePhase)

  const { showToast } = useAppToast()
  const [pendingAction, setPendingAction] = useState<PhaseAction>(null)
  const [isLoading, setIsLoading] = useState(false)

  const phase = competition?.phase ?? 'preparation'

  // Total ratings from dish scores
  const totalVotes = Array.from(dishScores.values()).reduce((sum, s) => sum + s.count, 0)

  // Adaptive share URLs: join for preparation/finished, vote for voting
  const joinUrl = `${window.location.origin}${window.location.pathname}#/?code=${competition?.code ?? ''}&mode=join`
  const voteUrl = `${window.location.origin}${window.location.pathname}#/?code=${competition?.code ?? ''}&mode=vote`
  const shareUrl = phase === 'voting' ? voteUrl : joinUrl

  // QR code adapts to current phase
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(shareUrl)}&size=200x200`

  const shareLinkLabel = phase === 'voting' ? '🔗 Condividi link votazione' : '🔗 Condividi link join'

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(competition?.code ?? '')
      showToast('Codice copiato!', 'success')
    } catch {
      showToast('Errore durante la copia', 'error')
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Link copiato negli appunti!', 'success')
    } catch {
      showToast('Errore durante la copia del link', 'error')
    }
  }

  async function handleAdvancePhase() {
    if (!competition || !session?.participantId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('competition-settings', {
        body: {
          action: 'advance_phase',
          competitionId: competition.id,
          participantId: session.participantId,
        },
      })

      if (error) throw error

      updatePhase(data.phase)
      showToast(`Fase aggiornata: ${PHASE_LABELS[data.phase] ?? data.phase}`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante l\'avanzamento della fase'
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  async function handleResetVotes() {
    if (!competition || !session?.participantId) return
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('competition-settings', {
        body: {
          action: 'reset_votes',
          competitionId: competition.id,
          participantId: session.participantId,
        },
      })

      if (error) throw error

      showToast(`${data.deletedCount} voti eliminati`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante il reset dei voti'
      showToast(msg, 'error')
    } finally {
      setIsLoading(false)
      setPendingAction(null)
    }
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Section 1: Codice gara */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <h2 className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
          Codice gara
        </h2>

        <div className="flex items-center gap-3">
          <span
            className="font-display text-4xl font-bold tracking-widest"
            style={{ color: 'var(--color-ember)' }}
          >
            {competition?.code ?? '——'}
          </span>
          <Button variant="ghost-dark" size="sm" onClick={copyCode}>
            📋 Copia
          </Button>
        </div>

        <Button variant="ghost-dark" size="sm" onClick={copyLink} className="w-full">
          {shareLinkLabel}
        </Button>

        {competition?.code && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <img
              src={qrUrl}
              alt={`QR code per ${phase === 'voting' ? 'votazione' : 'partecipare alla'} gara ${competition.code}`}
              width={160}
              height={160}
              className="rounded-lg"
            />
            {/* Link testuale per debug/verifica */}
            <p className="font-body text-xs break-all text-center" style={{ color: 'var(--color-ink-light)' }}>
              {shareUrl}
            </p>
          </div>
        )}
      </section>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--color-parchment-deep)' }} />

      {/* Section 2: Statistiche */}
      <section className="bg-white rounded-xl p-4 shadow-sm">
        <h2
          className="font-display text-base font-semibold mb-4"
          style={{ color: 'var(--color-ink)' }}
        >
          Statistiche
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: 'var(--color-parchment)' }}>
            <span className="text-2xl">👥</span>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {participants.length}
            </span>
            <span className="font-body text-xs" style={{ color: 'var(--color-ink-light)' }}>
              Partecipanti
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: 'var(--color-parchment)' }}>
            <span className="text-2xl">🍽️</span>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {dishes.length}
            </span>
            <span className="font-body text-xs" style={{ color: 'var(--color-ink-light)' }}>
              Piatti
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 p-3 rounded-xl" style={{ background: 'var(--color-parchment)' }}>
            <span className="text-2xl">🗳️</span>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>
              {totalVotes}
            </span>
            <span className="font-body text-xs" style={{ color: 'var(--color-ink-light)' }}>
              Valutazioni
            </span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--color-parchment-deep)' }} />

      {/* Section 3: Fase gara */}
      <section className="bg-white rounded-xl p-4 shadow-sm space-y-4">
        <h2
          className="font-display text-base font-semibold"
          style={{ color: 'var(--color-ink)' }}
        >
          Fase gara
        </h2>

        <div className="flex items-center gap-2">
          <span
            className="font-body text-sm font-bold px-3 py-1 rounded-full"
            style={{
              background: PHASE_COLORS[phase] ?? 'var(--color-ink-light)',
              color: '#ffffff',
            }}
          >
            {PHASE_LABELS[phase] ?? phase}
          </span>
        </div>

        <Button
          variant="ember"
          size="default"
          className="w-full"
          disabled={phase === 'finished' || isLoading}
          onClick={() => setPendingAction('advance')}
        >
          {getAdvanceButtonText(phase)}
        </Button>
      </section>

      {/* Divider */}
      <hr style={{ borderColor: 'var(--color-parchment-deep)' }} />

      {/* Section 4: Azioni pericolose */}
      {phase !== 'preparation' && (
        <section className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <h2
            className="font-display text-base font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            Azioni pericolose
          </h2>
          <Button
            variant="ghost-dark"
            size="default"
            className="w-full"
            style={{ color: '#dc2626' }}
            onClick={() => setPendingAction('reset')}
            disabled={isLoading}
          >
            🗑️ Reset voti
          </Button>
        </section>
      )}

      {/* Confirm modal — advance phase */}
      <ConfirmModal
        open={pendingAction === 'advance'}
        onClose={() => setPendingAction(null)}
        onConfirm={handleAdvancePhase}
        title="Avanza fase"
        message={getAdvanceConfirmMessage(phase)}
        confirmLabel={phase === 'preparation' ? 'Avvia votazione' : 'Concludi gara'}
        confirmVariant="ember"
        isLoading={isLoading}
      />

      {/* Confirm modal — reset votes */}
      <ConfirmModal
        open={pendingAction === 'reset'}
        onClose={() => setPendingAction(null)}
        onConfirm={handleResetVotes}
        title="Reset voti"
        message="Vuoi eliminare tutti i voti? L'azione e irreversibile."
        confirmLabel="Elimina voti"
        confirmVariant="ember"
        isLoading={isLoading}
      />
    </div>
  )
}
