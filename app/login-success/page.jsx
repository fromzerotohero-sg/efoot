'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginSuccessPage() {
  const router = useRouter()
  const [message, setMessage] = useState('Completing login...')
  const [error, setError] = useState(null)

  useEffect(() => {
    const checkLogin = () => {
      try {
        // Check if user data exists in localStorage
        const userData = localStorage.getItem('metalgate_user')
        const authToken = localStorage.getItem('auth_token')
        
        if (!userData || !authToken) {
          console.error('No user data found in localStorage')
          setError('Login failed. Please try again.')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
          return
        }
        
        const user = JSON.parse(userData)
        if (process.env.NODE_ENV !== 'production') console.log('User logged in successfully:', user.email)
        setMessage('Login successful! Redirecting...')
        
        // Redirect to home page after successful login
        setTimeout(() => {
          router.push('/')
        }, 1500)
        
      } catch (err) {
        console.error('Login check error:', err)
        setError('Something went wrong. Please try again.')
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      }
    }

    const timer = setTimeout(checkLogin, 1000)
    return () => clearTimeout(timer)
  }, [router])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          maxWidth: '400px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem'
          }}>
            ✕
          </div>
          <h2 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>
            {error}
          </h2>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
            Redirecting to login page...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '2rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e5e7eb',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }} />
        <h2 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>
          {message}
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          Please wait while we set up your account
        </p>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
