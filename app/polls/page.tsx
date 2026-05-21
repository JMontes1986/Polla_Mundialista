import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

async function getUserPolls(userId: string, supabase: ReturnType<typeof createServerClient<Database>>) {
  const [memberPollsRes, ownedPollsRes] = await Promise.all([
    supabase
      .from('poll_members')
      .select('points, rank, polls(id, name, invite_code, description)')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false }),
    supabase
      .from('polls')
      .select('id, name, invite_code, description')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false }),
  ])

  const pollsById = new Map<string, any>()

  ;((memberPollsRes.data ?? []) as any[]).forEach((memberPoll) => {
    if (memberPoll.polls?.id) {
      pollsById.set(memberPoll.polls.id, memberPoll)
    }
  })

  ;((ownedPollsRes.data ?? []) as any[]).forEach((poll) => {
    if (!pollsById.has(poll.id)) {
      pollsById.set(poll.id, {
        points: 0,
        rank: null,
        polls: poll,
      })
    }
  })

  return Array.from(pollsById.values())
}

type PollsPageProps = {
  searchParams?: { deleted?: string }
}

export default async function PollsPage({ searchParams }: PollsPageProps) {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const dataClient: any = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdminClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      )
    : supabase
  const polls = await getUserPolls(user.id, dataClient)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mis Pollas</h1>
          <p className="text-gray-400 mt-1">Gestiona tus ligas y entra a ver el ranking.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm text-center">
          Volver al inicio
        </Link>
      </div>

      {searchParams?.deleted === '1' && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm font-semibold text-green-400">
          Polla eliminada correctamente.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/polls/new" className="card p-5 border-dashed border-amber-500/40 hover:border-amber-500/70 transition-colors">
          <p className="text-amber-400 font-semibold">+ Crear nueva polla</p>
          <p className="text-xs text-gray-500 mt-2">Inicia una liga con tus amigos.</p>
        </Link>

        <Link href="/polls/join" className="card p-5 border-dashed border-blue-500/40 hover:border-blue-500/70 transition-colors">
          <p className="text-blue-400 font-semibold">Unirme con codigo</p>
          <p className="text-xs text-gray-500 mt-2">Ingresa el codigo que te compartieron.</p>
        </Link>

        {polls.map((pm: any) => (
          <Link key={pm.polls?.id} href={`/polls/${pm.polls?.id}`} className="card p-5 hover:border-gray-600 transition-colors">
            <p className="text-white font-bold truncate">{pm.polls?.name}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{pm.polls?.description || 'Sin descripcion'}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="text-amber-400 font-bold">{pm.points ?? 0} pts</span>
              <span className="text-gray-500 text-xs">{pm.rank ? `#${pm.rank}` : 'Sin ranking'}</span>
            </div>
          </Link>
        ))}
      </div>

      {polls.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No estas en ninguna polla todavia.
        </div>
      )}
    </div>
  )
}
