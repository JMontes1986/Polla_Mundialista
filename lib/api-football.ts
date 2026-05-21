const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io'

export interface ApiFootballFixture {
  fixture: {
    id: number
    date: string
    status: {
      short: string
    }
    venue?: {
      name?: string | null
      city?: string | null
    }
  }
  league: {
    round?: string | null
  }
  teams: {
    home: {
      id: number
      name: string
      code?: string | null
      logo?: string | null
    }
    away: {
      id: number
      name: string
      code?: string | null
      logo?: string | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
}

export interface ApiFootballNormalizedMatch {
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
  phase: 'groups' | 'round_of_32' | 'round_of_16' | 'quarterfinals' | 'semifinals' | 'third_place' | 'final'
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
  source: 'api_football'
}

function getApiKey() {
  return process.env.API_FOOTBALL_KEY || process.env.APISPORTS_KEY
}

function mapStatus(short: string): ApiFootballNormalizedMatch['status'] {
  if (['1H', 'HT', '2H', 'ET', 'P', 'BT', 'INT', 'LIVE'].includes(short)) return 'live'
  if (['FT', 'AET', 'PEN'].includes(short)) return 'finished'
  if (['PST'].includes(short)) return 'postponed'
  if (['CANC', 'ABD', 'AWD', 'WO'].includes(short)) return 'cancelled'
  return 'scheduled'
}

function mapPhase(round?: string | null): ApiFootballNormalizedMatch['phase'] {
  const value = (round ?? '').toLowerCase()
  if (value.includes('round of 32')) return 'round_of_32'
  if (value.includes('round of 16')) return 'round_of_16'
  if (value.includes('quarter')) return 'quarterfinals'
  if (value.includes('semi')) return 'semifinals'
  if (value.includes('third')) return 'third_place'
  if (value.includes('final')) return 'final'
  return 'groups'
}

function shortName(name: string, code?: string | null) {
  return code || name.slice(0, 3).toUpperCase()
}

function normalizeFixture(fixture: ApiFootballFixture): ApiFootballNormalizedMatch {
  return {
    externalId: String(fixture.fixture.id),
    homeTeamExternalId: `api-football:${fixture.teams.home.id}`,
    awayTeamExternalId: `api-football:${fixture.teams.away.id}`,
    homeTeamName: fixture.teams.home.name,
    awayTeamName: fixture.teams.away.name,
    homeTeamShortName: shortName(fixture.teams.home.name, fixture.teams.home.code),
    awayTeamShortName: shortName(fixture.teams.away.name, fixture.teams.away.code),
    homeTeamImageUrl: fixture.teams.home.logo ?? null,
    awayTeamImageUrl: fixture.teams.away.logo ?? null,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    matchDate: fixture.fixture.date,
    venue: fixture.fixture.venue?.name ?? null,
    city: fixture.fixture.venue?.city ?? null,
    phase: mapPhase(fixture.league.round),
    status: mapStatus(fixture.fixture.status.short),
    source: 'api_football',
  }
}

export async function getWorldCupFixtures(): Promise<ApiFootballNormalizedMatch[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY no esta configurado')
  }

  const leagueId = process.env.API_FOOTBALL_LEAGUE_ID || '1'
  const season = process.env.API_FOOTBALL_SEASON || '2026'
  const url = new URL(`${API_FOOTBALL_BASE}/fixtures`)
  url.searchParams.set('league', leagueId)
  url.searchParams.set('season', season)

  const res = await fetch(url, {
    headers: { 'x-apisports-key': apiKey },
    next: { revalidate: 0 },
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const detail = typeof json?.message === 'string' ? `: ${json.message}` : ''
    throw new Error(`API-Football respondio HTTP ${res.status}${detail}`)
  }
  if (Array.isArray(json?.errors) && json.errors.length > 0) {
    throw new Error(`API-Football: ${json.errors.join(', ')}`)
  }
  if (json?.errors && typeof json.errors === 'object' && Object.keys(json.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(json.errors)}`)
  }

  const fixtures: ApiFootballFixture[] = json?.response ?? []
  return fixtures.map(normalizeFixture)
}

async function upsertApiFootballTeam(
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

export async function importWorldCupFixtures(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ imported: number; updated: number; total: number; errors: string[] }> {
  const matches = await getWorldCupFixtures()
  const errors: string[] = []
  let imported = 0
  let updated = 0

  for (const match of matches) {
    try {
      const homeTeamId = await upsertApiFootballTeam(supabaseAdmin, {
        externalId: match.homeTeamExternalId,
        name: match.homeTeamName,
        shortName: match.homeTeamShortName,
        imageUrl: match.homeTeamImageUrl,
      })
      const awayTeamId = await upsertApiFootballTeam(supabaseAdmin, {
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
        phase: match.phase,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: match.homeScore,
        away_score: match.awayScore,
        match_date: match.matchDate,
        venue: match.venue,
        city: match.city,
        status: match.status,
        last_synced_at: new Date().toISOString(),
        sync_source: 'api_football',
      }

      if (existing?.id) {
        const { error } = await supabaseAdmin.from('matches').update(payload).eq('id', existing.id)
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
