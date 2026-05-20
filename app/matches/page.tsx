import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

export default async function MatchesPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('id,phase,match_date,status,home_score,away_score,home_team:teams!matches_home_team_id_fkey(short_name,flag_url),away_team:teams!matches_away_team_id_fkey(short_name,flag_url)')
    .order('match_date')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-white mb-2">Todos los partidos del Mundial</h1>
      <p className="text-gray-400 mb-6">Calendario completo para que puedas hacer tu polla en cada partido.</p>
      <div className="space-y-3">
        {(matches ?? []).map((m: any) => (
          <div key={m.id} className="match-card">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>{m.phase}</span>
              <span>{new Date(m.match_date).toLocaleString('es-CO')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold"><span>{m.home_team?.flag_url ?? '🏳️'}</span>{m.home_team?.short_name}</div>
              <div className="text-white font-black">{m.status === 'finished' ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : 'VS'}</div>
              <div className="flex items-center gap-2 text-white font-bold">{m.away_team?.short_name}<span>{m.away_team?.flag_url ?? '🏳️'}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
