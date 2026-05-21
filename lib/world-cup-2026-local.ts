type MatchPhase =
  | 'groups'
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinals'
  | 'semifinals'
  | 'third_place'
  | 'final'

type LocalTeam = {
  code: string
  name: string
  flag: string | null
}

type LocalFixture = {
  number: number
  date: string
  time: string
  home: string
  away: string
  phase: MatchPhase
}

const TEAM_DATA: Record<string, LocalTeam> = {
  ALG: { code: 'ALG', name: 'Argelia', flag: null },
  ALE: { code: 'ALE', name: 'Alemania', flag: null },
  ARG: { code: 'ARG', name: 'Argentina', flag: null },
  AUS: { code: 'AUS', name: 'Australia', flag: null },
  BEL: { code: 'BEL', name: 'Belgica', flag: null },
  BIH: { code: 'BIH', name: 'Bosnia', flag: null },
  BRA: { code: 'BRA', name: 'Brasil', flag: null },
  CAN: { code: 'CAN', name: 'Canada', flag: null },
  CIV: { code: 'CIV', name: 'Costa de Marfil', flag: null },
  COD: { code: 'COD', name: 'R. D. Congo', flag: null },
  COL: { code: 'COL', name: 'Colombia', flag: null },
  CPV: { code: 'CPV', name: 'Cabo Verde', flag: null },
  CRO: { code: 'CRO', name: 'Croacia', flag: null },
  CUR: { code: 'CUR', name: 'Curazao', flag: null },
  CZE: { code: 'CZE', name: 'Republica Checa', flag: null },
  ECU: { code: 'ECU', name: 'Ecuador', flag: null },
  EGP: { code: 'EGP', name: 'Egipto', flag: null },
  ESC: { code: 'ESC', name: 'Escocia', flag: null },
  ESP: { code: 'ESP', name: 'Espana', flag: null },
  FRA: { code: 'FRA', name: 'Francia', flag: null },
  GHA: { code: 'GHA', name: 'Ghana', flag: null },
  HAI: { code: 'HAI', name: 'Haiti', flag: null },
  ING: { code: 'ING', name: 'Inglaterra', flag: null },
  IRN: { code: 'IRN', name: 'Iran', flag: null },
  IRQ: { code: 'IRQ', name: 'Irak', flag: null },
  JAP: { code: 'JAP', name: 'Japon', flag: null },
  JOR: { code: 'JOR', name: 'Jordania', flag: null },
  KOR: { code: 'KOR', name: 'Corea del Sur', flag: null },
  KSA: { code: 'KSA', name: 'Arabia Saudita', flag: null },
  MAR: { code: 'MAR', name: 'Marruecos', flag: null },
  MEX: { code: 'MEX', name: 'Mexico', flag: null },
  NED: { code: 'NED', name: 'Paises Bajos', flag: null },
  NOR: { code: 'NOR', name: 'Noruega', flag: null },
  NZL: { code: 'NZL', name: 'Nueva Zelanda', flag: null },
  PAN: { code: 'PAN', name: 'Panama', flag: null },
  PAR: { code: 'PAR', name: 'Paraguay', flag: null },
  POR: { code: 'POR', name: 'Portugal', flag: null },
  QAT: { code: 'QAT', name: 'Qatar', flag: null },
  SEN: { code: 'SEN', name: 'Senegal', flag: null },
  SUD: { code: 'SUD', name: 'Sudafrica', flag: null },
  SUE: { code: 'SUE', name: 'Suecia', flag: null },
  SUI: { code: 'SUI', name: 'Suiza', flag: null },
  TUN: { code: 'TUN', name: 'Tunez', flag: null },
  TUR: { code: 'TUR', name: 'Turquia', flag: null },
  URU: { code: 'URU', name: 'Uruguay', flag: null },
  USA: { code: 'USA', name: 'Estados Unidos', flag: null },
  UZB: { code: 'UZB', name: 'Uzbekistan', flag: null },
}

