'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import CoachFeedbackChat from '@/components/CoachFeedbackChat'
import { INDIVIDUAL_INSTRUCTIONS_CONFIG } from '@/lib/tacticalInstructions'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, X, Camera, Shield, Target, Users, Settings, ChevronDown, ChevronUp, Brain, MessageCircle, Trophy, Radio, Sparkles, Mic, Swords, Link2, Layers3 } from 'lucide-react'

/** Estrae testo in lingua da valore stringa o oggetto bilingue { it, en } (coerente con analyze-match) */
function pickLang(val, lang) {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'object' && (val.it !== undefined || val.en !== undefined)) return val[lang] || val.it || val.en || ''
  return String(val)
}

function fillTemplate(template, vars) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`\${${key}}`, value ?? '?'),
    template
  )
}

/** Titolo sostituzione: slot del titolare uscente vs ruolo salvato della riserva. */
function formatPlayerSubstitutionTitle(suggestion, t) {
  const reserveName = suggestion.player_name || '?'
  const slotRole = suggestion.slot_role || suggestion.replace_position || '?'
  const reserveRole = suggestion.reserve_card_position || suggestion.position || '?'
  const outName = suggestion.replace_player_name || '?'
  const outRole = slotRole
  const title = fillTemplate(t('replaceInStartingXI'), {
    playerName: reserveName,
    playerRole: reserveRole,
    replacePlayerName: outName,
    replacePlayerRole: outRole
  })
  const hint = fillTemplate(t('replaceInStartingXIHint'), { replacePlayerName: outName })
  const rolesDiffer =
    outRole &&
    reserveRole &&
    String(outRole).trim().toUpperCase() !== String(reserveRole).trim().toUpperCase()
  const roleNote = rolesDiffer
    ? fillTemplate(t('replaceInStartingXIRoleNote'), {
        playerName: reserveName,
        playerRole: reserveRole,
        replacePlayerRole: outRole
      })
    : ''
  return { title, hint, roleNote }
}

export default function CountermeasuresPreMatchPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()

  const individualSlotLabel = (slot) => {
    if (slot === 'attacco_1') return lang === 'en' ? 'Attack instruction 1 (not a role change)' : 'Istruzione attacco 1 (non cambio ruolo)'
    if (slot === 'attacco_2') return lang === 'en' ? 'Attack instruction 2 (not a role change)' : 'Istruzione attacco 2 (non cambio ruolo)'
    if (slot === 'difesa_1') return lang === 'en' ? 'Defence instruction 1' : 'Istruzione difesa 1'
    if (slot === 'difesa_2') return lang === 'en' ? 'Defence instruction 2' : 'Istruzione difesa 2'
    const nameKey = INDIVIDUAL_INSTRUCTIONS_CONFIG[slot]?.nameKey
    return nameKey ? t(nameKey) : slot
  }

  const individualInstructionLabel = (instruction) => {
    const id = String(pickLang(instruction, lang) || '').trim()
    for (const config of Object.values(INDIVIDUAL_INSTRUCTIONS_CONFIG)) {
      const item = config.availableInstructions?.find((entry) => entry.id === id)
      if (item?.nameKey) return t(item.nameKey)
    }
    return id
  }

  const officialTeamStyleFromText = (text) => {
    const value = String(text || '').toLowerCase()
    if (/possesso palla|possession/.test(value)) return lang === 'en' ? 'Possession Game' : 'Possesso palla'
    if (/contropiede veloce|quick counter/.test(value)) return lang === 'en' ? 'Quick Counter' : 'Contropiede veloce'
    if (/contrattacco|long ball counter/.test(value)) return lang === 'en' ? 'Long Ball Counter' : 'Contrattacco'
    if (/passaggio lungo|long ball(?! counter)/.test(value)) return lang === 'en' ? 'Long Ball' : 'Passaggio lungo'
    if (/vie laterali|out wide/.test(value)) return lang === 'en' ? 'Out Wide' : 'Vie laterali'
    return ''
  }

  const cleanCustomerTacticalText = (text) => String(text || '')
    .replace(/(^|\s)non è una voce menu:?\s*/gi, '$1')
    .replace(/(^|\s)this is not (a )?menu setting:?\s*/gi, '$1')
    .replace(/(^|\s)non è una voce configurabile abbastanza chiara:?\s*/gi, '$1')
    .replace(/(^|\s)trattalo come piano pratico in partita,?\s*/gi, '$1')
    .replace(/(^|\s)treat it as a match plan, not a setting\.?\s*/gi, '$1')
    .replace(/(^|\s)è un piano pratico (di|da)\s*/gi, '$1')
    .replace(/(^|\s)is a behavior plan( to)?\s*/gi, '$1')
    .replace(/^(in (partita|match)\s*:\s*){2,}/i, (match) => match.toLowerCase().includes('match') ? 'In match: ' : 'In partita: ')
    .replace(/\b(inserisci|usa)\s+(.+?)\s+come\s+(.+?)\s+per\s+cambiare\s+gioco\b/gi, 'usa $2 per cambiare gioco')
    .replace(/\bsviluppo azione usando\b/gi, 'usa')
    .replace(/\s*\((CLD|CLS|TD|TS|DC|MED|CC|TRQ|SP|P|EDA|ESA)\)\s*/gi, ' ')
    .replace(/\s+come riferimento esterno\b/gi, ' per allargare il gioco')
    .replace(/\s+/g, ' ')
    .trim()

  const normalizeTacticalDisplay = (adj) => {
    const rawSuggestion = cleanCustomerTacticalText(pickLang(adj?.suggestion, lang))
      .replace(/\bTeam Playing Style\b/gi, lang === 'en' ? 'Team Playstyle' : 'Stile squadra')
      .replace(/\bTeam Playstyle\b/gi, lang === 'en' ? 'Team Playstyle' : 'Stile squadra')
      .replace(/^(in (partita|match)\s*:\s*){2,}/i, (match) => match.toLowerCase().includes('match') ? 'In match: ' : 'In partita: ')
      .replace(/\b(inserisci|usa)\s+(.+?)\s+come\s+(.+?)\s+per\s+cambiare\s+gioco\b/gi, 'usa $2 per cambiare gioco')
      .replace(/\bsviluppo azione usando\b/gi, 'sviluppo azione con')
      .trim()
    const officialStyle = officialTeamStyleFromText(rawSuggestion)
    const type = adj?.type

    if ((type === 'team_playing_style' || type === 'playing_style_change') && officialStyle) {
      return {
        type: 'team_playing_style',
        suggestion: lang === 'en' ? `Team Playstyle: ${officialStyle}` : `Stile squadra: ${officialStyle}`,
        hint: pickLang(adj?.application_hint, lang)
      }
    }

    if (type === 'team_playing_style' || type === 'playing_style_change') {
      const isWidth = /ampiezza|fasce|laterali|wide/i.test(rawSuggestion)
      return {
        type: 'match_plan',
        suggestion: isWidth
          ? (lang === 'en'
              ? 'In match: attack with more width through the wide lanes when the centre is closed'
              : 'In partita: attacca con più ampiezza sulle corsie laterali quando il centro è chiuso')
          : (rawSuggestion.toLowerCase().startsWith('in partita:') || rawSuggestion.toLowerCase().startsWith('in match:')
              ? rawSuggestion
              : `${lang === 'en' ? 'In match' : 'In partita'}: ${rawSuggestion}`),
        hint: lang === 'en'
          ? 'This is not one of the 6 current team playstyles: treat it as a match plan, not a setting.'
          : 'Non è uno dei 6 stili squadra correnti: trattalo come piano in partita, non come impostazione.'
      }
    }

    return {
      type,
      suggestion: rawSuggestion,
      hint: pickLang(adj?.application_hint, lang)
    }
  }

  const tacticalAdjustmentLabel = (type) => {
    const labels = {
      team_playing_style: t('changePlayingStyle'),
      playing_style_change: t('changePlayingStyle'),
      game_plan_adjustment: lang === 'en' ? 'Configurable Game Plan Action' : 'Azione configurabile nel Game Plan',
      match_plan: lang === 'en' ? 'In-Match Practical Plan' : 'Piano pratico in partita',
      defensive_line: lang === 'en' ? 'Defensive Line Clarification' : 'Chiarimento linea difensiva',
      pressing: lang === 'en' ? 'Pressing Plan' : 'Piano pressing',
      possession_strategy: lang === 'en' ? 'Possession Plan' : 'Piano possesso'
    }
    return labels[type] || (lang === 'en' ? 'Tactical Adjustment' : 'Adeguamento tattico')
  }
  
  const [uploadImage, setUploadImage] = React.useState(null)
  const [defenseImage, setDefenseImage] = React.useState(null)
  const [opponentUsesFluid, setOpponentUsesFluid] = React.useState(false)
  const [extracting, setExtracting] = React.useState(false)
  const [extractedFormation, setExtractedFormation] = React.useState(null)
  const [generating, setGenerating] = React.useState(false)
  const pipelineLockRef = React.useRef(false)
  const [countermeasures, setCountermeasures] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [expandedSections, setExpandedSections] = React.useState({
    analysis: true,
    tactical: false,
    players: false,
    instructions: false,
    playSummary: true
  })
  const [showPalestraCoach, setShowPalestraCoach] = React.useState(false)
  const [palestraUserProfile, setPalestraUserProfile] = React.useState(null)
  const [palestraLastMatch, setPalestraLastMatch] = React.useState(null)
  const [palestraOpenLoading, setPalestraOpenLoading] = React.useState(false)

  const isProcessing = extracting || generating
  const processingCopy = React.useMemo(() => {
    if (extracting) {
      return {
        kicker: lang === 'en' ? 'Reading opponent setup' : 'Lettura assetto avversario',
        title: lang === 'en' ? 'Hero AI is extracting the formation' : 'Hero AI sta estraendo la formazione',
        text: lang === 'en'
          ? 'We identify formation, player slots, coach clues and playing style before creating the tactical answer.'
          : 'Identifichiamo modulo, slot giocatori, indizi sul coach e stile di gioco prima di creare la risposta tattica.',
        steps: lang === 'en'
          ? ['Formation map', 'Players and coach', 'Tactical context']
          : ['Mappa modulo', 'Giocatori e coach', 'Contesto tattico']
      }
    }
    return {
      kicker: lang === 'en' ? 'Building countermeasures' : 'Costruzione contromisure',
      title: lang === 'en' ? 'Hero AI is turning data into a match plan' : 'Hero AI trasforma i dati in piano partita',
      text: lang === 'en'
        ? 'We cross the opponent shape with your pre-match logic to produce priorities, risks and actionable instructions.'
        : 'Incrociamo struttura avversaria e logica pre-partita per produrre priorità, rischi e istruzioni operative.',
      steps: lang === 'en'
        ? ['Threats', 'Weak points', 'Practical CTAs']
        : ['Minacce', 'Punti deboli', 'CTA pratiche']
    }
  }, [extracting, lang])

  const openPalestraCoach = React.useCallback(async () => {
    setPalestraOpenLoading(true)
    try {
      let token = localStorage.getItem('auth_token')
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) {
        router.push('/login')
        return
      }
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache'
        },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setPalestraUserProfile(data.profile || null)
        setPalestraLastMatch(data.matches?.[0] || null)
      }
      setShowPalestraCoach(true)
    } catch (e) {
      console.error('[contromisure-pre-partita] Prefetch dashboard for Palestra:', e)
      setShowPalestraCoach(true)
    } finally {
      setPalestraOpenLoading(false)
    }
  }, [router])

  const handleImageSelect = async (e) => {
    if (pipelineLockRef.current || extracting || generating) {
      e.target.value = ''
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError(t('errorInvalidImage'))
      return
    }

    try {
      const optimized = await optimizeImageFile(file)
      const imageDataUrl = optimized.dataUrl
      setUploadImage(imageDataUrl)
      setError(null)
      setExtractedFormation(null)
      setCountermeasures(null)
      if (!opponentUsesFluid) {
        await runFullPipeline(imageDataUrl, null, { fluid: false })
      } else if (defenseImage) {
        await runFullPipeline(imageDataUrl, defenseImage, { fluid: true })
      }
    } catch (err) {
      console.error('[contromisure-pre-partita] image optimization error:', err)
      setError(getImageOptimizeUserMessage(err, t))
    }
    e.target.value = ''
  }

  const handleDefenseImageSelect = async (e) => {
    if (pipelineLockRef.current || extracting || generating) {
      e.target.value = ''
      return
    }
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const optimized = await optimizeImageFile(file)
      setDefenseImage(optimized.dataUrl)
      setError(null)
      setExtractedFormation(null)
      setCountermeasures(null)
      if (opponentUsesFluid && uploadImage) {
        await runFullPipeline(uploadImage, optimized.dataUrl, { fluid: true })
      }
    } catch (err) {
      setError(getImageOptimizeUserMessage(err, t))
    }
    e.target.value = ''
  }

  /** Pipeline completo: estrazione + generazione contromisure (avvio automatico al caricamento) */
  const runFullPipeline = async (imageDataUrl, defenseDataUrl = null, { fluid = opponentUsesFluid } = {}) => {
    if (!imageDataUrl) return
    if (fluid && !defenseDataUrl) return
    if (pipelineLockRef.current) return
    pipelineLockRef.current = true
    setExtracting(true)
    setError(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const usePhases = Boolean(fluid && defenseDataUrl)
      let extractData
      let phases = null

      if (usePhases) {
        const extractRes = await fetch('/api/tactical/extract-opponent-phases', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
          },
          body: JSON.stringify({
            attackImageDataUrl: imageDataUrl,
            defenseImageDataUrl: defenseDataUrl
          })
        })
        const extracted = await extractRes.json().catch(() => ({}))
        if (!extractRes.ok) {
          const { message } = mapErrorToUserMessage(extracted?.error || '', t('errorExtractingFormation'), lang)
          throw new Error(message)
        }
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
        phases = extracted.phases
        extractData = phases?.attack || {}
      } else {
        const extractRes = await fetch('/api/extract-formation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
          },
          body: JSON.stringify({ imageDataUrl })
        })
        if (!extractRes.ok) {
          const errorData = await extractRes.json()
          const { message } = mapErrorToUserMessage(errorData?.error || '', t('errorExtractingFormation'), lang)
          throw new Error(message)
        }
        extractData = await extractRes.json()
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
      }

      const saveRes = await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          formation_name: extractData.formation || null,
          playing_style: extractData.playing_style || null,
          extracted_data: {
            formation: extractData.formation,
            slot_positions: extractData.slot_positions,
            players: extractData.players,
            overall_strength: extractData.overall_strength,
            tactical_style: extractData.tactical_style,
            coach: extractData.coach || null,
            visual_tactical_profile: extractData.visual_tactical_profile || null,
            ...(phases ? {
              fluid_formation: {
                attack: phases.attack,
                defense: phases.defense,
                fluid_detected: phases.fluid_detected,
                movement_summary: phases.movement_summary || []
              },
              source_version: 'v6.0.0'
            } : {})
          },
          is_pre_match: true
        })
      })
      const saveData = await safeJsonResponse(saveRes, t('errorSaveFormation'))
      const formationForState = {
        id: saveData.formation?.id,
        formation_name: extractData.formation,
        playing_style: extractData.playing_style,
        players: extractData.players,
        overall_strength: extractData.overall_strength,
        tactical_style: extractData.tactical_style,
        coach: extractData.coach || null,
        visual_tactical_profile: extractData.visual_tactical_profile || null
      }
      setExtractedFormation(formationForState)
      setExtracting(false)

      setGenerating(true)
      const generateRes = await fetch('/api/generate-countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
        },
        body: JSON.stringify({
          opponent_formation_id: formationForState.id,
          language: lang
        })
      })
      const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))
      if (generateData.success && generateData.countermeasures) {
        setCountermeasures(generateData.countermeasures)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
      } else {
        throw new Error(t('errorGeneratingCountermeasures'))
      }
    } catch (err) {
      console.error('[CountermeasuresPreMatch] Pipeline error:', err)
      setError(err.message || t('errorGeneratingCountermeasures'))
    } finally {
      setExtracting(false)
      setGenerating(false)
      pipelineLockRef.current = false
    }
  }

  const handleGenerateCountermeasures = async () => {
    if (!extractedFormation?.id) {
      setError(t('noFormationUploaded'))
      return
    }
    if (pipelineLockRef.current) return
    pipelineLockRef.current = true

    setGenerating(true)
    setError(null)
    setCountermeasures(null)

    try {
      let token = localStorage.getItem('auth_token')
      
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (!token) {
        throw new Error(t('tokenNotAvailable'))
      }

      const generateRes = await fetch('/api/generate-countermeasures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it'
        },
        body: JSON.stringify({
          opponent_formation_id: extractedFormation.id,
          language: lang
        })
      })

      const generateData = await safeJsonResponse(generateRes, t('errorGeneratingCountermeasures'))
      if (generateData.success && generateData.countermeasures) {
        setCountermeasures(generateData.countermeasures)
        if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
      } else {
        throw new Error(t('errorGeneratingCountermeasures'))
      }
    } catch (err) {
      console.error('[CountermeasuresPreMatch] Generate error:', err)
      setError(err.message || t('errorGeneratingCountermeasures'))
    } finally {
      setGenerating(false)
      pipelineLockRef.current = false
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'var(--neon-orange)'
      case 'medium': return 'var(--neon-blue)'
      default: return 'var(--neon-blue)'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return `${t('priority')}: ${t('priorityHigh')}`
      case 'medium': return `${t('priority')}: ${t('priorityMedium')}`
      default: return `${t('priority')}: ${t('priorityMedium')}`
    }
  }

  return (
    <main className="counter-page" data-tour-id="tour-counter-intro" style={{ 
      minHeight: '100vh', 
      padding: 'clamp(16px, 4vw, 24px)',
      paddingTop: '80px',
      color: '#fff'
    }}>
      {/* Header pagina: non fixed, così non collide con la top nav mobile. */}
      <div
        className="counter-page-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'nowrap',
          gap: '12px',
          marginBottom: '18px',
          padding: '10px 12px',
          background: 'linear-gradient(135deg, rgba(5, 10, 24, 0.92), rgba(8, 18, 34, 0.86))',
          backdropFilter: 'saturate(180%) blur(12px)',
          border: '1px solid rgba(0, 212, 255, 0.18)',
          borderRadius: '18px',
          boxShadow: '0 14px 36px rgba(0, 0, 0, 0.22)',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            onClick={() => router.push('/')}
            className="counter-back-button"
          >
            <ArrowLeft size={18} />
            <span>{t('back')}</span>
          </button>
          <h1 className="neon-text" style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t('countermeasuresLive')}
          </h1>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {isProcessing && (
        <section className="counter-processing-card" role="status" aria-live="polite" aria-busy="true">
          <div className="counter-processing-logo">
            <span className="counter-logo-orbit" aria-hidden="true" />
            <span className="counter-logo-scan" aria-hidden="true" />
            <img src="/logo.png" alt="" />
          </div>
          <div className="counter-processing-copy">
            <span>{processingCopy.kicker}</span>
            <strong>{processingCopy.title}</strong>
            <p>{processingCopy.text}</p>
            <div className="counter-processing-steps">
              {processingCopy.steps.map((step, index) => (
                <em key={step}>
                  <CheckCircle2 size={13} />
                  {index + 1}. {step}
                </em>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upload Sezione */}
      {!extractedFormation && (
        <div data-tour-id="tour-counter-upload" className="counter-upload-card">
          <div className="counter-upload-head">
            <div>
              <div className="counter-kicker">
                <Shield size={14} />
                {lang === 'en' ? 'Pre-match counter plan' : 'Piano contromisure pre-partita'}
              </div>
              <h2>{t('uploadOpponentFormation')}</h2>
              <p>
                {lang === 'en'
                  ? 'Clear squad screen → structure read, tactical tips generated.'
                  : lang === 'es'
                    ? 'Captura nítida del módulo rival → lectura y sugerencias tácticas.'
                    : 'Screenshot nitido del modulo avversario → lettura modulo e suggerimenti tattici.'}
              </p>
              <div className="counter-fluid-control">
                <div className="counter-fluid-label">
                  <Layers3 size={16} aria-hidden="true" />
                  <span>{t('opponentFluidToggle')}</span>
                </div>
                <div className="counter-fluid-options" role="group" aria-label={t('opponentFluidToggle')}>
                  <button
                    type="button"
                    className={`counter-fluid-option ${!opponentUsesFluid ? 'is-active' : ''}`}
                    aria-pressed={!opponentUsesFluid}
                    disabled={isProcessing}
                    onClick={() => {
                      if (isProcessing) return
                      const wasFluid = opponentUsesFluid
                      setOpponentUsesFluid(false)
                      setDefenseImage(null)
                      if (wasFluid && uploadImage && !extractedFormation && !isProcessing) {
                        runFullPipeline(uploadImage, null, { fluid: false })
                      }
                    }}
                  >
                    {!opponentUsesFluid && <CheckCircle2 size={15} aria-hidden="true" />}
                    No
                  </button>
                  <button
                    type="button"
                    className={`counter-fluid-option ${opponentUsesFluid ? 'is-active' : ''}`}
                    aria-pressed={opponentUsesFluid}
                    disabled={isProcessing}
                    onClick={() => {
                      if (isProcessing) return
                      setOpponentUsesFluid(true)
                      setExtractedFormation(null)
                      setCountermeasures(null)
                    }}
                  >
                    {opponentUsesFluid && <CheckCircle2 size={15} aria-hidden="true" />}
                    {lang === 'en' ? 'Yes' : lang === 'es' ? 'Sí' : 'Sì'}
                  </button>
                </div>
                <em className="counter-fluid-hint">
                  {opponentUsesFluid ? t('opponentFluidNeedBoth') : t('opponentFluidToggleHint')}
                </em>
              </div>
            </div>
            <div className="counter-upload-logo" aria-hidden="true">
              <span />
              <img src="/logo.png" alt="" />
            </div>
          </div>

          <input
            id="counter-upload-input"
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
          <input
            id="counter-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
          <input
            id="counter-defense-upload-input"
            type="file"
            accept="image/*"
            onChange={handleDefenseImageSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />
          <input
            id="counter-defense-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleDefenseImageSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />

          {opponentUsesFluid ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.35)', background: 'rgba(251, 191, 36, 0.06)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{t('fluidAttack')}</div>
                  {uploadImage ? (
                    <>
                      <img src={uploadImage} alt="" style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px' }} />
                      {!isProcessing && (
                      <button type="button" className="counter-secondary-cta" onClick={() => { setUploadImage(null); setExtractedFormation(null); setCountermeasures(null) }} style={{ marginTop: '8px', width: '100%' }}>
                        <X size={14} /> {t('remove')}
                      </button>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" className="counter-primary-cta" onClick={() => document.getElementById('counter-upload-input')?.click()} disabled={isProcessing} style={{ flex: 1 }}>
                        <Upload size={14} /> {t('upload')}
                      </button>
                      <button type="button" className="counter-secondary-cta" onClick={() => document.getElementById('counter-camera-input')?.click()} disabled={isProcessing}>
                        <Camera size={14} />
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.35)', background: 'rgba(251, 191, 36, 0.06)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{t('fluidDefense')}</div>
                  {defenseImage ? (
                    <>
                      <img src={defenseImage} alt="" style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', borderRadius: '8px' }} />
                      {!isProcessing && (
                      <button type="button" className="counter-secondary-cta" onClick={() => { setDefenseImage(null); setExtractedFormation(null); setCountermeasures(null) }} style={{ marginTop: '8px', width: '100%' }}>
                        <X size={14} /> {t('remove')}
                      </button>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button type="button" className="counter-primary-cta" onClick={() => document.getElementById('counter-defense-upload-input')?.click()} disabled={isProcessing} style={{ flex: 1 }}>
                        <Upload size={14} /> {t('upload')}
                      </button>
                      <button type="button" className="counter-secondary-cta" onClick={() => document.getElementById('counter-defense-camera-input')?.click()} disabled={isProcessing}>
                        <Camera size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {(!uploadImage || !defenseImage) && (
                <p style={{ fontSize: '13px', opacity: 0.78, margin: '0 0 8px' }}>
                  {t('opponentFluidMissingSecond')}
                </p>
              )}
              {isProcessing && (
                <div className="counter-inline-processing">
                  <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{extracting ? t('extracting') : (lang === 'en' ? 'Building the plan...' : lang === 'es' ? 'Preparando el plan...' : 'Preparazione del piano...')}</span>
                </div>
              )}
            </div>
          ) : !uploadImage ? (
            <div>
              <div
                className="upload-area"
                style={{
                  padding: 'clamp(24px, 6vw, 48px)',
                  background: 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 70%)',
                  border: '2px dashed rgba(251, 191, 36, 0.5)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  cursor: 'default',
                  opacity: isProcessing ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
              >
                <div className="counter-upload-icon">
                  <Camera size={30} />
                </div>
                <div style={{ fontSize: 'clamp(14px, 3vw, 16px)', fontWeight: 600, marginBottom: '6px' }}>
                  {t('uploadPhoto')}
                </div>
                <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.78, lineHeight: 1.35 }}>
                  {lang === 'en'
                    ? 'PNG/JPG • extraction and counters run automatically'
                    : lang === 'es'
                      ? 'PNG/JPG nítido • extracción y contramedidas en automático'
                      : 'PNG/JPG nitido • estrazione e contromisure in automatico'}
                </div>
              </div>
              <div className="counter-cta-row">
                <button
                  type="button"
                  onClick={() => document.getElementById('counter-upload-input')?.click()}
                  className="counter-primary-cta"
                  disabled={isProcessing}
                >
                  <Upload size={16} />
                  {t('upload')}
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('counter-camera-input')?.click()}
                  className="counter-secondary-cta"
                  disabled={isProcessing}
                >
                  <Camera size={16} />
                  {t('cameraCaptureTitle')}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <img
                  src={uploadImage}
                  alt="Preview"
                  style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                {isProcessing ? (
                  <div className="counter-inline-processing">
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{extracting ? t('extracting') : (lang === 'en' ? 'Building the plan...' : lang === 'es' ? 'Preparando el plan...' : 'Preparazione del piano...')}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => runFullPipeline(uploadImage, null, { fluid: false })}
                    className="counter-primary-cta"
                    disabled={isProcessing}
                    style={{ flex: 1, minWidth: '200px' }}
                  >
                    <RefreshCw size={16} />
                    {t('retry')}
                  </button>
                )}
                <button
                  onClick={() => {
                    setUploadImage(null)
                    setDefenseImage(null)
                    setExtractedFormation(null)
                    setCountermeasures(null)
                    setError(null)
                  }}
                  className="counter-secondary-cta"
                  disabled={isProcessing}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview Formazione Estratta */}
      {extractedFormation && !countermeasures && (
        <div data-tour-id="tour-counter-extracted" className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={24} color="#22C55E" />
            {t('formationExtracted')}
          </h2>
          
          <div style={{ 
            padding: 'clamp(12px, 3vw, 16px)', 
            background: 'rgba(34, 197, 94, 0.1)', 
            border: '1px solid rgba(34, 197, 94, 0.3)', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <strong>{t('formation')}:</strong> {extractedFormation.formation_name || 'N/A'}
              </div>
              {extractedFormation.playing_style && (
                <div>
                  <strong>{t('playingStyle')}:</strong> {extractedFormation.playing_style}
                </div>
              )}
              {extractedFormation.overall_strength && (
                <div>
                  <strong>{t('overallStrength')}:</strong> {extractedFormation.overall_strength}
                </div>
              )}
            </div>
            {extractedFormation.coach && (
              <div style={{ 
                marginTop: '12px', 
                padding: '10px', 
                background: 'rgba(0, 212, 255, 0.1)', 
                border: '1px solid rgba(0, 212, 255, 0.3)', 
                borderRadius: '6px',
                fontSize: 'clamp(12px, 2.5vw, 14px)'
              }}>
                <strong style={{ color: 'var(--neon-blue)' }}>✓ {t('coach')} estratto:</strong> {extractedFormation.coach.coach_name || 'N/A'}
                {extractedFormation.coach.age && ` (${extractedFormation.coach.age} ${t('years')})`}
              </div>
            )}
          </div>

          <button
            onClick={handleGenerateCountermeasures}
            className="btn primary"
            disabled={isProcessing}
            style={{ width: '100%' }}
          >
            {generating ? (
              <>
                <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                {t('generatingCountermeasures')}
              </>
            ) : (
              <>
                <Brain size={18} />
                {t('generateCountermeasures')}
              </>
            )}
          </button>
        </div>
      )}

      <div
        className="neon-card"
        style={{
          padding: 'clamp(18px, 4vw, 24px)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 215, 100, 0.24)',
          background: 'linear-gradient(135deg, rgba(28, 21, 10, 0.94), rgba(7, 18, 30, 0.98) 55%, rgba(5, 8, 20, 0.98) 100%)',
          boxShadow: '0 18px 36px rgba(0, 0, 0, 0.28), 0 0 28px rgba(255, 196, 0, 0.10)'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at top right, rgba(255,215,100,0.14), transparent 34%), radial-gradient(circle at bottom left, rgba(0,212,255,0.12), transparent 30%)',
            pointerEvents: 'none'
          }}
        />

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(255,215,100,0.10)', border: '1px solid rgba(255,215,100,0.22)', color: '#FFD76A', fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              <Sparkles size={14} />
              {t('liveCoachPremiumBadge')}
            </div>
            <h2 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 24px)', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Radio size={20} color="#FFD76A" />
              {t('liveCoachDashboardTitle')}
            </h2>
            <p style={{ margin: '10px 0 0', maxWidth: '780px', color: 'rgba(255,255,255,0.76)', lineHeight: 1.65, fontSize: 'clamp(13px, 3vw, 14px)' }}>
              {t('liveCoachDashboardSubtitle')}
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }}>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF', fontSize: '12px', fontWeight: 700 }}>
                {t('liveCoachHpHint')}
              </span>
              <span style={{ padding: '8px 12px', borderRadius: '999px', background: 'rgba(0,212,255,0.08)', color: 'var(--neon-cyan)', fontSize: '12px', fontWeight: 700 }}>
                {t('liveCoachVoiceSubtitle')}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('open-live-coach'))
              }
            }}
            className="neon-button"
            style={{
              flex: '0 0 auto',
              minWidth: '220px',
              minHeight: '60px',
              borderRadius: '18px',
              border: '1px solid rgba(255,215,100,0.30)',
              background: 'linear-gradient(135deg, rgba(255,215,100,0.16), rgba(0,212,255,0.12))',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              fontWeight: 800,
              fontSize: '15px'
            }}
          >
            <Mic size={18} />
            {t('liveCoachDashboardCta')}
          </button>
        </div>
      </div>

      {/* Contromisure Generate */}
      {countermeasures && (
        <>
          <p style={{ fontSize: 'clamp(13px, 2.5vw, 14px)', color: 'rgba(255,255,255,0.7)', marginBottom: '20px', marginTop: 0 }}>
            {t('countermeasuresPreMatchContext')}
          </p>
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(251, 191, 36, 0.35)',
              background: 'rgba(251, 191, 36, 0.10)',
              color: 'rgba(255,255,255,0.92)',
              fontSize: 'clamp(12px, 2.4vw, 13px)',
              lineHeight: 1.6
            }}
          >
            Valuta sempre la forma attuale dei giocatori (frecce). Se hai dubbi, usa Contromisure Live.
          </div>
          {countermeasures.fluid_formation_recommendation?.decision && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers3 size={22} color="var(--neon-blue)" />
                {t('v6FluidDecision')}
              </h2>
              <strong style={{ color: 'var(--neon-blue)', fontSize: '12px', letterSpacing: '0.06em' }}>
                {pickLang(countermeasures.fluid_formation_recommendation.title, lang)}
              </strong>
              <p style={{ margin: '8px 0 14px', lineHeight: 1.6, opacity: 0.85 }}>
                {pickLang(countermeasures.fluid_formation_recommendation.reason, lang)}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--neon-blue)', marginBottom: '6px' }}><Swords size={16} /><strong>{t('fluidAttack')}</strong></div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{pickLang(countermeasures.fluid_formation_recommendation.attack_action, lang)}</p>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', color: 'var(--neon-blue)', marginBottom: '6px' }}><Shield size={16} /><strong>{t('fluidDefense')}</strong></div>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>{pickLang(countermeasures.fluid_formation_recommendation.defense_action, lang)}</p>
                </div>
              </div>
            </div>
          )}
          {countermeasures.link_up_recommendations?.length > 0 && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link2 size={22} color="var(--neon-blue)" />
                {t('v6LinkUpPlan')}
              </h2>
              <div style={{ display: 'grid', gap: '10px' }}>
                {countermeasures.link_up_recommendations.map((item, index) => (
                  <div key={`${pickLang(item.name, lang)}-${index}`} style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <strong>{pickLang(item.name, lang)}</strong>
                      <span style={{ color: 'var(--neon-blue)', fontSize: '11px', fontWeight: 800 }}>
                        {item.decision === 'use' ? t('v6Use') : item.decision === 'do_not_use' ? t('v6DoNotUse') : item.decision === 'insufficient_data' ? t('v6InsufficientData') : t('v6NotActivatable')}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.75 }}>
                      {[
                        pickLang(item.focal_player, lang) && `${t('focalPoint')}: ${pickLang(item.focal_player, lang)}`,
                        pickLang(item.key_man_player, lang) && `${t('keyMan')}: ${pickLang(item.key_man_player, lang)}`
                      ].filter(Boolean).join(' · ')}
                    </p>
                    {pickLang(item.reason, lang) && <p style={{ margin: '6px 0 0', fontSize: '12px', opacity: 0.7 }}>{pickLang(item.reason, lang)}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Analisi Formazione Avversaria */}
          {countermeasures.analysis && (
          <div data-tour-id="tour-counter-result" className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                cursor: 'pointer'
              }}
              onClick={() => setExpandedSections(prev => ({ ...prev, analysis: !prev.analysis }))}
            >
              <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Target size={24} color="var(--neon-blue)" />
                {t('opponentFormationAnalysis')}
              </h2>
              {expandedSections.analysis ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>

            {expandedSections.analysis && (
              <div>
                {countermeasures.analysis.is_meta_formation && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 165, 0, 0.1)',
                    border: '1px solid rgba(255, 165, 0, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={18} color="var(--neon-orange)" />
                    <strong>{t('metaFormation')}:</strong> {pickLang(countermeasures.analysis.meta_type, lang)}
                  </div>
                )}

                <div style={{ marginBottom: '16px', lineHeight: '1.7' }}>
                  {pickLang(countermeasures.analysis.opponent_formation_analysis, lang)}
                </div>

                {countermeasures.analysis.strengths && countermeasures.analysis.strengths.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <strong style={{ color: 'var(--neon-orange)' }}>{t('formationStrengths')}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.strengths.map((strength, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(strength, lang)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.weaknesses && countermeasures.analysis.weaknesses.length > 0 && (
                  <div>
                    <strong style={{ color: 'var(--neon-blue)' }}>{t('formationWeaknesses')}:</strong>
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {countermeasures.analysis.weaknesses.map((weakness, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{pickLang(weakness, lang)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {countermeasures.analysis.why_weaknesses && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0, 212, 255, 0.1)', borderRadius: '8px', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                    <strong>{t('reason')}:</strong> {pickLang(countermeasures.analysis.why_weaknesses, lang)}
                  </div>
                )}
              </div>
            )}
          </div>
          )}

          {/* Contromisure Tattiche */}
          {(countermeasures.countermeasures?.formation_adjustments?.length > 0 ||
            countermeasures.countermeasures?.tactical_adjustments?.length > 0) && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, tactical: !prev.tactical }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Shield size={24} color="var(--neon-orange)" />
                  {t('tacticalCountermeasures')}
                </h2>
                {expandedSections.tactical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.tactical && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.formation_adjustments?.map((adj, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(255, 165, 0, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {adj.type === 'formation_change' ? t('changeFormation') : t('changePlayingStyle')}: {pickLang(adj.suggestion, lang)}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {cleanCustomerTacticalText(pickLang(adj.reason, lang))}
                        </div>
                      </div>
                    ))}

                  {countermeasures.countermeasures.tactical_adjustments?.map((adj, idx) => {
                    const displayAdj = normalizeTacticalDisplay(adj)
                    return (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(adj.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(adj.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(adj.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {tacticalAdjustmentLabel(displayAdj.type)}: {displayAdj.suggestion}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {cleanCustomerTacticalText(pickLang(adj.reason, lang))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Suggerimenti Giocatori */}
          {countermeasures.countermeasures?.player_suggestions?.filter(s => s?.action !== 'remove_from_starting_xi')?.length > 0 && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, players: !prev.players }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Users size={24} color="var(--neon-blue)" />
                  {t('playerSuggestions')}
                </h2>
                {expandedSections.players ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.players && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {countermeasures.countermeasures.player_suggestions
                    .filter(s => s?.action !== 'remove_from_starting_xi')
                    .map((suggestion, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(12px, 3vw, 16px)',
                          background: 'rgba(0, 212, 255, 0.1)',
                          border: `1px solid ${getPriorityColor(suggestion.priority)}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <span style={{ 
                            fontSize: 'clamp(11px, 2vw, 12px)', 
                            color: getPriorityColor(suggestion.priority),
                            fontWeight: 600
                          }}>
                            {getPriorityLabel(suggestion.priority)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: 'clamp(14px, 3vw, 16px)' }}>
                          {suggestion.action === 'add_to_starting_xi'
                            ? (suggestion.replace_player_name || suggestion.replace_player_id)
                              ? (() => {
                                  const sub = formatPlayerSubstitutionTitle(suggestion, t)
                                  return (
                                    <>
                                      <div>{sub.title}</div>
                                      <div style={{ fontWeight: 500, fontSize: 'clamp(12px, 2.8vw, 13px)', opacity: 0.85, marginTop: '6px' }}>
                                        {sub.hint}
                                      </div>
                                      {sub.roleNote ? (
                                        <div style={{ fontWeight: 500, fontSize: 'clamp(12px, 2.8vw, 13px)', color: 'var(--neon-blue)', marginTop: '4px' }}>
                                          {sub.roleNote}
                                        </div>
                                      ) : null}
                                    </>
                                  )
                                })()
                              : (
                                  <>
                                    <div>{fillTemplate(t('substitutionIncomplete'), { playerName: suggestion.player_name || '?' })}</div>
                                    <div style={{ fontWeight: 500, fontSize: 'clamp(12px, 2.8vw, 13px)', opacity: 0.85, marginTop: '6px' }}>
                                      {t('substitutionIncompleteHint')}
                                    </div>
                                  </>
                                )
                            : `${t('removeFromStartingXI')}: ${suggestion.player_name} (${suggestion.position || ''})`}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: '1.6', opacity: 0.9 }}>
                          {pickLang(suggestion.reason, lang)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Istruzioni Individuali */}
          {countermeasures.countermeasures?.individual_instructions?.length > 0 && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, instructions: !prev.instructions }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Settings size={24} color="var(--neon-blue)" />
                  {t('individualInstructions')}
                </h2>
                {expandedSections.instructions ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.instructions && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {countermeasures.countermeasures.individual_instructions.map((instruction, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 'clamp(10px, 2.5vw, 12px)',
                          className: 'neon-panel',
                          border: '1px solid rgba(0, 212, 255, 0.3)',
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '4px' }}>
                          <span style={{ fontSize: 'clamp(14px, 3.2vw, 15px)', fontWeight: 700, color: 'var(--neon-blue)' }}>
                            {(pickLang(instruction.player_name, lang) || '?') +
                              (instruction.position ? ` (${pickLang(instruction.position, lang)})` : '')}
                          </span>
                          <span style={{ fontSize: 'clamp(13px, 3vw, 14px)', fontWeight: 600 }}>
                            {individualSlotLabel(instruction.slot)} · {individualInstructionLabel(instruction.instruction)}
                          </span>
                        </div>
                        <div style={{ fontSize: 'clamp(12px, 2.5vw, 13px)', opacity: 0.8, marginLeft: '4px' }}>
                          {pickLang(instruction.reason, lang)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Come giocarla */}
          {countermeasures.play_summary && (
            <div className="neon-card" style={{ padding: 'clamp(16px, 4vw, 24px)', marginBottom: '24px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px',
                  cursor: 'pointer'
                }}
                onClick={() => setExpandedSections(prev => ({ ...prev, playSummary: !prev.playSummary }))}
              >
                <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Brain size={24} color="var(--neon-blue)" />
                  {t('howToPlayIt')}
                </h2>
                {expandedSections.playSummary ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              {expandedSections.playSummary && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {[
                    ['match_key', t('playSummaryMatchKey')],
                    ['base_plan', t('playSummaryBasePlan')],
                    ['attacking', t('playSummaryAttacking')],
                    ['defending', t('playSummaryDefending')],
                    ['avoid', t('playSummaryAvoid')]
                  ].map(([key, label]) => {
                    const text = pickLang(countermeasures.play_summary?.[key], lang)
                    if (!text) return null
                    return (
                      <div
                        key={key}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          background: key === 'match_key' ? 'rgba(251, 191, 36, 0.10)' : 'rgba(0, 212, 255, 0.08)',
                          border: key === 'match_key' ? '1px solid rgba(251, 191, 36, 0.28)' : '1px solid rgba(0, 212, 255, 0.18)'
                        }}
                      >
                        <div style={{ fontWeight: 700, color: key === 'match_key' ? 'var(--neon-orange)' : 'var(--neon-blue)', marginBottom: '6px', fontSize: 'clamp(13px, 3vw, 14px)' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: 1.6, color: 'rgba(255,255,255,0.9)' }}>
                          {text}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {countermeasures.warnings && countermeasures.warnings.length > 0 && (
            <div style={{
              padding: 'clamp(12px, 3vw, 16px)',
              background: 'rgba(255, 165, 0, 0.1)',
              border: '1px solid rgba(255, 165, 0, 0.3)',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                <AlertCircle size={18} color="var(--neon-orange)" />
                {t('warnings')}
              </div>
              <ul style={{ marginLeft: '24px' }}>
                {countermeasures.warnings.map((warning, idx) => (
                  <li key={idx} style={{ marginBottom: '4px', fontSize: 'clamp(13px, 3vw, 14px)' }}>{pickLang(warning, lang)}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Info Confidence */}
          <div style={{
            padding: 'clamp(10px, 2.5vw, 12px)',
            background: 'rgba(0, 212, 255, 0.1)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: 'clamp(12px, 2.5vw, 13px)',
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span>
              <strong>{t('confidence')}:</strong> {countermeasures.confidence}%
            </span>
            <span>
              <strong>{t('dataQuality')}:</strong> {countermeasures.data_quality || 'N/A'}
            </span>
          </div>

          {/* Dopo la partita: flusso post-match coerente con dashboard (aggiungi partita + Palestra) */}
          <div
            data-tour-id="tour-counter-postmatch"
            className="neon-card"
            style={{
              padding: 'clamp(16px, 4vw, 22px)',
              marginBottom: '24px',
              background: 'rgba(5, 12, 28, 0.75)',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              borderRadius: '12px'
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(16px, 3.5vw, 18px)',
                fontWeight: 700,
                margin: '0 0 14px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#fff'
              }}
            >
              <Trophy size={22} style={{ color: 'var(--neon-orange)', flexShrink: 0 }} aria-hidden />
              {t('countermeasuresPostMatchTitle')}
            </h2>

            <div
              style={{
                padding: '14px',
                marginBottom: '14px',
                background: 'rgba(0, 212, 255, 0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(0, 212, 255, 0.15)'
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                {t('countermeasuresPostMatchPhotosIntro')}
              </p>
              <Link
                href="/match/new"
                className="btn primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  textDecoration: 'none',
                  width: '100%',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                <Camera size={18} aria-hidden />
                {t('countermeasuresPostMatchAddMatchCta')}
              </Link>
            </div>

            <div
              style={{
                padding: '14px',
                background: 'rgba(251, 191, 36, 0.06)',
                borderRadius: '10px',
                border: '1px solid rgba(251, 191, 36, 0.2)'
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontSize: 'clamp(13px, 3vw, 14px)', lineHeight: 1.65, color: 'rgba(255,255,255,0.88)' }}>
                {t('countermeasuresPostMatchPalestraIntro')}
              </p>
              <button
                type="button"
                className="neon-button"
                disabled={palestraOpenLoading}
                onClick={openPalestraCoach}
                style={{
                  width: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '44px',
                  cursor: palestraOpenLoading ? 'wait' : 'pointer',
                  opacity: palestraOpenLoading ? 0.85 : 1
                }}
              >
                {palestraOpenLoading ? (
                  <>
                    <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
                    {t('loading')}
                  </>
                ) : (
                  <>
                    <MessageCircle size={18} aria-hidden />
                    {t('openPalestraCoach')}
                  </>
                )}
              </button>
            </div>
          </div>

        </>
      )}

      <CoachFeedbackChat
        show={showPalestraCoach}
        onClose={() => {
          setShowPalestraCoach(false)
          setPalestraUserProfile(null)
          setPalestraLastMatch(null)
        }}
        userProfile={palestraUserProfile}
        lastMatch={palestraLastMatch}
      />

      <style jsx>{`
        :global(body:has(.counter-page)) {
          background:
            radial-gradient(circle at 16% 8%, rgba(0, 212, 255, 0.22), transparent 28%),
            radial-gradient(circle at 86% 14%, rgba(124, 58, 237, 0.22), transparent 30%),
            radial-gradient(circle at 48% 96%, rgba(251, 191, 36, 0.13), transparent 32%),
            linear-gradient(135deg, #020510 0%, #061226 40%, #030712 100%) !important;
        }

        :global(body:has(.counter-page)::before),
        :global(body:has(.counter-page)::after) {
          opacity: 0 !important;
        }

        .counter-page {
          width: min(1180px, 100%);
          margin: 0 auto;
          position: relative;
          isolation: isolate;
        }

        .counter-page::before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: -1;
          background:
            linear-gradient(115deg, transparent 0 16%, rgba(0, 212, 255, 0.08) 16.3% 16.7%, transparent 17% 42%, rgba(124, 58, 237, 0.08) 42.2% 42.6%, transparent 43%),
            radial-gradient(circle at 12% 8%, rgba(0, 212, 255, 0.20), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(168, 85, 247, 0.20), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(52, 211, 153, 0.11), transparent 34%);
        }

        .counter-page::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.42;
          background-image:
            linear-gradient(rgba(0, 212, 255, 0.055) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.045) 1px, transparent 1px),
            radial-gradient(1px 1px at 16% 24%, rgba(255,255,255,0.85), transparent),
            radial-gradient(1px 1px at 74% 18%, rgba(0,212,255,0.9), transparent),
            radial-gradient(1.5px 1.5px at 82% 68%, rgba(251,191,36,0.75), transparent),
            radial-gradient(1px 1px at 32% 82%, rgba(255,255,255,0.75), transparent);
          background-size: 58px 58px, 58px 58px, 420px 420px, 520px 520px, 640px 640px, 480px 480px;
          mask-image: linear-gradient(180deg, black, rgba(0,0,0,0.85), transparent 94%);
          animation: counterArenaDrift 18s linear infinite;
        }

        .counter-page :global(.neon-card) {
          border: 1px solid rgba(0, 212, 255, 0.22) !important;
          border-radius: 22px !important;
          background:
            radial-gradient(circle at top right, rgba(0, 212, 255, 0.10), transparent 34%),
            linear-gradient(180deg, rgba(8, 12, 28, 0.94), rgba(5, 8, 20, 0.94)) !important;
          box-shadow:
            0 18px 46px rgba(0, 0, 0, 0.32),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04) !important;
          backdrop-filter: blur(16px);
        }

        .counter-page :global(.neon-card)::before {
          opacity: 0.32;
        }

        .counter-page :global(.neon-card[data-tour-id='tour-counter-extracted']) {
          border-color: rgba(34, 197, 94, 0.28) !important;
          background:
            radial-gradient(circle at top right, rgba(34, 197, 94, 0.14), transparent 34%),
            linear-gradient(180deg, rgba(6, 26, 24, 0.94), rgba(5, 8, 20, 0.94)) !important;
        }

        .counter-page :global(.neon-card[data-tour-id='tour-counter-result']) {
          border-color: rgba(0, 212, 255, 0.30) !important;
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.14), transparent 32%),
            radial-gradient(circle at bottom right, rgba(124, 58, 237, 0.10), transparent 34%),
            linear-gradient(180deg, rgba(5, 17, 34, 0.95), rgba(5, 8, 20, 0.95)) !important;
        }

        .counter-page :global(.neon-card[data-tour-id='tour-counter-postmatch']) {
          border-color: rgba(251, 191, 36, 0.28) !important;
          background:
            radial-gradient(circle at top right, rgba(251, 191, 36, 0.13), transparent 34%),
            linear-gradient(180deg, rgba(28, 21, 10, 0.92), rgba(5, 8, 20, 0.95)) !important;
        }

        .counter-back-button {
          min-height: 42px;
          min-width: 42px;
          padding: 0 13px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-shrink: 0;
          border: 1px solid rgba(0, 212, 255, 0.28);
          border-radius: 14px;
          color: #fff;
          background: rgba(0, 212, 255, 0.08);
          box-shadow: 0 0 18px rgba(0, 212, 255, 0.12);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .counter-back-button:hover {
          border-color: rgba(0, 212, 255, 0.48);
          background: rgba(0, 212, 255, 0.14);
        }

        @media (max-width: 640px) {
          .counter-page-header {
            margin-top: 4px;
            padding: 8px;
          }

          .counter-back-button {
            width: 44px;
            height: 44px;
            padding: 0;
            border-radius: 15px;
          }

          .counter-back-button span {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            white-space: nowrap;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(251, 191, 36, 0.5); box-shadow: 0 0 0 rgba(251, 191, 36, 0); }
          50% { border-color: rgba(251, 191, 36, 0.8); box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
        }

        @keyframes counterArenaDrift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-58px, -58px, 0); }
        }
        .upload-area {
          animation: pulse-border 2s infinite;
        }
        .upload-area:hover {
          animation: none;
        }

        .counter-upload-card,
        .counter-processing-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(0, 212, 255, 0.20);
          border-radius: 24px;
          background:
            radial-gradient(circle at top right, rgba(0, 212, 255, 0.16), transparent 34%),
            radial-gradient(circle at bottom left, rgba(255, 203, 5, 0.10), transparent 32%),
            linear-gradient(135deg, rgba(5, 10, 24, 0.96), rgba(8, 18, 34, 0.94));
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.30), 0 0 30px rgba(0, 212, 255, 0.10);
        }

        .counter-upload-card {
          padding: clamp(18px, 4vw, 26px);
          margin-bottom: 24px;
        }

        .counter-upload-head {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 20px;
        }

        .counter-kicker {
          width: fit-content;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding: 6px 10px;
          border-radius: 999px;
          color: #67e8f9;
          background: rgba(0, 212, 255, 0.10);
          border: 1px solid rgba(0, 212, 255, 0.22);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .counter-upload-head h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(24px, 5.5vw, 34px);
          line-height: 1.03;
          font-weight: 950;
        }

        .counter-upload-head p {
          max-width: 68ch;
          margin: 10px 0 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 14px;
          line-height: 1.6;
        }

        .counter-fluid-control {
          width: fit-content;
          max-width: 100%;
          margin-top: 16px;
          padding: 12px;
          border: 1px solid rgba(103, 232, 249, 0.20);
          border-radius: 16px;
          background: rgba(2, 12, 27, 0.58);
        }

        .counter-fluid-label {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 9px;
          color: rgba(255, 255, 255, 0.92);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.045em;
          text-transform: uppercase;
        }

        .counter-fluid-label svg {
          flex: 0 0 auto;
          color: #67e8f9;
        }

        .counter-fluid-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(76px, 1fr));
          gap: 7px;
        }

        .counter-fluid-option {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          color: rgba(255, 255, 255, 0.72);
          background: rgba(255, 255, 255, 0.05);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .counter-fluid-option:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(103, 232, 249, 0.42);
          color: #fff;
        }

        .counter-fluid-option.is-active {
          border-color: rgba(103, 232, 249, 0.72);
          color: #fff;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.24), rgba(34, 211, 238, 0.12));
          box-shadow: inset 0 0 0 1px rgba(103, 232, 249, 0.08), 0 0 16px rgba(0, 212, 255, 0.10);
        }

        .counter-fluid-option:focus-visible {
          outline: 2px solid #67e8f9;
          outline-offset: 2px;
        }

        .counter-fluid-option:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .counter-fluid-hint {
          display: block;
          max-width: 54ch;
          margin-top: 8px;
          color: rgba(255, 255, 255, 0.66);
          font-size: 12px;
          font-style: normal;
          line-height: 1.45;
        }

        .counter-upload-logo {
          position: relative;
          flex: 0 0 82px;
          width: 82px;
          height: 82px;
          display: grid;
          place-items: center;
          border-radius: 24px;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.16), rgba(138, 43, 226, 0.08) 58%, transparent 76%);
        }

        .counter-upload-logo span {
          position: absolute;
          inset: 8px;
          border-radius: 20px;
          border: 1px dashed rgba(255, 255, 255, 0.22);
          animation: counterBrandOrbit 4.2s linear infinite;
        }

        .counter-upload-logo img,
        .counter-processing-logo img {
          position: relative;
          z-index: 2;
          width: 64px;
          max-height: 64px;
          object-fit: contain;
          filter: drop-shadow(0 0 12px rgba(0, 212, 255, 0.52));
          animation: counterBrandInterference 1.2s steps(2, end) infinite;
        }

        .counter-upload-icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 16px;
          display: grid;
          place-items: center;
          border-radius: 20px;
          color: #06101f;
          background: linear-gradient(135deg, #ffcb05, #f97316);
          box-shadow: 0 0 24px rgba(255, 203, 5, 0.26);
        }

        .counter-cta-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .counter-primary-cta,
        .counter-secondary-cta {
          min-height: 50px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
        }

        .counter-primary-cta {
          border: none;
          color: #06101f;
          background: linear-gradient(135deg, #00d4ff, #67e8f9);
          box-shadow: 0 0 22px rgba(0, 212, 255, 0.22);
        }

        .counter-secondary-cta {
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #fff;
          background: rgba(255, 255, 255, 0.07);
        }

        .counter-primary-cta:hover,
        .counter-secondary-cta:hover {
          transform: translateY(-1px);
        }

        .counter-primary-cta:disabled,
        .counter-secondary-cta:disabled {
          cursor: not-allowed;
          opacity: 0.62;
          transform: none;
        }

        .counter-inline-processing {
          flex: 1;
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #ffcb05;
          font-weight: 800;
        }

        .counter-processing-card {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: clamp(16px, 4vw, 22px);
          margin-bottom: 24px;
        }

        .counter-processing-logo {
          position: relative;
          width: 116px;
          height: 116px;
          flex: 0 0 116px;
          display: grid;
          place-items: center;
          border-radius: 30px;
          background: radial-gradient(circle, rgba(0, 212, 255, 0.16), rgba(138, 43, 226, 0.08) 58%, transparent 76%);
        }

        .counter-logo-orbit {
          position: absolute;
          inset: 8px;
          border-radius: 26px;
          border: 1px dashed rgba(255, 255, 255, 0.22);
          animation: counterBrandOrbit 3.8s linear infinite;
        }

        .counter-logo-scan {
          position: absolute;
          z-index: 3;
          left: 16px;
          right: 16px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.95), transparent);
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.72);
          animation: counterBrandScan 1.35s ease-in-out infinite;
        }

        .counter-processing-copy span {
          display: inline-flex;
          margin-bottom: 7px;
          color: #67e8f9;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .counter-processing-copy strong {
          display: block;
          color: #fff;
          font-size: clamp(18px, 4vw, 24px);
          line-height: 1.12;
        }

        .counter-processing-copy p {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.55;
          font-size: 14px;
        }

        .counter-processing-steps {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 13px;
        }

        .counter-processing-steps em {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 10px;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.88);
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(255, 255, 255, 0.10);
          font-size: 12px;
          font-style: normal;
          font-weight: 800;
        }

        @keyframes counterBrandOrbit {
          to { transform: rotate(360deg); }
        }

        @keyframes counterBrandScan {
          0% { top: 16px; opacity: 0; }
          20%, 78% { opacity: 1; }
          100% { top: calc(100% - 18px); opacity: 0; }
        }

        @keyframes counterBrandInterference {
          0%, 100% { transform: translate(0, 0) skewX(0deg); opacity: 1; }
          12% { transform: translate(-1px, 1px) skewX(-1deg); }
          20% { transform: translate(1px, -1px) skewX(1deg); filter: drop-shadow(2px 0 rgba(255, 0, 102, 0.26)) drop-shadow(-2px 0 rgba(0, 212, 255, 0.44)); }
          44% { transform: translate(0, 0); }
          62% { transform: translate(-1px, 0) skewX(0.6deg); }
        }

        @media (max-width: 720px) {
          .counter-upload-head,
          .counter-processing-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .counter-upload-logo {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
          }

          .counter-cta-row {
            grid-template-columns: 1fr;
          }

          .counter-fluid-control {
            width: 100%;
            box-sizing: border-box;
          }

          .counter-processing-logo {
            width: 94px;
            height: 94px;
            flex-basis: 94px;
          }
        }
      `}</style>
    </main>
  )
}
