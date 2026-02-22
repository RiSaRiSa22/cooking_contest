import { useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../components/ui/Toast'
import { useVoterStore } from '../../../store/voterStore'
import { useSessionStore } from '../../../store/sessionStore'
import type { DishPublicWithPhotos } from '../../../store/voterStore'

function ScoreSelector({
  currentScore,
  isSubmitting,
  onSelect,
}: {
  currentScore: number | null
  isSubmitting: boolean
  onSelect: (score: number) => void
}) {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
        const isSelected = currentScore === score
        return (
          <button
            key={score}
            onClick={() => onSelect(score)}
            disabled={isSubmitting}
            className="w-9 h-9 rounded-lg font-body text-sm font-semibold transition-all duration-150 disabled:opacity-50 cursor-pointer"
            style={{
              background: isSelected ? 'var(--color-ember)' : 'var(--color-parchment-dark)',
              color: isSelected ? '#ffffff' : 'var(--color-ink)',
              border: isSelected
                ? '2px solid var(--color-ember)'
                : '1px solid var(--color-parchment-deep)',
            }}
          >
            {score}
          </button>
        )
      })}
    </div>
  )
}

function DishVoteCard({
  dish,
  isOwn,
  currentScore,
  isSubmitting,
  onRate,
}: {
  dish: DishPublicWithPhotos
  isOwn: boolean
  currentScore: number | null
  isSubmitting: boolean
  onRate: (dishId: string, score: number) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const heroPhoto = dish.photos[0]

  const handleCardClick = () => {
    if (isOwn) return
    setExpanded((prev) => !prev)
  }

  return (
    <div
      className="rounded-xl shadow-sm overflow-hidden transition-all duration-200 relative"
      style={{
        background: '#ffffff',
        border: currentScore !== null
          ? '2px solid var(--color-ember)'
          : '1px solid var(--color-parchment-deep)',
        boxShadow: currentScore !== null ? '0 4px 16px rgba(196,75,27,0.18)' : undefined,
        opacity: isOwn ? 0.85 : 1,
      }}
    >
      {/* Clickable header area */}
      <div
        onClick={handleCardClick}
        className={`${isOwn ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Hero photo */}
        {heroPhoto && (
          <div className="relative">
            <img
              src={heroPhoto.url}
              alt={dish.name ?? ''}
              className="w-full h-40 object-cover rounded-t-xl"
            />
            {isOwn && (
              <div
                className="absolute inset-0 flex items-center justify-center rounded-t-xl"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                <span className="font-body text-white text-sm font-semibold">Il tuo piatto</span>
              </div>
            )}
          </div>
        )}

        {/* Card header */}
        <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className="font-display text-base truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {dish.name ?? 'Piatto senza nome'}
            </h3>
            <p className="font-body text-xs mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
              {isOwn ? '🍳 Il tuo piatto' : '🎭 Cuoco misterioso'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentScore !== null && (
              <span
                className="font-body text-sm font-bold px-2 py-0.5 rounded-md"
                style={{ background: 'var(--color-ember)', color: '#ffffff' }}
              >
                {currentScore}/10
              </span>
            )}
            {!isOwn && (
              <span
                className="text-xs font-body"
                style={{ color: 'var(--color-ink-light)' }}
              >
                {expanded ? '▲' : '▼'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && !isOwn && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          {dish.ingredients && (
            <div>
              <p
                className="font-body text-[0.7rem] uppercase tracking-wider font-semibold mb-1"
                style={{ color: 'var(--color-ink-light)' }}
              >
                Ingredienti
              </p>
              <p className="font-body text-sm" style={{ color: 'var(--color-ink)' }}>
                {dish.ingredients}
              </p>
            </div>
          )}

          {dish.recipe && (
            <div>
              <p
                className="font-body text-[0.7rem] uppercase tracking-wider font-semibold mb-1"
                style={{ color: 'var(--color-ink-light)' }}
              >
                Ricetta
              </p>
              <p className="font-body text-sm" style={{ color: 'var(--color-ink)' }}>
                {dish.recipe}
              </p>
            </div>
          )}

          {/* Score selector */}
          <div>
            <p
              className="font-body text-[0.7rem] uppercase tracking-wider font-semibold mb-2 text-center"
              style={{ color: 'var(--color-ink-light)' }}
            >
              {currentScore !== null ? 'Il tuo voto (clicca per cambiare)' : 'Dai un voto da 1 a 10'}
            </p>
            <ScoreSelector
              currentScore={currentScore}
              isSubmitting={isSubmitting}
              onSelect={(score) => onRate(dish.id as string, score)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function VoteTab() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))

  const competition = useVoterStore((s) => s.competition)
  const dishes = useVoterStore((s) => s.dishes)
  const myRatings = useVoterStore((s) => s.myRatings)
  const myDishId = useVoterStore((s) => s.myDishId)
  const setMyRating = useVoterStore((s) => s.setMyRating)

  const { show: showToast } = useToast()

  const [isVoting, setIsVoting] = useState(false)

  const phase = competition?.phase

  // Sort dishes by name for consistency
  const sortedDishes = [...dishes].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'it')
  )

  // Count votable dishes (not own) and rated dishes
  const votableDishes = sortedDishes.filter((d) => d.id !== myDishId)
  const ratedCount = votableDishes.filter((d) => myRatings.has(d.id as string)).length

  async function handleRate(dishId: string, score: number) {
    if (!session || !competition) return
    if (isVoting) return

    setIsVoting(true)
    try {
      const { data, error } = await supabase.functions.invoke('vote-cast', {
        body: {
          competitionId: competition.id,
          participantId: session.participantId,
          dishId,
          score,
        },
      })

      if (error) {
        let message = 'Errore durante il voto'
        try {
          const ctx = (error as { context?: { responseBody?: string } }).context
          if (ctx?.responseBody) {
            const parsed = JSON.parse(ctx.responseBody) as { error?: string }
            if (parsed.error) message = parsed.error
          }
        } catch {
          // fallback to generic message
        }
        showToast(message)
        return
      }

      if (data?.vote) {
        setMyRating(dishId, data.vote.score)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setIsVoting(false)
    }
  }

  // Status bar
  let statusBar: React.ReactNode = null
  if (phase === 'preparation') {
    statusBar = (
      <div
        className="mx-4 mt-4 px-4 py-3 rounded-xl font-body text-sm text-center"
        style={{ background: 'rgba(201,153,31,0.15)', color: 'var(--color-ink)' }}
      >
        ⏳ Le votazioni non sono ancora aperte
      </div>
    )
  } else if (phase === 'finished') {
    statusBar = (
      <div
        className="mx-4 mt-4 px-4 py-3 rounded-xl font-body text-sm text-center"
        style={{ background: 'rgba(100,150,100,0.15)', color: 'var(--color-ink)' }}
      >
        🏁 Votazioni concluse
      </div>
    )
  } else if (phase === 'voting') {
    statusBar = (
      <div
        className="mx-4 mt-4 px-4 py-3 rounded-xl font-body text-sm text-center"
        style={{
          background: ratedCount === votableDishes.length && votableDishes.length > 0
            ? 'rgba(100,180,100,0.2)'
            : 'rgba(201,153,31,0.15)',
          color: 'var(--color-ink)',
        }}
      >
        {ratedCount === votableDishes.length && votableDishes.length > 0
          ? `Hai votato tutti i piatti! (${ratedCount}/${votableDishes.length}) ✅`
          : `🗳️ Hai votato ${ratedCount}/${votableDishes.length} piatti`}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {statusBar}

      {phase === 'voting' && (
        <>
          {sortedDishes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-5xl">🍳</span>
              <p
                className="font-body text-sm text-center"
                style={{ color: 'var(--color-ink-light)' }}
              >
                Nessun piatto disponibile.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 mt-2">
              {sortedDishes.map((dish) => (
                <DishVoteCard
                  key={dish.id as string}
                  dish={dish}
                  isOwn={myDishId !== null && dish.id === myDishId}
                  currentScore={myRatings.get(dish.id as string) ?? null}
                  isSubmitting={isVoting}
                  onRate={handleRate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
