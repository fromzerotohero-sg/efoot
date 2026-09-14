import React from 'react'
import { useTranslation, getPositionRoleTranslationKey } from '@/lib/i18n'
import { Shield, Target, Zap } from 'lucide-react'

// Posizioni raggruppate per ruolo (etichette: lib/i18n.js + getPositionRoleTranslationKey)
const POSITION_GROUPS = [
  {
    id: 'goalkeeper',
    icon: Shield,
    color: '#fbbf24',
    positions: [{ id: 'PT' }]
  },
  {
    id: 'defense',
    icon: Shield,
    color: '#22c55e',
    positions: [{ id: 'DC' }, { id: 'TS' }, { id: 'TD' }]
  },
  {
    id: 'midfield',
    icon: Zap,
    color: '#3b82f6',
    positions: [
      { id: 'CC', displayEn: 'CMF' },
      { id: 'MED', displayEn: 'DMF' },
      { id: 'CLS' },
      { id: 'CLD' }
    ]
  },
  {
    id: 'attack',
    icon: Target,
    color: '#ef4444',
    // Solo questi ruoli in attacco (niente LWF/RWF/CF/SS duplicati)
    positions: [{ id: 'ESA' }, { id: 'EDA' }, { id: 'TRQ', displayEn: 'AMF' }, { id: 'SP' }, { id: 'P' }]
  }
]

const COMPETENCE_LEVELS = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Intermedia', label: 'Intermedia' },
  { value: 'Bassa', label: 'Bassa' }
]

