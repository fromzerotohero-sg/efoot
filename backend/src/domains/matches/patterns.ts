import type { Json } from '../../types/database.js'
import { classifyMatchResult, type MatchResultClass } from './match.js'
import { summarizeMatchAttackZones, type ZoneAverages } from './zones.js'

// `UsageStat` is a type alias (not an interface) so it keeps an implicit index
// signature and stays assignable to the Json columns of team_tactical_patterns.
export type UsageStat = {
  matches: number
  wins: number
  losses: number
  draws: number
  win_rate: number
}

export type UsageMap = Record<string, UsageStat>

export interface PatternZonePayload {
  our_attack_areas_avg: ZoneAverages | null
  opponent_attack_areas_avg: ZoneAverages | null
  conceded_goal_zones_avg: null
  total_goals_scored?: number | null
  total_goals_conceded?: number | null
}

export interface TacticalPatterns extends PatternZonePayload {
  formation_usage: UsageMap
  playing_style_usage: UsageMap
  recurring_issues: Json[]
  last_50_matches_count: number
}

function addResult(stats: UsageStat, result: MatchResultClass): void {
  stats.matches += 1
  stats[result === 'win' ? 'wins' : result === 'loss' ? 'losses' : 'draws'] += 1
  stats.win_rate = stats.wins / stats.matches
}

export function calculateUsage(matches: unknown = [], field: string): UsageMap {
  const usage: UsageMap = {}

  for (const match of Array.isArray(matches) ? matches : []) {
    const rawValue = match?.[field]
    if (typeof rawValue !== 'string' || !rawValue.trim()) continue

    const value = rawValue.trim()
    if (!usage[value]) {
      usage[value] = {
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        win_rate: 0
      }
    }
    addResult(usage[value], classifyMatchResult(match?.result))
  }

  return usage
}

function finiteStat(value: unknown): number | null {
  if (value == null || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

/**
 * Produces persistence-ready zone aggregates without conflating concepts:
 * - our_attack_areas_avg: where our team attacked
 * - opponent_attack_areas_avg: where the opponent attacked (pressure proxy)
 * - conceded_goal_zones_avg: actual conceded-goal locations, unavailable today
 */
export function buildPatternZonePayload(matches: unknown = []): PatternZonePayload {
  const safeMatches = Array.isArray(matches) ? matches : []
  const zones = summarizeMatchAttackZones(safeMatches)
  let totalGoalsScored = 0
  let totalGoalsConceded = 0
  let scoredCount = 0
  let concededCount = 0

  for (const match of safeMatches) {
    const scored = finiteStat(match?.team_stats?.goals_scored)
    const conceded = finiteStat(match?.team_stats?.goals_conceded)
    if (scored != null) {
      totalGoalsScored += scored
      scoredCount += 1
    }
    if (conceded != null) {
      totalGoalsConceded += conceded
      concededCount += 1
    }
  }

  return {
    our_attack_areas_avg: zones.oursAvg,
    opponent_attack_areas_avg: zones.theirsAvg,
    conceded_goal_zones_avg: null,
    total_goals_scored: scoredCount ? totalGoalsScored : null,
    total_goals_conceded: concededCount ? totalGoalsConceded : null
  }
}

export function calculateTacticalPatterns(matches: unknown = []): TacticalPatterns {
  const safeMatches = Array.isArray(matches) ? matches : []

  return {
    formation_usage: calculateUsage(safeMatches, 'formation_played'),
    playing_style_usage: calculateUsage(safeMatches, 'playing_style_played'),
    recurring_issues: [],
    last_50_matches_count: safeMatches.length,
    ...buildPatternZonePayload(safeMatches)
  }
}
