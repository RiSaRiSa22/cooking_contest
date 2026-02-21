import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CreateCompetitionSchema = z.object({
  name: z.string().min(1),
  nickname: z.string().min(1),
  pinHash: z.string().min(1),
  allowGuests: z.boolean().optional().default(true),
  maxParticipants: z.number().int().positive().optional(),
})

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

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
    const parsed = CreateCompetitionSchema.safeParse(body)

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const { name, nickname, pinHash, allowGuests, maxParticipants } = parsed.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Generate unique 6-char code with uniqueness check (max 5 attempts)
    let code: string | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode()
      const { data: existing } = await supabase
        .from('competitions')
        .select('code')
        .eq('code', candidate)
        .maybeSingle()

      if (!existing) {
        code = candidate
        break
      }
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique code. Please retry.' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Insert competition
    const { data: competition, error: compError } = await supabase
      .from('competitions')
      .insert({
        name,
        code,
        admin_pwd_hash: pinHash,
        phase: 'preparation',
        allow_guests: allowGuests,
        max_participants: maxParticipants ?? null,
      })
      .select('id')
      .single()

    if (compError || !competition) {
      console.error('Competition insert error:', compError)
      return new Response(
        JSON.stringify({ error: 'Failed to create competition' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Insert admin participant
    const { data: participant, error: partError } = await supabase
      .from('participants')
      .insert({
        competition_id: competition.id,
        nickname,
        pin_hash: pinHash,
        role: 'admin',
      })
      .select('id')
      .single()

    if (partError || !participant) {
      console.error('Participant insert error:', partError)
      // Rollback competition
      await supabase.from('competitions').delete().eq('id', competition.id)
      return new Response(
        JSON.stringify({ error: 'Failed to create participant' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        code,
        competitionId: competition.id,
        participantId: participant.id,
        nickname,
        role: 'admin',
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
