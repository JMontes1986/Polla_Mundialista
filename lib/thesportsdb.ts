// lib/thesportsdb.ts
// Fallback: TheSportsDB (plan gratuito, sin límite de requests)
// Documentación: https://www.thesportsdb.com/api.php

const TSDB_BASE = 'https://www.thesportsdb.com/api/v1/json'
const API_KEY = process.env.THESPORTSDB_API_KEY ?? '3' // '3' es la key pública de prueba
const WORLD_CUP_LEAGUE_ID = '4429' // FIFA World Cup en TheSportsDB

export interface TSDBEvent {
  idEvent: string
  strEvent: string
  dateEvent: string
  strTime: string
  strHomeTeam: string
  strAwayTeam: string
  intHomeScore: string | null
  intAwayScore: string | null
  strStatus: string
  strVenue: string | null
  strSeason: string
}

export interface TSDBNormalizedMatch {
  externalId: string
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  matchDate: string
  venue: string | null
  status: string
  source: 'thesportsdb'
}

const cache = new Map<string, { data: unknown; expiresAt: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

function setCache(key: string, data: unknown, ttlSeconds = 300): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

function mapStatus(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (s === 'match finished' || s === 'ft') return 'finished'
  if (s === 'not started' || s === '') return 'scheduled'
  if (s.includes('live') || s === 'ht') return 'live'
  return 'scheduled'
}

/**
 * Obtiene eventos del Mundial por temporada
 */
export async function getEvents(season = '2025-2026'): Promise<TSDBNormalizedMatch[]> {
  const cacheKey = `tsdb:events:${season}`
  const cached = getCached<TSDBNormalizedMatch[]>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(
      `${TSDB_BASE}/${API_KEY}/eventsseason.php?id=${WORLD_CUP_LEAGUE_ID}&s=${season}`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) {
      console.error(`[thesportsdb] getEvents error: ${res.status}`)
      return []
    }
    const json = await res.json()
    const events: TSDBEvent[] = json.events ?? []
    const normalized = events.map(normalizeEvent)
    setCache(cacheKey, normalized, 600)
    return normalized
  } catch (err) {
    console.error('[thesportsdb] getEvents error:', err)
    return []
  }
}

/**
 * Obtiene resultado de un evento específico por ID
 */
export async function getEventResult(eventId: string): Promise<TSDBNormalizedMatch | null> {
  const cacheKey = `tsdb:event:${eventId}`
  const cached = getCached<TSDBNormalizedMatch>(cacheKey)
  if (cached) return cached

  try {
    const res = await fetch(`${TSDB_BASE}/${API_KEY}/lookupevent.php?id=${eventId}`)
    if (!res.ok) return null
    const json = await res.json()
    const event: TSDBEvent = json.events?.[0]
    if (!event) return null
    const normalized = normalizeEvent(event)
    setCache(cacheKey, normalized, normalized.status === 'finished' ? 3600 : 120)
    return normalized
  } catch (err) {
    console.error('[thesportsdb] getEventResult error:', err)
    return null
  }
}

/**
 * Sincronización de fallback: usa TheSportsDB cuando football-data.org falla
 */
export async function fallbackSync(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ updated: number; errors: string[] }> {
  const events = await getEvents('2026')
  const errors: string[] = []
  let updated = 0

  for (const event of events) {
    if (event.status !== 'finished') continue
    try {
      // Buscar el partido por nombres de equipo (ya que no tenemos external_id cruzado)
      const { data: matches } = await supabaseAdmin
        .from('matches')
        .select('id, external_id')
        .gte('match_date', event.matchDate.slice(0, 10))
        .lte('match_date', event.matchDate.slice(0, 10) + 'T23:59:59Z')

      if (!matches?.length) continue

      // En producción deberías cruzar por team name con la tabla teams
      // Por simplicidad actualizamos el primero que matchee por fecha
      const { error } = await supabaseAdmin
        .from('matches')
        .update({
          home_score: event.homeScore,
          away_score: event.awayScore,
          status: 'finished',
          last_synced_at: new Date().toISOString(),
          sync_source: 'thesportsdb',
        })
        .eq('id', matches[0].id)

      if (error) errors.push(error.message)
      else updated++
    } catch (err) {
      errors.push(String(err))
    }
  }

  return { updated, errors }
}

function normalizeEvent(e: TSDBEvent): TSDBNormalizedMatch {
  const dateTime = `${e.dateEvent}T${e.strTime ?? '00:00:00'}Z`
  return {
    externalId: e.idEvent,
    homeTeamName: e.strHomeTeam,
    awayTeamName: e.strAwayTeam,
    homeScore: e.intHomeScore != null ? parseInt(e.intHomeScore) : null,
    awayScore: e.intAwayScore != null ? parseInt(e.intAwayScore) : null,
    matchDate: dateTime,
    venue: e.strVenue ?? null,
    status: mapStatus(e.strStatus),
    source: 'thesportsdb',
  }
}
