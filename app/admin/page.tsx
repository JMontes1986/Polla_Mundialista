// app/admin/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../lib/supabase/client'

interface Match {
  id: number
  match_number: number | null
  phase: string
  match_date: string
  status: string
  home_score: number | null
  away_score: number | null
  sync_source: string | null
  last_synced_at: string | null
  home_team: { name: string; short_name: string } | null
  away_team: { name: string; short_name: string } | null
}

interface SyncLog {
  id: number
  source: string
  matches_updated: number
  success: boolean
  error_message: string | null
  duration_ms: number | null
  synced_at: string
}

type AdminTab = 'matches' | 'sync' | 'users' | 'export'

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('matches')
  const [matches, setMatches] = useState<Match[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [matchRes, logRes] = await Promise.all([
      supabase
        .from('matches')
        .select(`
          id, match_number, phase, match_date, status, home_score, away_score,
          sync_source, last_synced_at,
          home_team:teams!matches_home_team_id_fkey(name, short_name),
          away_team:teams!matches_away_team_id_fkey(name, short_name)
        `)
        .order('match_date'),
      supabase
        .from('sync_logs')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(20),
    ])
    setMatches((matchRes.data ?? []) as unknown as Match[])
    setSyncLogs(logRes.data ?? [])
    setLoading(false)
  }

  async function saveResult() {
    if (!editingMatch) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/admin/manual-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: editingMatch.id,
          homeScore,
          awayScore,
          status: 'finished',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage({ type: 'ok', text: data.message })
      setEditingMatch(null)
      await loadData()
    } catch (err) {
      setMessage({ type: 'err', text: String(err) })
    } finally {
      setSaving(false)
    }
  }

  async function triggerSync() {
    try {
      const res = await fetch('/api/cron/sync-results', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET ?? ''}` },
      })
      const data = await res.json()
      setMessage({
        type: data.success ? 'ok' : 'err',
        text: `Sync: ${data.updated} partidos · ${data.source} · ${data.duration_ms}ms`,
      })
      await loadData()
    } catch (err) {
      setMessage({ type: 'err', text: String(err) })
    }
  }

  async function exportCSV() {
    const { data } = await supabase
      .from('standings')
      .select('rank, total_points, exact_scores, correct_winners, profiles(username, full_name), polls(name)')
      .order('rank')

    if (!data) return

    const rows = [
      ['Ranking', 'Usuario', 'Polla', 'Puntos', 'Exactos', 'Ganadores'],
      ...data.map((s: any) => [
        s.rank, s.profiles?.username, s.polls?.name, s.total_points, s.exact_scores, s.correct_winners,
      ]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `polla-mundial-2026-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredMatches = filter === 'all'
    ? matches
    : matches.filter((m) => m.status === filter)

  const phaseLabel: Record<string, string> = {
    groups: 'Grupos', round_of_32: '32avos', round_of_16: '16avos',
    quarterfinals: 'Cuartos', semifinals: 'Semis', final: 'Final', third_place: '3er P',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Panel Administrador</h1>
          <p className="text-gray-400 mt-1">Polla Mundialista 2026</p>
        </div>
        <button onClick={triggerSync} className="btn-secondary text-sm">
          🔄 Sincronizar ahora
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-semibold ${
          message.type === 'ok'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'ok' ? '✓ ' : '✗ '}{message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(['matches', 'sync', 'export'] as AdminTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab === t ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'matches' ? '⚽ Partidos' : t === 'sync' ? '📋 Logs' : '📥 Exportar'}
          </button>
        ))}
      </div>

      {/* Tab: Partidos */}
      {tab === 'matches' && (
        <div>
          {/* Filtros */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {['all', 'scheduled', 'live', 'finished'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  filter === f ? 'bg-amber-500 text-gray-950' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'all' ? 'Todos' : f}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['#', 'Fase', 'Partido', 'Fecha', 'Estado', 'Resultado', 'Fuente', 'Acción'].map((h) => (
                      <th key={h} className="text-left px-3 py-3 text-gray-500 font-semibold text-xs uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match) => (
                    <tr key={match.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-3 py-3 text-gray-500">{match.match_number}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">
                          {phaseLabel[match.phase] ?? match.phase}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-semibold text-white">
                        {match.home_team?.short_name} vs {match.away_team?.short_name}
                      </td>
                      <td className="px-3 py-3 text-gray-400 whitespace-nowrap">
                        {new Date(match.match_date).toLocaleDateString('es-CO', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`phase-badge text-xs ${
                          match.status === 'live' ? 'status-live' :
                          match.status === 'finished' ? 'status-finished' :
                          'status-scheduled'
                        }`}>
                          {match.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-white">
                        {match.home_score !== null ? `${match.home_score} - ${match.away_score}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{match.sync_source ?? '-'}</td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => {
                            setEditingMatch(match)
                            setHomeScore(match.home_score ?? 0)
                            setAwayScore(match.away_score ?? 0)
                          }}
                          className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30
                                     px-3 py-1.5 rounded-lg hover:bg-amber-500/20 transition-colors"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Sync Logs */}
      {tab === 'sync' && (
        <div className="space-y-3">
          {syncLogs.map((log) => (
            <div key={log.id} className={`card p-4 flex items-center justify-between ${
              log.success ? 'border-green-500/20' : 'border-red-500/20'
            }`}>
              <div className="flex items-center gap-4">
                <span className={log.success ? 'text-green-400' : 'text-red-400'}>
                  {log.success ? '✓' : '✗'}
                </span>
                <div>
                  <p className="font-semibold text-white text-sm">{log.source}</p>
                  {log.error_message && (
                    <p className="text-xs text-red-400 mt-0.5">{log.error_message}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-amber-400 font-bold">{log.matches_updated} partidos</p>
                <p className="text-xs text-gray-500">
                  {new Date(log.synced_at).toLocaleString('es-CO')} · {log.duration_ms}ms
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Exportar */}
      {tab === 'export' && (
        <div className="card p-8 text-center max-w-md mx-auto">
          <div className="text-5xl mb-4">📥</div>
          <h3 className="text-xl font-bold text-white mb-2">Exportar Datos</h3>
          <p className="text-gray-400 text-sm mb-6">
            Descarga el ranking completo de todas las pollas en formato CSV.
          </p>
          <button onClick={exportCSV} className="btn-primary">
            Descargar CSV
          </button>
        </div>
      )}

      {/* Modal: Editar resultado */}
      {editingMatch && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditingMatch(null) }}
        >
          <div className="card p-8 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-1">Actualizar Resultado</h3>
            <p className="text-gray-400 text-sm mb-6">
              {editingMatch.home_team?.short_name} vs {editingMatch.away_team?.short_name}
            </p>

            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">{editingMatch.home_team?.short_name}</p>
                <input
                  type="number"
                  min={0}
                  value={homeScore}
                  onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                  className="score-input"
                />
              </div>
              <span className="text-gray-500 font-bold text-xl">-</span>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">{editingMatch.away_team?.short_name}</p>
                <input
                  type="number"
                  min={0}
                  value={awayScore}
                  onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                  className="score-input"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingMatch(null)}
                className="flex-1 btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={saveResult}
                disabled={saving}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
