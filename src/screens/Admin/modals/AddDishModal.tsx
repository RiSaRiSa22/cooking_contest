import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useToast } from '../../../components/ui/Toast'
import { usePhotoUpload } from '../../../hooks/usePhotoUpload'
import { supabase } from '../../../lib/supabase'
import { useCompetitionStore, type DishWithPhotos } from '../../../store/competitionStore'
import { useSessionStore } from '../../../store/sessionStore'
import { useParams } from 'react-router'

interface AddDishModalProps {
  open: boolean
  onClose: () => void
  editDish?: DishWithPhotos | null
}

export function AddDishModal({ open, onClose, editDish }: AddDishModalProps) {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const competition = useCompetitionStore((s) => s.competition)
  const addDish = useCompetitionStore((s) => s.addDish)
  const updateDish = useCompetitionStore((s) => s.updateDish)

  const { show: showToast } = useToast()
  const { uploadPhotos, isUploading } = usePhotoUpload()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [chefName, setChefName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [recipe, setRecipe] = useState('')
  const [story, setStory] = useState('')
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pre-fill form when editing
  const resetForm = useCallback(() => {
    if (editDish) {
      setName(editDish.name)
      setChefName(editDish.chef_name)
      setIngredients(editDish.ingredients ?? '')
      setRecipe(editDish.recipe ?? '')
      setStory(editDish.story ?? '')
      setExistingPhotoUrls(editDish.photos.map((p) => p.url))
    } else {
      setName('')
      setChefName('')
      setIngredients('')
      setRecipe('')
      setStory('')
      setExistingPhotoUrls([])
    }
    setNewFiles([])
    setNewFilePreviews([])
  }, [editDish])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  // Revoke object URLs on cleanup
  useEffect(() => {
    return () => {
      newFilePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [newFilePreviews])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    // Revoke old previews
    newFilePreviews.forEach((url) => URL.revokeObjectURL(url))

    setNewFiles((prev) => [...prev, ...files])
    setNewFilePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newFilePreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotoUrls((prev) => prev.filter((u) => u !== url))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!name.trim() || !chefName.trim()) {
      showToast('Nome piatto e nome cuoco sono obbligatori')
      return
    }

    if (!session || !competition) {
      showToast('Sessione non valida')
      return
    }

    setIsSubmitting(true)

    try {
      let newPhotoUrls: string[] = []

      // Generate dishId for new dish (used as PK so uploads go to the right folder)
      const dishId = editDish?.id ?? crypto.randomUUID()

      // Upload new photos if any
      if (newFiles.length > 0) {
        newPhotoUrls = await uploadPhotos(newFiles, dishId)
      }

      // Combine existing + new photo URLs
      const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls]

      // Call dish-write Edge Function
      const { data, error } = await supabase.functions.invoke('dish-write', {
        body: {
          competitionId: competition.id,
          participantId: session.participantId,
          dishId: dishId,
          name: name.trim(),
          chefName: chefName.trim(),
          ingredients: ingredients.trim(),
          recipe: recipe.trim(),
          story: story.trim(),
          photoUrls: allPhotoUrls,
          isExtra: false,
        },
      })

      if (error) throw error

      const result = data as { dish: Record<string, unknown>; photos: unknown[] }
      const updatedDish: DishWithPhotos = {
        ...result.dish,
        photos: result.photos,
      } as DishWithPhotos

      if (editDish) {
        updateDish(updatedDish)
        showToast('Piatto aggiornato')
      } else {
        addDish(updatedDish)
        showToast('Piatto aggiunto')
      }

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio'
      showToast(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isSubmitting || isUploading
  const title = editDish ? 'Modifica piatto' : 'Aggiungi piatto'

  return (
    <Modal isOpen={open} onClose={onClose} variant="bottom-sheet" title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Required fields */}
        <Input
          label="Nome piatto *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="es. Risotto ai funghi"
          required
          disabled={isLoading}
        />

        <Input
          label="Nome cuoco *"
          value={chefName}
          onChange={(e) => setChefName(e.target.value)}
          placeholder="es. Marco Rossi"
          required
          disabled={isLoading}
        />

        {/* Optional fields */}
        <div className="flex flex-col gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            Ingredienti
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="Lista ingredienti..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-3.5 text-[0.95rem] bg-parchment-dark border-[1.5px] border-parchment-deep rounded-[12px] text-ink outline-none transition-all duration-200 resize-none focus:border-ember focus:shadow-[0_0_0_3px_rgba(196,75,27,.12)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            Ricetta
          </label>
          <textarea
            value={recipe}
            onChange={(e) => setRecipe(e.target.value)}
            placeholder="Procedimento..."
            rows={4}
            disabled={isLoading}
            className="w-full px-4 py-3.5 text-[0.95rem] bg-parchment-dark border-[1.5px] border-parchment-deep rounded-[12px] text-ink outline-none transition-all duration-200 resize-none focus:border-ember focus:shadow-[0_0_0_3px_rgba(196,75,27,.12)]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            Storia
          </label>
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            placeholder="La storia di questo piatto..."
            rows={3}
            disabled={isLoading}
            className="w-full px-4 py-3.5 text-[0.95rem] bg-parchment-dark border-[1.5px] border-parchment-deep rounded-[12px] text-ink outline-none transition-all duration-200 resize-none focus:border-ember focus:shadow-[0_0_0_3px_rgba(196,75,27,.12)]"
          />
        </div>

        {/* Photos section */}
        <div className="flex flex-col gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            Foto
          </label>

          {/* Existing photos (edit mode) */}
          {existingPhotoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {existingPhotoUrls.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={url} alt="Foto esistente" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(url)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-white text-xs flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New file previews */}
          {newFilePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {newFilePreviews.map((preview, index) => (
                <div key={preview} className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={preview} alt="Nuova foto" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewFile(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-white text-xs flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <Button
            type="button"
            variant="ghost-dark"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            📷 Aggiungi foto
          </Button>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="ghost-dark"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Annulla
          </Button>
          <Button
            type="submit"
            variant="ember"
            size="sm"
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? 'Salvataggio...' : editDish ? 'Salva modifiche' : 'Aggiungi piatto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
