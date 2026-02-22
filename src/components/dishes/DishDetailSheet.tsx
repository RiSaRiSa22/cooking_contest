import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { DishPublicWithPhotos } from '../../store/voterStore'

interface DishDetailSheetProps {
  dish: DishPublicWithPhotos | null // null = chiuso
  onClose: () => void
  phase: string
  myDishId?: string | null
}

type SectionKey = 'ingredienti' | 'ricetta' | 'storia'

const SECTIONS: { key: SectionKey; label: string; emoji: string }[] = [
  { key: 'ingredienti', label: 'Ingredienti', emoji: '🥬' },
  { key: 'ricetta', label: 'Ricetta', emoji: '📋' },
  { key: 'storia', label: 'Storia', emoji: '📖' },
]

export function DishDetailSheet({
  dish,
  onClose,
  phase,
  myDishId,
}: DishDetailSheetProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  if (!dish) return null

  const heroPhoto = dish.photos[0]
  const extraPhotos = dish.photos.slice(1)
  const isMysteriousChef = phase === 'preparation' || phase === 'voting'
  const isOwnDish = myDishId != null && dish.id === myDishId

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const sectionValues: Record<SectionKey, string | null | undefined> = {
    ingredienti: dish.ingredients,
    ricetta: dish.recipe,
    storia: dish.story,
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: 'rgba(26,18,8,.5)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-t-[28px] max-h-[92vh] overflow-y-auto w-full animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet handle */}
        <div className="mx-auto mt-3 w-10 h-1 rounded-full bg-parchment-deep" />

        {/* Foto hero */}
        <div className="relative">
          {heroPhoto ? (
            <img
              src={heroPhoto.url}
              alt={dish.name ?? ''}
              className="w-full object-cover"
              style={{ maxHeight: 300 }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center"
              style={{ height: 200, background: 'var(--color-parchment-dark)' }}
            >
              <span className="text-5xl">🍽️</span>
            </div>
          )}

          {/* Pulsante chiudi */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-[34px] h-[34px] rounded-full bg-black/50 flex items-center justify-center text-white text-lg leading-none cursor-pointer"
            aria-label="Chiudi"
          >
            ×
          </button>
        </div>

        {/* Contenuto */}
        <div className="px-5 pt-4 pb-8">
          {/* Nome piatto */}
          <h2 className="font-display text-xl font-semibold text-ink leading-tight">
            {dish.name}
          </h2>

          {/* Chef label */}
          <p className="font-body text-sm mt-1" style={{ color: 'var(--color-ink-light)' }}>
            {isMysteriousChef
              ? '🎭 Cuoco misterioso'
              : `👨‍🍳 ${dish.chef_name ?? 'Chef sconosciuto'}` as string}
          </p>

          {/* Badge "Il tuo piatto" */}
          {isOwnDish && (
            <span
              className="inline-block mt-2 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold"
              style={{
                background: 'var(--color-parchment-dark)',
                color: 'var(--color-ink-mid)',
              }}
            >
              Il tuo piatto
            </span>
          )}

          {/* Sezioni espandibili */}
          <div className="mt-4 flex flex-col gap-0">
            {SECTIONS.map(({ key, label, emoji }) => {
              const value = sectionValues[key]
              if (!value?.trim()) return null
              const isOpen = expandedSections.has(key)

              return (
                <div
                  key={key}
                  className="border-t"
                  style={{ borderColor: 'var(--color-parchment-deep)' }}
                >
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full flex items-center justify-between py-3 cursor-pointer font-body text-sm font-semibold text-ink"
                  >
                    <span>
                      {emoji} {label}
                    </span>
                    <span
                      className="text-xs transition-transform duration-200"
                      style={{
                        color: 'var(--color-ink-light)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {isOpen && (
                    <p
                      className="font-body text-sm pb-3 leading-relaxed"
                      style={{ color: 'var(--color-ink-mid)' }}
                    >
                      {value}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Griglia foto extra */}
          {extraPhotos.length > 0 && (
            <div className="mt-4">
              <p
                className="font-body text-xs font-semibold uppercase tracking-widest mb-2"
                style={{ color: 'var(--color-ink-light)' }}
              >
                📸 Foto
              </p>
              <div className="grid grid-cols-3 gap-1">
                {extraPhotos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                    <img
                      src={photo.url}
                      alt="Foto extra"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
