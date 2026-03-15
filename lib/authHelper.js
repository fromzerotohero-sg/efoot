/**
 * Helper per validazione token Supabase (anon + email)
 * Funziona sia per token anonimi che per token email
 */

import { createClient } from '@supabase/supabase-js'

/**
 * Valida un token Supabase e restituisce userData
 * Supporta sia token anonimi che email
 * 
 * @param {string} token - Bearer token
 * @param {string} supabaseUrl - URL Supabase
 * @param {string} anonKey - Anon key (JWT legacy o publishable)
 * @returns {Promise<{userData: object|null, error: Error|null}>}
 */
export async function validateToken(token, supabaseUrl, anonKey) {
  if (!token || !supabaseUrl || !anonKey) {
    return { userData: null, error: new Error('Missing required parameters') }
  }

  let userData = null
  let userErr = null

  // Usa SOLO la chiave configurata (anonKey) - NO chiavi hardcoded
  try {
    const authClient = createClient(supabaseUrl, anonKey)
    const authResult = await authClient.auth.getUser(token)
    
    if (!authResult.error && authResult.data?.user?.id) {
      userData = authResult.data
      return { userData, error: null }
    } else {
      // Try validating with Metalgate SSO as fallback
      try {
        const metalgateRes = await fetch(`${process.env.NEXT_PUBLIC_METALGATE_API_URL || 'http://localhost:4001/api'}/sso/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })
        
        if (metalgateRes.ok) {
          const metalgateData = await metalgateRes.json()
          if (metalgateData.valid && metalgateData.user) {
             // Mock Supabase user structure so APIs can use it transparently
             userData = {
               user: {
                 id: metalgateData.user.id,
                 email: metalgateData.user.email,
                 user_metadata: {
                   is_metalgate_user: true,
                   metalgate_user_id: metalgateData.user.id
                 },
                 role: 'authenticated',
                 aud: 'authenticated'
               }
             }
             return { userData, error: null }
          }
        }
      } catch (metalgateErr) {
        // Ignore Metalgate error, keep original Supabase error
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Metalgate token validation failed:', metalgateErr)
        }
      }

      userErr = authResult.error || new Error('Token validation failed')
    }
  } catch (err) {
    userErr = err
  }

  return { userData: null, error: userErr || new Error('Token validation failed') }
}

/**
 * Estrae il token Bearer dall'header Authorization
 * 
 * @param {Request} req - Next.js Request object
 * @returns {string|null}
 */
export function extractBearerToken(req) {
  // Prova prima con 'authorization' (case-insensitive)
  let auth = req.headers.get('authorization') || req.headers.get('Authorization') || ''
  
  // Se non trovato, prova a cercare in tutti gli headers (case-insensitive)
  if (!auth) {
    const headers = Object.fromEntries(req.headers.entries())
    const authKey = Object.keys(headers).find(key => key.toLowerCase() === 'authorization')
    auth = authKey ? headers[authKey] : ''
  }
  
  // Estrai token (supporta sia "Bearer token" che "bearer token")
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null
  
  return token
}
