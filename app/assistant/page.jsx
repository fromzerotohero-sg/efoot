'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, MessageSquare } from 'lucide-react'
import AssistantChat from '@/components/AssistantChat'

export default function AssistantPage() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="neon-card" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderRadius: 0,
        marginBottom: '20px'
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.4)',
            color: 'var(--accent)',
            cursor: 'pointer',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(0, 212, 255, 0.8)',
            boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
            flexShrink: 0
          }}>
            <img src="/coach.jpg" alt="AI Coach" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 className="neon-text" style={{
            fontSize: '18px',
            fontWeight: 700,
            margin: 0
          }}>
            Coach AI
          </h1>
        </div>
      </header>

      {/* Chat Container */}
      <main style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: '20px',
        height: 'calc(100vh - 80px)'
      }}>
        <AssistantChat mode="page" />
      </main>
    </div>
  )
}
