import { useRef, useState } from 'react'
import { useVoterStore } from '../../../store/voterStore'
import { usePhotoUpload } from '../../../hooks/usePhotoUpload'
import { useToast } from '../../../components/ui/Toast'
import { supabase } from '../../../lib/supabase'
import { Button } from '../../../components/ui/Button'
import { AddMyDishModal } from '../modals/AddMyDishModal'

export function MyDishTab() {
  const dishes = useVoterStore((s) => s.dishes)
  const myDishId = useVoterStore((s) => s.myDishId)
  const competition = useVoterStore((s) => s.competition)
  const setDishes = useVoterStore((s) => s.setDishes)

  const { uploadPhotos, isUploading } = usePhotoUpload()
  const { show: showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAddDish, setShowAddDish] = useState(false)

  const phase = competition?.phase ?? 'preparation'

  // Trova il piatto del partecipante nell'elenco dishes
  // NOTA: in voting, dishes_public.participant_id è null — myDishId viene da vote-read
  // quindi cerchiamo per dish.id === myDishId
  const myDish = myDishId ? dishes.find((d) => d.id === myDishId) ?? null : null

  // Empty state per ospiti o partecipanti senza piatto
  if (!myDishId) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-6 gap-4 text-center">
          <span className="text-5xl">👀</span>
          <h3 className="font-display text-lg font-semibold text-ink">Nessun piatto</h3>
          <p className="font-body text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Non hai ancora aggiunto un piatto a questa gara.
          </p>
          {competition?.phase === 'preparation' && (
            <Button variant="ember" size="default" onClick={() => setShowAddDish(true)}>
              🍽️ Aggiungi il tuo piatto
            </Button>
          )}
        </div>
        <AddMyDishModal open={showAddDish} onClose={() => setShowAddDish(false)} />
      </>
    )
  }

  // Piatto ancora non trovato in dishes (potrebbe non essere ancora caricato)
  if (!myDish) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
        <span className="text-4xl">🍽️</span>
        <p className="font-body text-sm" style={{ color: 'var(--color-ink-light)' }}>
          Il tuo piatto si sta caricando...
        </p>
      </div>
    )
  }

  const heroPhoto = myDish.photos[0]
  const allPhotos = myDish.photos

  async function handleAddExtraPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !myDishId || !competition || !myDish) return

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''

    setIsSubmitting(true)
    // Capture reference for type narrowing inside async closure
    const currentDish = myDish
    try {
      // Upload foto compressa in Storage
      const urls = await uploadPhotos(files, myDishId, true)

      if (urls.length === 0) return

      // Chiama dish-write EF con isExtra: true per aggiungere le foto al piatto
      const { data, error } = await supabase.functions.invoke('dish-write', {
        body: {
          competitionId: competition.id,
          dishId: myDishId,
          photoUrls: [...allPhotos.map((p) => p.url), ...urls],
          isExtra: true,
        },
      })

      if (error) throw error

      // Aggiorna il voterStore con le nuove foto
      type Photo = typeof currentDish.photos[number]
      const result = data as { dish: Record<string, unknown>; photos: Photo[] }
      const updatedDish = { ...currentDish, photos: result.photos }
      setDishes(dishes.map((d) => (d.id === myDishId ? updatedDish : d)))

      showToast('Foto aggiunta!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il caricamento'
      showToast(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoadingPhoto = isUploading || isSubmitting

  return (
    <div className="px-4 py-5 flex flex-col gap-4">
      {/* Header: "Il mio piatto" */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🍽️</span>
        <h2 className="font-display text-xl font-semibold text-ink">Il mio piatto</h2>
      </div>

      {/* Foto hero */}
      {heroPhoto ? (
        <img
          src={heroPhoto.url}
          alt={myDish.name ?? ''}
          className="w-full rounded-xl object-cover"
          style={{ maxHeight: 192 }}
        />
      ) : (
        <div
          className="w-full rounded-xl flex items-center justify-center gap-2"
          style={{ height: 120, background: 'var(--color-parchment-dark)' }}
        >
          <span className="text-2xl">📷</span>
          <span className="font-body text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Nessuna foto
          </span>
        </div>
      )}

      {/* Nome piatto */}
      <div>
        <h3 className="font-display text-lg font-semibold text-ink leading-tight">
          {myDish.name}
        </h3>
        <p className="font-body text-sm mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
          Il tuo piatto
        </p>
      </div>

      {/* Sezioni info (semplici, non espandibili) */}
      {myDish.ingredients && (
        <div>
          <p
            className="font-body text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-ink-light)' }}
          >
            🥬 Ingredienti
          </p>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
            {myDish.ingredients}
          </p>
        </div>
      )}

      {myDish.recipe && (
        <div>
          <p
            className="font-body text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-ink-light)' }}
          >
            📋 Ricetta
          </p>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
            {myDish.recipe}
          </p>
        </div>
      )}

      {myDish.story && (
        <div>
          <p
            className="font-body text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: 'var(--color-ink-light)' }}
          >
            📖 Storia
          </p>
          <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--color-ink-mid)' }}>
            {myDish.story}
          </p>
        </div>
      )}

      {/* Griglia foto */}
      {allPhotos.length > 0 && (
        <div>
          <p
            className="font-body text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-ink-light)' }}
          >
            📸 Foto ({allPhotos.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {allPhotos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-lg overflow-hidden">
                <img
                  src={photo.url}
                  alt="Foto piatto"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foto extra in voting */}
      {phase === 'voting' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAddExtraPhoto}
            disabled={isLoadingPhoto}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoadingPhoto}
            className="w-full py-3 rounded-full font-body font-semibold border-2 cursor-pointer transition-opacity duration-150"
            style={{
              borderColor: 'var(--color-parchment-deep)',
              color: 'var(--color-ink-mid)',
              background: 'var(--color-parchment-dark)',
              opacity: isLoadingPhoto ? 0.6 : 1,
            }}
          >
            {isLoadingPhoto ? '⏳ Caricamento...' : '📷 Aggiungi foto extra'}
          </button>
        </>
      )}

      {/* Nota per fase preparation */}
      {phase === 'preparation' && (
        <p
          className="font-body text-xs text-center rounded-xl py-3 px-4"
          style={{
            color: 'var(--color-ink-light)',
            background: 'var(--color-parchment-dark)',
          }}
        >
          Puoi modificare il piatto dal pannello admin
        </p>
      )}
    </div>
  )
}
