import type { Database } from '../../types/database.types'

type Photo = Database['public']['Tables']['photos']['Row']

interface PhotoGridProps {
  photos: Photo[]
  maxDisplay?: number
}

export function PhotoGrid({ photos, maxDisplay }: PhotoGridProps) {
  if (photos.length === 0) return null

  const visiblePhotos = maxDisplay ? photos.slice(0, maxDisplay) : photos
  const hiddenCount = maxDisplay ? Math.max(0, photos.length - maxDisplay) : 0
  const count = visiblePhotos.length

  // Single photo: full width
  if (count === 1) {
    return (
      <div className="w-full aspect-square rounded-lg overflow-hidden">
        <img
          src={visiblePhotos[0].url}
          alt="Foto piatto"
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  // Two photos: 2-column layout
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
        {visiblePhotos.map((photo) => (
          <div key={photo.id} className="aspect-square">
            <img
              src={photo.url}
              alt="Foto piatto"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    )
  }

  // 3+ photos: 3-column grid
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
      {visiblePhotos.map((photo, index) => {
        const isLast = index === visiblePhotos.length - 1
        const showOverlay = isLast && hiddenCount > 0

        return (
          <div key={photo.id} className="relative aspect-square">
            <img
              src={photo.url}
              alt="Foto piatto"
              className="w-full h-full object-cover"
            />
            {showOverlay && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white font-body font-bold text-lg">+{hiddenCount}</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
