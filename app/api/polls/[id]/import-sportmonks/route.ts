import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { importInplayMatches } from '@/lib/sportmonks'
import type { CookieOptions } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/types'

type CookieToSet = {
  name: string
  value: string
  options: CookieOptions
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
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
    return redirectWithCookies(`/polls/${params.id}?import=config`)
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
  if (!user) return redirectWithCookies('/?error=session', cookiesToSet)

  const supabaseAdmin = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: poll } = await supabaseAdmin
    .from('polls')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!poll || poll.owner_id !== user.id) {
    return redirectWithCookies('/dashboard', cookiesToSet)
  }

  try {
    const result = await importInplayMatches(supabaseAdmin)
    const imported = result.imported + result.updated

    await supabaseAdmin.from('sync_logs').insert({
      source: 'sportmonks',
      matches_updated: imported,
      success: result.errors.length === 0,
      error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
      duration_ms: null,
    })

    const status = result.errors.length > 0 ? 'partial' : 'ok'
    return redirectWithCookies(
      `/polls/${params.id}?import=${status}&imported=${result.imported}&updated=${result.updated}&total=${result.total}`,
      cookiesToSet
    )
  } catch (err) {
    console.error('Sportmonks import failed', err)
    return redirectWithCookies(`/polls/${params.id}?import=error`, cookiesToSet)
  }
}
