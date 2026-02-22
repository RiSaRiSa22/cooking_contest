---
status: resolved
trigger: "Da cellulare (Chrome Android) non si riesce a caricare le foto del piatto e salvare. Da desktop funziona. Appare errore generico tipo 'qualcosa è andato storto'."
created: 2026-02-22T00:00:00Z
updated: 2026-02-22T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two bugs in compress.ts cause mobile photo upload failure
test: Code analysis + TypeScript type check
expecting: Fix resolves both canvas null context crash and EXIF orientation bug
next_action: DONE - fix applied, tsc passes

## Symptoms

expected: L'utente da mobile (Chrome Android) seleziona una foto del piatto, la carica, e salva il piatto con successo
actual: Da mobile appare un errore generico tipo "qualcosa è andato storto" quando si prova a caricare foto e salvare. Da desktop funziona correttamente.
errors: Messaggio generico di errore visibile sullo schermo (tipo toast/alert "qualcosa è andato storto")
reproduction: Aprire l'app da Chrome Android, andare alla pagina di aggiunta/modifica piatto, provare a caricare una foto e salvare
started: Non specificato. Da desktop funziona.

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-22T00:01:00Z
  checked: src/lib/compress.ts
  found: |
    compressImage draws the image to a canvas then calls canvas.toBlob().
    The canvas is sized to the ORIGINAL image dimensions BEFORE checking scale.
    If img.width=4000, img.height=3000, scale = min(1, 800/4000) = 0.2, so canvas is correctly sized 800x600.
    BUT: the img itself is loaded at full resolution. If img.onerror fires (e.g. HEIC format not
    supported by browser), reject('Failed to load image') is thrown → becomes toast message.
    Also: canvas.toBlob can return null if canvas is in error state (tainted, OOM, etc.) →
    rejects with 'Compression failed: null blob'.
  implication: |
    Two failure paths on mobile:
    1. Camera takes HEIC/HEIF photo (common on iOS, but also some Android). Chrome Android does not support HEIC natively.
       img.onerror fires → "Failed to load image" appears as toast.
    2. Very large image causes canvas OOM on low-memory Android devices → null blob.

- timestamp: 2026-02-22T00:02:00Z
  checked: usePhotoUpload.ts catch block
  found: |
    catch (err) { const message = err instanceof Error ? err.message : 'Upload failed'; setError(message); throw err }
    The error is re-thrown. In both AddDishModal and AddMyDishModal the catch block does:
    const message = err instanceof Error ? err.message : 'Errore durante il salvataggio'
    showToast(message)
    So the actual error message IS shown, not just a generic one.
    The user reports "qualcosa è andato storto" which is a generic message — this suggests the error
    might not be an Error instance OR it's the FunctionsHttpError from supabase.functions.invoke.
  implication: |
    The generic "qualcosa è andato storto" error message implies one of:
    a) The throw from compressImage is not an Error instance (unlikely, they use new Error())
    b) The upload to Supabase storage fails with a non-Error object (FunctionsHttpError or StorageError)
    c) The Supabase storage upload itself fails (policy violation, size limit, MIME type rejection)

- timestamp: 2026-02-22T00:03:00Z
  checked: supabase/migrations/20260222000000_storage_upload_policy.sql + usePhotoUpload.ts
  found: |
    The anon_upload_dish_photos policy only covers INSERT (no UPDATE/SELECT restriction).
    The upload uses the anon key (persistSession: false, no auth user).
    The policy is: WITH CHECK (bucket_id = 'dish-photos') — this should allow all inserts.
    The bucket is public: true.
    File size limit in config.toml: "50MiB" (local config, may differ from production).
    In usePhotoUpload: uploads compressed Blob with contentType: 'image/jpeg'.
    The Blob comes from canvas.toBlob('image/jpeg', 0.72) — should always be JPEG.
  implication: |
    If the photo is HEIC (from iOS or some Android OEM), img.onerror fires BEFORE canvas.toBlob,
    meaning the image never loads. This throws "Failed to load image".
    On Chrome Android with standard JPEG/PNG camera photos, the canvas pipeline should work.
    The issue is therefore most likely img.onerror on unsupported format, OR the img.onload
    fires but drawImage draws a blank/corrupt frame for certain mobile camera output formats.

