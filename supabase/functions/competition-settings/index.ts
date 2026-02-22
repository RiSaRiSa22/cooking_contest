import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SettingsSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('advance_phase'),
    competitionId: z.string().uuid(),
    participantId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('reset_votes'),
    competitionId: z.string().uuid(),
    participantId: z.string().uuid(),
  }),
])

const PHASE_ORDER: Record<string, string> = {
  preparation: 'voting',
  voting: 'finished',
}

Deno.serve(async (req) => {
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
    const parsed = SettingsSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { action, competitionId, participantId } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Verify caller is admin for this competition
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .select('role, competition_id')
      .eq('id', participantId)
      .eq('competition_id', competitionId)
      .maybeSingle()

    if (partError || !participant) {
      return new Response(
        JSON.stringify({ error: 'Partecipante non trovato' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (participant.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Accesso negato: solo l\'admin puo eseguire questa azione' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'advance_phase') {
      // Fetch current competition phase
      const { data: competition, error: compError } = await supabase
        .from('competitions')
        .select('phase')
        .eq('id', competitionId)
        .single()

      if (compError || !competition) {
        return new Response(
          JSON.stringify({ error: 'Gara non trovata' }),
          { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      if (competition.phase === 'finished') {
        return new Response(
          JSON.stringify({ error: 'Gara gia conclusa' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      const nextPhase = PHASE_ORDER[competition.phase]
      if (!nextPhase) {
        return new Response(
          JSON.stringify({ error: 'Fase non valida' }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabase
        .from('competitions')
        .update({ phase: nextPhase })
        .eq('id', competitionId)

      if (updateError) {
        console.error('Phase update error:', updateError)
        return new Response(
          JSON.stringify({ error: 'Errore durante l\'aggiornamento della fase' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ phase: nextPhase }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reset_votes') {
      const { count, error: deleteError } = await supabase
        .from('votes')
        .delete({ count: 'exact' })
        .eq('competition_id', competitionId)

      if (deleteError) {
        console.error('Reset votes error:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Errore durante il reset dei voti' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, deletedCount: count ?? 0 }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Should never reach here due to discriminated union
    return new Response(
      JSON.stringify({ error: 'Azione non supportata' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
