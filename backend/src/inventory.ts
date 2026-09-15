/**
 * Single catalog of what the separate backend must not lose.
 * Status:
 *   migrate                 → extract into this backend (later cutover)
 *   migrate-after-foundations → Hero/AI that depend on other domains
 *   deferred-metalgate      → Tommaso; placeholder only
 *   legacy-do-not-migrate   → route not called by the active UX; do not expose
 *   frontend-only           → stay in Next.js
 *   db-owned                → Postgres trigger/RPC; do not duplicate in Node
 */

export const BACKEND_VERSION = '0.0.1-dormant'

export type RouteStatus =
  | 'migrate'
  | 'migrate-after-foundations'
  | 'deferred-metalgate'
  | 'legacy-do-not-migrate'
  | 'frontend-only'
  | 'db-owned'

export interface RouteInventoryItem {
  source: string
  capability: string
  domain: string
  status: RouteStatus
  mutating: boolean
  credits?: boolean
  creditsRead?: boolean
  implementation?: string
  dbRpc?: string
  note?: string
}

export interface LibModuleItem {
  source: string
  domain: string
  status: RouteStatus
  note?: string
}

export interface DbTriggerItem {
  name: string
  table: string
  owner: string
  fn: string
  note?: string
}

export interface InventorySummary {
  routes: number
  routesByStatus: Record<string, number>
  libModules: number
  dbTriggers: number
  dbTables: number
  edgeFunctionsQuarantine: number
  domainContracts: number
}

