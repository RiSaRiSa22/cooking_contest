import { useCompetitionStore } from '../../store/competitionStore'

interface PhaseConfig {
  label: string
  emoji: string
  bgColor: string
  textColor: string
}

const PHASE_CONFIG: Record<string, PhaseConfig> = {
  preparation: {
    label: 'Preparazione in corso',
    emoji: '👨‍🍳',
    bgColor: 'var(--color-gold)',
    textColor: 'var(--color-ink)',
  },
  voting: {
    label: 'Votazione in corso',
    emoji: '🗳️',
    bgColor: 'var(--color-ember)',
    textColor: '#ffffff',
  },
  finished: {
    label: 'Gara conclusa',
    emoji: '🏆',
    bgColor: 'var(--color-sage)',
    textColor: '#ffffff',
  },
}

export function PhaseBanner() {
  const competition = useCompetitionStore((s) => s.competition)

  if (!competition) return null

  const config = PHASE_CONFIG[competition.phase] ?? {
    label: competition.phase,
    emoji: '📋',
    bgColor: 'var(--color-parchment-deep)',
    textColor: 'var(--color-ink)',
  }

  return (
    <div
      className="w-full py-2 text-center font-body text-sm font-semibold"
      style={{ background: config.bgColor, color: config.textColor }}
    >
      {config.emoji} {config.label}
    </div>
  )
}
