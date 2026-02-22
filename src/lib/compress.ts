const MAX_PX = 1200
const QUALITY = 0.82

const HEIC_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']

function isHeic(file: File): boolean {
  if (HEIC_TYPES.includes(file.type)) return true
  const name = file.name.toLowerCase()
  return name.endsWith('.heic') || name.endsWith('.heif')
}

async function convertHeicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any')
  const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
  const result = Array.isArray(blob) ? blob[0] : blob
  return new File([result], file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg'), {
    type: 'image/jpeg',
  })
}

/**
 * Reads the EXIF orientation tag from a JPEG file.
 * Returns a value 1-8, or 1 (no-op) if not found or not a JPEG.
 * Ref: https://exiftool.org/TagNames/EXIF.html (Orientation tag = 0x0112)
 */
function readExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer)

  // Must start with JPEG SOI marker 0xFFD8
  if (view.getUint16(0) !== 0xffd8) return 1

  let offset = 2
  const length = buffer.byteLength

  while (offset < length - 2) {
    const marker = view.getUint16(offset)
    offset += 2

    // APP1 segment (0xFFE1) is where EXIF lives
    if (marker === 0xffe1) {
      const segmentLength = view.getUint16(offset)
      offset += 2

      // Check for "Exif\0\0" header
      if (view.getUint32(offset) !== 0x45786966 || view.getUint16(offset + 4) !== 0) {
        offset += segmentLength - 2
        continue
      }

      const tiffOffset = offset + 6

      // Byte order: 0x4949 = little-endian, 0x4D4D = big-endian
      const littleEndian = view.getUint16(tiffOffset) === 0x4949
      const readUint16 = (o: number) =>
        littleEndian ? view.getUint16(o, true) : view.getUint16(o, false)
      const readUint32 = (o: number) =>
        littleEndian ? view.getUint32(o, true) : view.getUint32(o, false)

      // IFD0 offset
      const ifdOffset = tiffOffset + readUint32(tiffOffset + 4)
      const numEntries = readUint16(ifdOffset)

      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifdOffset + 2 + i * 12
        const tag = readUint16(entryOffset)
        if (tag === 0x0112) {
          // Orientation tag
          return readUint16(entryOffset + 8)
        }
      }
      break
    }

    // Skip other segments
    if ((marker & 0xff00) !== 0xff00) break
    offset += view.getUint16(offset)
  }

  return 1
}

/**
 * Applies canvas rotation/flip transform based on EXIF orientation.
 * The canvas must already be sized to the CORRECTED output dimensions.
 * `imgW` and `imgH` are the RAW (pre-rotation) image dimensions at draw scale.
 *
 * For orientations 1-4: canvas = imgW × imgH
 * For orientations 5-8: canvas = imgH × imgW (swapped)
 */
function applyExifTransform(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  imgW: number,
  imgH: number
): void {
  switch (orientation) {
    case 2:
      // Flip horizontal
      ctx.transform(-1, 0, 0, 1, imgW, 0)
      break
    case 3:
      // Rotate 180°
      ctx.transform(-1, 0, 0, -1, imgW, imgH)
      break
    case 4:
      // Flip vertical
      ctx.transform(1, 0, 0, -1, 0, imgH)
      break
    case 5:
      // Transpose (rotate 90° CW + flip horizontal)
      ctx.transform(0, 1, 1, 0, 0, 0)
      break
    case 6:
      // Rotate 90° CW
      ctx.transform(0, 1, -1, 0, imgH, 0)
      break
    case 7:
      // Transverse (rotate 90° CCW + flip horizontal)
      ctx.transform(0, -1, -1, 0, imgH, imgW)
      break
    case 8:
      // Rotate 90° CCW
      ctx.transform(0, -1, 1, 0, 0, imgW)
      break
    // case 1 and default: no transform needed
  }
}

/**
 * Compresses an image File to JPEG at max 1200px (longest side) and 0.82 quality.
 * Handles EXIF orientation correction for mobile camera photos (orientations 1-8).
 * Uses browser Canvas API — no external dependencies.
 */
