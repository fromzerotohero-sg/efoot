export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export interface BackendRouteContract {
  methods: readonly HttpMethod[]
  path: string
  auth: boolean
  credits?: number
}

export const ACTIVE_BACKEND_ROUTES = {
  'users.profile': { methods: ['GET'], path: '/v1/users/profile', auth: true },
  'users.profile.save': { methods: ['POST'], path: '/v1/users/profile/save', auth: true },
  'users.aiInfo': { methods: ['GET', 'POST'], path: '/v1/users/ai-info', auth: true },
  'dashboard.read': { methods: ['GET'], path: '/v1/dashboard/read', auth: true },
  'knowledge.read': { methods: ['GET'], path: '/v1/knowledge/read', auth: true },
  'diagnostics.refresh': { methods: ['POST'], path: '/v1/diagnostics/refresh', auth: true },
  'players': { methods: ['POST'], path: '/v1/players', auth: true },
  'players.byId': { methods: ['GET', 'PATCH', 'DELETE'], path: '/v1/players/:id', auth: true },
  'roster.assignSlot': { methods: ['PATCH'], path: '/v1/roster/assign-to-slot', auth: true },
  'roster.removeSlot': { methods: ['PATCH'], path: '/v1/roster/remove-from-slot', auth: true },
  'catalog.players': { methods: ['GET'], path: '/v1/catalog/players', auth: true },
  'catalog.coaches': { methods: ['GET'], path: '/v1/catalog/coaches', auth: true },
  'coaches': { methods: ['GET', 'POST'], path: '/v1/coaches', auth: true },
  'coaches.active': { methods: ['POST'], path: '/v1/coaches/active', auth: true },
  'coaches.byId': { methods: ['DELETE'], path: '/v1/coaches/:id', auth: true },
  'formations': { methods: ['GET'], path: '/v1/formations', auth: true },
  'formations.layout': { methods: ['POST'], path: '/v1/formations/layout', auth: true },
  'formations.variants': { methods: ['GET', 'POST'], path: '/v1/formations/variants', auth: true },
  'tactics': { methods: ['POST'], path: '/v1/tactics', auth: true },
  'matches': { methods: ['POST'], path: '/v1/matches', auth: true },
  'matches.opponentFormations': { methods: ['POST'], path: '/v1/matches/opponent-formations', auth: true },
  'vision.player': { methods: ['POST'], path: '/v1/vision/extract-player', auth: true },
  'vision.coach': { methods: ['POST'], path: '/v1/vision/extract-coach', auth: true },
  'vision.formation': { methods: ['POST'], path: '/v1/vision/extract-formation', auth: true },
  'vision.match': { methods: ['POST'], path: '/v1/vision/extract-match-data', auth: true },
  'vision.gameAnalysis': { methods: ['GET', 'POST'], path: '/v1/vision/extract-game-analysis', auth: true },
  'hero.chat': { methods: ['POST'], path: '/v1/hero/chat', auth: true, credits: 2 },
  'hero.threads': { methods: ['GET', 'POST'], path: '/v1/hero/threads', auth: true },
  'hero.plans': { methods: ['GET', 'POST', 'PATCH'], path: '/v1/hero/plans', auth: true },
  'hero.feedbackChat': { methods: ['POST'], path: '/v1/coach-feedback/chat', auth: true, credits: 1 },
  'hero.feedbackSave': { methods: ['POST'], path: '/v1/coach-feedback/save', auth: true, credits: 1 },
  'countermeasures.generate': { methods: ['POST'], path: '/v1/countermeasures/generate', auth: true, credits: 2 },
  'cardAdvisor.deepAnalysis': { methods: ['POST'], path: '/v1/cardAdvisor/deepAnalysis', auth: true, credits: 2 },
  'cardAdvisor.buildPreview': { methods: ['POST'], path: '/v1/cardAdvisor/buildPreview', auth: true },
  'cardAdvisor.releases': { methods: ['GET'], path: '/v1/cardAdvisor/releases', auth: false },
  'cardAdvisor.image': { methods: ['GET'], path: '/v1/cardAdvisor/image', auth: false },
  'buildCoach.roster': { methods: ['POST'], path: '/v1/buildCoach/roster', auth: true },
  'buildCoach.player': { methods: ['POST'], path: '/v1/buildCoach/player/:id', auth: true },
  'credits.usage': { methods: ['GET', 'POST'], path: '/v1/credits/usage', auth: true },
  'notifications': { methods: ['GET', 'PATCH'], path: '/v1/notifications/list', auth: true },
  'notifications.prefs': { methods: ['GET', 'POST'], path: '/v1/notifications/prefs', auth: true },
  'gates.prelaunch.status': { methods: ['GET'], path: '/v1/gates/prelaunch/status', auth: false },
  'gates.prelaunch.unlock': { methods: ['POST'], path: '/v1/gates/prelaunch/unlock', auth: false },
  'gates.prelaunch.logout': { methods: ['POST'], path: '/v1/gates/prelaunch/logout', auth: false },
  'gates.maintenance.status': { methods: ['GET'], path: '/v1/gates/maintenance/status', auth: false },
  'gates.maintenance.unlock': { methods: ['POST'], path: '/v1/gates/maintenance/unlock', auth: false }
} as const satisfies Record<string, BackendRouteContract>

export const INTENTIONALLY_EXCLUDED_ROUTES = [
  'tasks.list',
  'tasks.generate',
  'roster.starterPack',
  'cardAdvisor.evaluate',
  'cardAdvisor.unlock',
  'credits.transactions',
  'gates.prelaunch.session',
  'buildCoach.repairPlayProfile',
  'catalog.playingStyles',
  'analytics.recalculatePatterns',
  'liveCoach'
] as const