export default function PositionSelectionModal({
  playerName,
  mainPosition,
  selectedPositions,
  onPositionsChange,
  onConfirm,
  onCancel,
  uploading = false
}) {
  const { t, lang } = useTranslation()

  const normalizePositionId = React.useCallback((posId) => {
    const p = String(posId || '').trim().toUpperCase()
    if (!p) return p
    // Alias eFootball (EN) -> canonico
    if (p === 'CMF') return 'CC'
    if (p === 'DMF') return 'MED'
    if (p === 'AMF') return 'TRQ'
    if (p === 'LWF') return 'ESA'
    if (p === 'RWF') return 'EDA'
    if (p === 'EDE') return 'EDA'
    // Legacy attacco: stesso ruolo in UI unica
    if (p === 'CF') return 'P'
    if (p === 'SS') return 'SP'
    return p
  }, [])

  const normalizedMainPosition = React.useMemo(
    () => normalizePositionId(mainPosition),
    [mainPosition, normalizePositionId]
  )

  const handleTogglePosition = (positionId) => {
    const canonicalId = normalizePositionId(positionId)
    const exists = selectedPositions.find(p => normalizePositionId(p?.position) === canonicalId)
    
    if (exists) {
      // Rimuovi
      onPositionsChange(selectedPositions.filter(p => normalizePositionId(p?.position) !== canonicalId))
    } else {
      // Aggiungi con competenza default "Alta"
      onPositionsChange([...selectedPositions, {
        position: canonicalId,
        competence: 'Alta'
      }])
    }
  }
  
  const handleCompetenceChange = (positionId, competence) => {
    const canonicalId = normalizePositionId(positionId)
    onPositionsChange(selectedPositions.map(p => 
      normalizePositionId(p?.position) === canonicalId
        ? { ...p, competence }
        : p
    ))
  }

  const getCompetenceForPosition = (positionId) => {
    const canonicalId = normalizePositionId(positionId)
    const selected = selectedPositions.find(p => normalizePositionId(p?.position) === canonicalId)
    return selected?.competence || 'Alta'
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
          backgroundColor: 'var(--bg-primary, var(--surface))',
          borderRadius: '12px',
          padding: '24px',
          paddingBottom: 'calc(24px + 64px + env(safe-area-inset-bottom, 0px))',
          maxWidth: '600px',
          width: '100%',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          border: '1px solid var(--border-color, #333)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          marginTop: 0, 
          marginBottom: '8px',
          color: 'var(--text-primary, #fff)',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {t('selectOriginalPositions')}
        </h2>
        
        <p style={{ 
          marginTop: 0, 
          marginBottom: '16px',
          color: 'var(--text-secondary, #aaa)',
          fontSize: '14px'
        }}>
          {playerName}
        </p>
        
        <p style={{ 
          marginBottom: '20px',
          color: 'var(--text-secondary, #aaa)',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {t('positionSelectionDescription')}
        </p>
        
        {/* 🎨 ENTERPRISE REDESIGN: Layout a gruppi con header colorati */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {POSITION_GROUPS.map(group => {
            const GroupIcon = group.icon
            const selectedCount = group.positions.filter(p => 
              selectedPositions.find(sp => normalizePositionId(sp?.position) === normalizePositionId(p.id))
            ).length
            
            return (
              <div key={group.id} style={{
                border: `1px solid ${group.color}30`,
                borderRadius: '12px',
                overflow: 'hidden',
                background: 'var(--inset-bg)'
              }}>
                {/* Header gruppo */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  background: `${group.color}15`,
                  borderBottom: `1px solid ${group.color}30`
                }}>
                  <GroupIcon size={20} color={group.color} />
                  <span style={{ 
                    fontWeight: 600, 
                    color: group.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: '13px'
                  }}>
                    {t(`positionGroup${group.id.charAt(0).toUpperCase() + group.id.slice(1)}`) || group.id}
                  </span>
                  {selectedCount > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: group.color,
                      color: '#000',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 700
                    }}>
                      {selectedCount}
                    </span>
                  )}
                </div>
                
                {/* Posizioni del gruppo */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: '8px',
                  padding: '12px'
                }}>
                  {group.positions.map(pos => {
                    const canonicalId = normalizePositionId(pos.id)
                    const selected = selectedPositions.find(p => normalizePositionId(p?.position) === canonicalId)
                    const isMain = canonicalId === normalizedMainPosition
                    const label = t(getPositionRoleTranslationKey(canonicalId))
                    const displayCode = lang === 'it'
                      ? pos.id
                      : (pos.displayEn || pos.id)
                    
                    return (
                      <div 
                        key={pos.id}
                        onClick={() => handleTogglePosition(canonicalId)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          padding: '10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: `1.5px solid ${selected ? group.color : 'transparent'}`,
                          background: selected ? `${group.color}20` : 'var(--surface-2)',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!selected) e.currentTarget.style.background = 'var(--surface-3)'
                        }}
                        onMouseLeave={(e) => {
                          if (!selected) e.currentTarget.style.background = 'var(--surface-2)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: `2px solid ${selected ? group.color : 'var(--border-strong)'}`,
                            background: selected ? group.color : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#000'
                          }}>
                            {selected && '✓'}
                          </div>
                          <span style={{
                            fontWeight: isMain ? 600 : 400,
                            color: isMain ? group.color : 'var(--text-main)',
                            fontSize: '13px'
                          }}>
                            {displayCode}
                            {isMain && <span style={{ opacity: 0.7, fontSize: '11px' }}> ★</span>}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          opacity: 0.7,
                          paddingLeft: '26px'
                        }}>
                          {label}
                        </span>
                        
                        {selected && (
                          <select
                            value={getCompetenceForPosition(canonicalId)}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleCompetenceChange(canonicalId, e.target.value)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: '4px',
                              marginLeft: '26px',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: `1px solid ${group.color}50`,
                              background: 'var(--inset-bg)',
                              color: 'var(--text-main)',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            {COMPETENCE_LEVELS.map(level => (
                              <option key={level.value} value={level.value}>
                                {t(`competence${level.value === 'Alta' ? 'High' : level.value === 'Intermedia' ? 'Medium' : 'Low'}`)}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        
        {selectedPositions.length === 0 && (
          <p style={{
            color: 'var(--error-color, #ff4444)',
            fontSize: '13px',
            marginBottom: '16px'
          }}>
            {t('mustSelectAtLeastOne')}
          </p>
        )}
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '24px'
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
              fontWeight: '500'
            }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={selectedPositions.length === 0 || uploading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedPositions.length === 0 || uploading
                ? 'var(--border-color, #333)' 
                : 'var(--neon-blue, #00d4ff)',
              color: selectedPositions.length === 0 || uploading
                ? 'var(--text-secondary, #aaa)' 
                : '#000',
              cursor: selectedPositions.length === 0 || uploading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            {uploading ? (t('saving') || 'Salvataggio...') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
