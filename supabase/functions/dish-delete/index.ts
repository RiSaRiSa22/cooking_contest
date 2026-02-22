import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DishDeleteSchema = z.object({
  competitionId: z.string().uuid(),
  participantId: z.string().uuid(),
  dishId: z.string().uuid(),
})

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    const parsed = DishDeleteSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { competitionId, participantId, dishId } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // 1. Verify participant exists and belongs to this competition
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .select('id, role, competition_id')
      .eq('id', participantId)
      .maybeSingle()

    if (partError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Partecipante non trovato' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (participant.competition_id !== competitionId) {
      return new Response(
        JSON.stringify({ error: 'Non autorizzato' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Only admin can delete (DISH-04)
    if (participant.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Solo l\'admin può eliminare i piatti' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verify dish exists and belongs to this competition
    const { data: dish } = await supabase
      .from('dishes')
      .select('id, competition_id')
      .eq('id', dishId)
      .maybeSingle()

    if (!dish || dish.competition_id !== competitionId) {
      return new Response(
        JSON.stringify({ error: 'Piatto non trovato' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Fetch photo URLs to clean up Storage (ORDER MATTERS — delete blobs before DB record)
    const { data: photos } = await supabase
      .from('photos')
      .select('url')
      .eq('dish_id', dishId)

    if (photos && photos.length > 0) {
      // Extract Storage paths from public URLs
      // URL format: https://<ref>.supabase.co/storage/v1/object/public/dish-photos/<path>
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const storagePaths = photos
        .map((p) => {
          const prefix = `${supabaseUrl}/storage/v1/object/public/dish-photos/`
          if (p.url.startsWith(prefix)) {
            return p.url.slice(prefix.length)
          }
          return null
        })
        .filter((path): path is string => path !== null)

      if (storagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('dish-photos')
          .remove(storagePaths)

        if (storageError) {
          console.error('Storage delete error (non-fatal):', storageError)
          // Non-fatal — continue with DB deletion
        }
      }
    }

    // 5. DELETE from dishes (CASCADE removes photos and votes rows)
    const { error: deleteError } = await supabase
      .from('dishes')
      .delete()
      .eq('id', dishId)

    if (deleteError) {
      console.error('Dish delete error:', deleteError)
      return new Response(
        JSON.stringify({ error: 'Errore durante l\'eliminazione del piatto' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
