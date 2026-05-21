// lib/scoring.ts
// Motor de puntuación para la Polla Mundialista 2026

export interface PredictionResult {
  homePred: number
  awayPred: number
  homeReal: number
  awayReal: number
}

export interface PointsBreakdown {
  total: number
  reason: 'exact_score' | 'correct_winner_diff' | 'correct_winner' | 'no_points'
  exactScore: boolean
  correctWinner: boolean
  correctDiff: boolean
}

/**
 * Calcula puntos para una predicción individual
 * Reglas:
 * - Marcador exacto:           5 puntos
 * - Ganador + dif. correcta:   4 puntos (sin exacto)
 * - Solo ganador/empate:        3 puntos
 * - Nada:                       0 puntos
 */
export function calculatePredictionPoints(result: PredictionResult): PointsBreakdown {
  const { homePred, awayPred, homeReal, awayReal } = result

  // Marcador exacto
  if (homePred === homeReal && awayPred === awayReal) {
    return {
      total: 5,
      reason: 'exact_score',
      exactScore: true,
      correctWinner: true,
      correctDiff: true,
    }
  }

  const getWinner = (h: number, a: number) =>
    h > a ? 'home' : h < a ? 'away' : 'draw'

  const predWinner = getWinner(homePred, awayPred)
  const realWinner = getWinner(homeReal, awayReal)

  const correctWinner = predWinner === realWinner
  const correctDiff =
    correctWinner && homePred - awayPred === homeReal - awayReal

  if (correctWinner && correctDiff) {
    return {
      total: 4,
      reason: 'correct_winner_diff',
      exactScore: false,
      correctWinner: true,
      correctDiff: true,
    }
  }

  if (correctWinner) {
    return {
      total: 3,
      reason: 'correct_winner',
      exactScore: false,
      correctWinner: true,
      correctDiff: false,
    }
  }

  return {
    total: 0,
    reason: 'no_points',
    exactScore: false,
    correctWinner: false,
    correctDiff: false,
  }
}

export interface StandingEntry {
  userId: string
  totalPoints: number
  exactScores: number
  correctWinners: number
  correctDiffs: number
  predictionsMade: number
  rank: number
}

/**
 * Recalcula el ranking completo de una polla dado un array de entradas
 */
export function recalculatePollRanking(entries: Omit<StandingEntry, 'rank'>[]): StandingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores
    if (b.correctWinners !== a.correctWinners) return b.correctWinners - a.correctWinners
    return b.correctDiffs - a.correctDiffs
  })

  let rank = 1
  return sorted.map((entry, idx) => {
    if (idx > 0 && entry.totalPoints !== sorted[idx - 1].totalPoints) {
      rank = idx + 1
    }
    return { ...entry, rank }
  })
}

/**
 * Calcula el porcentaje de puntos máximos posibles
 */
export function calculateEfficiency(
  totalPoints: number,
  predictionsMade: number,
  maxPointsPerMatch = 5
): number {
  if (predictionsMade === 0) return 0
  const maxPossible = predictionsMade * maxPointsPerMatch
  return Math.round((totalPoints / maxPossible) * 100)
}

/**
 * Genera el resumen de puntos de un usuario
 */
export function generateUserSummary(standing: StandingEntry) {
  return {
    ...standing,
    efficiency: calculateEfficiency(standing.totalPoints, standing.predictionsMade),
    averagePoints:
      standing.predictionsMade > 0
        ? Math.round((standing.totalPoints / standing.predictionsMade) * 10) / 10
        : 0,
  }
}