export const ROUTES: RouteInventoryItem[] = [
  { source: 'app/api/user/profile/route.js', capability: 'users.profile', domain: 'users', status: 'migrate', mutating: true },
  { source: 'app/api/supabase/save-profile/route.js', capability: 'users.profile.save', domain: 'users', status: 'migrate', mutating: true },
  { source: 'app/api/supabase/save-ai-info/route.js', capability: 'users.aiInfo.save', domain: 'users', status: 'migrate', mutating: true },
  { source: 'app/api/dashboard/route.js', capability: 'dashboard.read', domain: 'dashboard', status: 'migrate', mutating: false },
  { source: 'app/api/ai-knowledge/route.js', capability: 'knowledge.read', domain: 'memory', status: 'migrate', mutating: false },
  { source: 'app/api/refresh-diagnostic/route.js', capability: 'diagnostics.refresh', domain: 'diagnostics', status: 'migrate', mutating: true },

  { source: 'app/api/players/[id]/route.js', capability: 'players.read', domain: 'players', status: 'migrate', implementation: 'read-handler', mutating: false },
  { source: 'app/api/supabase/save-player/route.js', capability: 'players.save', domain: 'players', status: 'migrate', mutating: true },
  { source: 'app/api/supabase/delete-player/route.js', capability: 'players.delete', domain: 'players', status: 'migrate', implementation: 'write-handler-live-only', mutating: true },
  { source: 'app/api/supabase/assign-player-to-slot/route.js', capability: 'roster.assignSlot', domain: 'roster', status: 'migrate', mutating: true, dbRpc: 'atomic_slot_assignment' },
  { source: 'app/api/supabase/remove-player-from-slot/route.js', capability: 'roster.removeSlot', domain: 'roster', status: 'migrate', mutating: true },
  { source: 'app/api/starter-pack/import/route.js', capability: 'roster.starterPack', domain: 'roster', status: 'legacy-do-not-migrate', mutating: true, note: 'No active UX caller' },

  { source: 'app/api/player-catalog/search/route.js', capability: 'catalog.players.search', domain: 'catalog', status: 'migrate', mutating: false },
  { source: 'app/api/coach-catalog/search/route.js', capability: 'catalog.coaches.search', domain: 'catalog', status: 'migrate', mutating: false },
  { source: 'app/api/playing-styles/route.js', capability: 'catalog.playingStyles', domain: 'catalog', status: 'legacy-do-not-migrate', mutating: false, note: 'Active Rosa receives styles from formation.read' },

  { source: 'app/api/coaches/route.js', capability: 'coaches.list', domain: 'coaches', status: 'migrate', mutating: false },
  { source: 'app/api/supabase/save-coach/route.js', capability: 'coaches.save', domain: 'coaches', status: 'migrate', mutating: true },
  { source: 'app/api/supabase/set-active-coach/route.js', capability: 'coaches.setActive', domain: 'coaches', status: 'migrate', mutating: true },
  { source: 'app/api/extract-coach/route.js', capability: 'vision.extractCoach', domain: 'vision', status: 'migrate', mutating: true, credits: true },

  { source: 'app/api/formation/route.js', capability: 'formations.read', domain: 'formations', status: 'migrate', mutating: false },
  { source: 'app/api/supabase/save-formation-layout/route.js', capability: 'formations.saveLayout', domain: 'formations', status: 'migrate', mutating: true },
  { source: 'app/api/tactical/formation-variants/route.js', capability: 'formations.variants', domain: 'formations', status: 'migrate', mutating: true },
  { source: 'app/api/extract-formation/route.js', capability: 'vision.extractFormation', domain: 'vision', status: 'migrate', mutating: true, credits: true },
  { source: 'app/api/supabase/save-tactical-settings/route.js', capability: 'tactics.save', domain: 'tactics', status: 'migrate', mutating: true },

  { source: 'app/api/supabase/save-match/route.js', capability: 'matches.save', domain: 'matches', status: 'migrate', mutating: true },
  { source: 'app/api/extract-match-data/route.js', capability: 'vision.extractMatch', domain: 'vision', status: 'migrate', mutating: true, credits: true },
  { source: 'app/api/extract-game-analysis/route.js', capability: 'vision.extractGameAnalysis', domain: 'vision', status: 'migrate', mutating: true, credits: true },
  { source: 'app/api/supabase/save-opponent-formation/route.js', capability: 'matches.saveOpponentFormation', domain: 'matches', status: 'migrate', mutating: true },
  { source: 'app/api/admin/recalculate-patterns/route.js', capability: 'analytics.recalculatePatterns', domain: 'analytics', status: 'legacy-do-not-migrate', mutating: true, note: 'No active HTTP caller; pattern refresh remains an internal match-save side effect' },

  { source: 'app/api/assistant-chat/route.js', capability: 'hero.chat', domain: 'hero', status: 'migrate-after-foundations', mutating: true, credits: true },
  { source: 'app/api/hero-chat/route.js', capability: 'hero.threads', domain: 'hero', status: 'migrate-after-foundations', mutating: true },
  { source: 'app/api/hero-chat/plans/route.js', capability: 'hero.plans', domain: 'hero', status: 'migrate-after-foundations', mutating: true },
  { source: 'app/api/coach-feedback-chat/route.js', capability: 'hero.palestra.chat', domain: 'hero', status: 'migrate-after-foundations', mutating: true, credits: true },
  { source: 'app/api/save-coach-feedback/route.js', capability: 'hero.palestra.save', domain: 'hero', status: 'migrate-after-foundations', mutating: true, credits: true },
  { source: 'app/api/generate-countermeasures/route.js', capability: 'countermeasures.generate', domain: 'countermeasures', status: 'migrate-after-foundations', mutating: true, credits: true },

  { source: 'app/api/extract-player/route.js', capability: 'vision.extractPlayer', domain: 'vision', status: 'migrate', mutating: true, credits: true },

  { source: 'app/api/card-advisor-lab/evaluate/route.js', capability: 'cardAdvisor.evaluate', domain: 'card-advisor', status: 'legacy-do-not-migrate', mutating: true, credits: true, note: 'Current Card Advisor UX calls deep-analysis, not evaluate' },
  { source: 'app/api/card-advisor-lab/deep-analysis/route.js', capability: 'cardAdvisor.deepAnalysis', domain: 'card-advisor', status: 'migrate', mutating: true, credits: true },
  { source: 'app/api/card-advisor-lab/build-preview/route.js', capability: 'cardAdvisor.buildPreview', domain: 'card-advisor', status: 'migrate', mutating: false },
  { source: 'app/api/card-advisor-lab/image/route.js', capability: 'cardAdvisor.image', domain: 'card-advisor', status: 'migrate', mutating: false },
  { source: 'app/api/card-advisor-lab/releases/route.js', capability: 'cardAdvisor.releases', domain: 'card-advisor', status: 'migrate', mutating: false },
  { source: 'app/api/card-advisor-access/unlock/route.js', capability: 'cardAdvisor.unlock', domain: 'card-advisor', status: 'legacy-do-not-migrate', mutating: true, note: 'No active UX caller' },

  { source: 'app/api/build-coach/roster/route.js', capability: 'buildCoach.roster', domain: 'build-coach', status: 'migrate', mutating: true },
  { source: 'app/api/build-coach/player/[id]/route.js', capability: 'buildCoach.player', domain: 'build-coach', status: 'migrate', mutating: true },
  { source: 'app/api/build-coach/repair-play-profile/route.js', capability: 'buildCoach.repairPlayProfile', domain: 'build-coach', status: 'legacy-do-not-migrate', mutating: true, note: 'No active UX caller' },

  { source: 'app/api/tasks/list/route.js', capability: 'tasks.list', domain: 'tasks', status: 'legacy-do-not-migrate', mutating: true, note: 'Task UI was removed; GET also writes weekly_goals' },
  { source: 'app/api/tasks/generate/route.js', capability: 'tasks.generate', domain: 'tasks', status: 'legacy-do-not-migrate', mutating: true, note: 'Task UI was removed' },

  { source: 'app/api/credits/usage/route.js', capability: 'credits.usage', domain: 'credits', status: 'migrate', mutating: false, creditsRead: true },
  { source: 'app/api/credits/transactions/route.js', capability: 'credits.transactions', domain: 'credits', status: 'legacy-do-not-migrate', mutating: false, creditsRead: true, note: 'No active UX caller' },
  { source: 'app/api/credits/accredit/route.js', capability: 'credits.accredit', domain: 'credits', status: 'deferred-metalgate', mutating: true },

  { source: 'app/api/auth/metalgate-callback/route.js', capability: 'auth.metalgate.callback', domain: 'auth', status: 'deferred-metalgate', mutating: true },
  { source: 'app/api/auth/metalgate-verify/route.js', capability: 'auth.metalgate.verify', domain: 'auth', status: 'deferred-metalgate', mutating: false },
  { source: 'app/api/metalgate-sync/route.js', capability: 'auth.metalgate.sync', domain: 'auth', status: 'deferred-metalgate', mutating: true },

  { source: 'app/api/prelaunch/status/route.js', capability: 'gates.prelaunch.status', domain: 'gates', status: 'migrate', mutating: false },
  { source: 'app/api/prelaunch/session/route.js', capability: 'gates.prelaunch.session', domain: 'gates', status: 'legacy-do-not-migrate', mutating: false, note: 'No active UX caller' },
  { source: 'app/api/prelaunch/unlock/route.js', capability: 'gates.prelaunch.unlock', domain: 'gates', status: 'migrate', mutating: true },
  { source: 'app/api/prelaunch/logout/route.js', capability: 'gates.prelaunch.logout', domain: 'gates', status: 'migrate', mutating: true },
  { source: 'app/api/maintenance/status/route.js', capability: 'gates.maintenance.status', domain: 'gates', status: 'migrate', mutating: false },
  { source: 'app/api/maintenance/unlock/route.js', capability: 'gates.maintenance.unlock', domain: 'gates', status: 'migrate', mutating: true },

  { source: 'app/api/notifications/route.js', capability: 'notifications.list', domain: 'notifications', status: 'migrate', mutating: false, note: 'Production table applied 2026-09-15' },
  { source: 'app/api/notifications/prefs/route.js', capability: 'notifications.prefs', domain: 'notifications', status: 'migrate', mutating: true, note: 'notification_prefs applied 2026-09-15' },

]

