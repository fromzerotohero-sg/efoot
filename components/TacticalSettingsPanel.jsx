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
    <div style={{
      marginBottom: '24px',
      background: 'linear-gradient(180deg, rgba(13, 20, 40, 0.9), rgba(8, 12, 28, 0.95))',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '14px',
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
          padding: 'clamp(14px, 2vw, 16px)',
          cursor: 'pointer',
          userSelect: 'none',
          background: isCollapsed
            ? 'rgba(255, 255, 255, 0.02)'
            : 'rgba(255, 255, 255, 0.03)',
          transition: 'background 0.2s ease',
          borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
        }}
        onMouseEnter={(e) => {
          if (isCollapsed) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }
        }}
        onMouseLeave={(e) => {
          if (isCollapsed) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
          }
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Settings size={18} color="#7ceeff" />
          <h2 style={{
            fontSize: 'clamp(15px, 1.8vw, 16px)',
            fontWeight: 600,
            margin: 0,
            color: '#fff',
            letterSpacing: '0.2px'
          }}>
            {t('tacticalSettings')}
          </h2>
        </div>
        {isCollapsed ? (
          <ChevronDown size={20} color="rgba(255, 255, 255, 0.6)" />
        ) : (
          <ChevronUp size={20} color="rgba(255, 255, 255, 0.6)" />
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
          fontSize: 'clamp(11px, 1.2vw, 12px)',
          fontWeight: 700,
          marginBottom: '8px',
          color: '#7ceeff',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          {t('teamPlayingStyle')}
        </label>
        <div style={{ position: 'relative' }}>
          <select
            className="tsp-select"
            value={teamPlayingStyle}
            onChange={(e) => setTeamPlayingStyle(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: '40px',
              background: 'rgba(8, 12, 28, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '10px',
              color: '#fff',
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
            color="rgba(255, 255, 255, 0.55)"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}
          />
        </div>
        <div style={{
          fontSize: 'clamp(11px, 1.2vw, 12px)',
          color: 'rgba(255, 255, 255, 0.55)',
          marginTop: '6px',
          lineHeight: '1.4'
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
              style={{
                padding: 'clamp(12px, 1.5vw, 14px)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px'
              }}
            >
              {/* Titolo Categoria - Compatto */}
              <div style={{
                fontSize: 'clamp(11px, 1.2vw, 12px)',
                fontWeight: 700,
                marginBottom: '10px',
                color: '#7ceeff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase'
              }}>
                {t(config.nameKey)}
              </div>
              
              {/* Dropdown Istruzione - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  color: 'rgba(255, 255, 255, 0.55)',
                  marginBottom: '4px'
                }}>
                  {t('instruction')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="tsp-select"
                    value={currentSetting.instruction || ''}
                    onChange={(e) => handleCategoryChange(category, 'instruction', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '36px',
                      background: 'rgba(8, 12, 28, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      color: '#fff',
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
                    color="rgba(255, 255, 255, 0.55)"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Dropdown Giocatore - Compatto */}
              <div style={{ marginBottom: '8px' }}>
                <label style={{
                  display: 'block',
                  fontSize: 'clamp(11px, 1.2vw, 12px)',
                  color: 'rgba(255, 255, 255, 0.55)',
                  marginBottom: '4px'
                }}>
                  {t('selectPlayer')}:
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="tsp-select"
                    value={currentSetting.player_id || ''}
                    onChange={(e) => handleCategoryChange(category, 'player_id', e.target.value)}
                    disabled={compatiblePlayers.length === 0}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '36px',
                      background: 'rgba(8, 12, 28, 0.85)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: '10px',
                      color: compatiblePlayers.length === 0 ? 'rgba(255, 255, 255, 0.45)' : '#fff',
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
                    color="rgba(255, 255, 255, 0.55)"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none'
                    }}
                  />
                </div>
                {compatiblePlayers.length === 0 && (
                  <div style={{
                    fontSize: 'clamp(11px, 1.2vw, 12px)',
                    color: 'rgba(255, 255, 255, 0.55)',
                    marginTop: '6px',
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
        className="tsp-save-button"
        style={{
          width: '100%',
          justifyContent: 'center',
          fontSize: 'clamp(12px, 1.3vw, 13px)',
          marginTop: '8px'
        }}
      >
        <Save size={14} />
        {saving ? t('saving') : t('save')}
      </button>
      <style jsx>{`
        .tsp-select:focus {
          outline: none;
          border-color: rgba(0, 212, 255, 0.45) !important;
        }
        .tsp-select option {
          background: #0d1428;
          color: #fff;
        }
        .tsp-save-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          background: rgba(0, 212, 255, 0.1);
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.18s ease, border-color 0.18s ease;
        }
        .tsp-save-button:hover:not(:disabled) {
          background: rgba(0, 212, 255, 0.16);
          border-color: rgba(0, 212, 255, 0.45);
        }
        .tsp-save-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      </div>
      )}
    </div>
  )
}
