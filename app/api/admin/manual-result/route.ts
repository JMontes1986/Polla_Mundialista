// app/api/admin/manual-result/route.ts
// Endpoint protegido para que el admin actualice resultados manualmente

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

interface ManualResultPayload {
  matchId: number
  homeScore: number
  awayScore: number
  status?: 'finished' | 'live' | 'scheduled'
}

export async function POST(request: Request) {
  // Autenticar usuario via Supabase (cookies de sesión)
  const cookieStore = cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Verificar rol admin
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
  }

  // Validar payload
  let body: ManualResultPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { matchId, homeScore, awayScore, status = 'finished' } = body

  if (
    typeof matchId !== 'number' ||
    typeof homeScore !== 'number' ||
    typeof awayScore !== 'number' ||
    homeScore < 0 || awayScore < 0
  ) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // Obtener estado anterior para log
  const { data: previousMatch } = await supabaseAdmin
    .from('matches')
    .select('home_score, away_score, status')
    .eq('id', matchId)
    .single()

  // Actualizar partido
  const { error: updateError } = await supabaseAdmin
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
      last_synced_at: new Date().toISOString(),
      sync_source: 'manual',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Registrar en admin_logs
  await supabaseAdmin.from('admin_logs').insert({
    admin_id: user.id,
    action: 'manual_result_update',
    target_type: 'match',
    target_id: String(matchId),
    old_value: previousMatch
      ? { home_score: previousMatch.home_score, away_score: previousMatch.away_score, status: previousMatch.status }
      : null,
    new_value: { home_score: homeScore, away_score: awayScore, status },
  })

  // Si el partido terminó, disparar cálculo de puntos vía función SQL
  if (status === 'finished') {
    const { error: calcError } = await supabaseAdmin.rpc('process_match_results', {
      p_match_id: matchId,
    })
    if (calcError) {
      console.error('[admin] process_match_results error:', calcError)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Partido ${matchId} actualizado: ${homeScore}-${awayScore} (${status})`,
  })
}
