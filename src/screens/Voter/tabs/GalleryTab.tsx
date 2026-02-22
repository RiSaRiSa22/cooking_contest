import { useState } from 'react'
import { useVoterStore, type DishPublicWithPhotos } from '../../../store/voterStore'
import { DishDetailSheet } from '../../../components/dishes/DishDetailSheet'

export function GalleryTab() {
  const dishes = useVoterStore((s) => s.dishes)
  const competition = useVoterStore((s) => s.competition)
  const myDishId = useVoterStore((s) => s.myDishId)

  const [selectedDish, setSelectedDish] = useState<DishPublicWithPhotos | null>(null)

  const phase = competition?.phase ?? 'preparation'

  const sortedDishes = [...dishes].sort((a, b) =>
    (a.name ?? '').localeCompare(b.name ?? '', 'it')
  )

  if (sortedDishes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-3">
        <span className="text-4xl">🍽️</span>
        <p className="font-body text-sm text-center" style={{ color: 'var(--color-ink-light)' }}>
          Nessun piatto in questa gara
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 px-1 py-4">
        {sortedDishes.map((dish) => {
          const heroPhoto = dish.photos[0]

          return (
            <button
              key={dish.id}
              onClick={() => setSelectedDish(dish)}
              className="relative aspect-square overflow-hidden cursor-pointer"
              style={{ background: 'var(--color-parchment-dark)' }}
            >
              {heroPhoto ? (
                <img
                  src={heroPhoto.url}
                  alt={dish.name ?? ''}
                  className="w-full h-full object-cover transition-transform duration-250 hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-3xl">🍽️</span>
                </div>
              )}

              {/* Overlay con nome piatto */}
              <div
                className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5 pt-5"
                style={{
                  background: 'linear-gradient(transparent, rgba(26,18,8,.72))',
                }}
              >
                <p
                  className="font-body text-[0.62rem] font-semibold text-white leading-tight truncate"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                >
                  {dish.name}
                </p>
              </div>

              {/* Badge numero foto */}
              {dish.photos.length > 1 && (
                <div
                  className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full font-body text-[0.58rem] text-white flex items-center gap-0.5"
                  style={{ background: 'rgba(26,18,8,.55)' }}
                >
                  📷 {dish.photos.length}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <DishDetailSheet
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        phase={phase}
        myDishId={myDishId}
      />
    </>
  )
}
