import { createClient } from '@supabase/supabase-js'

function unavailable(message, statusCode = 503) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function createReadOnlySupabaseProvider(config) {
  return {
    name: 'ReadOnlySupabaseProvider',
    forUser(token) {
      if (!config.allowDormantDbReads) {
        throw unavailable('Dormant database reads are disabled')
      }
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw unavailable('Supabase read-only connection is not configured')
      }
      if (!token) {
        throw unavailable('Authenticated token required', 401)
      }

      // Anon key + caller JWT means RLS, not service_role, owns tenant isolation.
      return createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
    },
    forServerCatalog() {
      if (!config.allowDormantDbReads) {
        throw unavailable('Dormant database reads are disabled')
      }
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
        throw unavailable('Supabase server catalog reader is not configured')
      }
      // Needed only for server-owned catalog tables that intentionally have no
      // client SELECT policy. Domain services receive this client for reads only.
      return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    },
    async mutate() {
      throw unavailable('Writes are forbidden through ReadOnlySupabaseProvider', 403)
    }
  }
}

export function createTestReadOnlyProvider(client) {
  return {
    name: 'TestReadOnlySupabaseProvider',
    forUser() {
      return client
    },
    async mutate() {
      throw unavailable('Writes are forbidden through ReadOnlySupabaseProvider', 403)
    }
  }
}

export function createUserSupabaseWriteProvider(config) {
  return {
    name: 'UserSupabaseWriteProvider',
    forUser(token) {
      if (config.dormant || !config.allowLive) {
        throw unavailable('Supabase writes are disabled until live cutover', 403)
      }
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw unavailable('Supabase user connection is not configured')
      }
      if (!token) throw unavailable('Authenticated token required', 401)
      // Never service_role: the caller JWT and RLS must authorize every write.
      return createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } }
      })
    }
  }
}

export function createServerSupabaseWriteProvider(config) {
  return {
    name: 'ServerSupabaseWriteProvider',
    forUser(token) {
      if (config.dormant || !config.allowLive) {
        throw unavailable('Server-side Supabase writes are disabled until live cutover', 403)
      }
      if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
        throw unavailable('Supabase service-role connection is not configured')
      }
      if (!token) throw unavailable('Authenticated token required', 401)
      // Identity is validated before domain invocation. Every domain query must
      // still include the resolved user_id: service_role bypasses RLS.
      return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    }
  }
}
