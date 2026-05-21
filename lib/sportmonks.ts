const SPORTMONKS_BASE = 'https://api.sportmonks.com/v3/football'

export interface SportmonksFixture {
  id: number
  name: string
  starting_at: string
  state_id: number
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
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  venue: string | null
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
    homeTeamName: home.name,
    awayTeamName: away.name,
    homeScore,
    awayScore,
    matchDate: f.starting_at.replace(' ', 'T') + 'Z',
    venue: null,
    status: mapStatus(f.state_id),
    source: 'sportmonks',
  }
}

export async function getInplayMatches(): Promise<SportmonksNormalizedMatch[]> {
  const token = process.env.SPORTMONKS_API_TOKEN
  if (!token) {
    console.warn('[sportmonks] SPORTMONKS_API_TOKEN no configurado')
    return []
  }

  const url = `${SPORTMONKS_BASE}/livescores/inplay?api_token=${token}&include=participants;scores;periods;events;league.country;round`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`[sportmonks] HTTP ${res.status}`)
  const json = await res.json()
  const fixtures: SportmonksFixture[] = json.data ?? []
  return fixtures.map(normalizeFixture).filter(Boolean) as SportmonksNormalizedMatch[]
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
