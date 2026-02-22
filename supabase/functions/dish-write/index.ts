import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DishWriteSchema = z.object({
  competitionId: z.string().uuid(),
  participantId: z.string().uuid(),
  dishId: z.string().uuid().optional(),       // present = edit, absent = create
  name: z.string().min(1).max(100),
  chefName: z.string().min(1).max(50),
  ingredients: z.string().max(2000).optional().default(''),
  recipe: z.string().max(5000).optional().default(''),
  story: z.string().max(2000).optional().default(''),
  photoUrls: z.array(z.string().url()).max(10).optional().default([]),
  isExtra: z.boolean().optional().default(false),
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
    const parsed = DishWriteSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const {
      competitionId,
      participantId,
      dishId,
      name,
      chefName,
      ingredients,
      recipe,
      story,
      photoUrls,
      isExtra,
    } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // 1. Fetch participant and verify they belong to this competition
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

    const isAdmin = participant.role === 'admin'
    const isEditing = !!dishId

    // 2. Non-admin authorization checks
    if (!isAdmin) {
      // Fetch competition to check phase
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('phase')
        .eq('id', competitionId)
        .maybeSingle()

      if (compError || !competition) {
        return new Response(
          JSON.stringify({ error: 'Gara non trovata' }),
          { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      // isExtra carve-out (DISH-06): participants can add extra photos during voting
      if (isExtra && competition.phase === 'voting' && isEditing) {
        // Verify the participant owns this dish
        const { data: existingDish } = await supabase
          .from('dishes')
          .select('participant_id')
          .eq('id', dishId)
          .maybeSingle()

        if (!existingDish || existingDish.participant_id !== participantId) {
          return new Response(
            JSON.stringify({ error: 'Non puoi modificare il piatto di un altro partecipante' }),
            { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
        // isExtra + voting + own dish → allowed, fall through to mutation
      } else {
        // Normal phase gate: only preparation allowed
        if (competition.phase !== 'preparation') {
          return new Response(
            JSON.stringify({ error: 'Piatti modificabili solo in fase preparazione' }),
            { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }

        if (!isEditing) {
          // Creating: check no existing dish for this participant (max 1, DISH-02)
          const { data: existingDish } = await supabase
            .from('dishes')
            .select('id')
            .eq('competition_id', competitionId)
            .eq('participant_id', participantId)
            .maybeSingle()

          if (existingDish) {
            return new Response(
              JSON.stringify({ error: 'Hai già aggiunto un piatto per questa gara' }),
              { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Editing: verify dish belongs to this participant (DISH-03)
          const { data: existingDish } = await supabase
            .from('dishes')
            .select('participant_id')
            .eq('id', dishId)
            .maybeSingle()

          if (!existingDish || existingDish.participant_id !== participantId) {
            return new Response(
              JSON.stringify({ error: 'Non puoi modificare il piatto di un altro partecipante' }),
              { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
            )
          }
        }
      }
    }

    // 3. Mutation
    let dish

    if (!isEditing) {
      // CREATE: INSERT dish (use provided dishId as PK if given, else let DB generate)
      const insertData: Record<string, unknown> = {
        competition_id: competitionId,
        participant_id: participantId,
        name,
        chef_name: chefName,
        ingredients: ingredients || null,
        recipe: recipe || null,
        story: story || null,
      }
      if (dishId) insertData.id = dishId

      const { data: newDish, error: dishError } = await supabase
        .from('dishes')
        .insert(insertData)
        .select()
        .single()

      if (dishError || !newDish) {
        console.error('Dish insert error:', dishError)
        return new Response(
          JSON.stringify({ error: 'Errore durante la creazione del piatto' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      dish = newDish

      // Insert photo records
      if (photoUrls.length > 0) {
        const photoInserts = photoUrls.map((url, index) => ({
          dish_id: dish.id,
          url,
          order: index,
          is_extra: isExtra,
        }))

        const { error: photosError } = await supabase
          .from('photos')
          .insert(photoInserts)

        if (photosError) {
          console.error('Photos insert error:', photosError)
          // Don't fail the whole operation — dish was created
        }
      }
    } else {
      // EDIT: UPDATE dish record
      const { data: updatedDish, error: dishError } = await supabase
        .from('dishes')
        .update({
          name,
          chef_name: chefName,
          ingredients: ingredients || null,
          recipe: recipe || null,
          story: story || null,
        })
        .eq('id', dishId)
        .select()
        .single()

      if (dishError || !updatedDish) {
        console.error('Dish update error:', dishError)
        return new Response(
          JSON.stringify({ error: 'Piatto non trovato' }),
          { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      dish = updatedDish

      // UPSERT photos: delete old ones, insert new ones
      await supabase.from('photos').delete().eq('dish_id', dishId)

      if (photoUrls.length > 0) {
        const photoInserts = photoUrls.map((url, index) => ({
          dish_id: dishId,
          url,
          order: index,
          is_extra: isExtra,
        }))

        const { error: photosError } = await supabase
          .from('photos')
          .insert(photoInserts)

        if (photosError) {
          console.error('Photos upsert error:', photosError)
        }
      }
    }

    // Fetch updated photos
    const { data: photos } = await supabase
      .from('photos')
      .select()
      .eq('dish_id', dish.id)
      .order('order')

    return new Response(
      JSON.stringify({ dish, photos: photos ?? [] }),
      {
        status: isEditing ? 200 : 201,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
