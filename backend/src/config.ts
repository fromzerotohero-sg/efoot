import { BACKEND_VERSION } from './inventory.js'

export interface BackendConfig {
  name: string
  version: string
  mode: 'dormant' | 'live'
  dormant: boolean
  host: string
  port: number
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  allowDormantDbReads: boolean
  openAiApiKey: string
  openAiModel: string
  cardAdvisorAccessCode: string
  prelaunchEnabled: boolean
  prelaunchCode: string
  maintenanceEnabled: boolean
  maintenanceKey: string
  secureCookies: boolean
  allowLive: boolean
}

function envFlag(name: string, fallback = '0'): string {
  const raw = process.env[name]
  if (raw == null || raw === '') return fallback
  return String(raw).trim()
}

function envBoolean(name: string, fallback = false): boolean {
  const value = envFlag(name, fallback ? '1' : '0').toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(value)
}

export function loadConfig(): BackendConfig {
  const mode = (process.env.BACKEND_MODE || 'dormant').trim().toLowerCase()
  const allowLive = envFlag('ALLOW_BACKEND_LIVE', '0') === '1'
  const dormant = mode !== 'live' || !allowLive
  const requestedHost = process.env.HOST || '127.0.0.1'
  return {
    name: 'efoot-backend',
    version: BACKEND_VERSION,
    mode: dormant ? 'dormant' : 'live',
    dormant,
    // Inventory exposes internal architecture; dormant mode is loopback-only.
    host: dormant ? '127.0.0.1' : requestedHost,
    port: Number(process.env.PORT || 4050),
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    allowDormantDbReads: envFlag('ALLOW_DORMANT_DB_READS', '0') === '1',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    openAiModel: process.env.OPENAI_MODEL || 'gpt-5.2',
    cardAdvisorAccessCode: process.env.CARD_ADVISOR_ACCESS_CODE || process.env.PRELAUNCH_ACCESS_CODE || '',
    prelaunchEnabled: envBoolean('PRELAUNCH_ENABLED'),
    prelaunchCode: process.env.PRELAUNCH_ACCESS_CODE || '',
    maintenanceEnabled: envBoolean('MAINTENANCE_MODE'),
    maintenanceKey: process.env.MAINTENANCE_BYPASS_KEY || '',
    secureCookies: envBoolean('SECURE_COOKIES', process.env.NODE_ENV === 'production'),
    allowLive
  }
}
