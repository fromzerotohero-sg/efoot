import { createClient } from '@supabase/supabase-js'

export function extractBearerToken(request) {
  const value = request?.headers?.authorization || ''
  if (!value.toLowerCase().startsWith('bearer ')) return null
  const token = value.slice(7).trim()
  return token || null
}

export function createSupabaseIdentityProvider(config) {
  return {
    name: 'SupabaseIdentityProvider',
    async resolveUser(request) {
      const token = extractBearerToken(request)
      if (!token) {
        const error = new Error('Authentication required')
        error.statusCode = 401
        throw error
      }
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        const error = new Error('Supabase identity is not configured')
        error.statusCode = 503
        throw error
      }

      const auth = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data, error } = await auth.auth.getUser(token)
      if (error || !data?.user?.id) {
        const invalid = new Error('Invalid or expired authentication')
        invalid.statusCode = 401
        throw invalid
      }

      // MetalGate identity belongs to Tommaso and is deliberately not resolved here.
      if (data.user.user_metadata?.is_metalgate_user) {
        const deferred = new Error('MetalGate identity is not implemented in this backend')
        deferred.statusCode = 501
        throw deferred
      }

      return { token, user: data.user, userId: data.user.id }
    }
  }
}

export function createTestIdentityProvider(userId = '00000000-0000-4000-8000-000000000001') {
  return {
    name: 'TestIdentityProvider',
    async resolveUser() {
      return { token: 'test', user: { id: userId }, userId }
    }
  }
}
