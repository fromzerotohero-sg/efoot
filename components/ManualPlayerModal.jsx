'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { X, User, ChevronDown, ChevronUp, Zap, Shield, Star, Check, Gift } from 'lucide-react'
import { SKILL_CATEGORIES } from '@/lib/playerSkillLabels'

/**
 * ManualPlayerModal — Inserimento manuale giocatore (0 HP).
 * Sezioni espandibili, dropdown con dati reali da playing_styles,
 * filtraggio stili per posizione, responsive mobile-first.
 *
 * Props:
 * - show {boolean}
 * - onClose {function}
 * - onSaved {function(player)} — callback dopo salvataggio
 * - slotIndex {number|null} — se fornito, assegna direttamente allo slot
 */

const POSITIONS = [
  { value: 'PT', label: 'PT', group: 'Portiere' },
  { value: 'DC', label: 'DC', group: 'Difesa' },
  { value: 'TD', label: 'TD', group: 'Difesa' },
  { value: 'TS', label: 'TS', group: 'Difesa' },
  { value: 'MED', label: 'MED', group: 'Centrocampo' },
  { value: 'CC', label: 'CC', group: 'Centrocampo' },
  { value: 'CLD', label: 'CLD', group: 'Centrocampo' },
  { value: 'CLS', label: 'CLS', group: 'Centrocampo' },
  { value: 'TRQ', label: 'TRQ', group: 'Centrocampo' },
  { value: 'EDA', label: 'EDA', group: 'Attacco' },
  { value: 'ESA', label: 'ESA', group: 'Attacco' },
  { value: 'SP', label: 'SP', group: 'Attacco' },
  { value: 'P', label: 'P', group: 'Attacco' }
]

const CARD_TYPES = ['Standard', 'Trending', 'In evidenza', 'In risalto', 'Epico', 'Leggendario']

const CARD_COLORS = {
  Standard: '#666', Trending: '#00bcd4', 'In evidenza': '#2196f3',
  'In risalto': '#9c27b0', Epico: '#7c3aed', Leggendario: '#f59e0b'
}

const inputStyle = {
  width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.25)',
  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px',
  color: 'white', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s'
}
const selectStyle = {
  ...inputStyle, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2300d4ff\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '30px', cursor: 'pointer'
}
const labelStyle = { display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }

/**
 * Props:
 * - show, onClose, onSaved, slotIndex (come prima)
 * - existingPlayer {object|null} — se fornito, modalita EDIT/COMPLETA (pre-popola campi)
 */
