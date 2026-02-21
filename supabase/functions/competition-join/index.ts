import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const JoinCompetitionSchema = z.object({
  code: z.string().min(1),
  nickname: z.string().min(1),
  pinHash: z.string().min(1),
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
    const parsed = JoinCompetitionSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { code, nickname, pinHash } = parsed.data
    const upperCode = code.toUpperCase()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Look up competition by code
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .select('id, name, code, admin_pwd_hash, max_participants, allow_guests, phase')
      .eq('code', upperCode)
      .maybeSingle()

    if (compError || !competition) {
      return new Response(
        JSON.stringify({ error: 'Gara non trovata' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting: count login_attempts in last 15 min for this code+nickname
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { count: attemptCount, error: attemptCountError } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('competition_code', upperCode)
      .eq('nickname', nickname)
      .gte('attempted_at', fifteenMinAgo)

    if (attemptCountError) {
      console.error('Rate limit check error:', attemptCountError)
    }

    if ((attemptCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: 'Troppi tentativi. Riprova tra 15 minuti.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Log this attempt
    await supabase
      .from('login_attempts')
      .insert({ competition_code: upperCode, nickname })

    // Check if participant with this nickname already exists
    const { data: existingParticipant } = await supabase
      .from('participants')
      .select('id, nickname, pin_hash, role')
      .eq('competition_id', competition.id)
      .eq('nickname', nickname)
      .maybeSingle()

    if (existingParticipant) {
      // Case B: Re-auth — compare pinHash
      if (existingParticipant.pin_hash === pinHash) {
        return new Response(
          JSON.stringify({
            competitionId: competition.id,
            participantId: existingParticipant.id,
            nickname: existingParticipant.nickname,
            role: existingParticipant.role,
            competitionName: competition.name,
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      // Check admin PIN (AUTH-06: admin can re-auth via competition admin_pwd_hash)
      if (competition.admin_pwd_hash === pinHash) {
        return new Response(
          JSON.stringify({
            competitionId: competition.id,
            participantId: existingParticipant.id,
            nickname: existingParticipant.nickname,
            role: existingParticipant.role,
            competitionName: competition.name,
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      // Neither PIN matched
      return new Response(
        JSON.stringify({ error: 'PIN errato' }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Case A: New participant
    // Check max_participants limit
    if (competition.max_participants !== null) {
      const { count: participantCount } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('competition_id', competition.id)

      if ((participantCount ?? 0) >= competition.max_participants) {
        return new Response(
          JSON.stringify({ error: 'Gara al completo' }),
          { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Insert new participant
    const { data: newParticipant, error: insertError } = await supabase
      .from('participants')
      .insert({
        competition_id: competition.id,
        nickname,
        pin_hash: pinHash,
        role: 'participant',
      })
      .select('id')
      .single()

    if (insertError || !newParticipant) {
      console.error('Participant insert error:', insertError)
      return new Response(
        JSON.stringify({ error: 'Errore durante la registrazione' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        competitionId: competition.id,
        participantId: newParticipant.id,
        nickname,
        role: 'participant',
        competitionName: competition.name,
      }),
      { status: 201, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
