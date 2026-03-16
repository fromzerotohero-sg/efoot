import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { token, action = 'login' } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Verify Metalgate token and get user info
    const metalgateResponse = await fetch(`${process.env.NEXT_PUBLIC_METALGATE_API_URL}/sso/user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    })

    if (!metalgateResponse.ok) {
      const errorData = await metalgateResponse.json()
      return NextResponse.json({ error: errorData.error || 'Invalid token' }, { status: 401 })
    }

    const metalgateData = await metalgateResponse.json()
    const user = metalgateData.user

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    if (process.env.NODE_ENV !== 'production') console.log('Looking for user with metalgate_user_id:', user.id)
    
    // Check if user exists in Supabase using metalgate_user_id
    const { data: existingUser, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id, user_id, metalgate_user_id, first_name, ai_name, is_metalgate_user, created_at, updated_at')
      .eq('metalgate_user_id', user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase fetch error:', fetchError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Create or update user
    let userData
    if (existingUser) {
      // Update existing user
      const { data: updatedUser, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          metalgate_user_id: user.id,
          is_metalgate_user: true,
          updated_at: new Date().toISOString()
        })
        .eq('metalgate_user_id', user.id)
        .select('id, user_id, metalgate_user_id, first_name, ai_name, is_metalgate_user, created_at, updated_at')
        .single()

      if (updateError) {
        console.error('Supabase update error:', updateError)
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
      }
      userData = updatedUser
    } else {
      // User doesn't exist - only create if registering
      if (action === 'register') {
        // Create auth user first, then profile
        let authUserId;
        try {
          // Create auth user with email
          const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
            email: user.email,
            email_confirm: true,
            user_metadata: {
              metalgate_user_id: user.id,
              source: 'metalgate_sso'
            }
          })

          if (createAuthError) {
            // Check if user already exists - handle silently
            if (createAuthError.message?.includes('already registered') || 
                createAuthError.message?.includes('duplicate') ||
                createAuthError.message?.includes('user_already_exists')) {
              // User already exists, try to get existing user
              try {
                const { data: existingAuthUser } = await supabase.auth.admin.listUsers()
                const existingUser = existingAuthUser.users.find(u => u.email === user.email)
                
                if (existingUser) {
                  authUserId = existingUser.id;
                  if (process.env.NODE_ENV !== 'production') console.log('Using existing auth user with ID:', authUserId);
                } else {
                  // If we can't find existing user, try a different approach
                  if (process.env.NODE_ENV !== 'production') console.log('User might exist, trying alternative lookup...')
                  throw new Error('User exists but could not be found')
                }
              } catch (lookupError) {
                console.error('Could not find existing user:', lookupError.message)
                throw createAuthError
              }
            } else {
              console.error('Auth user creation error:', createAuthError.message)
              throw createAuthError
            }
          } else {
            authUserId = authUser.user.id;
            if (process.env.NODE_ENV !== 'production') console.log('Created auth user with ID:', authUserId);
          }
        } catch (authError) {
          console.error('Auth user creation failed:', authError.message)
          return NextResponse.json({ 
            error: `Authentication setup failed: ${authError.message}`, 
            details: 'auth_setup_failed',
            debug_error: authError.message 
          
          }, { status: 500 })
        }

        // Now create user profile with the auth user ID
        const { data: newUser, error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authUserId, // Use the auth user ID as foreign key
            metalgate_user_id: user.id,
            first_name: user.username || user.email?.split('@')[0] || 'User',
            ai_name: user.username || user.email?.split('@')[0] || 'User',
            is_metalgate_user: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('id, user_id, metalgate_user_id, first_name, ai_name, is_metalgate_user, created_at, updated_at')
          .single()

        if (insertError) {
          console.error('Supabase insert error:', insertError)
          return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }
        userData = newUser
      } else {
        // Login action - user must exist
        return NextResponse.json({ 
          error: 'User not found. Please register first.', 
          details: 'user_not_found'
        }, { status: 404 })
      }
    }

    // Instead of magic link, return success and let frontend handle session
    return NextResponse.json({
      success: true,
      user: userData,
      email: user.email,
      message: 'Authentication successful'
    })

  } catch (error) {
    console.error('Callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
