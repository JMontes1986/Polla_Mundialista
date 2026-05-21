import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

type CreatedPoll = Pick<Database['public']['Tables']['polls']['Row'], 'id'>

export async function POST(request: Request) {
  const formData = await request.formData()

  const cookieStore = cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const isPublic = formData.get('isPublic') === 'on'

  if (!name) {
    return NextResponse.redirect(new URL('/polls/new', request.url))
  }

  const { data: poll, error } = await supabase
    .from('polls')
    .insert([{ name, description: description || null, is_public: isPublic, owner_id: user.id }] as any)
    .select('id')
    .single()

  const createdPoll = poll as CreatedPoll | null
  if (error || !createdPoll) {
    return NextResponse.redirect(new URL('/polls/new', request.url))
  }

  await supabase.from('poll_members').insert([{ poll_id: createdPoll.id, user_id: user.id }] as any)

  return NextResponse.redirect(new URL(`/polls/${createdPoll.id}`, request.url))
}
