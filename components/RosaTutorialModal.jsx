'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { X, BookOpen, Camera, AlertTriangle, HelpCircle, ChevronDown, ChevronUp, Move } from 'lucide-react'

/**
 * Tutorial per il caricamento della rosa: come caricare, le 3 foto,
 * cosa sono gli alert, cosa fare quando le foto non vengono riconosciute.
 */
export default function RosaTutorialModal({ onClose }) {
  const { t } = useTranslation()
  const [expandedSection, setExpandedSection] = React.useState('steps')

  const sections = [
    {
      id: 'steps',
      titleKey: 'tutorialRosaSectionSteps',
      icon: BookOpen,
      color: 'var(--neon-blue)'
    },
    {
      id: 'photos',
      titleKey: 'tutorialRosaSectionPhotos',
      icon: Camera,
      color: 'var(--neon-purple)'
    },
    {
      id: 'alerts',
      titleKey: 'tutorialRosaSectionAlerts',
      icon: AlertTriangle,
      color: 'var(--neon-orange)'
    },
    {
      id: 'completeMove',
      titleKey: 'tutorialRosaSectionCompleteMove',
      icon: Move,
      color: 'var(--neon-green)'
    },
    {
      id: 'troubleshoot',
      titleKey: 'tutorialRosaSectionTroubleshoot',
      icon: HelpCircle,
      color: 'var(--neon-pink)'
    }
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1002,
        padding: 'clamp(12px, 4vw, 24px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="neon-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          minWidth: 0,
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          padding: 'clamp(16px, 4vw, 24px)',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          background: 'rgba(10, 14, 39, 0.98)',
          border: '2px solid var(--neon-blue)',
          borderRadius: '16px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '24px', minWidth: 0 }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: 0, color: 'var(--neon-blue)', flex: 1, minWidth: 0 }}>
            {t('tutorialRosaTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', opacity: 0.9, marginBottom: '20px', lineHeight: 1.5, wordWrap: 'break-word' }}>
          {t('tutorialRosaIntro')}
        </p>

        {sections.map(({ id, titleKey, icon: Icon, color }) => {
          const isOpen = expandedSection === id
          return (
            <div
              key={id}
              style={{
                marginBottom: '12px',
                border: `1px solid ${isOpen ? color : 'rgba(255,255,255,0.15)'}`,
                borderRadius: '12px',
                overflow: 'hidden',
                background: isOpen ? `${color}10` : 'rgba(255,255,255,0.03)'
              }}
            >
              <button
                type="button"
                onClick={() => setExpandedSection(isOpen ? null : id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: 'clamp(12px, 3vw, 14px) 16px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'clamp(14px, 2.5vw, 15px)',
                  fontWeight: 600,
                  minWidth: 0
                }}
              >
                {Icon && <Icon size={20} color={color} style={{ flexShrink: 0 }} />}
                <span style={{ flex: 1, minWidth: 0, wordWrap: 'break-word' }}>{t(titleKey)}</span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <div style={{ padding: '0 clamp(12px, 3vw, 16px) 16px', fontSize: 'clamp(13px, 2vw, 14px)', lineHeight: 1.6, opacity: 0.95, wordWrap: 'break-word' }}>
                  {id === 'steps' && <TutorialSteps t={t} />}
                  {id === 'photos' && <TutorialPhotos t={t} />}
                  {id === 'alerts' && <TutorialAlerts t={t} />}
                  {id === 'completeMove' && <TutorialCompleteMove t={t} />}
                  {id === 'troubleshoot' && <TutorialTroubleshoot t={t} />}
                </div>
              )}
            </div>
          )
        })}

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button type="button" onClick={onClose} className="btn primary" style={{ width: '100%', minHeight: '44px' }}>
            {t('tutorialRosaGotIt')}
          </button>
        </div>
      </div>
    </div>
  )
}

function TutorialSteps({ t }) {
  return (
    <ul style={{ margin: 0, paddingLeft: '20px' }}>
      <li>{t('tutorialRosaStep1')}</li>
      <li>{t('tutorialRosaStep2')}</li>
      <li>{t('tutorialRosaStep3')}</li>
      <li>{t('tutorialRosaStep4')}</li>
      <li>{t('tutorialRosaStep5')}</li>
    </ul>
  )
}

function TutorialPhotos({ t }) {
  return (
    <>
      <p style={{ marginTop: 0, marginBottom: '10px' }}>{t('tutorialRosaPhotosIntro')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li><strong>{t('tutorialRosaPhoto1Title')}</strong> — {t('tutorialRosaPhoto1Desc')}</li>
        <li><strong>{t('tutorialRosaPhoto2Title')}</strong> — {t('tutorialRosaPhoto2Desc')}</li>
        <li><strong>{t('tutorialRosaPhoto3Title')}</strong> — {t('tutorialRosaPhoto3Desc')}</li>
      </ul>
      <p style={{ marginTop: '14px', marginBottom: '6px', fontWeight: 600, color: 'var(--neon-orange)' }}>{t('tutorialRosaPhotoRulesTitle')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li>{t('tutorialRosaPhotoFullScreen')}</li>
        <li>{t('tutorialRosaPhotoBoosterActive')}</li>
      </ul>
    </>
  )
}

function TutorialAlerts({ t }) {
  return (
    <>
      <p style={{ marginTop: 0, marginBottom: '10px' }}>{t('tutorialRosaAlertsIntro')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li><strong>{t('tutorialRosaAlertDuplicate')}</strong> — {t('tutorialRosaAlertDuplicateDesc')}</li>
        <li><strong>{t('tutorialRosaAlertOutOfRole')}</strong> — {t('tutorialRosaAlertOutOfRoleDesc')}</li>
        <li><strong>{t('tutorialRosaAlertReplace')}</strong> — {t('tutorialRosaAlertReplaceDesc')}</li>
      </ul>
    </>
  )
}

function TutorialCompleteMove({ t }) {
  return (
    <>
      <p style={{ marginTop: 0, marginBottom: '8px' }}>{t('tutorialRosaCompleteLaterIntro')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px', marginBottom: '14px' }}>
        <li>{t('tutorialRosaCompleteLater1')}</li>
        <li>{t('tutorialRosaCompleteLater2')}</li>
      </ul>
      <p style={{ marginTop: 0, marginBottom: '8px' }}>{t('tutorialRosaMoveIntro')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li>{t('tutorialRosaMove1')}</li>
        <li>{t('tutorialRosaMove2')}</li>
        <li>{t('tutorialRosaMove3')}</li>
      </ul>
    </>
  )
}

function TutorialTroubleshoot({ t }) {
  return (
    <>
      <p style={{ marginTop: 0, marginBottom: '10px' }}>{t('tutorialRosaTroubleshootIntro')}</p>
      <ul style={{ margin: 0, paddingLeft: '20px' }}>
        <li>{t('tutorialRosaTroubleshoot1')}</li>
        <li>{t('tutorialRosaTroubleshoot2')}</li>
        <li>{t('tutorialRosaTroubleshoot3')}</li>
        <li>{t('tutorialRosaTroubleshoot4')}</li>
        <li>{t('tutorialRosaTroubleshoot5')}</li>
        <li>{t('tutorialRosaTroubleshoot6')}</li>
      </ul>
    </>
  )
}
