import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

type CreatedPoll = Pick<Database['public']['Tables']['polls']['Row'], 'id'>
type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

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
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Poll creation failed: missing Supabase environment variables')
    return redirectWithCookies('/polls/new?error=config')
  }

  const cookieStore = cookies()
  const cookiesToSet: CookieToSet[] = []
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookies: CookieToSet[]) => {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user) {
    console.error('Poll creation failed: missing authenticated user', {
      authError: userError?.message,
      cookieNames: cookieStore.getAll().map((cookie) => cookie.name),
    })
    return redirectWithCookies('/?error=session', cookiesToSet)
  }

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const isPublic = formData.get('isPublic') === 'on'

  if (!name) {
    return redirectWithCookies('/polls/new?error=name', cookiesToSet)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('Poll creation failed: user profile is missing and service role key is not configured', {
        userId: user.id,
      })
      return redirectWithCookies('/polls/new?error=profile-config', cookiesToSet)
    }

    const supabaseAdmin = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

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
      console.error('Poll creation failed: profile repair failed', {
        userId: user.id,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      })
      return redirectWithCookies('/polls/new?error=profile', cookiesToSet)
    }
  }

  const { data: poll, error } = await supabase
    .from('polls')
    .insert([{ name, description: description || null, is_public: isPublic, owner_id: user.id }] as any)
    .select('id')
    .single()

  const createdPoll = poll as CreatedPoll | null
  if (error || !createdPoll) {
    console.error('Poll creation failed: polls insert failed', {
      userId: user.id,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    })
    return redirectWithCookies('/polls/new?error=create', cookiesToSet)
  }

  const { error: memberError } = await supabase
    .from('poll_members')
    .insert([{ poll_id: createdPoll.id, user_id: user.id }] as any)

  if (memberError) {
    console.error('Poll creation failed: poll_members insert failed', {
      pollId: createdPoll.id,
      userId: user.id,
      message: memberError.message,
      details: memberError.details,
      hint: memberError.hint,
      code: memberError.code,
    })
    return redirectWithCookies(`/polls/${createdPoll.id}?warning=member`, cookiesToSet)
  }

  return redirectWithCookies(`/polls/${createdPoll.id}`, cookiesToSet)
}
