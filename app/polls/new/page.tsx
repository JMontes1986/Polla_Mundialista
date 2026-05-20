import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

type CreatedPoll = Pick<Database['public']['Tables']['polls']['Row'], 'id'>

export default async function NewPollPage() {
  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  async function createPoll(formData: FormData) {
    'use server'
    const cookieStore = cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')

    const name = String(formData.get('name') ?? '').trim()
    const description = String(formData.get('description') ?? '').trim()
    const isPublic = formData.get('isPublic') === 'on'

    if (!name) return

    const { data: poll, error } = await supabase
      .from('polls')
      .insert([{ name, description: description || null, is_public: isPublic, owner_id: user.id }] as any)
      .select('id')
      .single()

    const createdPoll = poll as CreatedPoll | null
    if (error || !createdPoll) return

    await supabase.from('poll_members').insert([{ poll_id: createdPoll.id, user_id: user.id }] as any)
    redirect(`/polls/${createdPoll.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-black text-white mb-2">Crear nueva polla</h1>
      <p className="text-gray-400 mb-8">Crea una polla y empieza a registrar resultados partido por partido.</p>
      <form action={createPoll} className="card p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2">NOMBRE</label>
          <input name="name" required placeholder="Polla Oficina 2026" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2">DESCRIPCIÓN</label>
          <textarea name="description" placeholder="Opcional" rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white" />
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-300">
          <input type="checkbox" name="isPublic" className="accent-amber-500" />
          Polla pública (visible para todos)
        </label>
        <button type="submit" className="btn-primary">Crear polla</button>
      </form>
    </div>
  )
}