const GROUP_FIXTURES: LocalFixture[] = [
  ['2026-06-11', '16:00', 'MEX', 'SUD'],
  ['2026-06-11', '23:00', 'KOR', 'CZE'],
  ['2026-06-12', '16:00', 'CAN', 'BIH'],
  ['2026-06-12', '22:00', 'USA', 'PAR'],
  ['2026-06-13', '16:00', 'QAT', 'SUI'],
  ['2026-06-13', '19:00', 'BRA', 'MAR'],
  ['2026-06-13', '22:00', 'HAI', 'ESC'],
  ['2026-06-14', '01:00', 'AUS', 'TUR'],
  ['2026-06-14', '14:00', 'ALE', 'CUR'],
  ['2026-06-14', '17:00', 'NED', 'JAP'],
  ['2026-06-14', '20:00', 'CIV', 'ECU'],
  ['2026-06-14', '23:00', 'SUE', 'TUN'],
  ['2026-06-15', '13:00', 'ESP', 'CPV'],
  ['2026-06-15', '16:00', 'BEL', 'EGP'],
  ['2026-06-15', '19:00', 'KSA', 'URU'],
  ['2026-06-15', '22:00', 'IRN', 'NZL'],
  ['2026-06-16', '16:00', 'FRA', 'SEN'],
  ['2026-06-16', '19:00', 'IRQ', 'NOR'],
  ['2026-06-16', '22:00', 'ARG', 'ALG'],
  ['2026-06-17', '01:00', 'AUS', 'JOR'],
  ['2026-06-17', '14:00', 'POR', 'COD'],
  ['2026-06-17', '17:00', 'ING', 'CRO'],
  ['2026-06-17', '20:00', 'GHA', 'PAN'],
  ['2026-06-17', '23:00', 'UZB', 'COL'],
  ['2026-06-18', '13:00', 'CZE', 'SUD'],
  ['2026-06-18', '16:00', 'SUI', 'BIH'],
  ['2026-06-18', '19:00', 'CAN', 'QAT'],
  ['2026-06-18', '22:00', 'MEX', 'KOR'],
  ['2026-06-19', '16:00', 'USA', 'AUS'],
  ['2026-06-19', '19:00', 'ESC', 'MAR'],
  ['2026-06-19', '21:30', 'BRA', 'HAI'],
  ['2026-06-20', '00:00', 'TUR', 'PAR'],
  ['2026-06-20', '14:00', 'NED', 'SUE'],
  ['2026-06-20', '17:00', 'ALE', 'CIV'],
  ['2026-06-20', '21:00', 'ECU', 'CUR'],
  ['2026-06-21', '01:00', 'TUN', 'JAP'],
  ['2026-06-21', '13:00', 'ESP', 'KSA'],
  ['2026-06-21', '16:00', 'BEL', 'IRN'],
  ['2026-06-21', '19:00', 'URU', 'CPV'],
  ['2026-06-21', '22:00', 'NZL', 'EGP'],
  ['2026-06-22', '14:00', 'ARG', 'AUS'],
  ['2026-06-22', '18:00', 'FRA', 'IRQ'],
  ['2026-06-22', '21:00', 'NOR', 'SEN'],
  ['2026-06-23', '00:00', 'JOR', 'ALG'],
  ['2026-06-23', '14:00', 'POR', 'UZB'],
  ['2026-06-23', '17:00', 'ING', 'GHA'],
  ['2026-06-23', '20:00', 'PAN', 'CRO'],
  ['2026-06-23', '23:00', 'COL', 'COD'],
  ['2026-06-24', '16:00', 'SUI', 'CAN'],
  ['2026-06-24', '16:00', 'BIH', 'QAT'],
  ['2026-06-24', '19:00', 'MAR', 'HAI'],
  ['2026-06-24', '19:00', 'ESC', 'BRA'],
  ['2026-06-24', '22:00', 'SUD', 'KOR'],
  ['2026-06-24', '22:00', 'CZE', 'MEX'],
  ['2026-06-25', '17:00', 'CUR', 'CIV'],
  ['2026-06-25', '17:00', 'ECU', 'ALE'],
  ['2026-06-25', '20:00', 'TUN', 'NED'],
  ['2026-06-25', '20:00', 'JAP', 'SUE'],
  ['2026-06-25', '23:00', 'TUR', 'USA'],
  ['2026-06-25', '23:00', 'PAR', 'AUS'],
  ['2026-06-26', '16:00', 'NOR', 'FRA'],
  ['2026-06-26', '16:00', 'SEN', 'IRQ'],
  ['2026-06-26', '21:00', 'CPV', 'KSA'],
  ['2026-06-26', '21:00', 'URU', 'ESP'],
  ['2026-06-27', '00:00', 'EGP', 'IRN'],
  ['2026-06-27', '00:00', 'NZL', 'BEL'],
  ['2026-06-27', '18:00', 'PAN', 'ING'],
  ['2026-06-27', '18:00', 'CRO', 'GHA'],
  ['2026-06-27', '20:30', 'COL', 'POR'],
  ['2026-06-27', '20:30', 'COD', 'UZB'],
  ['2026-06-27', '23:00', 'ALG', 'AUS'],
  ['2026-06-27', '23:00', 'JOR', 'ARG'],
].map(([date, time, home, away], index) => ({
  number: index + 1,
  date,
  time,
  home,
  away,
  phase: 'groups',
}))

