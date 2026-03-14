import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { AlertCircle, RefreshCw, Save, X } from 'lucide-react'

export default function MissingDataModal({
  missingData,
  playerData,
  onManualInput,
  onRetryUpload,
  onSaveAnyway,
  onCancel
}) {
  const { t } = useTranslation()
  const [manualInput, setManualInput] = React.useState({})

  const handleInputChange = (field, value) => {
    setManualInput(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveManual = () => {
    onManualInput(manualInput)
  }

  const getInputType = (field) => {
    if (field === 'overall_rating' || field === 'age' || field === 'height_cm' || field === 'weight_kg') {
      return 'number'
    }
    return 'text'
  }

  const getInputValue = (field) => {
    return manualInput[field] ?? playerData?.[field] ?? ''
  }

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel()
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-primary, #1a1a1a)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--border-color, #333)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <AlertCircle style={{ color: 'var(--error-color, #ff4444)', width: '24px', height: '24px' }} />
          <h2 style={{ 
            margin: 0,
            color: 'var(--text-primary, #fff)',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            {t('missingDataTitle')}
          </h2>
        </div>
        
        <p style={{ 
          marginTop: 0, 
          marginBottom: '8px',
          color: 'var(--text-secondary, #aaa)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {t('missingDataDescription')}
        </p>
        <p style={{ 
          marginTop: 0, 
          marginBottom: '20px',
          color: 'var(--text-secondary, #888)',
          fontSize: '13px',
          lineHeight: '1.5',
          fontStyle: 'italic'
        }}>
          {t('missingDataCompleteLater')}
        </p>

        {/* Campi OBBLIGATORI mancanti */}
        {missingData.required.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              color: 'var(--error-color, #ff4444)',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {t('requiredFields')} ({missingData.required.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {missingData.required.map(missing => (
                <div key={missing.field}>
                  <label style={{
                    display: 'block',
                    color: 'var(--text-primary, #fff)',
                    fontSize: '14px',
                    marginBottom: '6px',
                    fontWeight: '500'
                  }}>
                    {missing.label} *
                  </label>
                  <input
                    type={getInputType(missing.field)}
                    value={getInputValue(missing.field)}
                    onChange={(e) => handleInputChange(missing.field, e.target.value)}
                    placeholder={t('enterValue')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #333)',
                      backgroundColor: 'var(--bg-secondary, #2a2a2a)',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campi OPZIONALI mancanti */}
        {missingData.optional.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{
              color: 'var(--text-secondary, #aaa)',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '12px'
            }}>
              {t('optionalFields')} ({missingData.optional.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {missingData.optional.map(missing => (
                <div key={missing.field}>
                  <label style={{
                    display: 'block',
                    color: 'var(--text-secondary, #aaa)',
                    fontSize: '14px',
                    marginBottom: '6px'
                  }}>
                    {missing.label}
                  </label>
                  <input
                    type={getInputType(missing.field)}
                    value={getInputValue(missing.field)}
                    onChange={(e) => handleInputChange(missing.field, e.target.value)}
                    placeholder={t('enterValueOptional')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #333)',
                      backgroundColor: 'var(--bg-secondary, #2a2a2a)',
                      color: 'var(--text-primary, #fff)',
                      fontSize: '14px'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottoni azione */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #333)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary, #fff)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <X size={16} />
            {t('cancel')}
          </button>
          
          <button
            onClick={onRetryUpload}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #333)',
              backgroundColor: 'transparent',
              color: 'var(--text-primary, #fff)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <RefreshCw size={16} />
            {t('retryUpload')}
          </button>
          
          {missingData.required.length === 0 && (
            <button
              onClick={onSaveAnyway}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--text-secondary, #aaa)',
                color: '#000',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {t('saveAnyway')}
            </button>
          )}
          
          <button
            onClick={handleSaveManual}
            disabled={missingData.required.some(m => !manualInput[m.field] && !playerData?.[m.field])}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: missingData.required.some(m => !manualInput[m.field] && !playerData?.[m.field])
                ? 'var(--border-color, #333)'
                : 'var(--neon-blue, #00d4ff)',
              color: missingData.required.some(m => !manualInput[m.field] && !playerData?.[m.field])
                ? 'var(--text-secondary, #aaa)'
                : '#000',
              cursor: missingData.required.some(m => !manualInput[m.field] && !playerData?.[m.field])
                ? 'not-allowed'
                : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            {t('saveWithManualData')}
          </button>
        </div>
      </div>
    </div>
  )
}