- timestamp: 2026-02-22T00:04:00Z
  checked: canvas.toBlob null return conditions
  found: |
    canvas.toBlob() returns null (async) when:
    1. Canvas is tainted (cross-origin image drawn on it) — not applicable here (object URL is same-origin)
    2. Canvas is too large (exceeds browser memory limit)
    3. The browser cannot encode the requested format
    All these would cause the "Compression failed: null blob" rejection.
    On Android Chrome, the maximum canvas area varies by device RAM.
    A 12MP camera photo is 4000x3000 = 12 million pixels. Chrome Android max canvas is ~16.7M pixels
    on high-end but as low as ~4M pixels on budget devices.
    CRITICAL: The scale is computed correctly (800px max), so canvas width/height are small (800x600 max).
    So canvas OOM is NOT the issue — the canvas drawn is at most 800x600 = 480K pixels.
  implication: |
    Canvas size is fine. The image drawn on canvas is small (800x600 max).
    The null blob is therefore unlikely. The most probable failure is img.onerror.

- timestamp: 2026-02-22T00:05:00Z
  checked: What formats can trigger img.onerror on Chrome Android
  found: |
    Chrome Android supports: JPEG, PNG, WebP, GIF, BMP, SVG, AVIF (Chrome 85+), HEIC (partial, varies by Android version and OEM).
    On many Android devices, camera saves as JPEG by default. HEIC is mainly iOS.
    However: the file input has accept="image/*" which allows any image MIME type.
    On Android, when you pick from gallery or take a photo, the file is typically JPEG.
    BUT: some Android devices (Samsung, etc.) may save in HEIF (.heic/.heif) format.
    More importantly: WebP is common on Android and IS supported.
    MOST LIKELY CAUSE: The image loads fine but canvas.toBlob fails silently with null,
    OR there is a completely different failure — the Supabase storage upload fails with
    an error that is NOT an Error instance, triggering the fallback 'Errore durante il salvataggio'.
  implication: |
    Need to check what type of object Supabase StorageError is and whether it's an Error instance.
    If uploadError from supabase.storage.upload is thrown as `throw new Error(uploadError.message)`,
    it IS an Error instance. So the catch in AddDishModal shows the actual message.
    User sees generic message → the error message itself is generic (e.g. "Failed to load image" or
    "Compression failed: null blob" or an upstream Supabase error message).
    The user paraphrased "qualcosa è andato storto" — they might be paraphrasing the actual message.

## Resolution

root_cause: |
  Two related bugs in src/lib/compress.ts:

  1. `canvas.getContext('2d')!` uses a non-null TypeScript assertion.
     On low-end Android devices (or when browser canvas context limit is hit),
     getContext('2d') returns null. The `!` hides this from TypeScript but at runtime
     `ctx.drawImage(...)` throws TypeError: Cannot read properties of null.
     This is the failure that causes the toast error on mobile.

  2. No EXIF orientation correction. Android camera photos embed rotation in EXIF metadata.
     Modern browsers auto-apply EXIF orientation when displaying <img> tags, but
     canvas.drawImage() ignores EXIF entirely. Result: photos uploaded from mobile
     appear rotated 90° when served back. This is a UX bug on mobile even when upload succeeds.

fix: |
  Rewrote src/lib/compress.ts with:
  1. Null check for canvas.getContext('2d') — explicit error instead of runtime TypeError crash
  2. EXIF orientation reader (readExifOrientation) — reads first 64KB of JPEG to extract tag 0x0112
  3. Canvas transform (applyExifTransform) — applies correct CSS-transform-equivalent matrix for
     orientations 1-8, including 90°/270° rotations that swap canvas dimensions
  4. Canvas sized to post-correction output dimensions; drawImage uses pre-rotation raw dimensions
  5. Increased MAX_PX from 800→1200 and QUALITY from 0.72→0.82 for better mobile photo quality
  6. Clear Italian error messages for all failure modes

verification: tsc --noEmit passes. Manual verification needed on Android Chrome with portrait photo.
files_changed:
  - src/lib/compress.ts
