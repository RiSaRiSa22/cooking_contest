import { useState } from 'react'
import { useParams } from 'react-router'
import { DishCard } from '../../../components/dishes/DishCard'
import { AddDishModal } from '../modals/AddDishModal'
import { ConfirmModal } from '../modals/ConfirmModal'
import { useToast } from '../../../components/ui/Toast'
import { useCompetitionStore, type DishWithPhotos } from '../../../store/competitionStore'
import { useSessionStore } from '../../../store/sessionStore'
import { supabase } from '../../../lib/supabase'

export function DishesTab() {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const dishes = useCompetitionStore((s) => s.dishes)
  const competition = useCompetitionStore((s) => s.competition)
  const removeDish = useCompetitionStore((s) => s.removeDish)

  const { show: showToast } = useToast()

  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editDish, setEditDish] = useState<DishWithPhotos | null>(null)
  const [deleteDish, setDeleteDish] = useState<DishWithPhotos | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function handleEdit(dish: DishWithPhotos) {
    setEditDish(dish)
    setAddModalOpen(true)
  }

  function handleAddNew() {
    setEditDish(null)
    setAddModalOpen(true)
  }

  function handleModalClose() {
    setAddModalOpen(false)
    setEditDish(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteDish || !session || !competition) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.functions.invoke('dish-delete', {
        body: {
          competitionId: competition.id,
          participantId: session.participantId,
          dishId: deleteDish.id,
        },
      })

      if (error) throw error

      removeDish(deleteDish.id)
      showToast('Piatto eliminato')
      setDeleteDish(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'eliminazione'
      showToast(message)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative min-h-full">
      <div className="px-4 py-6 flex flex-col gap-4">
        {dishes.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-5xl">🍳</span>
            <p className="font-body text-sm text-center" style={{ color: 'var(--color-ink-light)' }}>
              Nessun piatto ancora.
              <br />
              Aggiungi il primo!
            </p>
          </div>
        ) : (
          dishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              showActions={true}
              onEdit={() => handleEdit(dish)}
              onDelete={() => setDeleteDish(dish)}
            />
          ))
        )}
      </div>

      {/* FAB — Aggiungi piatto */}
      <button
        onClick={handleAddNew}
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0"
        style={{
          background: 'var(--color-ember)',
          boxShadow: '0 8px 32px rgba(196,75,27,.4)',
        }}
        aria-label="Aggiungi piatto"
      >
        <span className="text-white text-2xl font-bold leading-none">+</span>
      </button>

      {/* Add/Edit modal */}
      <AddDishModal
        open={addModalOpen}
        onClose={handleModalClose}
        editDish={editDish}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteDish}
        onClose={() => setDeleteDish(null)}
        onConfirm={handleDeleteConfirm}
        title="Elimina piatto"
        message={`Sei sicuro di voler eliminare "${deleteDish?.name}"? Questa azione è irreversibile.`}
        confirmLabel="Elimina"
        confirmVariant="ember"
        isLoading={isDeleting}
      />
    </div>
  )
}
