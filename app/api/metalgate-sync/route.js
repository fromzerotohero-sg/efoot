import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    console.log('[API] Metalgate sync endpoint called')
    
    const { email, metalgateData, action } = await request.json()
    
    console.log('[API] Request data:', { email, action, hasMetalgateData: !!metalgateData })
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('[API] Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase admin credentials not configured' }, { status: 500 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    if (action === 'sync-user') {
      // Check if user exists in auth.users
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const existingUser = authUsers.users.find(u => u.email === email)
      
      let userId
      if (!existingUser) {
        // Create new user in auth.users
        const { data, error } = await supabase.auth.admin.createUser({
          email: email,
          password: 'metalgate_sso_' + Date.now(),
          email_confirm: metalgateData.email_verified,
          user_metadata: {
            metalgate_user_id: metalgateData.id,
            username: metalgateData.username,
            source: 'metalgate_sso',
            metalgate_email_verified: metalgateData.email_verified
          }
        })
        
        if (error) {
          return Response.json({ error: error.message }, { status: 400 })
        }
        userId = data.user.id
      } else {
        // Update existing user metadata
        const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            metalgate_user_id: metalgateData.id,
            metalgate_email_verified: metalgateData.email_verified,
            last_metalgate_login: new Date().toISOString()
          }
        })
        
        if (error) {
          return Response.json({ error: error.message }, { status: 400 })
        }
        userId = existingUser.id
      }
      
      // Create/update user in user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id, user_id, email, user_metadata, created_at, updated_at')
        .eq('email', email)
        .maybeSingle()
      
      const profileData = {
        email: email,
        first_name: metalgateData.username || email.split('@')[0],
        ai_name: metalgateData.username || email.split('@')[0],
        updated_at: new Date().toISOString()
      }
      
      if (existingProfile) {
        await supabase
          .from('user_profiles')
          .update({
            ...profileData,
            user_metadata: {
              ...existingProfile.user_metadata,
              metalgate_user_id: metalgateData.id,
              metalgate_email_verified: metalgateData.email_verified,
              last_metalgate_sync: new Date().toISOString()
            }
          })
          .eq('email', email)
      } else {
        await supabase
          .from('user_profiles')
          .insert({
            ...profileData,
            user_id: userId,
            metalgate_user_id: metalgateData.id,
            created_at: new Date().toISOString(),
            user_metadata: {
              metalgate_user_id: metalgateData.id,
              metalgate_email_verified: metalgateData.email_verified,
              source: 'metalgate_sso'
            }
          })
      }
      
      // Generate magic link for existing user
      if (process.env.NODE_ENV !== 'production') console.log('[API] Generating magic link for email:', email)
      
      const { data: magicLinkData, error: magicLinkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${request.headers.get('origin')}/auth/magiclink-callback`
        }
      })
      
      if (process.env.NODE_ENV !== 'production') console.log('[API] Magic link generation result:', { magicLinkData, magicLinkError })
      
      if (magicLinkError) {
        console.error('[API] Magic link generation error:', magicLinkError)
        // Fallback: return success without link
        return Response.json({ 
          success: true, 
          message: 'User synced successfully',
          userId: userId
        })
      }
      
      if (process.env.NODE_ENV !== 'production') console.log('[API] Magic link generated successfully:', magicLinkData.properties?.action_link)
      
      return Response.json({ 
        success: true, 
        magicLink: magicLinkData.properties?.action_link,
        userId: userId
      })
    }
    
    return Response.json({ error: 'Invalid action' }, { status: 400 })
    
  } catch (error) {
    console.error('[API] Metalgate sync error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
