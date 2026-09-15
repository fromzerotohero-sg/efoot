'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { getSelectableInstructions, INDIVIDUAL_INSTRUCTIONS_CONFIG } from '@/lib/tacticalInstructions'
import { ChevronDown, ChevronUp, Save, Settings } from 'lucide-react'

export default function TacticalSettingsPanel({ 
  titolari, 
  tacticalSettings, 
  onSave,
  saving = false 
}) {
  const { t } = useTranslation()
  
  const [isCollapsed, setIsCollapsed] = React.useState(true) // Inizia collassato
  const [teamPlayingStyle, setTeamPlayingStyle] = React.useState(
    tacticalSettings?.team_playing_style || ''
  )
  const [individualInstructions, setIndividualInstructions] = React.useState(
    tacticalSettings?.individual_instructions || {}
  )

  // Sincronizza state quando tacticalSettings cambia (dopo salvataggio)
  React.useEffect(() => {
    if (tacticalSettings) {
      setTeamPlayingStyle(tacticalSettings.team_playing_style || '')
      setIndividualInstructions(tacticalSettings.individual_instructions || {})
    }
  }, [tacticalSettings])

  // Opzioni stile di gioco di squadra
  const teamPlayingStyleOptions = [
    { id: 'possesso_palla', nameKey: 'possesso_palla' },
    { id: 'contropiede_veloce', nameKey: 'contropiede_veloce' },
    { id: 'contrattacco', nameKey: 'contrattacco' },
    { id: 'vie_laterali', nameKey: 'vie_laterali' },
    { id: 'passaggio_lungo', nameKey: 'passaggio_lungo' },
    { id: 'pressing_totale', nameKey: 'pressing_totale' }
  ]

  const handleCategoryChange = (category, field, value) => {
    setIndividualInstructions(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [field]: value,
        enabled: true
      }
    }))
  }

  const handleSave = async () => {
    if (onSave) {
      await onSave({
        team_playing_style: teamPlayingStyle || null,
        individual_instructions: individualInstructions
      })
    }
  }

  const getCompatiblePlayersForSelectedInstruction = React.useCallback((category, instruction, players) => {
    const list = Array.isArray(players) ? players : []
    const base = INDIVIDUAL_INSTRUCTIONS_CONFIG?.[category]?.filterPlayers
      ? INDIVIDUAL_INSTRUCTIONS_CONFIG[category].filterPlayers(list)
      : list

    const inst = (instruction || '').trim()
    if (!inst) return base

    return base
  }, [])

  return (
    <div className="neon-card" style={{
      marginBottom: '24px',
      background: 'var(--surface)',
      border: '1px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '10px',
      overflow: 'hidden'
    }}>
      {/* Header - Clickabile per Collassare/Espandere */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: 'clamp(14px, 2vw, 18px)',
          cursor: 'pointer',
          userSelect: 'none',
          background: isCollapsed 
            ? 'rgba(0, 212, 255, 0.05)' 
            : 'rgba(0, 212, 255, 0.1)',
          transition: 'background 0.2s ease',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(0, 212, 255, 0.15)'
        }}
        onMouseEnter={(e) => {
          if (isCollapsed) {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.08)'
          }
        }}
        onMouseLeave={(e) => {
          if (isCollapsed) {
            e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'
          }
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Settings size={18} color="var(--neon-blue)" />
          <h2 style={{
            fontSize: 'clamp(16px, 2vw, 18px)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--neon-blue)',
            letterSpacing: '0.3px'
          }}>
            {t('tacticalSettings')}
          </h2>
        </div>
        {isCollapsed ? (
          <ChevronDown size={20} color="var(--neon-blue)" style={{ opacity: 0.7 }} />
        ) : (
          <ChevronUp size={20} color="var(--neon-blue)" style={{ opacity: 0.7 }} />
        )}
      </div>

      {/* Contenuto - Collassabile */}
      {!isCollapsed && (
      <div style={{
        padding: 'clamp(16px, 2vw, 24px)'
      }}>

      {/* Team Playing Style - Compatto */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: 'clamp(12px, 1.3vw, 13px)',
          fontWeight: 600,
          marginBottom: '6px',
          color: 'var(--text-main)',
          opacity: 0.9
        }}>
          {t('teamPlayingStyle')}
        </label>
        <div style={{ position: 'relative' }}>
          <select
            value={teamPlayingStyle}
            onChange={(e) => setTeamPlayingStyle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: '40px',
              background: 'var(--inset-bg)',
              border: '1px solid var(--neon-blue)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: 'clamp(13px, 1.5vw, 15px)',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none'
            }}
          >
            <option value="">{t('selectInstruction')}</option>
            {teamPlayingStyleOptions.map(option => (
              <option key={option.id} value={option.id}>
                {t(option.nameKey)}
              </option>
            ))}
          </select>
          <ChevronDown 
            size={18} 
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              opacity: 0.6
            }}
          />
        </div>
        <div style={{
          fontSize: 'clamp(10px, 1.1vw, 11px)',
          opacity: 0.6,
          marginTop: '4px',
          lineHeight: '1.3'
        }}>
          {t('teamPlayingStyleDescription')}
        </div>
      </div>

      {/* Individual Instructions - 4 Categorie - Layout Verticale Compatto */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {Object.entries(INDIVIDUAL_INSTRUCTIONS_CONFIG).map(([category, config]) => {
          const currentSetting = individualInstructions[category] || {}
          const compatiblePlayers = getCompatiblePlayersForSelectedInstruction(
            category,
            currentSetting.instruction,
            titolari || []
          )
          
          return (
            <div 
              key={category}
              className="neon-card"
              style={{
                padding: '12px',
                background: 'rgba(0, 212, 255, 0.04)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '6px'
              }}
            >
              {/* Titolo Categoria - Compatto */}
              <div style={{
                fontSize: 'clamp(12px, 1.3vw, 13px)',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--neon-blue)',
                opacity: 0.9
              }}>
                {t(config.nameKey)}
              </div>
              
              {/* Dropdown Istruzione - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  opacity: 0.75,
                  marginBottom: '4px'
                }}>
                  {t('instruction')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={currentSetting.instruction || ''}
                    onChange={(e) => handleCategoryChange(category, 'instruction', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '35px',
                      background: 'var(--inset-bg)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: 'clamp(12px, 1.3vw, 14px)',
                      cursor: 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  >
                    <option value="">{t('selectInstruction')}</option>
                    {getSelectableInstructions(category, currentSetting.instruction).map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.legacy
                          ? `${t(inst.nameKey)} — v6 Formazione fluida`
                          : t(inst.nameKey)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={16} 
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      opacity: 0.6
                    }}
                  />
                </div>
              </div>

              {/* Dropdown Giocatore - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  opacity: 0.75,
                  marginBottom: '4px'
                }}>
                  {t('selectPlayer')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={currentSetting.player_id || ''}
                    onChange={(e) => handleCategoryChange(category, 'player_id', e.target.value)}
                    disabled={compatiblePlayers.length === 0}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: '35px',
                      background: 'var(--inset-bg)',
                      border: '1px solid var(--neon-blue)',
                      borderRadius: '6px',
                      color: compatiblePlayers.length === 0 ? 'var(--text-dim)' : 'var(--text-main)',
                      fontSize: 'clamp(12px, 1.3vw, 14px)',
                      cursor: compatiblePlayers.length === 0 ? 'not-allowed' : 'pointer',
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none'
                    }}
                  >
                    <option value="">{t('selectPlayer')}</option>
                    {compatiblePlayers.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.player_name} {player.position ? `(${player.position})` : ''}
                        {player.overall_rating ? ` - ${player.overall_rating}` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown 
                    size={16} 
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      opacity: 0.6
                    }}
                  />
                </div>
                {compatiblePlayers.length === 0 && (
                  <div style={{
                    fontSize: 'clamp(11px, 1.2vw, 12px)',
                    opacity: 0.6,
                    marginTop: '4px',
                    fontStyle: 'italic'
                  }}>
                    {t('noCompatiblePlayers')}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottone Salva - Compatto Enterprise */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          padding: '10px 12px',
          fontSize: 'clamp(12px, 1.3vw, 13px)',
          fontWeight: 600,
          marginTop: '8px'
        }}
      >
        <Save size={14} />
        {saving ? t('saving') : t('save')}
      </button>
      </div>
      )}
    </div>
  )
}
