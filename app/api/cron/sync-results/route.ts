// app/api/cron/sync-results/route.ts
// Cron endpoint para Netlify (o cron externo), recomendado cada 5 minutos durante el Mundial
// Puedes invocarlo vía: /.netlify/functions/cron-sync-results (redirigido a este route handler)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncInplayMatches } from '../../../../lib/sportmonks'
import { fallbackSync } from '../../../../lib/thesportsdb'

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

  // 1. Intentar con Sportmonks (inplay)
  try {
    const smResult = await syncInplayMatches(supabase)
    if (smResult.updated > 0 || smResult.errors.length === 0) {
      result = { ...smResult, source: 'sportmonks' }
    } else {
      throw new Error('sportmonks returned 0 updates, trying fallback')
    }
  } catch (primaryErr) {
    console.warn('[cron] sportmonks failed, using TheSportsDB fallback:', primaryErr)

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
    source: result.source as 'sportmonks' | 'thesportsdb' | 'manual',
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
