import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'
import { loadConfig, type BackendConfig } from './config.js'
import { createProviders } from './providers.js'
import { type Providers } from './types.js'
import { dormantPayload, installDormantGuard } from './dormant.js'
import {
  createPlayerReadService,
  createPlayerWriteService,
  registerPlayerRoutes
} from './domains/players/service.js'
import {
  createCatalogReadService,
  registerCatalogRoutes
} from './domains/catalog/routes.js'
import {
  createFormationReadService,
  createFormationWriteService
} from './domains/formations/service.js'
import { registerFormationRoutes } from './domains/formations/routes.js'
import {
  createCoachReadService,
  createCoachWriteService
} from './domains/coaches/service.js'
import { registerCoachRoutes } from './domains/coaches/routes.js'
import {
  createTacticsWriteService,
  registerTacticsRoutes
} from './domains/tactics/service.js'
import { createMatchWriteService } from './domains/matches/service.js'
import { registerMatchRoutes } from './domains/matches/routes.js'
import { createAnalyticsWriteService } from './domains/analytics/service.js'
import {
  createDiagnosticReadService,
  createDiagnosticWriteService,
  registerDiagnosticRoutes
} from './domains/diagnostics/service.js'
import {
  createUserReadService,
  createUserWriteService
} from './domains/users/service.js'
import { registerUserRoutes } from './domains/users/routes.js'
import { createAIKnowledgeService } from './domains/memory/aiKnowledge.js'
import { createKnowledgeRefreshSideEffect } from './domains/memory/knowledgeRefresh.js'
import { registerMemoryRoutes } from './domains/memory/routes.js'
import { createCoachFeedbackDb } from './domains/coach-feedback/db.js'
import { registerCoachFeedbackRoutes } from './domains/coach-feedback/routes.js'
import { createCoachFeedbackService } from './domains/coach-feedback/service.js'
import { createCreditReadService } from './domains/credits/service.js'
import { registerCreditReadRoutes } from './domains/credits/routes.js'
import { createRateLimiter, installRateLimitHook, type RateLimiter } from './rateLimiter.js'
import { createHeroContextBuilder } from './domains/hero-assistant/context.js'
import { createHeroCardAvailability } from './domains/hero-assistant/cardAvailability.js'
import { registerHeroAssistantRoutes } from './domains/hero-assistant/routes.js'
import { createHeroAssistantService } from './domains/hero-assistant/service.js'
import {
  createHeroPersistenceDb,
  createHeroPersistenceService,
  registerHeroPersistenceRoutes
} from './domains/hero-persistence/index.js'
import { createCountermeasuresRepository } from './domains/countermeasures/repository.js'
import { registerCountermeasuresRoutes } from './domains/countermeasures/routes.js'
import { createCountermeasuresService } from './domains/countermeasures/service.js'
import { createGameAnalysisStore, createVisionService } from './domains/vision/service.js'
import { registerVisionRoutes } from './domains/vision/routes.js'
import {
  buildAdvisorPreview,
  cardAdvisorDeepEngine,
  createCardAdvisorDb,
  createCardAdvisorService,
  registerCardAdvisorRoutes
} from './domains/card-advisor/index.js'
import {
  calculatePlayerBuild,
  createBuildCoachDb,
  createBuildCoachService,
  registerBuildCoachRoutes
} from './domains/build-coach/index.js'
import {
  createDashboardDb,
  createDashboardService,
  registerDashboardRoutes
} from './domains/dashboard/index.js'
import { createGateService, registerGateRoutes } from './domains/gates/index.js'
import {
  createNotificationDb,
  createNotificationService,
  registerNotificationRoutes
} from './domains/notifications/index.js'
import {
  BACKEND_VERSION,
  ROUTES,
  DB_TRIGGERS,
  DB_TABLES,
  LEGACY_DB_TABLES,
  EDGE_FUNCTIONS_QUARANTINE,
  DOMAIN_CONTRACTS,
  summarizeInventory,
  type RouteInventoryItem
} from './inventory.js'

