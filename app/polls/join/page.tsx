import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Database } from '@/lib/supabase/types'

type JoinPollPageProps = {
  searchParams?: {
    code?: string
    error?: string
  }
}

const joinErrorMessages: Record<string, string> = {
  config: 'Faltan variables de Supabase en el despliegue.',
  code: 'Escribe el codigo de invitacion.',
  'not-found': 'No existe una polla activa con ese codigo.',
  inactive: 'Esta polla ya no esta activa.',
  profile: 'No se pudo preparar tu perfil para unirte.',
  join: 'No se pudo unir tu usuario a la polla.',
}

export default async function JoinPollPage({ searchParams }: JoinPollPageProps) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black text-white mb-2">Configura Supabase</h1>
        <p className="text-red-400">Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY en el despliegue.</p>
      </div>
    )
  }

  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const inviteCode = String(searchParams?.code ?? '').trim().toUpperCase()

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/polls" className="text-sm text-amber-400 hover:underline">
          Volver a mis pollas
        </Link>
        <h1 className="text-3xl font-black text-white mt-4 mb-2">Unirme a una polla</h1>
        <p className="text-gray-400">
          Ingresa el codigo que te compartio el organizador para empezar a pronosticar.
        </p>
      </div>

      {searchParams?.error && joinErrorMessages[searchParams.error] && (
        <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {joinErrorMessages[searchParams.error]}
        </div>
      )}

      <form action="/api/polls/join" method="post" className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2">CODIGO DE INVITACION</label>
          <input
            name="code"
            required
            defaultValue={inviteCode}
            placeholder="AB12CD34"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white uppercase tracking-widest"
          />
        </div>
        <button type="submit" className="btn-primary">
          Unirme
        </button>
      </form>
    </div>
  )
}
