import type { DishScore } from '../store/voterStore'

export type RankingMode = 'simple' | 'bayesian'

export interface RankedDish {
  id: string
  score: number // the computed score used for sorting
}

/**
 * Compute bayesian average for a dish.
 * Formula: (C * m + n * avg) / (C + n)
 * - m: global mean across all dishes
 * - n: number of votes for this dish
 * - C: confidence threshold (median vote count, min 2)
 */
function bayesianScore(avg: number, count: number, globalMean: number, threshold: number): number {
  return (threshold * globalMean + count * avg) / (threshold + count)
}

/**
 * Compute ranking scores for all dishes.
 * Returns a Map of dish_id → computed score.
 */
export function computeRankingScores(
  dishScores: Map<string, DishScore>,
  mode: RankingMode,
): Map<string, number> {
  const result = new Map<string, number>()

  if (mode === 'simple') {
    for (const [dishId, score] of dishScores) {
      result.set(dishId, score.avg)
    }
    return result
  }

  // Bayesian mode
  const entries = Array.from(dishScores.entries())
  if (entries.length === 0) return result

  // Global mean: weighted average of all dish averages
  let totalScore = 0
  let totalCount = 0
  for (const [, score] of entries) {
    totalScore += score.avg * score.count
    totalCount += score.count
  }
  const globalMean = totalCount > 0 ? totalScore / totalCount : 5

  // Threshold C: median vote count (min 2)
  const counts = entries.map(([, s]) => s.count).sort((a, b) => a - b)
  const medianCount = counts[Math.floor(counts.length / 2)]
  const threshold = Math.max(medianCount, 2)

  for (const [dishId, score] of entries) {
    result.set(dishId, bayesianScore(score.avg, score.count, globalMean, threshold))
  }

  return result
}