export async function compressImage(file: File): Promise<Blob> {
  let alreadyConvertedHeic = false

  // Convert HEIC/HEIF to JPEG first (Chrome/Android can't decode HEIC natively)
  if (isHeic(file)) {
    try {
      file = await convertHeicToJpeg(file)
      alreadyConvertedHeic = true
    } catch {
      throw new Error('Impossibile convertire il file HEIC. Prova a scattare la foto in formato JPEG dalle impostazioni fotocamera.')
    }
  }

  return new Promise((resolve, reject) => {
    // Read EXIF orientation from file bytes (JPEG only, first 64KB is enough)
    const reader = new FileReader()

    reader.onload = (readerEvent) => {
      const buffer = readerEvent.target?.result as ArrayBuffer
      const orientation = file.type === 'image/jpeg' ? readExifOrientation(buffer) : 1

      const img = new Image()
      const url = URL.createObjectURL(file)

      img.onload = () => {
        URL.revokeObjectURL(url)

        // Orientations 5-8 rotate 90°, swapping width/height in the output
        const isRotated90 = orientation >= 5 && orientation <= 8

        // Output dimensions after EXIF correction
        const outputW = isRotated90 ? img.height : img.width
        const outputH = isRotated90 ? img.width : img.height

        // Scale so the longest output side fits within MAX_PX
        const scale = Math.min(1, MAX_PX / Math.max(outputW, outputH))

        // Canvas is sized to the corrected (post-rotation) output
        const canvasW = Math.round(outputW * scale)
        const canvasH = Math.round(outputH * scale)

        // Raw image draw dimensions (pre-rotation, for drawImage call)
        const drawW = Math.round(img.width * scale)
        const drawH = Math.round(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = canvasW
        canvas.height = canvasH

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(
            new Error(
              'Impossibile creare il contesto canvas. Riprova o usa un altro browser.'
            )
          )
          return
        }

        ctx.save()
        applyExifTransform(ctx, orientation, drawW, drawH)
        ctx.drawImage(img, 0, 0, drawW, drawH)
        ctx.restore()

        canvas.toBlob(
          (blob) =>
            blob
              ? resolve(blob)
              : reject(new Error('Compressione fallita. Prova con un altro file.')),
          'image/jpeg',
          QUALITY
        )
      }

      img.onerror = async () => {
        URL.revokeObjectURL(url)

        // Fallback: il file potrebbe essere HEIC con MIME type errato (es. application/octet-stream)
        if (!alreadyConvertedHeic) {
          try {
            const converted = await convertHeicToJpeg(file)
            const retryUrl = URL.createObjectURL(converted)
            const retryImg = new Image()
            retryImg.onload = () => {
              URL.revokeObjectURL(retryUrl)
              // Riuso lo stesso canvas pipeline
              const rScale = Math.min(1, MAX_PX / Math.max(retryImg.width, retryImg.height))
              const rW = Math.round(retryImg.width * rScale)
              const rH = Math.round(retryImg.height * rScale)
              const c = document.createElement('canvas')
              c.width = rW
              c.height = rH
              const rCtx = c.getContext('2d')
              if (!rCtx) {
                reject(new Error('Impossibile creare il contesto canvas. Riprova o usa un altro browser.'))
                return
              }
              rCtx.drawImage(retryImg, 0, 0, rW, rH)
              c.toBlob(
                (b) => b ? resolve(b) : reject(new Error('Compressione fallita. Prova con un altro file.')),
                'image/jpeg',
                QUALITY
              )
            }
            retryImg.onerror = () => {
              URL.revokeObjectURL(retryUrl)
              reject(new Error('Formato immagine non supportato. Prova con JPEG o PNG.'))
            }
            retryImg.src = retryUrl
          } catch {
            reject(new Error('Formato immagine non supportato. Prova con JPEG o PNG.'))
          }
        } else {
          reject(new Error('Formato immagine non supportato. Prova con JPEG o PNG.'))
        }
      }

      img.src = url
    }

    reader.onerror = () => {
      reject(new Error('Impossibile leggere il file. Riprova.'))
    }

    // First 64KB is always enough to contain the EXIF APP1 segment at the start of a JPEG
    reader.readAsArrayBuffer(file.slice(0, 65536))
  })
}