export const LIB_MODULES: LibModuleItem[] = [
  { source: 'lib/authHelper.js', domain: 'auth', status: 'migrate', note: 'JWT resolve; MetalGate /sso/verify is deferred' },
  { source: 'lib/creditService.js', domain: 'credits', status: 'migrate', note: 'Use MockCreditProvider until MetalGate cutover' },
  { source: 'lib/openaiHelper.js', domain: 'providers', status: 'migrate' },
  { source: 'lib/rateLimiter.js', domain: 'shared', status: 'migrate', note: 'In-memory is not enough for future live backend' },
  { source: 'lib/ragHelper.js', domain: 'rag', status: 'migrate' },
  { source: 'lib/efootballTruthLayer.js', domain: 'truth', status: 'migrate' },
  { source: 'lib/efootballV6Rules.js', domain: 'truth', status: 'migrate' },
  { source: 'lib/efootballV6TacticalModel.js', domain: 'tactics', status: 'migrate' },
  { source: 'lib/playingStyleResolve.js', domain: 'catalog', status: 'migrate', note: 'v6 attack+defense adapter' },
  { source: 'lib/teamPlayingStyles.js', domain: 'tactics', status: 'migrate' },
  { source: 'lib/tacticalInstructions.js', domain: 'tactics', status: 'migrate', note: 'No Offensivo/Linea bassa in domain model' },
  { source: 'lib/playerSavePayload.js', domain: 'players', status: 'migrate' },
  { source: 'lib/playerSkillLabels.js', domain: 'players', status: 'migrate' },
  { source: 'lib/playerSkillSemantics.js', domain: 'players', status: 'migrate' },
  { source: 'lib/rosterSkillsContext.js', domain: 'players', status: 'migrate', note: 'native ≠ additional ≠ COM/AI' },
  { source: 'lib/playerEffectiveStats.js', domain: 'players', status: 'migrate' },
  { source: 'lib/playerFieldPlacement.js', domain: 'formations', status: 'migrate', note: 'card position ≠ slot position' },
  { source: 'lib/playerSlotRoleMetadata.js', domain: 'formations', status: 'migrate' },
  { source: 'lib/rosterSlotUtils.js', domain: 'roster', status: 'migrate' },
  { source: 'lib/saveDefaultFormationWithPlayer.js', domain: 'formations', status: 'migrate' },
  { source: 'lib/validateFormationLimits.js', domain: 'formations', status: 'migrate' },
  { source: 'lib/formationDefaultSlots.js', domain: 'formations', status: 'migrate' },
  { source: 'lib/formationDefenseRules.js', domain: 'formations', status: 'migrate' },
  { source: 'lib/matchSummary.js', domain: 'matches', status: 'migrate' },
  { source: 'lib/matchAttackZones.js', domain: 'matches', status: 'migrate', note: 'our attack ≠ opponent pressure ≠ conceded-goal zones' },
  { source: 'lib/diagnosticBuilder.js', domain: 'diagnostics', status: 'migrate' },
  { source: 'lib/diagnosticCacheSanitize.js', domain: 'diagnostics', status: 'migrate' },
  { source: 'lib/aiKnowledgeHelper.js', domain: 'memory', status: 'migrate' },
  { source: 'lib/taskHelper.js', domain: 'tasks', status: 'legacy-do-not-migrate', note: 'Task UI was removed' },
  { source: 'lib/countermeasuresHelper.js', domain: 'countermeasures', status: 'migrate' },
  { source: 'lib/prematchCustomerPlan.js', domain: 'countermeasures', status: 'migrate' },
  { source: 'lib/prematchChangeSet.js', domain: 'countermeasures', status: 'migrate' },
  { source: 'lib/prematchPitchHelpers.js', domain: 'countermeasures', status: 'migrate' },
  { source: 'lib/cardAdvisorLabCatalog.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'lib/cardAdvisorCardsLookup.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'app/api/card-advisor-lab/evaluate/route.js (helpers in route)', domain: 'card-advisor', status: 'legacy-do-not-migrate', note: 'Unused evaluate route' },
  { source: 'lib/cardAdvisorBuildPreview.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'lib/cardAdvisorPurchaseContext.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'lib/cardAdvisorSkillCompare.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'lib/cardAdvisorSkillSuggestions.js', domain: 'card-advisor', status: 'migrate' },
  { source: 'lib/buildCoachServerUtils.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/buildCoachBaselineRepair.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/gameplayBuildCoach.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/playerBuildCoachPrompt.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/efootballBuildRules.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/efootballProgressionCost.js', domain: 'build-coach', status: 'migrate' },
  { source: 'lib/playerOverallPipeline.js', domain: 'players', status: 'migrate' },
  { source: 'lib/catalogPlayerBackfill.js', domain: 'catalog', status: 'migrate' },
  { source: 'lib/heroChatStore.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/heroChatAuth.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/coachPromptRules.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/coachSuggestionEngine.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/chatReadiness.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/chatCardAvailability.js', domain: 'hero', status: 'migrate-after-foundations' },
  { source: 'lib/notifyUser.js', domain: 'notifications', status: 'migrate' },
  { source: 'lib/maintenanceServer.js', domain: 'gates', status: 'migrate' },
  { source: 'lib/prelaunchServer.js', domain: 'gates', status: 'migrate' },
  { source: 'lib/starter-pack/defaultMetaPack.js', domain: 'roster', status: 'legacy-do-not-migrate', note: 'Starter-pack UI is absent' },
  { source: 'lib/i18n.js', domain: 'frontend', status: 'frontend-only' },
  { source: 'lib/cameraCapture.js', domain: 'frontend', status: 'frontend-only' },
  { source: 'lib/pwaInstall.js', domain: 'frontend', status: 'frontend-only' },
  { source: 'lib/postLoginRedirect.js', domain: 'frontend', status: 'frontend-only' },
  { source: 'lib/supabaseClient.js', domain: 'frontend', status: 'frontend-only', note: 'Browser client stays in Next.js' }
]

export const DB_TRIGGERS: DbTriggerItem[] = [
  { name: 'after_match_save_refresh_performance', table: 'matches', owner: 'db-owned', fn: 'trg_refresh_player_performance' },
  { name: 'trigger_cleanup_individual_instructions', table: 'players', owner: 'db-owned', fn: 'cleanup_orphan_individual_instructions' },
  { name: 'update_players_updated_at', table: 'players', owner: 'db-owned', fn: 'update_updated_at_column' },
  { name: 'trigger_calculate_profile_completion', table: 'user_profiles', owner: 'db-owned', fn: 'calculate_profile_completion_score' },
  { name: 'trigger_set_initial_division', table: 'user_profiles', owner: 'db-owned', fn: 'set_initial_division' },
  { name: 'atomic_slot_assignment', table: 'players', owner: 'db-owned', fn: 'atomic_slot_assignment', note: 'RPC called by roster.assignSlot' }
]

export const DB_TABLES: string[] = [
  'user_profiles', 'players', 'coaches', 'formation_layout', 'formation_variants',
  'team_tactical_settings', 'playing_styles', 'matches', 'opponent_formations',
  'player_performance_aggregates', 'team_tactical_patterns', 'weekly_goals',
  'user_credit_usage', 'credit_transactions', 'credit_error_logs',
  'user_diagnostic_cache', 'user_game_analysis', 'user_tactical_feedback',
  'player_catalog', 'player_identities', 'player_catalog_meta_targets', 'player_catalog_import_runs',
  'coach_catalog', 'card_advisor_releases', 'card_advisor_cards',
  'hero_chat_threads', 'hero_chat_messages', 'prematch_plans',
  'smart_coach_contexts', 'leaderboard_snapshots', 'user_prizes', 'notifications',
  'daily_spin_claims', 'live_coach_sessions'
]

export const LEGACY_DB_TABLES = Object.freeze({
  daily_spin_claims: 'Legacy/no active API; do not expose in the backend',
  live_coach_sessions: 'Legacy Live Coach; do not expose or migrate'
})

export const EDGE_FUNCTIONS_QUARANTINE: string[] = [
  'process-screenshot', 'analyze-rosa', 'import-players-from-drive', 'import-players-json',
  'test-efootballhub', 'scrape-players', 'process-screenshot-gpt',
  'analyze-heatmap-screenshot-gpt', 'analyze-squad-formation-gpt', 'analyze-player-ratings-gpt',
  'voice-coaching-gpt', 'realtime-proxy'
]

export const DOMAIN_CONTRACTS: string[] = [
  'Player Skill ≠ Additional Skill ≠ AI/COM Playstyle',
  'Form trait ≠ Live Update Rating A/B/C/D/E ≠ Current Condition',
  'Card/Natural Position ≠ formation slot position',
  'Attacking Playing Style ≠ Defensive Playing Style',
  'Official game truth ≠ competitive meta ≠ community heuristic',
  'User stated fact ≠ measured data ≠ AI inference ≠ coach recommendation',
  'Diagnostic cache ≠ source of truth',
  'Raw match history ≠ derived tactical patterns',
  'Your attack zones ≠ opponent pressure ≠ conceded-goal zones',
  'Do not treat Offensivo / Linea bassa as valid v6 instructions'
]

export function routeSources(): string[] {
  return ROUTES.map((row) => row.source.replace(/\\/g, '/'))
}

export function summarizeInventory(): InventorySummary {
  const countBy = (list: readonly RouteInventoryItem[], key: 'status'): Record<string, number> =>
    list.reduce<Record<string, number>>((acc, row) => {
      const value = row[key]
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})
  return {
    routes: ROUTES.length,
    routesByStatus: countBy(ROUTES, 'status'),
    libModules: LIB_MODULES.length,
    dbTriggers: DB_TRIGGERS.length,
    dbTables: DB_TABLES.length,
    edgeFunctionsQuarantine: EDGE_FUNCTIONS_QUARANTINE.length,
    domainContracts: DOMAIN_CONTRACTS.length
  }
}
