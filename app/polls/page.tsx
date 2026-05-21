import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

async function getUserPolls(userId: string, supabase: ReturnType<typeof createServerClient<Database>>) {
  const { data } = await supabase
    .from('poll_members')
    .select('points, rank, polls(id, name, invite_code, description)')
    .eq('user_id', userId)
    .order('joined_at', { ascending: false })

  return (data ?? []) as any[]
}

export default async function PollsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const polls = await getUserPolls(user.id, supabase)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mis Pollas</h1>
          <p className="text-gray-400 mt-1">Gestiona tus ligas y entra a ver el ranking.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">← Dashboard</Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/polls/new" className="card p-5 border-dashed border-amber-500/40 hover:border-amber-500/70 transition-colors">
          <p className="text-amber-400 font-semibold">+ Crear nueva polla</p>
          <p className="text-xs text-gray-500 mt-2">Inicia una liga con tus amigos.</p>
        </Link>

        {polls.map((pm: any) => (
          <Link key={pm.polls?.id} href={`/polls/${pm.polls?.id}`} className="card p-5 hover:border-gray-600 transition-colors">
            <p className="text-white font-bold truncate">{pm.polls?.name}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{pm.polls?.description || 'Sin descripción'}</p>
            <div className="flex items-center justify-between mt-4">
              <span className="text-amber-400 font-bold">{pm.points ?? 0} pts</span>
              <span className="text-gray-500 text-xs">{pm.rank ? `#${pm.rank}` : 'Sin ranking'}</span>
            </div>
          </Link>
        ))}
      </div>

      {polls.length === 0 && (
        <div className="card p-8 text-center text-gray-500">
          No estás en ninguna polla todavía.
        </div>
      )}
    </div>
  )
}
