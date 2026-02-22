import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VoteReadSchema = z.object({
  competitionId: z.string().uuid(),
  participantId: z.string().uuid(),
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
    const parsed = VoteReadSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { competitionId, participantId } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Verify participant exists and belongs to this competition
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

    // Three parallel queries
    const [myVoteRes, myDishRes, allVotesRes] = await Promise.all([
      // 1. Current vote by this participant
      supabase
        .from('votes')
        .select('dish_id')
        .eq('competition_id', competitionId)
        .eq('participant_id', participantId)
        .maybeSingle(),

      // 2. Participant's own dish
      supabase
        .from('dishes')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('participant_id', participantId)
        .maybeSingle(),

      // 3. All votes for this competition (aggregate in JS)
      supabase
        .from('votes')
        .select('dish_id')
        .eq('competition_id', competitionId),
    ])

    const myVotedDishId = myVoteRes.data?.dish_id ?? null
    const myDishId = myDishRes.data?.id ?? null

    // Aggregate vote counts: dish_id → count
    const voteCountMap = new Map<string, number>()
    for (const row of allVotesRes.data ?? []) {
      voteCountMap.set(row.dish_id, (voteCountMap.get(row.dish_id) ?? 0) + 1)
    }
    const voteCounts = Array.from(voteCountMap.entries()).map(([dish_id, count]) => ({
      dish_id,
      count,
    }))

    return new Response(
      JSON.stringify({ myVotedDishId, myDishId, voteCounts }),
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
