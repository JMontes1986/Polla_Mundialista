import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

type PollDetailPageProps = {
  params: { id: string }
  searchParams?: {
    import?: string
    imported?: string
    updated?: string
    total?: string
    reason?: string
  }
}
type Poll = Pick<
  Database['public']['Tables']['polls']['Row'],
  'id' | 'name' | 'description' | 'owner_id' | 'is_public'
>
type Prediction = Pick<
  Database['public']['Tables']['predictions']['Row'],
  'match_id' | 'home_score_pred' | 'away_score_pred'
>
type Match = Pick<
  Database['public']['Tables']['matches']['Row'],
  'id' | 'phase' | 'match_date' | 'status' | 'lock_time'
> & {
  home_team: { short_name: string; flag_url: string | null } | null
  away_team: { short_name: string; flag_url: string | null } | null
}

const importMessages: Record<string, string> = {
  ok: 'Partidos importados desde API-Football.',
  partial: 'Importacion parcial desde API-Football. Algunos partidos no se pudieron guardar.',
  error: 'No se pudieron importar los partidos desde API-Football.',
  config: 'Faltan API_FOOTBALL_KEY o las variables de servidor de Supabase.',
}

export default async function PollDetailPage({ params, searchParams }: PollDetailPageProps) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const pollId = params.id
  const dataClient: any = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : supabase

  const [pollRes, memberRes, matchesRes, predictionsRes] = await Promise.all([
    dataClient.from('polls').select('id,name,description,owner_id,is_public').eq('id', pollId).single(),
    dataClient.from('poll_members').select('id').eq('poll_id', pollId).eq('user_id', user.id).maybeSingle(),
    dataClient.from('matches').select('id,phase,match_date,status,lock_time,home_team:teams!matches_home_team_id_fkey(short_name,flag_url),away_team:teams!matches_away_team_id_fkey(short_name,flag_url)').order('match_date'),
    dataClient.from('predictions').select('match_id,home_score_pred,away_score_pred').eq('poll_id', pollId).eq('user_id', user.id),
  ])

  const poll = pollRes.data as Poll | null
  if (!poll) redirect('/dashboard')
  if (!poll.is_public && poll.owner_id !== user.id && !memberRes.data) redirect('/dashboard')

  const predictions = (predictionsRes.data ?? []) as Prediction[]
  const matches = (matchesRes.data ?? []) as Match[]
  const predMap = new Map(predictions.map((p) => [p.match_id, p]))
  const isOwner = poll.owner_id === user.id
  const importMessage = searchParams?.import ? importMessages[searchParams.import] : null
  const importSummary = searchParams?.total
    ? ` Nuevos: ${searchParams.imported ?? 0} - actualizados: ${searchParams.updated ?? 0} - recibidos: ${searchParams.total}.`
    : ''
  const importReason = searchParams?.reason ? ` Detalle: ${searchParams.reason}` : ''

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

    const dataClient: any = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          { auth: { persistSession: false } }
        )
      : supabase

    const { data: poll } = await dataClient
      .from('polls')
      .select('owner_id,is_public')
      .eq('id', pollId)
      .single()
    const { data: member } = await dataClient
      .from('poll_members')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!poll || (!poll.is_public && poll.owner_id !== user.id && !member)) redirect('/dashboard')

    await dataClient.from('predictions').upsert([
      {
        poll_id: pollId,
        match_id: matchId,
        user_id: user.id,
        home_score_pred: home,
        away_score_pred: away,
      },
    ] as any)

    redirect(`/polls/${pollId}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-3xl font-black text-white">{poll.name}</h1>
        {isOwner && (
          <form action={`/api/polls/${pollId}/import-api-football`} method="post">
            <button type="submit" className="btn-primary whitespace-nowrap">
              Importar partidos
            </button>
          </form>
        )}
      </div>
      <p className="text-gray-400 mt-1 mb-6">{poll.description ?? 'Registra tus pronósticos para todos los partidos del mundial.'}</p>

      {importMessage && (
        <div className={`mb-5 rounded-xl border p-3 text-sm ${
          searchParams?.import === 'ok'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {importMessage}{importSummary}{importReason}
        </div>
      )}

      <div className="space-y-3">
        {matches.length === 0 && (
          <div className="card p-8 text-center">
            <h2 className="text-xl font-bold text-white mb-2">No hay partidos cargados</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              {isOwner
                ? 'Usa Importar partidos para traerlos desde API-Football y dejarlos disponibles para los pronosticos.'
                : 'El administrador de esta polla todavia no ha cargado partidos.'}
            </p>
          </div>
        )}
        {matches.map((m) => {
          const locked = Boolean(m.lock_time && new Date() >= new Date(m.lock_time))
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
