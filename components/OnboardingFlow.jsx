'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { X, ChevronRight, ChevronLeft, Shield, Camera, MessageSquare, Bot, Sparkles } from 'lucide-react'

const OnboardingFlow = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [showKeyMessage, setShowKeyMessage] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  const steps = [
    {
      icon: '🛡️',
      lucideIcon: Shield,
      title: t('onboardingStep1Title'),
      description: t('onboardingStep1Desc'),
      color: '#00d4ff',
      bgGradient: 'linear-gradient(135deg, rgba(0, 212, 255, 0.2) 0%, rgba(0, 161, 166, 0.1) 100%)'
    },
    {
      icon: '📸',
      lucideIcon: Camera,
      title: t('onboardingStep2Title'),
      description: t('onboardingStep2Desc'),
      color: '#22c55e',
      bgGradient: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(20, 180, 80, 0.1) 100%)'
    },
    {
      icon: '💬',
      lucideIcon: MessageSquare,
      title: t('onboardingStep3Title'),
      description: t('onboardingStep3Desc'),
      color: '#f59e0b',
      bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)'
    },
    {
      icon: '🤖',
      lucideIcon: Bot,
      title: t('onboardingStep4Title'),
      description: t('onboardingStep4Desc'),
      color: '#a855f7',
      bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(126, 34, 206, 0.1) 100%)'
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
        className="onboarding-trigger"
        aria-label={t('onboardingTitle')}
      >
        <span className="onboarding-trigger-emoji">⚽</span>
        <span className="onboarding-trigger-text">{t('onboardingTitle')}</span>
        <style jsx>{`
          .onboarding-trigger {
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
          
          .onboarding-trigger::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
            transition: left 0.5s ease;
          }
          
          .onboarding-trigger:hover::before {
            left: 100%;
          }
          
          .onboarding-trigger:hover {
            transform: translateY(-2px) scale(1.02);
            border-color: rgba(0, 212, 255, 0.8);
            box-shadow: 
              0 8px 25px rgba(0, 212, 255, 0.4),
              0 0 40px rgba(0, 212, 255, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }
          
          .onboarding-trigger:active {
            transform: translateY(0) scale(0.98);
          }
          
          .onboarding-trigger-emoji {
            font-size: 20px;
            animation: bounce 2s infinite;
            display: inline-block;
          }
          
          @keyframes bounce {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            25% { transform: translateY(-4px) rotate(-5deg); }
            50% { transform: translateY(0) rotate(0deg); }
            75% { transform: translateY(-2px) rotate(5deg); }
          }
          
          @media (max-width: 640px) {
            .onboarding-trigger {
              padding: 10px 16px;
              font-size: 13px;
            }
            .onboarding-trigger-emoji {
              font-size: 18px;
            }
          }
        `}</style>
      </button>
    )
  }

  const CurrentIcon = showKeyMessage ? Sparkles : steps[currentStep].lucideIcon

  return (
    <div className={`onboarding-overlay ${isAnimating ? 'closing' : ''}`}>
      <div className="onboarding-modal">
        {/* Header con progress */}
        <div className="onboarding-header">
          <div className="onboarding-progress">
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
            className="onboarding-close"
            aria-label={t('onboardingClose')}
          >
            <X size={24} />
          </button>
        </div>

        {/* Contenuto */}
        <div className="onboarding-content">
          {showKeyMessage ? (
            <div className="key-message">
              <div className="key-message-icon">
                <Sparkles size={48} color="#00d4ff" />
              </div>
              <h2 className="key-message-title">{t('onboardingKeyMessage')}</h2>
              <p className="key-message-subtitle">{t('onboardingSubtitle')}</p>
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
        <div className="onboarding-footer">
          <button
            onClick={prevStep}
            className={`onboarding-btn secondary ${(showKeyMessage || currentStep === 0) && showKeyMessage ? 'hidden' : ''}`}
            disabled={showKeyMessage}
          >
            <ChevronLeft size={20} />
            {t('back')}
          </button>
          
          {showKeyMessage || currentStep < steps.length - 1 ? (
            <button
              onClick={nextStep}
              className="onboarding-btn primary"
            >
              {showKeyMessage ? t('onboardingStart') : t('onboardingNext')}
              {!showKeyMessage && <ChevronRight size={20} />}
            </button>
          ) : (
            <button
              onClick={closeModal}
              className="onboarding-btn cta"
            >
              {t('onboardingStart')}
              <Sparkles size={20} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .onboarding-overlay {
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
        
        .onboarding-overlay.closing {
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
        
        .onboarding-modal {
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
        
        .onboarding-overlay.closing .onboarding-modal {
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
        
        .onboarding-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
        }
        
        .onboarding-progress {
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
        
        .onboarding-close {
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
        
        .onboarding-close:hover {
          background: rgba(255, 59, 48, 0.2);
          border-color: rgba(255, 59, 48, 0.5);
          color: #FF3B30;
        }
        
        .onboarding-content {
          flex: 1;
          padding: 32px 24px;
          overflow-y: auto;
          min-height: 280px;
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
        .onboarding-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-top: 1px solid rgba(0, 212, 255, 0.2);
          gap: 12px;
        }
        
        .onboarding-btn {
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
        
        .onboarding-btn.hidden {
          visibility: hidden;
        }
        
        .onboarding-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .onboarding-btn.primary {
          background: linear-gradient(135deg, #00d4ff 0%, #00a1a6 100%);
          color: #000;
          margin-left: auto;
          box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
        }
        
        .onboarding-btn.primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 212, 255, 0.5);
        }
        
        .onboarding-btn.secondary {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(0, 212, 255, 0.3);
          color: rgba(255, 255, 255, 0.8);
        }
        
        .onboarding-btn.secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(0, 212, 255, 0.5);
          color: #fff;
        }
        
        .onboarding-btn.cta {
          background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
          color: #fff;
          margin-left: auto;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
        }
        
        .onboarding-btn.cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(34, 197, 94, 0.5);
        }
        
        /* Responsive */
        @media (max-width: 640px) {
          .onboarding-overlay {
            padding: 0;
            align-items: flex-end;
          }
          
          .onboarding-modal {
            max-width: 100%;
            max-height: 85vh;
            border-radius: 24px 24px 0 0;
            border-bottom: none;
            animation: slideUpMobile 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          @keyframes slideUpMobile {
            from { 
              transform: translateY(100%);
            }
            to { 
              transform: translateY(0);
            }
          }
          
          .onboarding-content {
            padding: 24px 20px;
            min-height: 240px;
          }
          
          .key-message-title {
            font-size: 20px;
          }
          
          .key-message-subtitle {
            font-size: 14px;
          }
          
          .step-title {
            font-size: 20px;
          }
          
          .step-description {
            font-size: 15px;
          }
          
          .step-icon-wrapper {
            width: 80px;
            height: 80px;
          }
          
          .step-emoji {
            font-size: 40px;
          }
          
          .onboarding-footer {
            padding: 16px 20px;
          }
          
          .onboarding-btn {
            padding: 12px 20px;
            font-size: 14px;
          }
        }
        
        @media (max-width: 380px) {
          .key-message-title {
            font-size: 18px;
          }
          
          .step-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  )
}

export default OnboardingFlow
