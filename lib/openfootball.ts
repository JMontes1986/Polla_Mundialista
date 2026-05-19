// lib/openfootball.ts
// Fuente: https://github.com/openfootball/worldcup.json
// Usada solo para la importación inicial del calendario base

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export interface OFBMatch {
  num: number
  date: string
  time?: string
  team1: { name: string; code: string }
  team2: { name: string; code: string }
  score?: { ft: [number, number] }
  group?: string
}

export interface OFBRound {
  name: string
  matches: OFBMatch[]
}

export interface OFBData {
  name: string
  rounds: OFBRound[]
}

export interface NormalizedOFBMatch {
  matchNumber: number
  phase: string
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  group: string | null
}

function mapRoundToPhase(roundName: string): string {
  const n = roundName.toLowerCase()
  if (n.includes('group') || n.includes('grupo') || n.includes('matchday')) return 'groups'
  if (n.includes('round of 32') || n.includes('32')) return 'round_of_32'
  if (n.includes('round of 16') || n.includes('16avos') || n.includes('16')) return 'round_of_16'
  if (n.includes('quarter') || n.includes('cuart')) return 'quarterfinals'
  if (n.includes('semi')) return 'semifinals'
  if (n.includes('third') || n.includes('tercer') || n.includes('3rd')) return 'third_place'
  if (n.includes('final')) return 'final'
  return 'groups'
}

/**
 * Descarga y normaliza el calendario base de openfootball
 */
export async function importBaseCalendar(): Promise<NormalizedOFBMatch[]> {
  try {
    const res = await fetch(OPENFOOTBALL_URL, {
      next: { revalidate: 86400 }, // Cache 24h
    })
    if (!res.ok) {
      console.error(`[openfootball] HTTP ${res.status}`)
      return []
    }
    const data: OFBData = await res.json()
    return normalizeMatches(data)
  } catch (err) {
    console.error('[openfootball] importBaseCalendar error:', err)
    return []
  }
}

/**
 * Normaliza el JSON de openfootball a formato interno
 */
export function normalizeMatches(data: OFBData): NormalizedOFBMatch[] {
  const result: NormalizedOFBMatch[] = []

  for (const round of data.rounds) {
    const phase = mapRoundToPhase(round.name)
    const group = round.name.match(/Group\s+([A-L])/i)?.[1]?.toUpperCase() ?? null

    for (const match of round.matches) {
      const dateStr = match.date
      const timeStr = match.time ?? '00:00'
      const matchDate = `${dateStr}T${timeStr}:00Z`

      result.push({
        matchNumber: match.num,
        phase,
        homeTeamCode: match.team1.code,
        awayTeamCode: match.team2.code,
        homeScore: match.score?.ft?.[0] ?? null,
        awayScore: match.score?.ft?.[1] ?? null,
        matchDate,
        group,
      })
    }
  }

  return result
}

/**
 * Normaliza equipos desde openfootball
 */
export function normalizeTeams(data: OFBData): Array<{ name: string; code: string }> {
  const seen = new Set<string>()
  const teams: Array<{ name: string; code: string }> = []

  for (const round of data.rounds) {
    for (const match of round.matches) {
      if (!seen.has(match.team1.code)) {
        seen.add(match.team1.code)
        teams.push({ name: match.team1.name, code: match.team1.code })
      }
      if (!seen.has(match.team2.code)) {
        seen.add(match.team2.code)
        teams.push({ name: match.team2.name, code: match.team2.code })
      }
    }
  }

  return teams
}

/**
 * Inserta el calendario base en Supabase
 * Se ejecuta una sola vez durante el setup inicial
 */
export async function seedCalendar(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ inserted: number; errors: string[] }> {
  const matches = await importBaseCalendar()
  const errors: string[] = []
  let inserted = 0

  for (const match of matches) {
    // Buscar IDs de equipos por código
    const { data: homeTeam } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('short_name', match.homeTeamCode)
      .single()

    const { data: awayTeam } = await supabaseAdmin
      .from('teams')
      .select('id')
      .eq('short_name', match.awayTeamCode)
      .single()

    if (!homeTeam || !awayTeam) {
      errors.push(`Equipos no encontrados: ${match.homeTeamCode} vs ${match.awayTeamCode}`)
      continue
    }

    const { error } = await supabaseAdmin.from('matches').upsert(
      {
        match_number: match.matchNumber,
        phase: match.phase,
        home_team_id: homeTeam.id,
        away_team_id: awayTeam.id,
        home_score: match.homeScore,
        away_score: match.awayScore,
        match_date: match.matchDate,
        status: match.homeScore !== null ? 'finished' : 'scheduled',
        sync_source: 'openfootball',
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: 'match_number' }
    )

    if (error) errors.push(`Partido ${match.matchNumber}: ${error.message}`)
    else inserted++
  }

  return { inserted, errors }
}
