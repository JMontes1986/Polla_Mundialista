const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football'

export interface SportmonksFixture {
  id: number
  name: string
  starting_at: string
  state_id: number
  venue_id?: number | null
  participants?: Array<{
    id: number
    name: string
    short_code?: string | null
    image_path?: string | null
    meta?: { location?: 'home' | 'away' }
  }>
  league?: {
    name: string
    country?: { name?: string }
  }
  scores?: Array<{
    participant_id: number
    score: {
      goals: number | null
      participant: 'home' | 'away' | string
    }
  }>
}

export interface SportmonksNormalizedMatch {
  externalId: string
  homeTeamExternalId: string
  awayTeamExternalId: string
  homeTeamName: string
  awayTeamName: string
  homeTeamShortName: string
  awayTeamShortName: string
  homeTeamImageUrl: string | null
  awayTeamImageUrl: string | null
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  venue: string | null
  city: string | null
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
  source: 'sportmonks'
}

function mapStatus(stateId: number): SportmonksNormalizedMatch['status'] {
  if (stateId === 5 || stateId === 3) return 'scheduled'
  if (stateId === 1 || stateId === 2 || stateId === 22) return 'live'
  if (stateId === 7) return 'finished'
  if (stateId === 12) return 'postponed'
  if (stateId === 13) return 'cancelled'
  return 'scheduled'
}

function normalizeFixture(f: SportmonksFixture): SportmonksNormalizedMatch | null {
  const home = f.participants?.find((p) => p.meta?.location === 'home') ?? f.participants?.[0]
  const away = f.participants?.find((p) => p.meta?.location === 'away') ?? f.participants?.[1]
  if (!home || !away) return null

  const homeScore = f.scores?.find((s) => s.score.participant === 'home')?.score.goals ?? null
  const awayScore = f.scores?.find((s) => s.score.participant === 'away')?.score.goals ?? null

  return {
    externalId: String(f.id),
    homeTeamExternalId: `sportmonks:${home.id}`,
    awayTeamExternalId: `sportmonks:${away.id}`,
    homeTeamName: home.name,
    awayTeamName: away.name,
    homeTeamShortName: home.short_code || home.name.slice(0, 3).toUpperCase(),
    awayTeamShortName: away.short_code || away.name.slice(0, 3).toUpperCase(),
    homeTeamImageUrl: home.image_path ?? null,
    awayTeamImageUrl: away.image_path ?? null,
    homeScore,
    awayScore,
    matchDate: f.starting_at.replace(' ', 'T') + 'Z',
    venue: f.league?.name ?? null,
    city: f.league?.country?.name ?? null,
    status: mapStatus(f.state_id),
    source: 'sportmonks',
  }
}

export async function getInplayMatches(): Promise<SportmonksNormalizedMatch[]> {
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) {
    throw new Error('SPORTMONKS_API_TOKEN no esta configurado')
  }

  const url = `${SPORTMONKS_BASE}/livescores/inplay?api_token=${token}&include=participants;scores;periods;events;league.country;round`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) {
    let detail = ''
    try {
      const errorBody = await res.json()
      detail = typeof errorBody?.message === 'string' ? `: ${errorBody.message}` : ''
    } catch {
      detail = ''
    }
    throw new Error(`Sportmonks respondio HTTP ${res.status}${detail}`)
  }
  const json = await res.json()
  const fixtures: SportmonksFixture[] = json.data ?? []
  return fixtures.map(normalizeFixture).filter(Boolean) as SportmonksNormalizedMatch[]
}

async function upsertSportmonksTeam(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  team: {
    externalId: string
    name: string
    shortName: string
    imageUrl: string | null
  }
): Promise<number> {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('fifa_code', team.externalId)
    .maybeSingle()

  if (findError) throw findError
  if (existing?.id) return existing.id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('teams')
    .insert({
      name: team.name,
      short_name: team.shortName,
      flag_url: team.imageUrl,
      group_letter: null,
      fifa_code: team.externalId,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return inserted.id
}

export async function importInplayMatches(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ imported: number; updated: number; total: number; errors: string[] }> {
  const matches = await getInplayMatches()
  const errors: string[] = []
  let imported = 0
  let updated = 0

  for (const match of matches) {
    try {
      const homeTeamId = await upsertSportmonksTeam(supabaseAdmin, {
        externalId: match.homeTeamExternalId,
        name: match.homeTeamName,
        shortName: match.homeTeamShortName,
        imageUrl: match.homeTeamImageUrl,
      })
      const awayTeamId = await upsertSportmonksTeam(supabaseAdmin, {
        externalId: match.awayTeamExternalId,
        name: match.awayTeamName,
        shortName: match.awayTeamShortName,
        imageUrl: match.awayTeamImageUrl,
      })

      const { data: existing, error: findError } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('external_id', match.externalId)
        .maybeSingle()

      if (findError) throw findError

      const payload = {
        external_id: match.externalId,
        phase: 'groups',
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: match.homeScore,
        away_score: match.awayScore,
        match_date: match.matchDate,
        venue: match.venue,
        city: match.city,
        status: match.status,
        last_synced_at: new Date().toISOString(),
        sync_source: 'sportmonks',
      }

      if (existing?.id) {
        const { error } = await supabaseAdmin
          .from('matches')
          .update(payload)
          .eq('id', existing.id)
        if (error) throw error
        updated++
      } else {
        const { error } = await supabaseAdmin.from('matches').insert(payload)
        if (error) throw error
        imported++
      }
    } catch (err) {
      errors.push(String(err))
    }
  }

  return { imported, updated, total: matches.length, errors }
}

export async function syncInplayMatches(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ updated: number; errors: string[] }> {
  const matches = await getInplayMatches()
  const errors: string[] = []
  let updated = 0

  for (const match of matches) {
    try {
      const { data: dbMatches, error: findError } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('external_id', match.externalId)
        .limit(1)

      if (findError) {
        errors.push(findError.message)
        continue
      }

      if (dbMatches && dbMatches.length > 0) {
        const { error } = await supabaseAdmin
          .from('matches')
          .update({
            home_score: match.homeScore,
            away_score: match.awayScore,
            status: match.status,
            last_synced_at: new Date().toISOString(),
            sync_source: 'sportmonks',
          })
          .eq('id', dbMatches[0].id)
        if (error) errors.push(error.message)
        else updated++
      }
    } catch (err) {
      errors.push(String(err))
    }
  }

  return { updated, errors }
}
