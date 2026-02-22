import { useState, useRef, useEffect, useCallback } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { useToast } from '../../../components/ui/Toast'
import { usePhotoUpload } from '../../../hooks/usePhotoUpload'
import { supabase } from '../../../lib/supabase'
import { useVoterStore } from '../../../store/voterStore'
import { useSessionStore } from '../../../store/sessionStore'
import { useParams } from 'react-router'

interface EditDish {
  id: string
  name: string | null
  chef_name: string | null
  ingredients: string | null
  recipe: string | null
  story: string | null
  photos: Array<{ id: string; url: string }>
}

interface AddMyDishModalProps {
  open: boolean
  onClose: () => void
  editDish?: EditDish | null
}

export function AddMyDishModal({ open, onClose, editDish }: AddMyDishModalProps) {
  const { code } = useParams<{ code: string }>()
  const session = useSessionStore((s) => s.getSession(code!))
  const competition = useVoterStore((s) => s.competition)
  const setMyDishId = useVoterStore((s) => s.setMyDishId)
  const setDishes = useVoterStore((s) => s.setDishes)
  const dishes = useVoterStore((s) => s.dishes)

  const { show: showToast } = useToast()
  const { uploadPhotos, isUploading } = usePhotoUpload()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [chefName, setChefName] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [recipe, setRecipe] = useState('')
  const [story, setStory] = useState('')
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [newFilePreviews, setNewFilePreviews] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<Array<{ id: string; url: string }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditing = !!editDish

  const resetForm = useCallback(() => {
    if (editDish) {
      setName(editDish.name ?? '')
      setChefName(editDish.chef_name ?? '')
      setIngredients(editDish.ingredients ?? '')
      setRecipe(editDish.recipe ?? '')
      setStory(editDish.story ?? '')
      setExistingPhotos(editDish.photos ?? [])
    } else {
      setName('')
      setChefName(session?.nickname ?? '')
      setIngredients('')
      setRecipe('')
      setStory('')
      setExistingPhotos([])
    }
    setNewFiles([])
    setNewFilePreviews([])
  }, [session?.nickname, editDish])

  useEffect(() => {
    if (open) resetForm()
  }, [open, resetForm])

  useEffect(() => {
    return () => {
      newFilePreviews.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [newFilePreviews])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    newFilePreviews.forEach((url) => URL.revokeObjectURL(url))

    setNewFiles((prev) => [...prev, ...files])
    setNewFilePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeNewFile(index: number) {
    URL.revokeObjectURL(newFilePreviews[index])
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
    setNewFilePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingPhoto(index: number) {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index))
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
      const dishId = isEditing ? editDish!.id : crypto.randomUUID()
      let newPhotoUrls: string[] = []

      if (newFiles.length > 0) {
        newPhotoUrls = await uploadPhotos(newFiles, dishId)
      }

      const allPhotoUrls = [...existingPhotos.map((p) => p.url), ...newPhotoUrls]

      const { data, error } = await supabase.functions.invoke('dish-write', {
        body: {
          competitionId: competition.id,
          participantId: session.participantId,
          dishId,
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

      const result = data as { dish: Record<string, unknown>; photos: Array<{ id: string; url: string; display_order: number }> }
      const photos = (result.photos ?? []).map((p, i) => ({
        id: p.id,
        url: p.url,
        order: p.display_order ?? i,
        dish_id: dishId,
        is_extra: false,
        created_at: new Date().toISOString(),
      }))

      if (isEditing) {
        // Update existing dish in store
        const updatedDish = {
          ...dishes.find((d) => d.id === dishId)!,
          name: name.trim(),
          chef_name: chefName.trim(),
          ingredients: ingredients.trim() || null,
          recipe: recipe.trim() || null,
          story: story.trim() || null,
          photos,
        }
        setDishes(dishes.map((d) => (d.id === dishId ? updatedDish : d)))
        showToast('Piatto modificato!')
      } else {
        setMyDishId(dishId)
        const newDish = {
          id: dishId,
          name: name.trim(),
          chef_name: chefName.trim(),
          ingredients: ingredients.trim() || null,
          recipe: recipe.trim() || null,
          story: story.trim() || null,
          competition_id: competition.id,
          participant_id: null,
          created_at: new Date().toISOString(),
          photos,
        }
        setDishes([...dishes, newDish])
        showToast('Piatto aggiunto!')
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

  return (
    <Modal isOpen={open} onClose={onClose} variant="bottom-sheet" title={isEditing ? 'Modifica il tuo piatto' : 'Aggiungi il tuo piatto'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {/* Photos */}
        <div className="flex flex-col gap-2">
          <label className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink-light">
            Foto
          </label>

          {existingPhotos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {existingPhotos.map((photo, index) => (
                <div key={photo.id} className="relative w-20 h-20 rounded-lg overflow-hidden">
                  <img src={photo.url} alt="Foto esistente" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeExistingPhoto(index)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full text-white text-xs flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

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
            {isLoading ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Aggiungi piatto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
