// app/dashboard/page.tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

async function getDashboardData(userId: string, supabase: ReturnType<typeof createServerClient<Database>>) {
  const today = new Date()
  const threeDaysAhead = new Date(today)
  threeDaysAhead.setDate(today.getDate() + 3)

  const [profileRes, pollsRes, upcomingMatchesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase
      .from('poll_members')
      .select('points, rank, polls(id, name, invite_code)')
      .eq('user_id', userId)
      .limit(5),
    supabase
      .from('matches')
      .select(`
        id, phase, match_date, lock_time, status, home_score, away_score,
        home_team:teams!matches_home_team_id_fkey(name, short_name, flag_url),
        away_team:teams!matches_away_team_id_fkey(name, short_name, flag_url)
      `)
      .gte('match_date', today.toISOString())
      .lte('match_date', threeDaysAhead.toISOString())
      .order('match_date')
      .limit(6),
  ])

  return {
    profile: profileRes.data,
    polls: pollsRes.data ?? [],
    upcomingMatches: upcomingMatchesRes.data ?? [],
  }
}

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { profile, polls, upcomingMatches } = await getDashboardData(user.id, supabase)

  const phaseLabels: Record<string, string> = {
    groups: 'Grupos', round_of_32: '32avos', round_of_16: '16avos',
    quarterfinals: 'Cuartos', semifinals: 'Semis', third_place: '3er Puesto', final: 'Final',
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">
            Hola, <span className="text-amber-400">{profile?.username ?? 'Jugador'}</span> 👋
          </h1>
          <p className="text-gray-400 mt-1">Mundial 2026 · {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="btn-secondary text-sm">Panel Admin</Link>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Puntos totales', value: profile?.total_points ?? 0, icon: '🏅', color: 'text-amber-400' },
          { label: 'Pollas activas', value: polls.length, icon: '🎯', color: 'text-blue-400' },
          { label: 'Partidos hoy', value: upcomingMatches.filter(m => new Date(m.match_date).toDateString() === new Date().toDateString()).length, icon: '⚽', color: 'text-green-400' },
          { label: 'Mejor ranking', value: polls.length > 0 ? `#${Math.min(...polls.map(p => p.rank ?? 999))}` : '-', icon: '🏆', color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="card p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Próximos partidos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Próximos Partidos</h2>
            <Link href="/matches" className="text-sm text-amber-400 hover:underline">Ver todos →</Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="card p-8 text-center text-gray-500">
              No hay partidos próximos
            </div>
          ) : (
            upcomingMatches.map((match: any) => {
              const isLocked = match.lock_time && new Date() >= new Date(match.lock_time)
              const matchDate = new Date(match.match_date)
              return (
                <Link key={match.id} href={`/matches/${match.id}`}>
                  <div className="match-card">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`phase-badge ${
                        match.status === 'live' ? 'status-live' :
                        match.status === 'finished' ? 'status-finished' :
                        isLocked ? 'status-locked' : 'status-scheduled'
                      }`}>
                        {match.status === 'live' ? '● EN VIVO' :
                         match.status === 'finished' ? '✓ FINALIZADO' :
                         isLocked ? '🔒 CERRADO' : phaseLabels[match.phase]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {matchDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {matchDate.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-2xl">{match.home_team?.flag_url ?? '🏳️'}</span>
                        <span className="font-bold text-white">{match.home_team?.short_name}</span>
                      </div>
                      <div className="text-center px-4">
                        {match.status === 'finished' || match.status === 'live' ? (
                          <span className="text-xl font-black text-white">
                            {match.home_score ?? 0} - {match.away_score ?? 0}
                          </span>
                        ) : (
                          <span className="text-gray-500 font-bold">VS</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <span className="font-bold text-white">{match.away_team?.short_name}</span>
                        <span className="text-2xl">{match.away_team?.flag_url ?? '🏳️'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })
          )}
        </div>

        {/* Mis Pollas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Mis Pollas</h2>
            <Link href="/polls" className="text-sm text-amber-400 hover:underline">Ver todas →</Link>
          </div>

          <div className="space-y-3">
            <Link href="/polls/new">
              <div className="card p-4 border-dashed border-amber-500/30 hover:border-amber-500/60 transition-colors text-center cursor-pointer">
                <span className="text-amber-400 font-semibold text-sm">+ Crear nueva polla</span>
              </div>
            </Link>
            <Link href="/polls/join">
              <div className="card p-4 border-dashed border-blue-500/30 hover:border-blue-500/60 transition-colors text-center cursor-pointer">
                <span className="text-blue-400 font-semibold text-sm">🔗 Unirme con código</span>
              </div>
            </Link>

            {polls.map((pm: any) => (
              <Link key={pm.polls?.id} href={`/polls/${pm.polls?.id}`}>
                <div className="card p-4 hover:border-gray-600 transition-colors">
                  <p className="font-semibold text-white text-sm truncate">{pm.polls?.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-amber-400 font-bold">{pm.points} pts</span>
                    <span className="text-gray-500 text-xs">
                      {pm.rank ? `#${pm.rank}` : 'Sin ranking'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
