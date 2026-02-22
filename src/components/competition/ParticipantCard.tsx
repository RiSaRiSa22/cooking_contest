import type { Database } from '../../types/database.types'
import type { DishWithPhotos } from '../../store/competitionStore'

type Participant = Database['public']['Tables']['participants']['Row']

interface ParticipantCardProps {
  participant: Participant
  dish?: DishWithPhotos | null
  voteCount?: number
}

// Derive a consistent color from the participant's nickname
const PALETTE = ['#C44B1B', '#C9991F', '#5C8C5C', '#2E7BB5', '#8B3D8B'] // ember, gold, sage, sky, plum

function getAvatarColor(nickname: string): string {
  let hash = 0
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % PALETTE.length
  return PALETTE[idx]
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'poco fa'
  if (mins < 60) return `${mins}m fa`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h fa`
  const days = Math.floor(hrs / 24)
  return `${days}g fa`
}

export function ParticipantCard({ participant, dish }: ParticipantCardProps) {
  const avatarBg = getAvatarColor(participant.nickname)
  const initial = participant.nickname.charAt(0).toUpperCase()
  const hasDish = dish != null

  return (
    <div
      className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-sm"
      style={{ border: '1px solid var(--color-parchment-deep)' }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: avatarBg }}
      >
        <span className="font-display text-white text-sm font-bold">{initial}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="font-body text-sm font-semibold truncate"
            style={{ color: 'var(--color-ink)' }}
          >
            {participant.nickname}
          </span>
          {participant.role === 'admin' && (
            <span
              className="font-body text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--color-gold)', color: 'var(--color-ink)' }}
            >
              👑 Admin
            </span>
          )}
        </div>
        <p className="font-body text-xs" style={{ color: 'var(--color-ink-light)' }}>
          {formatRelativeTime(participant.joined_at)}
        </p>
      </div>

      {/* Status badges */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {/* Dish status */}
        <span
          className="font-body text-xs"
          title={hasDish ? 'Piatto aggiunto' : 'Nessun piatto'}
          style={{ color: hasDish ? '#16a34a' : 'var(--color-ink-light)' }}
        >
          🍽️ {hasDish ? '✓' : '—'}
        </span>
        {/* Vote status — available in Phase 3 */}
        <span
          className="font-body text-xs"
          title="Stato voto disponibile nella Fase 3"
          style={{ color: 'var(--color-ink-light)' }}
        >
          🗳️ —
        </span>
      </div>
    </div>
  )
}
