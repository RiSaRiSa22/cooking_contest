import { useCompetitionStore } from '../../../store/competitionStore'
import { ParticipantCard } from '../../../components/competition/ParticipantCard'

export function ParticipantsTab() {
  const participants = useCompetitionStore((s) => s.participants)
  const dishes = useCompetitionStore((s) => s.dishes)

  // Sort: admin first, then by joined_at ascending
  const sorted = [...participants].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1
    if (b.role === 'admin' && a.role !== 'admin') return 1
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
  })

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          Partecipanti
        </h2>
        <span
          className="font-body text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--color-ember)', color: '#ffffff' }}
        >
          {participants.length}
        </span>
      </div>

      {/* Participant list */}
      {sorted.length === 0 ? (
        <p className="font-body text-sm text-center py-8" style={{ color: 'var(--color-ink-light)' }}>
          Nessun partecipante ancora
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((participant) => {
            const dish = dishes.find((d) => d.participant_id === participant.id) ?? null
            return (
              <ParticipantCard
                key={participant.id}
                participant={participant}
                dish={dish}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