// TODO(ts): domain services are still JS; the `any` override slots below get
// precise types when each domain is converted.
export interface BuildAppOverrides extends Partial<BackendConfig> {
  logger?: FastifyServerOptions['logger']
  providers?: Partial<Providers>
  rateLimiter?: RateLimiter
  aiKnowledge?: any
  knowledgeRefresh?: any
  playerReads?: any
  playerWrites?: any
  catalogReads?: any
  formationReads?: any
  formationWrites?: any
  coachReads?: any
  coachWrites?: any
  tacticsWrites?: any
  analyticsWrites?: any
  matchWrites?: any
  diagnosticReads?: any
  diagnosticWrites?: any
  userReads?: any
  userWrites?: any
  coachFeedback?: any
  coachFeedbackDb?: any
  heroAssistant?: any
  heroContextBuilder?: any
  heroCardAvailability?: any
  heroPersistence?: any
  heroPersistenceDb?: any
  countermeasures?: any
  countermeasuresRepository?: any
  creditReads?: any
  gameAnalysisStore?: any
  vision?: any
  cardAdvisorDb?: any
  cardAdvisor?: any
  cardAdvisorEvaluator?: any
  cardAdvisorBuildPreview?: any
  buildCoachDb?: any
  buildCoach?: any
  buildCoachCalculator?: any
  dashboard?: any
  dashboardDb?: any
  gates?: any
  notifications?: any
  notificationDb?: any
}

declare module 'fastify' {
  interface FastifyInstance {
    config: BackendConfig
    providers: Providers
  }
}

function backendPath(item: RouteInventoryItem): string {
  return `/v1/${item.capability.replace(/\./g, '/')}`
}

