// lib/football-data.ts
// API principal: football-data.org (plan gratuito: 10 req/min)

const API_BASE = 'https://api.football-data.org/v4'
const WORLD_CUP_2026_ID = 2000 // Actualizar con el ID real cuando esté disponible

// Cache en memoria simple (Node.js) – en producción usar Vercel KV o Upstash Redis
const cache = new Map<string, { data: unknown; expiresAt: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: unknown, ttlSeconds = 300): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

// Rate limiter simple: máx 10 req/min
let requestCount = 0
let windowStart = Date.now()

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  if (now - windowStart > 60_000) {
    requestCount = 0
    windowStart = now
  }
  if (requestCount >= 9) {
    const waitMs = 60_000 - (now - windowStart)
    await new Promise((r) => setTimeout(r, waitMs))
    requestCount = 0
    windowStart = Date.now()
  }
  requestCount++
  return fetch(url, {
    headers: {
      'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY!,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 0 },
  })
}

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface FDMatch {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  group: string | null
  homeTeam: { id: number; name: string; shortName: string; crest: string }
  awayTeam: { id: number; name: string; shortName: string; crest: string }
  score: {
    winner: string | null
    fullTime: { home: number | null; away: number | null }
    halfTime: { home: number | null; away: number | null }
  }
  venue: string
}

export interface NormalizedMatch {
  externalId: string
  phase: string
  homeTeamCode: string
  awayTeamCode: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  venue: string | null
  status: string
  source: 'football_data'
}

// ─────────────────────────────────────────────
// MAPEO DE FASE
// ─────────────────────────────────────────────
function mapStage(stage: string): string {
  const map: Record<string, string> = {
    GROUP_STAGE: 'groups',
    ROUND_OF_32: 'round_of_32',
    LAST_16: 'round_of_16',
    QUARTER_FINALS: 'quarterfinals',
    SEMI_FINALS: 'semifinals',
    THIRD_PLACE: 'third_place',
    FINAL: 'final',
  }
  return map[stage] ?? 'groups'
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: 'scheduled',
    TIMED: 'scheduled',
    IN_PLAY: 'live',
    PAUSED: 'live',
    FINISHED: 'finished',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled',
  }
  return map[status] ?? 'scheduled'
}

// ─────────────────────────────────────────────
// FUNCIONES PRINCIPALES
// ─────────────────────────────────────────────

/**
 * Obtiene todos los fixtures del Mundial 2026
 */
export async function getWorldCupFixtures(): Promise<NormalizedMatch[]> {
  const cacheKey = 'fd:fixtures:wc2026'
  const cached = getCached<NormalizedMatch[]>(cacheKey)
  if (cached) return cached

  try {
    const res = await rateLimitedFetch(
      `${API_BASE}/competitions/${WORLD_CUP_2026_ID}/matches?season=2026`
    )
    if (!res.ok) {
      console.error(`[football-data] fixtures error: ${res.status}`)
      return []
    }
    const json = await res.json()
    const matches: FDMatch[] = json.matches ?? []
    const normalized = matches.map(normalizeMatch)
    setCache(cacheKey, normalized, 600) // 10 min
    return normalized
  } catch (err) {
    console.error('[football-data] getWorldCupFixtures error:', err)
    return []
  }
}

/**
 * Obtiene partidos por fecha (útil para sincronización diaria)
 */
export async function getWorldCupMatches(dateFrom: string, dateTo: string): Promise<NormalizedMatch[]> {
  const cacheKey = `fd:matches:${dateFrom}:${dateTo}`
  const cached = getCached<NormalizedMatch[]>(cacheKey)
  if (cached) return cached

  try {
    const res = await rateLimitedFetch(
      `${API_BASE}/competitions/${WORLD_CUP_2026_ID}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
    )
    if (!res.ok) {
      console.error(`[football-data] matches error: ${res.status}`)
      return []
    }
    const json = await res.json()
    const matches: FDMatch[] = json.matches ?? []
    const normalized = matches.map(normalizeMatch)
    setCache(cacheKey, normalized, 300)
    return normalized
  } catch (err) {
    console.error('[football-data] getWorldCupMatches error:', err)
    return []
  }
}

/**
 * Obtiene resultado de un partido específico
 */
export async function getMatchResult(externalId: string): Promise<NormalizedMatch | null> {
  const cacheKey = `fd:match:${externalId}`
  const cached = getCached<NormalizedMatch>(cacheKey)
  if (cached) return cached

  try {
    const res = await rateLimitedFetch(`${API_BASE}/matches/${externalId}`)
    if (!res.ok) return null
    const json = await res.json()
    const normalized = normalizeMatch(json)
    setCache(cacheKey, normalized, normalized.status === 'finished' ? 3600 : 60)
    return normalized
  } catch (err) {
    console.error('[football-data] getMatchResult error:', err)
    return null
  }
}

/**
 * Sincroniza resultados de hoy y ayer con Supabase
 */
export async function syncResults(supabaseAdmin: import('@supabase/supabase-js').SupabaseClient): Promise<{
  updated: number
  errors: string[]
}> {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const dateFrom = yesterday.toISOString().split('T')[0]
  const dateTo = today.toISOString().split('T')[0]

  const matches = await getWorldCupMatches(dateFrom, dateTo)
  const errors: string[] = []
  let updated = 0

  for (const match of matches) {
    if (match.status !== 'finished' && match.status !== 'live') continue
    try {
      const { error } = await supabaseAdmin
        .from('matches')
        .update({
          home_score: match.homeScore,
          away_score: match.awayScore,
          status: match.status,
          last_synced_at: new Date().toISOString(),
          sync_source: 'football_data',
        })
        .eq('external_id', match.externalId)

      if (error) errors.push(`Match ${match.externalId}: ${error.message}`)
      else updated++
    } catch (err) {
      errors.push(`Match ${match.externalId}: ${String(err)}`)
    }
  }

  return { updated, errors }
}

// ─────────────────────────────────────────────
// NORMALIZACIÓN
// ─────────────────────────────────────────────
function normalizeMatch(m: FDMatch): NormalizedMatch {
  return {
    externalId: String(m.id),
    phase: mapStage(m.stage),
    homeTeamCode: m.homeTeam?.shortName ?? '',
    awayTeamCode: m.awayTeam?.shortName ?? '',
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
    matchDate: m.utcDate,
    venue: m.venue ?? null,
    status: mapStatus(m.status),
    source: 'football_data',
  }
}
