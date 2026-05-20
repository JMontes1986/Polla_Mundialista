import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const pollId = params.id

  const [pollRes, matchesRes, predictionsRes] = await Promise.all([
    supabase.from('polls').select('id,name,description').eq('id', pollId).single(),
    supabase.from('matches').select('id,phase,match_date,status,lock_time,home_team:teams!matches_home_team_id_fkey(short_name,flag_url),away_team:teams!matches_away_team_id_fkey(short_name,flag_url)').order('match_date'),
    supabase.from('predictions').select('match_id,home_score_pred,away_score_pred').eq('poll_id', pollId).eq('user_id', user.id),
  ])

  const poll = pollRes.data
  if (!poll) redirect('/dashboard')

  const predMap = new Map((predictionsRes.data ?? []).map((p: any) => [p.match_id, p]))

  async function savePrediction(formData: FormData) {
    'use server'
    const cookieStore = cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const pollId = String(formData.get('pollId'))
    const matchId = Number(formData.get('matchId'))
    const home = Number(formData.get('homeScore'))
    const away = Number(formData.get('awayScore'))

    if (Number.isNaN(matchId) || Number.isNaN(home) || Number.isNaN(away)) return

    await supabase.from('predictions').upsert({
      poll_id: pollId,
      match_id: matchId,
      user_id: user.id,
      home_score_pred: home,
      away_score_pred: away,
    })

    redirect(`/polls/${pollId}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black text-white">{poll.name}</h1>
      <p className="text-gray-400 mt-1 mb-6">{poll.description ?? 'Registra tus pronósticos para todos los partidos del mundial.'}</p>

      <div className="space-y-3">
        {(matchesRes.data ?? []).map((m: any) => {
          const locked = m.lock_time && new Date() >= new Date(m.lock_time)
          const pred = predMap.get(m.id)
          return (
            <form key={m.id} action={savePrediction} className="card p-4">
              <input type="hidden" name="pollId" value={pollId} />
              <input type="hidden" name="matchId" value={m.id} />
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">{new Date(m.match_date).toLocaleString('es-CO')} · {m.phase}</span>
                {locked && <span className="text-xs text-red-400">Cerrado</span>}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
                <div className="font-bold text-white flex items-center gap-2"><span>{m.home_team?.flag_url ?? '🏳️'}</span>{m.home_team?.short_name}</div>
                <input name="homeScore" type="number" min={0} defaultValue={pred?.home_score_pred ?? ''} disabled={locked} className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-center" />
                <div className="font-bold text-white flex items-center gap-2 justify-end">{m.away_team?.short_name}<span>{m.away_team?.flag_url ?? '🏳️'}</span></div>
                <input name="awayScore" type="number" min={0} defaultValue={pred?.away_score_pred ?? ''} disabled={locked} className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-center" />
              </div>
              {!locked && <button className="mt-3 btn-secondary text-sm">Guardar</button>}
            </form>
          )
        })}
      </div>
    </div>
  )
}