export default function ManualPlayerModal({ show, onClose, onSaved, slotIndex = null, existingPlayer = null }) {
  const { t, lang } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [playingStyles, setPlayingStyles] = useState([])

  const isEditMode = !!existingPlayer

  // Sezioni espandibili — in edit mode, apri le sezioni con dati mancanti
  const [expandedSections, setExpandedSections] = useState({ stats: false, skills: false, boosters: false, details: false })
  /** Se false, PATCH non invia overall_rating così il server ricalcola da base_stats (vedi app/api/players/[id]/route.js). */
  const [overallRatingTouched, setOverallRatingTouched] = useState(false)

  // Dati form
  const [form, setForm] = useState({
    player_name: '', position: '', overall_rating: '', card_type: 'Standard',
    playing_style: '', form: 'B',
    speed: '', acceleration: '', finishing: '', passing: '', dribbling: '', defending: '', physical: '',
    skills: [],
    boosters: [],
    height: '', weight: '', age: '', nationality: '', club_name: ''
  })

  // Carica stili dal DB e inizializza form
  useEffect(() => {
    if (!show) return
    setError(''); setSuccess(false)
    setOverallRatingTouched(false)

    if (existingPlayer) {
      // EDIT MODE: pre-popola con dati esistenti
      const bs = existingPlayer.base_stats || {}
      const atk = bs.attacking || {}
      const def = bs.defending || {}
      const ath = bs.athleticism || {}
      setForm({
        player_name: existingPlayer.player_name || '',
        position: existingPlayer.position || '',
        overall_rating: existingPlayer.overall_rating || '',
        card_type: existingPlayer.card_type || 'Standard',
        playing_style: existingPlayer.role || '',
        form: existingPlayer.form || 'B',
        speed: ath.speed || '', acceleration: ath.acceleration || '',
        finishing: atk.finishing || '', passing: atk.low_pass || atk.lofted_pass || '',
        dribbling: atk.dribbling || '', defending: def.defensive_awareness || '',
        physical: ath.physical_contact || '',
        skills: Array.isArray(existingPlayer.skills) ? [...existingPlayer.skills] : [],
        boosters: Array.isArray(existingPlayer.available_boosters) ? [...existingPlayer.available_boosters] : [],
        height: existingPlayer.height || '', weight: existingPlayer.weight || '',
        age: existingPlayer.age || '',
        nationality: existingPlayer.nationality || '', club_name: existingPlayer.club_name || ''
      })
      // Apri sezioni con dati mancanti
      const hasStats = Object.keys(atk).length > 0 || Object.keys(def).length > 0 || Object.keys(ath).length > 0
      const hasSkills = Array.isArray(existingPlayer.skills) && existingPlayer.skills.length > 0
      const hasBoosters = Array.isArray(existingPlayer.available_boosters) && existingPlayer.available_boosters.length > 0
      setExpandedSections({
        stats: !hasStats,   // apri se mancano stats
        skills: !hasSkills, // apri se mancano skills
        boosters: !hasBoosters,
        details: false
      })
    } else {
      // CREATE MODE: form vuoto
      setForm({ player_name: '', position: '', overall_rating: '', card_type: 'Standard', playing_style: '', form: 'B', speed: '', acceleration: '', finishing: '', passing: '', dribbling: '', defending: '', physical: '', skills: [], boosters: [], height: '', weight: '', age: '', nationality: '', club_name: '' })
      setExpandedSections({ stats: false, skills: false, boosters: false, details: false })
    }

    const loadStyles = async () => {
      try {
        const res = await fetch('/api/playing-styles')
        if (res.ok) {
          const data = await res.json()
          setPlayingStyles(data)
          // Se in edit il giocatore ha playing_style_id ma non role (es. creato da foto), mostra lo stile nel dropdown
          if (existingPlayer?.playing_style_id && !existingPlayer.role) {
            const style = data.find(s => s.id === existingPlayer.playing_style_id)
            if (style?.name) setForm(prev => ({ ...prev, playing_style: style.name }))
          }
        }
      } catch (err) {
        console.error('[ManualPlayerModal] Error loading styles:', err)
      }
    }
    loadStyles()
  }, [show, existingPlayer?.id, existingPlayer?.playing_style_id, existingPlayer?.role])

  // Filtra stili per posizione selezionata
  const filteredStyles = useMemo(() => {
    if (!form.position) return playingStyles
    return playingStyles.filter(s =>
      Array.isArray(s.compatible_positions) && s.compatible_positions.includes(form.position)
    )
  }, [form.position, playingStyles])

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }))
  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const toggleSkill = (skill) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : prev.skills.length < 10 ? [...prev.skills, skill] : prev.skills
    }))
  }

  const addBooster = () => {
    setForm(prev => ({ ...prev, boosters: [...(Array.isArray(prev.boosters) ? prev.boosters : []), { name: '', effect: '' }] }))
  }
  const removeBooster = (idx) => {
    setForm(prev => ({ ...prev, boosters: (Array.isArray(prev.boosters) ? prev.boosters : []).filter((_, i) => i !== idx) }))
  }
  const updateBooster = (idx, key, value) => {
    setForm(prev => ({
      ...prev,
      boosters: (Array.isArray(prev.boosters) ? prev.boosters : []).map((b, i) => i === idx ? { ...(b || {}), [key]: value } : b)
    }))
  }

  const cardColor = CARD_COLORS[form.card_type] || '#666'

  const handleSave = async () => {
    setError('')
    if (!form.player_name.trim()) { setError(t('playerNameRequired')); return }
    if (!form.position) { setError(t('positionRequired')); return }

    setSaving(true)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      // Struttura base_stats coerente con extract-player (attacking/defending/athleticism)
      const attacking = {}
      const defending = {}
      const athleticism = {}
      if (form.finishing) attacking.finishing = Number(form.finishing)
      if (form.passing) attacking.low_pass = Number(form.passing)
      if (form.dribbling) attacking.dribbling = Number(form.dribbling)
      if (form.defending) defending.defensive_awareness = Number(form.defending)
      if (form.speed) athleticism.speed = Number(form.speed)
      if (form.acceleration) athleticism.acceleration = Number(form.acceleration)
      if (form.physical) athleticism.physical_contact = Number(form.physical)

      const baseStats = {}
      if (Object.keys(attacking).length > 0) baseStats.attacking = attacking
      if (Object.keys(defending).length > 0) baseStats.defending = defending
      if (Object.keys(athleticism).length > 0) baseStats.athleticism = athleticism

      const newPhotoSlots = {
        ...(existingPlayer?.photo_slots || {}),
        manuale: true,
        card: true,
        statistiche: (Object.keys(baseStats).length > 0) || (existingPlayer?.photo_slots?.statistiche) || undefined,
        abilita: (form.skills.length > 0) || (existingPlayer?.photo_slots?.abilita) || undefined,
        booster: ((Array.isArray(form.boosters) && form.boosters.length > 0) || (existingPlayer?.photo_slots?.booster)) || undefined
      }

      var data = null

      if (isEditMode && existingPlayer?.id) {
        // EDIT MODE: aggiorna giocatore tramite API
        // Merge base_stats con quelle esistenti (non sovrascrivere se l'utente non ha toccato)
        const existingBs = existingPlayer.base_stats || {}
        const mergedBaseStats = {
          attacking: { ...(existingBs.attacking || {}), ...attacking },
          defending: { ...(existingBs.defending || {}), ...defending },
          athleticism: { ...(existingBs.athleticism || {}), ...athleticism }
        }
        // Rimuovi sottooggetti vuoti
        if (Object.keys(mergedBaseStats.attacking).length === 0) delete mergedBaseStats.attacking
        if (Object.keys(mergedBaseStats.defending).length === 0) delete mergedBaseStats.defending
        if (Object.keys(mergedBaseStats.athleticism).length === 0) delete mergedBaseStats.athleticism

        const trimmedOvr = String(form.overall_rating ?? '').trim()
        const includeLockedOvr =
          overallRatingTouched && trimmedOvr !== '' && Number.isFinite(Number(trimmedOvr))

        const updateData = {
          player_name: form.player_name.trim(),
          position: form.position,
          ...(includeLockedOvr ? { overall_rating: Number(trimmedOvr) } : {}),
          card_type: form.card_type,
          form: form.form || existingPlayer.form || 'B',
          base_stats: Object.keys(mergedBaseStats).length > 0 ? mergedBaseStats : existingPlayer.base_stats || {},
          skills: form.skills.length > 0 ? form.skills : existingPlayer.skills || [],
          available_boosters: (Array.isArray(form.boosters) && form.boosters.length > 0) ? form.boosters : existingPlayer.available_boosters || [],
          height: form.height ? Number(form.height) : existingPlayer.height,
          weight: form.weight ? Number(form.weight) : existingPlayer.weight,
          age: form.age ? Number(form.age) : existingPlayer.age,
          nationality: form.nationality || existingPlayer.nationality,
          club_name: form.club_name || existingPlayer.club_name,
          photo_slots: newPhotoSlots,
          updated_at: new Date().toISOString()
        }

        // Lookup playing_style_id
        if (form.playing_style) {
          const style = playingStyles.find(s => s.name === form.playing_style)
          if (style) updateData.playing_style_id = style.id
          updateData.role = form.playing_style
        }

        const res = await fetch(`/api/players/${existingPlayer.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || t('saveFailed'))
        }
        data = { success: true, player_id: existingPlayer.id, action: 'updated' }
      } else {
        // CREATE MODE: nuovo giocatore via save-player API
        const player = {
          player_name: form.player_name.trim(),
          position: form.position,
          overall_rating: form.overall_rating ? Number(form.overall_rating) : null,
          card_type: form.card_type,
          role: form.playing_style || null,
          form: form.form || 'B',
          base_stats: Object.keys(baseStats).length > 0 ? baseStats : {},
          skills: form.skills.length > 0 ? form.skills : [],
          boosters: (Array.isArray(form.boosters) && form.boosters.length > 0) ? form.boosters : [],
          height_cm: form.height ? Number(form.height) : null,
          weight_kg: form.weight ? Number(form.weight) : null,
          age: form.age ? Number(form.age) : null,
          nationality: form.nationality || null,
          club_name: form.club_name || null,
          slot_index: slotIndex,
          photo_slots: newPhotoSlots,
          extracted_data: { source: 'manual_input' }
        }

        const res = await fetch('/api/supabase/save-player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ player })
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || t('saveFailed'))
        }

        data = await res.json()
      }
      setSuccess(true)
      setTimeout(() => {
        onSaved?.(data)
        onClose?.()
      }, 1200)
    } catch (err) {
      console.error('[ManualPlayerModal] Save error:', err)
      setError(err.message || t('aiInfoError'))
    } finally {
      setSaving(false)
    }
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <style>{`.mp-select option { background: #1a1a2e; color: #fff; } .mp-select option:checked { background: #0d47a1; }`}</style>

      <div style={{
        width: 'clamp(340px, 94vw, 480px)', maxHeight: '92vh',
        background: 'rgba(10, 14, 39, 0.97)', border: `2px solid ${cardColor}`,
        borderRadius: '12px', boxShadow: `0 0 30px ${cardColor}33`,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'border-color 0.3s'
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', background: `linear-gradient(135deg, ${cardColor}, ${cardColor}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} color="white" />
            <div>
              <div style={{ fontWeight: 700, color: 'white', fontSize: '15px' }}>
                {isEditMode ? t('editPlayer') : t('newPlayer')}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>
                {isEditMode ? t('completeOrEditData') : t('manualEntry')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'white', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

          {/* SEZIONE BASE (sempre visibile) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Nome */}
            <div>
              <label style={labelStyle}>{t('playerNameLabel')}</label>
              <input type="text" style={inputStyle} maxLength={100} placeholder={t('placeholderPlayerNameExample')}
                value={form.player_name} onChange={e => updateForm('player_name', e.target.value)}
                onFocus={e => { e.target.style.borderColor = cardColor }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }} />
            </div>

            {/* Posizione + Overall (2 colonne) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>{t('positionLabel')}</label>
                <select className="mp-select" style={selectStyle} value={form.position}
                  onChange={e => { updateForm('position', e.target.value); updateForm('playing_style', '') }}>
                  <option value="">--</option>
                  {[{ i18nKey: 'positionGroupPortiere', group: 'Portiere' }, { i18nKey: 'positionGroupDefense', group: 'Difesa' }, { i18nKey: 'positionGroupMidfield', group: 'Centrocampo' }, { i18nKey: 'positionGroupAttack', group: 'Attacco' }].map(({ i18nKey, group }) => (
                    <optgroup key={i18nKey} label={t(i18nKey)}>
                      {POSITIONS.filter(p => p.group === group).map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Overall</label>
                <input type="number" style={inputStyle} min="40" max="120" placeholder="40-120"
                  value={form.overall_rating}
                  onChange={(e) => {
                    setOverallRatingTouched(true)
                    updateForm('overall_rating', e.target.value)
                  }} />
              </div>
            </div>

            {/* Tipo carta + Stile (2 colonne) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>{lang === 'en' ? 'Card type' : 'Tipo carta'}</label>
                <select className="mp-select" style={selectStyle} value={form.card_type}
                  onChange={e => updateForm('card_type', e.target.value)}>
                  {CARD_TYPES.map(ct => (
                    <option key={ct} value={ct}>{ct}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>
                  {lang === 'en' ? 'Playing style' : 'Stile giocatore'}
                  {form.position && <span style={{ color: cardColor, marginLeft: '4px' }}>({filteredStyles.length})</span>}
                </label>
                <select className="mp-select" style={selectStyle} value={form.playing_style}
                  onChange={e => updateForm('playing_style', e.target.value)}>
                  <option value="">--</option>
                  {filteredStyles.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SEZIONE STATS (espandibile) */}
          <div style={{ marginTop: '16px', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <button type="button" onClick={() => toggleSection('stats')} style={{
              width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: expandedSections.stats ? 'rgba(0,212,255,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--neon-blue)', fontSize: '13px', fontWeight: 600
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} /> {lang === 'en' ? 'Stats' : 'Statistiche'}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                  ({lang === 'en' ? 'optional' : 'opzionale'})
                </span>
              </span>
              {expandedSections.stats ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.stats && (
              <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { key: 'speed', label: lang === 'en' ? 'Speed' : 'Velocita' },
                  { key: 'acceleration', label: lang === 'en' ? 'Acceleration' : 'Accelerazione' },
                  { key: 'finishing', label: lang === 'en' ? 'Finishing' : 'Finalizzazione' },
                  { key: 'passing', label: lang === 'en' ? 'Passing' : 'Passaggio' },
                  { key: 'dribbling', label: 'Dribbling' },
                  { key: 'defending', label: lang === 'en' ? 'Defending' : 'Difesa' },
                  { key: 'physical', label: lang === 'en' ? 'Physical' : 'Fisico' }
                ].map(stat => (
                  <div key={stat.key}>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>{stat.label}</label>
                    <input type="number" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      min="1" max="99" placeholder="1-99"
                      value={form[stat.key]} onChange={e => updateForm(stat.key, e.target.value)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEZIONE ABILITA (espandibile) */}
          <div style={{ marginTop: '10px', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <button type="button" onClick={() => toggleSection('skills')} style={{
              width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: expandedSections.skills ? 'rgba(168,85,247,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', color: '#a855f7', fontSize: '13px', fontWeight: 600
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Star size={14} /> {lang === 'en' ? 'Skills' : 'Abilita'}
                {form.skills.length > 0 && <span style={{ background: '#a855f7', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>{form.skills.length}</span>}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                  (max 10)
                </span>
              </span>
              {expandedSections.skills ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.skills && (
              <div style={{ padding: '10px 14px', maxHeight: '200px', overflowY: 'auto' }}>
                {Object.entries(SKILL_CATEGORIES).map(([cat, skills]) => (
                  <div key={cat} style={{ marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {skills.map(skill => {
                        const selected = form.skills.includes(skill)
                        return (
                          <button key={skill} type="button" onClick={() => toggleSkill(skill)} style={{
                            padding: '4px 10px', fontSize: '11px', borderRadius: '14px', cursor: 'pointer',
                            border: `1px solid ${selected ? '#a855f7' : 'rgba(255,255,255,0.12)'}`,
                            background: selected ? 'rgba(168,85,247,0.2)' : 'transparent',
                            color: selected ? '#c084fc' : 'rgba(255,255,255,0.6)',
                            transition: 'all 0.15s'
                          }}>
                            {selected && <Check size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEZIONE DETTAGLI (espandibile) */}
          <div style={{ marginTop: '10px', border: '1px solid rgba(255,140,0,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <button type="button" onClick={() => toggleSection('details')} style={{
              width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: expandedSections.details ? 'rgba(255,140,0,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--neon-orange)', fontSize: '13px', fontWeight: 600
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={14} /> {lang === 'en' ? 'Details' : 'Dettagli'}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                  ({lang === 'en' ? 'optional' : 'opzionale'})
                </span>
              </span>
              {expandedSections.details ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.details && (
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>{lang === 'en' ? 'Height cm' : 'Altezza cm'}</label>
                    <input type="number" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      min="150" max="210" placeholder="170"
                      value={form.height} onChange={e => updateForm('height', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>{lang === 'en' ? 'Weight kg' : 'Peso kg'}</label>
                    <input type="number" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      min="50" max="120" placeholder="75"
                      value={form.weight} onChange={e => updateForm('weight', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>{lang === 'en' ? 'Age' : 'Eta'}</label>
                    <input type="number" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      min="15" max="50" placeholder="25"
                      value={form.age} onChange={e => updateForm('age', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>{lang === 'en' ? 'Nationality' : 'Nazionalita'}</label>
                    <input type="text" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      maxLength={50} placeholder={lang === 'en' ? 'e.g. France' : 'es. Francia'}
                      value={form.nationality} onChange={e => updateForm('nationality', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '11px' }}>Club</label>
                    <input type="text" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      maxLength={100} placeholder="es. PSG"
                      value={form.club_name} onChange={e => updateForm('club_name', e.target.value)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SEZIONE BOOSTER (espandibile) */}
          <div style={{ marginTop: '10px', border: '1px solid rgba(168,85,247,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <button type="button" onClick={() => toggleSection('boosters')} style={{
              width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: expandedSections.boosters ? 'rgba(168,85,247,0.06)' : 'transparent',
              border: 'none', cursor: 'pointer', color: 'var(--neon-purple)', fontSize: '13px', fontWeight: 600
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Gift size={14} /> {t('boostersSection')}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                  ({t('optional')})
                </span>
              </span>
              {expandedSections.boosters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {expandedSections.boosters && (
              <div style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{t('boostersList')}</div>
                  <button type="button" onClick={addBooster} className="btn secondary" style={{ padding: '8px 10px', fontSize: '12px', borderRadius: '10px' }}>
                    {t('addBooster')}
                  </button>
                </div>
                {(Array.isArray(form.boosters) ? form.boosters : []).length === 0 ? (
                  <div style={{ fontSize: '13px', opacity: 0.6 }}>{t('boostersNotAvailable')}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(Array.isArray(form.boosters) ? form.boosters : []).map((b, idx) => (
                      <div key={idx} style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--neon-purple)', fontSize: '12px' }}>
                            {t('boosters')} #{idx + 1}
                          </div>
                          <button type="button" onClick={() => removeBooster(idx)} className="btn secondary" style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '10px', borderColor: 'rgba(239, 68, 68, 0.35)', color: '#fecaca' }}>
                            {t('remove')}
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: '11px' }}>{t('boosterName')}</label>
                            <input type="text" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                              placeholder={t('boosterName')}
                              value={String(b?.name ?? '')} onChange={e => updateBooster(idx, 'name', e.target.value)} />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: '11px' }}>{t('boosterEffect')}</label>
                            <input type="text" style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                              placeholder={t('boosterEffect')}
                              value={String(b?.effect ?? '')} onChange={e => updateBooster(idx, 'effect', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Errore / Successo */}
          {error && <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '13px' }}>{error}</div>}
          {success && <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', color: '#22c55e', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}><Check size={16} /> {lang === 'en' ? 'Player saved!' : 'Giocatore salvato!'}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer'
          }}>
            {lang === 'en' ? 'Cancel' : 'Annulla'}
          </button>
          <button onClick={handleSave} disabled={saving || success} style={{
            padding: '10px 24px', background: saving || success ? 'rgba(255,255,255,0.1)' : cardColor,
            border: 'none', borderRadius: '8px', color: 'white', fontSize: '14px', fontWeight: 600,
            cursor: saving || success ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            opacity: saving ? 0.7 : 1
          }}>
            {saving ? (lang === 'en' ? 'Saving...' : 'Salvo...') : success ? (lang === 'en' ? 'Saved!' : 'Salvato!') : (lang === 'en' ? 'Save player' : 'Salva giocatore')}
          </button>
        </div>
      </div>
    </div>
  )
}
