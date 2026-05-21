import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()
  const message = 'Cron sin APIs externas. Usa Montar Mundial y resultados manuales.'

  await supabase.from('sync_logs').insert({
    source: 'manual',
    matches_updated: 0,
    success: true,
    error_message: message,
    duration_ms: 0,
  })

  return NextResponse.json({
    success: true,
    updated: 0,
    source: 'manual',
    duration_ms: 0,
    message,
  })
}
