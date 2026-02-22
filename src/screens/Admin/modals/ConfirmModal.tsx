import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  confirmVariant?: 'ember' | 'gold'
  isLoading?: boolean
}

/**
 * Reusable confirmation modal shared by DishesTab (delete) and SettingsTab (phase advance / vote reset).
 */
export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Conferma',
  confirmVariant = 'ember',
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal isOpen={open} onClose={onClose} variant="center" title={title}>
      <p className="font-body text-sm text-ink-light mb-6">{message}</p>

      <div className="flex gap-3">
        <Button
          variant="ghost-dark"
          size="sm"
          onClick={onClose}
          disabled={isLoading}
          className="flex-1"
        >
          Annulla
        </Button>

        <Button
          variant={confirmVariant}
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Caricamento...
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
      </div>
    </Modal>
  )
}
