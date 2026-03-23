'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { X, ChevronRight, ChevronLeft, Camera, Pencil, AlertTriangle, Save, Gamepad2, Sparkles } from 'lucide-react'

const OnboardingFormation = ({ onOpenTutorial }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showKeyMessage, setShowKeyMessage] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  const steps = [
    {
      icon: '📸',
      lucideIcon: Camera,
      title: t('formationStep1Title'),
      description: t('formationStep1Desc'),
      color: '#00d4ff',
      bgGradient: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 161, 166, 0.1) 100%)'
    },
    {
      icon: '✏️',
      lucideIcon: Pencil,
      title: t('formationStep2Title'),
      description: t('formationStep2Desc'),
      color: '#22c55e',
      bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(20, 180, 80, 0.1) 100%)'
    },
    {
      icon: '⚠️',
      lucideIcon: AlertTriangle,
      title: t('formationStep3Title'),
      description: t('formationStep3Desc'),
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)'
    },
    {
      icon: '💾',
      lucideIcon: Save,
      title: t('formationStep4Title'),
      description: t('formationStep4Desc'),
      color: '#a855f7',
      bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.1) 100%)'
    },
    {
      icon: '🎮',
      lucideIcon: Gamepad2,
      title: t('formationStep5Title'),
      description: t('formationStep5Desc'),
      color: '#ec4899',
      bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(219, 39, 119, 0.1) 100%)'
    }
  ]

  const openModal = () => {
    setIsOpen(true)
    setCurrentStep(0)
    setShowKeyMessage(true)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsOpen(false)
      setIsAnimating(false)
      document.body.style.overflow = ''
    }, 300)
  }

  const nextStep = () => {
    if (showKeyMessage) {
      setShowKeyMessage(false)
      return
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    } else if (!showKeyMessage) {
      setShowKeyMessage(true)
    }
  }

  const goToStep = (index) => {
    if (!showKeyMessage) {
      setCurrentStep(index)
    }
  }

  // Chiudi con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Pulisci overflow al unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="formation-onboarding-trigger"
        aria-label={t('formationOnboardingTitle')}
      >
        <span className="formation-onboarding-trigger-emoji">🏟️</span>
        <span className="formation-onboarding-trigger-text">{t('formationOnboardingTitle')}</span>
        <style jsx>{`
          .formation-onboarding-trigger {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            background: linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(34, 197, 94, 0.1) 100%);
            border: 2px solid rgba(0, 212, 255, 0.5);
            border-radius: 50px;
            color: #00d4ff;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 
              0 4px 15px rgba(0, 212, 255, 0.3),
              0 0 30px rgba(0, 212, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.1);
            position: relative;
            overflow: hidden;
            text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
          }
          
          .formation-onboarding-trigger::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
            transition: left 0.5s ease;
          }
          
          .formation-onboarding-trigger:hover::before {
            left: 100%;
          }
          
          .formation-onboarding-trigger:hover {
            transform: translateY(-2px) scale(1.02);
            border-color: rgba(0, 212, 255, 0.8);
            box-shadow: 
              0 8px 25px rgba(0, 212, 255, 0.4),
              0 0 40px rgba(0, 212, 255, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          
          .formation-onboarding-trigger:active {
            transform: translateY(0) scale(0.98);
          }
          
          .formation-onboarding-trigger-emoji {
            font-size: 20px;
            animation: stadiumPulse 2s infinite;
            display: inline-block;
          }
          
          @keyframes stadiumPulse {
            0%, 100% { 
              transform: scale(1);
              filter: brightness(1);
            }
            50% { 
              transform: scale(1.1);
              filter: brightness(1.2);
            }
          }
          
          @media (max-width: 640px) {
            .formation-onboarding-trigger {
              padding: 10px 16px;
              font-size: 13px;
            }
            .formation-onboarding-trigger-emoji {
              font-size: 18px;
            }
          }
        `}</style>
      </button>
    )
  }

  const CurrentIcon = showKeyMessage ? Sparkles : steps[currentStep].lucideIcon

  return (
    <div className={`formation-onboarding-overlay ${isAnimating ? 'closing' : ''}`}>
      <div className="formation-onboarding-modal">
        {/* Header con progress */}
        <div className="formation-onboarding-header">
          <div className="formation-onboarding-progress">
            {!showKeyMessage && steps.map((step, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`progress-dot ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                aria-label={`Step ${index + 1}`}
              />
            ))}
            {showKeyMessage && <div className="progress-dot active" />}
          </div>
          <button 
            onClick={closeModal}
            className="formation-onboarding-close"
            aria-label={t('onboardingClose')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenuto */}
        <div className="formation-onboarding-content">
          {showKeyMessage ? (
            <div className="key-message">
              <div className="key-message-icon">
                <span className="stadium-emoji">🏟️</span>
              </div>
              <h2 className="key-message-title">{t('formationOnboardingKeyTitle')}</h2>
              <p className="key-message-subtitle">{t('formationOnboardingKeySubtitle')}</p>
              <div className="soccer-ball-animation">
                <span>⚽</span>
              </div>
            </div>
          ) : (
            <div className="step-content">
              <div 
                className="step-icon-wrapper"
                style={{ background: steps[currentStep].bgGradient }}
              >
                <span className="step-emoji">{steps[currentStep].icon}</span>
                <CurrentIcon 
                  size={40} 
                  color={steps[currentStep].color}
                  className="step-lucide-icon"
                />
              </div>
              <h3 className="step-title" style={{ color: steps[currentStep].color }}>
                {steps[currentStep].title}
              </h3>
              <p className="step-description">
                {steps[currentStep].description}
              </p>
              <div className="step-number">
                {currentStep + 1} / {steps.length}
              </div>
            </div>
          )}
        </div>

        {/* Footer con bottoni */}
        <div className="formation-onboarding-footer">
          <button
            onClick={prevStep}
            className={`formation-onboarding-btn secondary ${(showKeyMessage || currentStep === 0) && showKeyMessage ? 'hidden' : ''}`}
            disabled={showKeyMessage}
          >
            <ChevronLeft size={20} />
            {t('back')}
          </button>
          
          {showKeyMessage || currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="formation-onboarding-btn primary"
            >
              {showKeyMessage ? t('formationOnboardingStart') : t('onboardingNext')}
              {!showKeyMessage && <ChevronRight size={20} />}
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={closeModal}
                className="formation-onboarding-btn cta"
              >
                {t('formationOnboardingStart')}
                <Sparkles size={20} />
              </button>
              {onOpenTutorial && (
                <button
                  onClick={() => {
                    closeModal()
                    setTimeout(() => onOpenTutorial(), 300)
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(0, 212, 255, 0.8)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '8px 16px'
                  }}
                >
                  {t('formationOnboardingTutorialLink') || 'Vuoi istruzioni e consigli specifici? Clicca qui'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .formation-onboarding-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2, 4, 12, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.3s ease;
        }
        
        .formation-onboarding-overlay.closing {
          animation: fadeOut 0.3s ease forwards;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .formation-onboarding-modal {
          background: linear-gradient(145deg, #050814 0%, #02040a 100%);
          border: 2px solid #00d4ff;
          border-radius: 24px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 
            0 0 40px rgba(0, 212, 255, 0.3),
            0 0 80px rgba(0, 161, 166, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
        }
        
        .formation-onboarding-overlay.closing .formation-onboarding-modal {
          animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        @keyframes slideUp {
          from { 
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
          to { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes slideDown {
          from { 
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          to { 
            transform: translateY(30px) scale(0.95);
            opacity: 0;
          }
        }
        
        .formation-onboarding-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
        
        .formation-onboarding-progress {
          display: flex;
          gap: 8px;
        }
        
        .progress-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(0, 212, 255, 0.2);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
          padding: 0;
        }
        
        .progress-dot:hover {
          background: rgba(0, 212, 255, 0.4);
        }
        
        .progress-dot.active {
          background: #00d4ff;
          box-shadow: 0 0 10px rgba(0, 212, 255, 0.6);
          transform: scale(1.2);
        }
        
        .progress-dot.completed {
          background: #22c55e;
          border-color: #22c55e;
        }
        
        .formation-onboarding-close {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        
        .formation-onboarding-close:hover {
          background: rgba(255, 59, 48, 0.2);
          border-color: rgba(255, 59, 48, 0.5);
          color: #FF3B30;
        }
        
        .formation-onboarding-content {
          flex: 1;
          padding: 20px 24px;
          overflow-y: auto;
          min-height: 0;
          max-height: calc(100% - 140px);
        }
        
        /* Key Message Styles */
        .key-message {
          text-align: center;
          animation: fadeInScale 0.5s ease;
        }
        
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .key-message-icon {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 161, 166, 0.1) 100%);
          border: 2px solid rgba(0, 212, 255, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.3);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
          }
        }
        
        .stadium-emoji {
          font-size: 40px;
          animation: stadiumGlow 2s infinite;
        }
        
        @keyframes stadiumGlow {
          0%, 100% { 
            filter: brightness(1) drop-shadow(0 0 5px rgba(0, 212, 255, 0.5));
          }
          50% { 
            filter: brightness(1.3) drop-shadow(0 0 15px rgba(0, 212, 255, 0.8));
          }
        }
        
        .key-message-title {
          font-size: 24px;
          font-weight: 800;
          color: #00d4ff;
          margin-bottom: 12px;
          text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
          line-height: 1.3;
        }
        
        .key-message-subtitle {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin-bottom: 24px;
        }
        
        .soccer-ball-animation {
          font-size: 48px;
          animation: ballBounce 1s infinite;
          display: inline-block;
        }
        
        @keyframes ballBounce {
          0%, 100% { 
            transform: translateY(0) rotate(0deg);
          }
          25% { 
            transform: translateY(-20px) rotate(-10deg);
          }
          50% { 
            transform: translateY(0) rotate(0deg);
          }
          75% { 
            transform: translateY(-10px) rotate(10deg);
          }
        }
        
        /* Step Content Styles */
        .step-content {
          text-align: center;
          animation: slideInRight 0.4s ease;
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .step-icon-wrapper {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          border: 3px solid;
          position: relative;
          animation: iconPulse 2s infinite;
        }
        
        @keyframes iconPulse {
          0%, 100% { 
            transform: scale(1);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.2);
          }
          50% { 
            transform: scale(1.05);
            box-shadow: 0 0 30px rgba(0, 212, 255, 0.4);
          }
        }
        
        .step-emoji {
          font-size: 48px;
          position: absolute;
          opacity: 0.3;
          filter: blur(2px);
        }
        
        .step-lucide-icon {
          position: relative;
          z-index: 1;
        }
        
        .step-title {
          font-size: 22px;
          font-weight: 800;
          margin-bottom: 16px;
          text-shadow: 0 0 15px currentColor;
        }
        
        .step-description {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 20px;
        }
        
        .step-number {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 600;
          letter-spacing: 1px;
        }
        
        /* Footer Styles */
        .formation-onboarding-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
          gap: 12px;
        }
        
        .formation-onboarding-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }
        
        .formation-onboarding-btn.hidden {
          visibility: hidden;
        }
        
        .formation-onboarding-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .formation-onboarding-btn.primary {
          background: linear-gradient(135deg, #00d4ff 0%, #00a1a6 100%);
          color: #000;
          margin-left: auto;
          box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
        }
        
        .formation-onboarding-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.5);
        }
        
        .formation-onboarding-btn.secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.3);
          color: rgba(255, 255, 255, 0.8);
        }
        
        .formation-onboarding-btn.secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(0, 212, 255, 0.5);
          color: #fff;
        }
        
        .formation-onboarding-btn.cta {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff;
          margin-left: auto;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
        }
        
        .formation-onboarding-btn.cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.5);
        }
        
        /* Responsive Mobile - Modal centrato come card */
        @media (max-width: 640px) {
          .formation-onboarding-overlay {
            padding: 20px 16px;
            align-items: center;
            justify-content: center;
          }
          
          .formation-onboarding-modal {
            max-width: 100%;
            width: 100%;
            max-height: calc(100vh - 140px);
            height: auto;
            border-radius: 20px;
            border: 2px solid #00d4ff;
            margin: 0;
            animation: fadeInScale 0.3s ease;
          }
          
          @keyframes fadeInScale {
            from { 
              transform: scale(0.9);
              opacity: 0;
            }
            to { 
              transform: scale(1);
              opacity: 1;
            }
          }
          
          .formation-onboarding-content {
            padding: 12px 16px;
            min-height: 0;
            max-height: calc(100% - 120px);
          }
          
          .key-message {
            padding: 8px 0;
          }
          
          .key-message-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 8px;
          }
          
          .key-message-icon svg {
            width: 24px;
            height: 24px;
          }
          
          .key-message-title {
            font-size: 16px;
            margin-bottom: 6px;
            line-height: 1.3;
          }
          
          .key-message-subtitle {
            font-size: 12px;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          
          .stadium-icon {
            font-size: 28px;
            margin-bottom: 4px;
          }
          
          .step-icon-wrapper {
            width: 56px;
            height: 56px;
            margin: 0 auto 12px;
            border-width: 2px;
          }
          
          .step-emoji {
            font-size: 28px;
          }
          
          .step-lucide-icon {
            width: 28px;
            height: 28px;
          }
          
          .step-title {
            font-size: 16px;
            margin-bottom: 8px;
            line-height: 1.3;
          }
          
          .step-description {
            font-size: 13px;
            margin-bottom: 12px;
            line-height: 1.4;
          }
          
          .step-number {
            font-size: 11px;
          }
          
          .formation-onboarding-footer {
            padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
            gap: 8px;
            min-height: 60px;
          }
          
          .formation-onboarding-btn {
            padding: 10px 16px;
            font-size: 13px;
            border-radius: 10px;
          }
          
          .formation-onboarding-header {
            padding: 10px 16px;
            min-height: 44px;
          }
          
          .formation-onboarding-close {
            padding: 4px;
            width: 32px;
            height: 32px;
          }
          
          .formation-onboarding-close svg {
            width: 18px;
            height: 18px;
          }
          
          .progress-dot {
            width: 6px;
            height: 6px;
          }
        }
        
        @media (max-width: 380px) {
          .key-message-title {
            font-size: 15px;
          }
          
          .step-title {
            font-size: 15px;
          }
          
          .step-description {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  )
}

export default OnboardingFormation
