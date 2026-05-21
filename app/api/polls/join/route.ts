import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

type PollToJoin = Pick<
  Database['public']['Tables']['polls']['Row'],
  'id' | 'is_active'
>

export async function POST(request: Request) {
  const formData = await request.formData()
  const redirectWithCookies = (path: string, cookiesToSet: CookieToSet[] = []) => {
    const response = NextResponse.redirect(new URL(path, request.url), { status: 303 })
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options)
    })
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return redirectWithCookies('/polls/join?error=config')
  }

  const code = String(formData.get('code') ?? '').trim().toUpperCase()
  if (!code) {
    return redirectWithCookies('/polls/join?error=code')
  }

  const cookieStore = cookies()
  const cookiesToSet: CookieToSet[] = []
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookies: CookieToSet[]) => {
        cookiesToSet.push(...cookies)
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return redirectWithCookies(`/?error=session&joinCode=${encodeURIComponent(code)}`, cookiesToSet)
  }

  const supabaseAdmin = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: poll, error: pollError } = await supabaseAdmin
    .from('polls')
    .select('id,is_active')
    .eq('invite_code', code)
    .maybeSingle()

  const pollToJoin = poll as PollToJoin | null
  if (pollError || !pollToJoin) {
    return redirectWithCookies(`/polls/join?code=${encodeURIComponent(code)}&error=not-found`, cookiesToSet)
  }

  if (!pollToJoin.is_active) {
    return redirectWithCookies(`/polls/join?code=${encodeURIComponent(code)}&error=inactive`, cookiesToSet)
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const fallbackUsername = user.email?.split('@')[0] || 'Jugador'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        username:
          typeof user.user_metadata?.username === 'string'
            ? user.user_metadata.username
            : fallbackUsername,
        full_name:
          typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '',
        avatar_url:
          typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : '',
        role: 'participant',
        total_points: 0,
      })

    if (profileError) {
      return redirectWithCookies(`/polls/join?code=${encodeURIComponent(code)}&error=profile`, cookiesToSet)
    }
  }

  const { error: memberError } = await supabaseAdmin
    .from('poll_members')
    .upsert([{ poll_id: pollToJoin.id, user_id: user.id }] as any, {
      onConflict: 'poll_id,user_id',
    })

  if (memberError) {
    return redirectWithCookies(`/polls/join?code=${encodeURIComponent(code)}&error=join`, cookiesToSet)
  }

  return redirectWithCookies(`/polls/${pollToJoin.id}`, cookiesToSet)
}