export async function buildApp(overrides: BuildAppOverrides = {}): Promise<FastifyInstance> {
  const config = { ...loadConfig(), ...overrides }
  const providers: Providers = { ...createProviders(config), ...(overrides.providers || {}) }
  const identityDelegate = providers.identity
  providers.identity = {
    ...identityDelegate,
    async resolveUser(request) {
      if (request.auth?.userId) return request.auth
      const session = await identityDelegate.resolveUser(request)
      request.auth = session
      return session
    }
  }
  const app = Fastify({
    logger: overrides.logger ?? false
  })

  app.decorate('config', config)
  app.decorate('providers', providers)

  installDormantGuard(app, config)
  const rateLimiter = overrides.rateLimiter || createRateLimiter()
  installRateLimitHook(app, rateLimiter, providers.identity)

  app.get('/health', async () => ({
    ok: true,
    dormant: config.dormant,
    mode: config.mode,
    version: BACKEND_VERSION
  }))

  app.get('/ready', async () => ({
    ok: true,
    ready: true,
    dormant: config.dormant,
    traffic: 'off',
    writes: 'blocked',
    credits: 'mock',
    metalgate: 'not-implemented'
  }))

  app.get('/version', async () => ({
    name: config.name,
    version: BACKEND_VERSION,
    mode: config.mode
  }))

  app.get('/inventory', async () => ({
    ok: true,
    summary: summarizeInventory(),
    routes: ROUTES.map((item) => ({
      ...item,
      ...(item.status === 'deferred-metalgate' ? { backendPath: backendPath(item) } : {}),
      routeContract: item.status === 'migrate' || item.status === 'migrate-after-foundations'
        ? 'backend/types/routes.ts'
        : null
    })),
    dbTriggers: DB_TRIGGERS,
    dbTables: DB_TABLES,
    legacyDbTables: LEGACY_DB_TABLES,
    edgeFunctionsQuarantine: EDGE_FUNCTIONS_QUARANTINE,
    domainContracts: DOMAIN_CONTRACTS
  }))

  app.get('/handoff/metalgate', async () => ({
    ok: true,
    dormant: config.dormant,
    owner: 'Tommaso',
    status: 'not-implemented',
    types: {
      full: 'backend/types/database.ts',
      metalgate: 'backend/types/metalgate.ts',
      notes: 'backend/handoff/TOMMASO.md'
    },
    tables: ['user_profiles', 'credit_transactions', 'user_credit_usage', 'credit_error_logs'],
    columns: {
      user_profiles: ['user_id', 'metalgate_user_id', 'is_metalgate_user']
    },
    rpc: ['get_user_id_by_email'],
    placeholders: ROUTES.filter((row) => row.status === 'deferred-metalgate').map((row) => row.capability),
    outOfScope: ['removed product APIs', 'live-coach', 'app/api cutover']
  }))

  const aiKnowledge =
    overrides.aiKnowledge ||
    createAIKnowledgeService({
      readProvider: providers.serverSupabaseWrites,
      writeProvider: providers.serverSupabaseWrites
    })
  // JS domain factories destructure options with defaults (`= null`, `= console`),
  // which narrows their inferred parameter types; `as any` marks the untyped
  // boundary until each domain is converted (same below).
  const knowledgeRefresh = overrides.knowledgeRefresh || createKnowledgeRefreshSideEffect({
    live: !config.dormant && config.allowLive === true,
    refresh: ({ userId }: { userId: string }) => aiKnowledge.read({ userId, refresh: true }),
    logger: app.log
  } as any)

  const playerReads =
    overrides.playerReads || createPlayerReadService(providers.readOnlySupabase)
  const playerWrites =
    overrides.playerWrites || createPlayerWriteService(providers.userSupabaseWrites, { knowledgeRefresh })
  registerPlayerRoutes(app, {
    identity: providers.identity,
    playerReads,
    playerWrites
  })
  const catalogReads =
    overrides.catalogReads || createCatalogReadService(providers.readOnlySupabase)
  registerCatalogRoutes(app, { identity: providers.identity, catalogReads })
  const formationReads =
    overrides.formationReads || createFormationReadService(providers.readOnlySupabase)
  const formationWrites =
    overrides.formationWrites || createFormationWriteService(providers.userSupabaseWrites, { knowledgeRefresh })
  registerFormationRoutes(app, {
    identity: providers.identity,
    formationReads,
    formationWrites
  })
  const coachReads =
    overrides.coachReads || createCoachReadService(providers.readOnlySupabase)
  const coachWrites =
    overrides.coachWrites || createCoachWriteService(providers.userSupabaseWrites, { knowledgeRefresh })
  registerCoachRoutes(app, {
    identity: providers.identity,
    coachReads,
    coachWrites
  })
  const tacticsWrites =
    overrides.tacticsWrites || createTacticsWriteService(providers.userSupabaseWrites, { knowledgeRefresh })
  registerTacticsRoutes(app, { identity: providers.identity, tacticsWrites })
  const analyticsWrites =
    overrides.analyticsWrites || createAnalyticsWriteService(providers.userSupabaseWrites)
  const matchWrites =
    overrides.matchWrites || createMatchWriteService(providers.userSupabaseWrites, {
      logger: app.log,
      afterSave: async ({ token, userId }: { token: string; userId: string }) => {
        await analyticsWrites.recalculatePatterns({ token, userId })
        knowledgeRefresh.schedule({ userId, source: 'matches.save' })
      }
    } as any)
  registerMatchRoutes(app, { identity: providers.identity, matchWrites })
  const diagnosticReads =
    overrides.diagnosticReads || createDiagnosticReadService(providers.readOnlySupabase)
  const diagnosticWrites =
    overrides.diagnosticWrites ||
    createDiagnosticWriteService(providers.userSupabaseWrites, diagnosticReads)
  registerDiagnosticRoutes(app, {
    identity: providers.identity,
    diagnosticWrites
  })
  const userReads =
    overrides.userReads || createUserReadService(providers.readOnlySupabase)
  const userWrites =
    overrides.userWrites || createUserWriteService(providers.userSupabaseWrites, { knowledgeRefresh })
  registerUserRoutes(app, {
    identity: providers.identity,
    userReads,
    userWrites
  })
  registerMemoryRoutes(app, { identity: providers.identity, aiKnowledge })
  const coachFeedback =
    overrides.coachFeedback ||
    createCoachFeedbackService({
      openai: providers.openai,
      credits: providers.credits,
      db: overrides.coachFeedbackDb || createCoachFeedbackDb({
        readProvider: providers.readOnlySupabase,
        writeProvider: providers.serverSupabaseWrites
      }),
      aiKnowledge: {
        update: (input: { userId: string }) => aiKnowledge.read({ ...input, refresh: true })
      },
      config,
      logger: app.log
    } as any)
  registerCoachFeedbackRoutes(app, {
    identity: providers.identity,
    coachFeedback
  })

  const heroAssistant =
    overrides.heroAssistant ||
    createHeroAssistantService({
      config,
      openai: providers.openai,
      credits: providers.credits,
      contextBuilder: overrides.heroContextBuilder || createHeroContextBuilder({
        readProvider: providers.serverSupabaseWrites
      }),
      rateLimiter: ({ userId, maxRequests, windowMs }: { userId: string; maxRequests: number; windowMs: number }) =>
        rateLimiter.check(userId, 'hero.chat', { maxRequests, windowMs }),
      cardAvailability: overrides.heroCardAvailability || createHeroCardAvailability({
        readProvider: providers.serverSupabaseWrites
      })
    } as any)
  registerHeroAssistantRoutes(app, {
    identity: providers.identity,
    heroAssistant
  })

  const heroPersistence =
    overrides.heroPersistence ||
    createHeroPersistenceService({
      config,
      db: overrides.heroPersistenceDb || createHeroPersistenceDb({
        readProvider: providers.serverSupabaseWrites,
        writeProvider: providers.serverSupabaseWrites
      })
    })
  registerHeroPersistenceRoutes(app, {
    identity: providers.identity,
    service: heroPersistence,
    rateLimiter
  } as any)

  const countermeasures =
    overrides.countermeasures ||
    createCountermeasuresService({
      repository: overrides.countermeasuresRepository || createCountermeasuresRepository({
        readProvider: providers.serverSupabaseWrites,
        writeProvider: providers.serverSupabaseWrites
      }),
      openai: providers.openai,
      credits: providers.credits,
      config
    })
  registerCountermeasuresRoutes(app, {
    identity: providers.identity,
    countermeasures,
    rateLimiter
  } as any)
  const creditReads =
    overrides.creditReads || createCreditReadService(providers.readOnlySupabase)
  registerCreditReadRoutes(app, { identity: providers.identity, creditReads })

  const gameAnalysisStore = overrides.gameAnalysisStore || createGameAnalysisStore({
    readProvider: providers.readOnlySupabase,
    writeProvider: providers.userSupabaseWrites
  })
  const vision = overrides.vision || createVisionService({
    openai: providers.openai,
    credits: providers.credits,
    gameAnalysisStore,
    config
  })
  registerVisionRoutes(app, { identity: providers.identity, vision })

  const cardAdvisorDb = overrides.cardAdvisorDb || createCardAdvisorDb({
    readProvider: providers.readOnlySupabase,
    writeProvider: providers.userSupabaseWrites
  })
  const cardAdvisor = overrides.cardAdvisor || createCardAdvisorService({
    config,
    db: cardAdvisorDb,
    openai: providers.openai,
    credits: providers.credits,
    evaluator: overrides.cardAdvisorEvaluator || cardAdvisorDeepEngine,
    buildPreview: overrides.cardAdvisorBuildPreview || buildAdvisorPreview
  })
  registerCardAdvisorRoutes(app, {
    identity: providers.identity,
    service: cardAdvisor,
    accessCode: config.cardAdvisorAccessCode || ''
  } as any)

  const buildCoachDb = overrides.buildCoachDb || createBuildCoachDb({
    readProvider: providers.readOnlySupabase,
    writeProvider: providers.userSupabaseWrites
  })
  const buildCoach = overrides.buildCoach || createBuildCoachService({
    config,
    db: buildCoachDb,
    calculator: overrides.buildCoachCalculator || calculatePlayerBuild
  })
  registerBuildCoachRoutes(app, { identity: providers.identity, service: buildCoach })

  const dashboard = overrides.dashboard || createDashboardService(
    overrides.dashboardDb || createDashboardDb(providers.readOnlySupabase)
  )
  registerDashboardRoutes(app, { identity: providers.identity, service: dashboard })

  const gates = overrides.gates || createGateService({
    config,
    // Production Next.js currently hard-disables the prelaunch gate.
    prelaunchEnabled: false,
    prelaunchCode: config.prelaunchCode || '',
    maintenanceEnabled: Boolean(config.maintenanceEnabled),
    maintenanceKey: config.maintenanceKey || '',
    secureCookies: Boolean(config.secureCookies)
  })
  registerGateRoutes(app, { identity: providers.identity, service: gates })

  const notifications = overrides.notifications || createNotificationService({
    config,
    db: overrides.notificationDb || createNotificationDb({
      readProvider: providers.readOnlySupabase,
      writeProvider: providers.userSupabaseWrites
    })
  })
  registerNotificationRoutes(app, { identity: providers.identity, service: notifications })

  for (const item of ROUTES) {
    // Concrete registrars own every active capability. Only Tommaso's deferred
    // MetalGate endpoints remain explicit 501 placeholders.
    if (item.status !== 'deferred-metalgate') continue
    const url = backendPath(item)
    const methods = (['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).filter(
      (method) => !app.hasRoute({ method, url })
    )
    if (!methods.length) continue
    app.route({
      method: methods,
      url,
      handler: async (request, reply) => {
        const payload = dormantPayload(item, request.method === 'GET' ? 'read-stub' : 'invoke')
        return reply.code(501).send(payload)
      }
    })
  }

  return app
}
