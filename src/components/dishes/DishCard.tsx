import { Button } from '../ui/Button'
import { PhotoGrid } from './PhotoGrid'
import type { DishWithPhotos } from '../../store/competitionStore'

interface DishCardProps {
  dish: DishWithPhotos
  onEdit?: () => void
  onDelete?: () => void
  showActions?: boolean
}

export function DishCard({ dish, onEdit, onDelete, showActions = false }: DishCardProps) {
  const ingredientsPreview = dish.ingredients
    ? dish.ingredients.length > 80
      ? dish.ingredients.slice(0, 80) + '...'
      : dish.ingredients
    : null

  return (
    <div className="rounded-xl shadow-sm bg-white overflow-hidden">
      {/* Photo section */}
      {dish.photos.length > 0 ? (
        <PhotoGrid photos={dish.photos} maxDisplay={3} />
      ) : (
        <div
          className="w-full h-32 flex items-center justify-center"
          style={{ background: 'var(--color-parchment-dark)' }}
        >
          <span className="text-2xl mr-2">📷</span>
          <span className="font-body text-sm" style={{ color: 'var(--color-ink-light)' }}>
            Nessuna foto
          </span>
        </div>
      )}

      {/* Body */}
      <div className="px-4 pt-3 pb-2">
        <h3 className="font-display text-lg font-bold text-ink leading-tight">{dish.name}</h3>
        <p className="font-body text-sm mt-0.5" style={{ color: 'var(--color-ink-light)' }}>
          👨‍🍳 {dish.chef_name}
        </p>
        {ingredientsPreview && (
          <p className="font-body text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
            {ingredientsPreview}
          </p>
        )}
      </div>

      {/* Footer with actions */}
      {showActions && (
        <div className="px-4 pb-3 flex gap-2 justify-end">
          {onEdit && (
            <Button
              variant="ghost-dark"
              size="sm"
              onClick={onEdit}
              className="text-sm px-4 py-2"
            >
              ✏️ Modifica
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost-dark"
              size="sm"
              onClick={onDelete}
              className="text-sm px-4 py-2"
              style={{ color: 'var(--color-ember)' }}
            >
              🗑️ Elimina
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