const KNOCKOUT_FIXTURES: LocalFixture[] = [
  [73, '2026-06-28', '16:00', '2A', '2B', 'round_of_32'],
  [74, '2026-06-29', '14:00', '1C', '2F', 'round_of_32'],
  [75, '2026-06-29', '17:30', '1E', '3ABCDF', 'round_of_32'],
  [76, '2026-06-29', '22:00', '1F', '2C', 'round_of_32'],
  [77, '2026-06-30', '14:00', '2E', '2I', 'round_of_32'],
  [78, '2026-06-30', '18:00', '1I', '3CDFGH', 'round_of_32'],
  [79, '2026-06-30', '22:00', '1A', '3CEFHI', 'round_of_32'],
  [80, '2026-07-01', '13:00', '1L', '3EHIJK', 'round_of_32'],
  [81, '2026-07-01', '17:00', '1G', '3AEHIJ', 'round_of_32'],
  [82, '2026-07-01', '21:00', '1D', '3BEFIJ', 'round_of_32'],
  [83, '2026-07-02', '16:00', '1H', '2J', 'round_of_32'],
  [84, '2026-07-02', '20:00', '2K', '2L', 'round_of_32'],
  [85, '2026-07-03', '00:00', '1B', '3EFGIJ', 'round_of_32'],
  [86, '2026-07-03', '15:00', '2D', '2G', 'round_of_32'],
  [87, '2026-07-03', '19:00', '1J', '2H', 'round_of_32'],
  [88, '2026-07-03', '22:30', '1K', '3DEIJL', 'round_of_32'],
  [89, '2026-07-04', '14:00', 'G73', 'G75', 'round_of_16'],
  [90, '2026-07-04', '18:00', 'G74', 'G77', 'round_of_16'],
  [91, '2026-07-05', '17:00', 'G76', 'G78', 'round_of_16'],
  [92, '2026-07-05', '21:00', 'G79', 'G80', 'round_of_16'],
  [93, '2026-07-06', '16:00', 'G83', 'G84', 'round_of_16'],
  [94, '2026-07-06', '21:00', 'G81', 'G82', 'round_of_16'],
  [95, '2026-07-07', '13:00', 'G86', 'G88', 'round_of_16'],
  [96, '2026-07-07', '17:00', 'G85', 'G87', 'round_of_16'],
  [97, '2026-07-09', '17:00', 'G89', 'G90', 'quarterfinals'],
  [98, '2026-07-10', '16:00', 'G93', 'G94', 'quarterfinals'],
  [99, '2026-07-11', '18:00', 'G91', 'G92', 'quarterfinals'],
  [100, '2026-07-11', '22:00', 'G95', 'G96', 'quarterfinals'],
  [101, '2026-07-14', '16:00', 'G97', 'G98', 'semifinals'],
  [102, '2026-07-15', '16:00', 'G99', 'G100', 'semifinals'],
  [103, '2026-07-18', '18:00', 'P101', 'P102', 'third_place'],
  [104, '2026-07-19', '16:00', 'G101', 'G102', 'final'],
].map(([number, date, time, home, away, phase]) => ({
  number: Number(number),
  date: String(date),
  time: String(time),
  home: String(home),
  away: String(away),
  phase: phase as MatchPhase,
}))

const LOCAL_FIXTURES = [...GROUP_FIXTURES, ...KNOCKOUT_FIXTURES]

function getTeam(code: string): LocalTeam {
  if (TEAM_DATA[code]) return TEAM_DATA[code]
  return { code, name: code, flag: null }
}

function toMatchDate(date: string, time: string) {
  return `${date}T${time}:00-05:00`
}

async function upsertLocalTeam(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  code: string
): Promise<number> {
  const team = getTeam(code)
  const { data: existing, error: findError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('short_name', team.code)
    .maybeSingle()

  if (findError) throw findError
  if (existing?.id) return existing.id

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('teams')
    .insert({
      name: team.name,
      short_name: team.code,
      flag_url: team.flag,
      group_letter: null,
      fifa_code: `LOCAL-${team.code}`,
    })
    .select('id')
    .single()

  if (insertError) throw insertError
  return inserted.id
}

export async function importLocalWorldCupCalendar(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient
): Promise<{ imported: number; updated: number; total: number; errors: string[] }> {
  const errors: string[] = []
  let imported = 0
  let updated = 0

  for (const fixture of LOCAL_FIXTURES) {
    try {
      const homeTeamId = await upsertLocalTeam(supabaseAdmin, fixture.home)
      const awayTeamId = await upsertLocalTeam(supabaseAdmin, fixture.away)
      const externalId = `local-wc-2026-${String(fixture.number).padStart(3, '0')}`

      const { data: existing, error: findError } = await supabaseAdmin
        .from('matches')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle()

      if (findError) throw findError

      const payload = {
        external_id: externalId,
        match_number: fixture.number,
        phase: fixture.phase,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_score: null,
        away_score: null,
        match_date: toMatchDate(fixture.date, fixture.time),
        venue: 'Mundial 2026',
        city: null,
        status: 'scheduled',
        last_synced_at: new Date().toISOString(),
        sync_source: 'manual',
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
      errors.push(`Partido ${fixture.number}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return { imported, updated, total: LOCAL_FIXTURES.length, errors }
}
