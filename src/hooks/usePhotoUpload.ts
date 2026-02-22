import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/compress'

interface UsePhotoUploadReturn {
  uploadPhotos: (files: File[], dishId: string, isExtra?: boolean) => Promise<string[]>
  isUploading: boolean
  error: string | null
}

export function usePhotoUpload(): UsePhotoUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function uploadPhotos(
    files: File[],
    dishId: string,
    _isExtra = false
  ): Promise<string[]> {
    setIsUploading(true)
    setError(null)

    try {
      // Compress all files and upload in parallel
      // Storage handles concurrent uploads; dish-write EF is called after all URLs are collected
      const urls = await Promise.all(
        files.map(async (file) => {
          const compressed = await compressImage(file)
          const path = `${dishId}/${crypto.randomUUID()}.jpg`

          const { data, error: uploadError } = await supabase.storage
            .from('dish-photos')
            .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

          if (uploadError) throw new Error(uploadError.message)

          // getPublicUrl is synchronous — no await needed
          const { data: urlData } = supabase.storage
            .from('dish-photos')
            .getPublicUrl(data.path)

          return urlData.publicUrl
        })
      )

      return urls
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  return { uploadPhotos, isUploading, error }
}
