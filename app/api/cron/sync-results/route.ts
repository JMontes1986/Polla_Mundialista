// app/api/cron/sync-results/route.ts
// Cron endpoint para Netlify (o cron externo), recomendado cada 5 minutos durante el Mundial
// Puedes invocarlo vía: /.netlify/functions/cron-sync-results (redirigido a este route handler)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncResults } from '@/lib/football-data'
import { fallbackSync } from '@/lib/thesportsdb'

// Cliente admin con service role (solo en server)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: Request) {
  // Verificar secret del cron (enviar Authorization: Bearer <CRON_SECRET>)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const supabase = getAdminClient()

  let result = { updated: 0, errors: [] as string[], source: '' }

  // 1. Intentar con football-data.org
  try {
    const fdResult = await syncResults(supabase)
    if (fdResult.updated > 0 || fdResult.errors.length === 0) {
      result = { ...fdResult, source: 'football_data' }
    } else {
      throw new Error('football-data returned 0 updates, trying fallback')
    }
  } catch (primaryErr) {
    console.warn('[cron] football-data failed, using TheSportsDB fallback:', primaryErr)

    // 2. Fallback: TheSportsDB
    try {
      const tsdbResult = await fallbackSync(supabase)
      result = { ...tsdbResult, source: 'thesportsdb' }
    } catch (fallbackErr) {
      console.error('[cron] Both APIs failed:', fallbackErr)
      result = {
        updated: 0,
        errors: [String(primaryErr), String(fallbackErr)],
        source: 'none',
      }
    }
  }

  const duration = Date.now() - startTime

  // Guardar log de sincronización
  await supabase.from('sync_logs').insert({
    source: result.source as 'football_data' | 'thesportsdb' | 'manual',
    matches_updated: result.updated,
    success: result.errors.length === 0,
    error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
    duration_ms: duration,
  })

  return NextResponse.json({
    success: result.errors.length === 0,
    updated: result.updated,
    source: result.source,
    duration_ms: duration,
    errors: result.errors,
  })
}
