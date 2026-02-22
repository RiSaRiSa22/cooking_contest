import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VoteCastSchema = z.object({
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
    const parsed = VoteCastSchema.safeParse(body)

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
      .select('id, competition_id')
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

    // 2. Verify competition is in voting phase
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

    if (competition.phase !== 'voting') {
      return new Response(
        JSON.stringify({ error: 'Votazione non in corso' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verify dish exists and belongs to this competition
    const { data: dish, error: dishError } = await supabase
      .from('dishes')
      .select('id, competition_id, participant_id')
      .eq('id', dishId)
      .maybeSingle()

    if (dishError || !dish) {
      return new Response(
        JSON.stringify({ error: 'Piatto non trovato' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (dish.competition_id !== competitionId) {
      return new Response(
        JSON.stringify({ error: 'Piatto non in questa gara' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Prevent voting for own dish
    if (dish.participant_id === participantId) {
      return new Response(
        JSON.stringify({ error: 'Non puoi votare il tuo piatto' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Atomic upsert (1 vote per participant per competition)
    const { data: vote, error: voteError } = await supabase
      .from('votes')
      .upsert(
        { competition_id: competitionId, participant_id: participantId, dish_id: dishId },
        { onConflict: 'competition_id,participant_id' }
      )
      .select()
      .single()

    if (voteError || !vote) {
      console.error('Vote upsert error:', voteError)
      return new Response(
        JSON.stringify({ error: 'Errore durante il voto' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ vote }),
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
