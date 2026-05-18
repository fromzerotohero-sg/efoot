'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { withAuth } from '@/components/AuthWrapper'
import { supabase } from '@/lib/supabaseClient'
import { getPositionRoleTranslationKey, useTranslation } from '@/lib/i18n'
import ConfirmModal from '@/components/ConfirmModal'
import TacticalSettingsPanel from '@/components/TacticalSettingsPanel'
import PositionSelectionModal from '@/components/PositionSelectionModal'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import { PHOTO_TYPE_KEYS, getPhotoTypeConfig } from '@/lib/playerPhotoTypes'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'
import { getImageOptimizeUserMessage } from '@/lib/imageOptimizeUserMessage'
import { getFormationNameFromSlotPositions } from '@/lib/validateFormationLimits'
import {
  isBuildMacroBlockedForPlayer,
  nestedBaselineStatsFromGameplayPreview,
  nestedEffectiveStatsFromGameplayPreview,
  pickBilingualList,
  previewGameplayBuildFromSliders,
  buildPlayerForPlayProfilePreview,
  sanitizeSliders as sanitizeBuildCoachSliders,
  setBuildSliderTicks,
  tryApplyBuildSliderDelta
} from '@/lib/gameplayBuildCoach'
import { MAX_TACCE_PER_MACRO } from '@/lib/efootballProgressionCost'
import { PLAYER_SKILL_PRESETS, getSkillDisplayLabel, normalizePlayerSkillsArray, normalizeSkillKey } from '@/lib/playerSkillLabels'
import { resolvePlayerCardImageUrl } from '@/lib/playerCardImage'
import { resolvePlayingStyleDbName } from '@/lib/playingStyleResolve'
import {
  buildCatalogPlayerSavePayload,
  buildPhotoPlayerSavePayload,
  resolveOriginalPositionsFromCatalogCard
} from '@/lib/playerSavePayload'
import { getPlayerDisplayStats, getPlayerDisplayOverall } from '@/lib/playerEffectiveStats'
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronRight,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  X
} from 'lucide-react'

function ModalPortal({ children }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function toKey(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function getSlotCompatibility(slotPosition = '', cardPosition = '') {
  const slot = String(slotPosition || '').toUpperCase().trim()
  const card = String(cardPosition || '').toUpperCase().trim()
  const map = {
    PT: ['PT'],
    DC: ['DC', 'TD', 'TS', 'MED'],
    TD: ['TD', 'DC', 'TS', 'CLD', 'EDA'],
    TS: ['TS', 'DC', 'TD', 'CLS', 'ESA'],
    MED: ['MED', 'CC', 'DC', 'TRQ'],
    CC: ['CC', 'MED', 'TRQ', 'CLS', 'CLD'],
    TRQ: ['TRQ', 'CC', 'SP', 'ESA', 'EDA', 'CLS', 'CLD'],
    CLS: ['CLS', 'ESA', 'TRQ', 'CC', 'SP'],
    CLD: ['CLD', 'EDA', 'TRQ', 'CC', 'SP'],
    ESA: ['ESA', 'CLS', 'SP', 'TRQ', 'EDA'],
    EDA: ['EDA', 'CLD', 'SP', 'TRQ', 'ESA'],
    SP: ['SP', 'P', 'TRQ', 'ESA', 'EDA'],
    P: ['P', 'SP', 'TRQ', 'ESA', 'EDA']
  }

  if (!slot || !card) return 'unknown'
  if (slot === card) return 'perfect'
  if ((map[slot] || []).includes(card)) return 'adaptable'
  return 'out_of_role'
}

function compatibilityLabel(compatibility, lang) {
  if (compatibility === 'perfect') return lang === 'en' ? 'Perfect fit' : 'Fit perfetto'
  if (compatibility === 'adaptable') return lang === 'en' ? 'Adaptable' : 'Adattabile'
  if (compatibility === 'out_of_role') return lang === 'en' ? 'Out of role' : 'Fuori ruolo'
  return lang === 'en' ? 'Unknown' : 'Non definito'
}

function buildPlayerPayloadFromCatalog(card, slotIndex = null, { originalPositions = null, fieldPosition = null } = {}) {
  const payload = card?.players_payload && typeof card.players_payload === 'object'
    ? card.players_payload
    : {}
  const resolvedBoosters = resolveCatalogAvailableBoosters(payload, card)
  return buildCatalogPlayerSavePayload(card, {
    slotIndex,
    originalPositions,
    fieldPosition,
    availableBoosters: resolvedBoosters.boosters,
    metadataExtra: resolvedBoosters.usedCatalogDefaults ? { catalog_booster_reminder: true } : {}
  })
}

function buildCoachPayloadFromCatalog(coach) {
  const payload = coach?.coach_payload && typeof coach.coach_payload === 'object'
    ? coach.coach_payload
    : {}

  const category = getCoachDisplayCategory(payload.category || coach?.category) || 'Allenatore catalogo'

  return {
    ...payload,
    coach_name: payload.coach_name || coach?.coach_name,
    category,
    pack_type: payload.pack_type || coach?.pack_type || 'Special',
    playing_style_competence: payload.playing_style_competence || coach?.playing_style_competence || {},
    stat_boosters: Array.isArray(payload.stat_boosters)
      ? payload.stat_boosters
      : Array.isArray(coach?.stat_boosters)
        ? coach.stat_boosters
        : [],
    connection: payload.connection || coach?.connection || null,
    photo_slots: payload.photo_slots || {
      catalog_card: coach?.source_card_image_url || null
    },
    source_catalog: payload.source_catalog || {
      catalog: 'coach_catalog',
      catalog_id: coach?.id || null,
      source: coach?.source || 'efhub',
      source_coach_id: coach?.source_coach_id || null,
      source_card_image_url: coach?.source_card_image_url || null
    }
  }
}

function getCoachDisplayCategory(category) {
  const value = String(category || '').trim()
  if (!value) return null
  return /efhub/i.test(value) ? 'Allenatore catalogo' : value
}

function getCoachCardImage(coach) {
  return coach?.source_card_image_url ||
    coach?.photo_slots?.catalog_card ||
    coach?.photo_slots?.main_url ||
    coach?.extracted_data?.source_catalog?.source_card_image_url ||
    null
}

function getBestCoachPlaystyle(coach) {
  const entries = Object.entries(coach?.playing_style_competence || {})
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value))
    .sort((left, right) => right[1] - left[1])
  return entries[0] || null
}

function mergeCoachPhotoData(currentCoach, nextCoach) {
  if (!currentCoach) return nextCoach
  if (!nextCoach) return currentCoach

  const merged = { ...currentCoach }
  Object.entries(nextCoach).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    merged[key] = value
  })

  return {
    ...merged,
    coach_name: nextCoach.coach_name || currentCoach.coach_name,
    age: nextCoach.age ?? currentCoach.age,
    nationality: nextCoach.nationality || currentCoach.nationality,
    team: nextCoach.team || currentCoach.team,
    category: nextCoach.category || currentCoach.category,
    pack_type: nextCoach.pack_type || currentCoach.pack_type,
    training_affinity_description: nextCoach.training_affinity_description || currentCoach.training_affinity_description,
    connection: nextCoach.connection || currentCoach.connection,
    playing_style_competence: {
      ...(currentCoach.playing_style_competence || {}),
      ...(nextCoach.playing_style_competence || {})
    },
    stat_boosters: [
      ...(currentCoach.stat_boosters || []),
      ...(nextCoach.stat_boosters || [])
    ]
  }
}

function formatCoachLabel(key, t) {
  return t(key) || String(key || '').replace(/_/g, ' ')
}

function buildInitialPositionsFromCatalogCard(card) {
  return resolveOriginalPositionsFromCatalogCard(card)
}

function buildInitialPositionsFromPlayer(player) {
  if (Array.isArray(player?.original_positions) && player.original_positions.length > 0) {
    return player.original_positions
      .map((entry) => {
        const position = typeof entry === 'string' ? entry : entry?.position
        if (!position) return null
        return {
          position,
          competence: typeof entry === 'object' && entry?.competence ? entry.competence : 'Alta'
        }
      })
      .filter(Boolean)
  }
  return player?.position ? [{ position: player.position, competence: 'Alta' }] : []
}

function hasPlayerStats(player) {
  return Boolean(player?.base_stats && Object.keys(player.base_stats || {}).length > 0)
}

function hasPlayerSkills(player) {
  return Boolean(
    (Array.isArray(player?.skills) && player.skills.length > 0) ||
    (Array.isArray(player?.com_skills) && player.com_skills.length > 0)
  )
}

function hasPlayerBoosters(player) {
  return Boolean(
    (Array.isArray(player?.available_boosters) && player.available_boosters.length > 0) ||
    (Array.isArray(player?.boosters) && player.boosters.length > 0)
  )
}

function getPhotoProfileCompletion(player, lang = 'it') {
  const statsReady = hasPlayerStats(player)
  const skillsReady = hasPlayerSkills(player)
  const boostersReady = hasPlayerBoosters(player)
  const sections = [
    { key: 'stats', ready: statsReady, label: lang === 'en' ? 'stats' : 'statistiche' },
    { key: 'skills', ready: skillsReady, label: lang === 'en' ? 'skills' : 'abilita' },
    { key: 'boosters', ready: boostersReady, label: 'booster' }
  ]
  const missing = sections.filter((section) => !section.ready)
  return {
    statsReady,
    skillsReady,
    boostersReady,
    completedCount: sections.length - missing.length,
    missing,
    isComplete: missing.length === 0
  }
}

function isSameExtractedPlayer(existingPlayer, extractedPlayer) {
  const existingName = String(existingPlayer?.player_name || '').trim().toLowerCase()
  const extractedName = String(extractedPlayer?.player_name || '').trim().toLowerCase()
  const existingAge = existingPlayer?.age != null ? Number(existingPlayer.age) : null
  const extractedAge = extractedPlayer?.age != null ? Number(extractedPlayer.age) : null
  if (existingName && extractedName && existingAge && extractedAge) {
    return existingName === extractedName && existingAge === extractedAge
  }
  return Boolean(existingName && extractedName && existingName === extractedName)
}

function findCatalogDuplicatePlayer(card, players = []) {
  if (!card) return null
  const sourcePlayerId = String(card.source_player_id || card.sourcePlayerId || '').trim()
  const cardInstanceKey = String(card.card_instance_key || '').trim()
  const identityKey = String(card.player_identity_key || '').trim()
  const cardName = String(card.player_name || card.name || '').trim().toLowerCase()
  const cardAge = card?.players_payload?.age != null ? Number(card.players_payload.age) : (card?.age != null ? Number(card.age) : null)

  return (Array.isArray(players) ? players : []).find((player) => {
    const metadata = player?.metadata || {}
    const playerInstanceKey = String(metadata.catalog_card_instance_key || '').trim()
    if (cardInstanceKey && playerInstanceKey && cardInstanceKey === playerInstanceKey) return true

    const playerIdentityKey = String(metadata.catalog_player_identity_key || '').trim()
    if (identityKey && playerIdentityKey && identityKey === playerIdentityKey) return true

    const playerSourceId = String(
      metadata.catalog_source_player_id ||
      metadata.source_player_id ||
      metadata.sourcePlayerId ||
      player?.source_player_id ||
      ''
    ).trim()
    if (sourcePlayerId && playerSourceId && sourcePlayerId === playerSourceId) return true

    const playerName = String(player?.player_name || '').trim().toLowerCase()
    const playerAge = player?.age != null ? Number(player.age) : null
    if (cardName && playerName && cardAge && playerAge) return cardName === playerName && cardAge === playerAge
    return Boolean(cardName && playerName && cardName === playerName)
  }) || null
}

function getPlayerInitials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}

function getShortPlayerName(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '-'
  const lastName = parts[parts.length - 1]
  return lastName.length > 10 ? `${lastName.slice(0, 9)}.` : lastName
}

const BUILD_SLIDER_ORDER = [
  'shooting',
  'passing',
  'dribbling',
  'dexterity',
  'lowerBodyStrength',
  'aerialStrength',
  'defending',
  'gk1',
  'gk2',
  'gk3'
]

const BUILD_SLIDER_LABELS = {
  shooting: { it: 'Tiro', en: 'Shooting' },
  passing: { it: 'Passaggio', en: 'Passing' },
  dribbling: { it: 'Dribbling', en: 'Dribbling' },
  dexterity: { it: 'Destrezza', en: 'Dexterity' },
  lowerBodyStrength: { it: 'Forza arti inferiori', en: 'Lower body' },
  aerialStrength: { it: 'Forza in aria', en: 'Aerial strength' },
  defending: { it: 'Difesa', en: 'Defending' },
  gk1: { it: 'PT 1', en: 'GK 1' },
  gk2: { it: 'PT 2', en: 'GK 2' },
  gk3: { it: 'PT 3', en: 'GK 3' }
}

function getPlayerBuildCoachData(player) {
  const meta = player?.metadata?.build_coach
  const dev = player?.development_points?.build_coach
  if (!meta && !dev) return null
  return { ...(dev || {}), ...(meta || {}) }
}

function rosterFormationOvr(player, slot = null, activeCoach = null, tacticalSettings = null) {
  const resolved = getPlayerDisplayOverall(player, {
    slotPosition: slot?.position ?? null,
    coach: activeCoach,
    teamStyle: tacticalSettings?.team_playing_style ?? null,
    context: 'field'
  })
  if (resolved != null) return resolved
  return player?.overall_rating ?? '-'
}

function getBuildSliderLabel(key, lang) {
  const label = BUILD_SLIDER_LABELS[key]
  return label ? (lang === 'en' ? label.en : label.it) : key
}

function getTokenFallback() {
  return localStorage.getItem('auth_token')
}

function showConfirmConfig({
  title,
  message,
  details,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'primary',
  variant = 'warning',
  presentation = 'sheet'
}) {
  return {
    show: true,
    title,
    message,
    details,
    variant,
    confirmLabel,
    cancelLabel,
    confirmVariant,
    presentation
  }
}

function EnterpriseModalFrame({ show, onClose, title, subtitle, children, className = '' }) {
  if (!show) return null

  return (
    <ModalPortal>
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className={`nr-modal-shell ${className}`.trim()} onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            {subtitle ? <span className="nr-mini-kicker">{subtitle}</span> : null}
            <h2>{title}</h2>
          </div>
          <button type="button" className="nr-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
    </ModalPortal>
  )
}

function EnterpriseSection({ title, children, actions = null }) {
  return (
    <section className="nr-section-card">
      <div className="nr-section-head">
        <h3>{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  )
}

function EnterpriseInput({ label, value, onChange, placeholder = '', type = 'text', onKeyDown }) {
  return (
    <label className="nr-form-field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </label>
  )
}

function getStatToneClass(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 'neutral'
  if (num >= 85) return 'elite'
  if (num >= 75) return 'good'
  if (num >= 65) return 'ok'
  return 'low'
}

function CompactStatInput({ label, value, onChange }) {
  const toneClass = getStatToneClass(value)
  const numericValue = Number(value)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  const adjustValue = (delta) => {
    const nextValue = Math.max(0, Math.min(99, safeValue + delta))
    onChange(String(nextValue))
  }

  return (
    <div className="nr-stat-compact-row">
      <span className="nr-stat-compact-label">{label}</span>
      <div className={`nr-stat-stepper tone-${toneClass}`}>
        <button type="button" onClick={() => adjustValue(-1)} aria-label={`Decrease ${label}`}>
          -
        </button>
        <input
          type="number"
          min="0"
          max="99"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="nr-stat-compact-input"
        />
        <button type="button" onClick={() => adjustValue(1)} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  )
}

const FIELD_SLOT_DRAG_THRESHOLD_PX = 10

function SlotPlayerCard({
  player,
  slot,
  onClick,
  onRemove,
  lang,
  isEditMode = false,
  onPositionChange,
  activeCoach = null,
  tacticalSettings = null
}) {
  const [dragging, setDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const suppressClickForFieldDragRef = React.useRef(false)
  /** After opening from pointer release (edit mode), skip one synthetic click to avoid double-open on desktop */
  const skipNextSyntheticCardClickRef = React.useRef(false)
  const slotThumb = React.useMemo(() => resolvePlayerCardImageUrl(player), [player])
  const roleLabel = isEditMode ? (slot.position || player.position || '-') : (player.position || slot.position || '-')
  const rosterPosition = String(player?.position || roleLabel || '').trim().toUpperCase()
  const overallLabel = rosterFormationOvr(player, slot, activeCoach, tacticalSettings)
  const initialsLabel = getPlayerInitials(player.player_name)

  React.useEffect(() => {
    if (!isEditMode) suppressClickForFieldDragRef.current = false
  }, [isEditMode])

  const handlePointerStart = (event) => {
    if (!isEditMode || !player) return
    if (event.target instanceof HTMLElement && event.target.closest('.nr-slot-remove')) return
    event.stopPropagation()
    suppressClickForFieldDragRef.current = false
    const isTouch = event.type.startsWith('touch')
    const container = event.currentTarget.closest('[data-field-container]')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = isTouch ? event.touches[0].clientX : event.clientX
    const startY = isTouch ? event.touches[0].clientY : event.clientY
    const startSlotX = Number(slot.x)
    const startSlotY = Number(slot.y)
    let lastPosition = { x: startSlotX, y: startSlotY }
    setDragging(true)

    const onMove = (moveEvent) => {
      const moveIsTouch = moveEvent.type.startsWith('touch')
      const currentX = moveIsTouch ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = moveIsTouch ? moveEvent.touches[0].clientY : moveEvent.clientY
      const deltaX = currentX - startX
      const deltaY = currentY - startY
      if (deltaX * deltaX + deltaY * deltaY > FIELD_SLOT_DRAG_THRESHOLD_PX * FIELD_SLOT_DRAG_THRESHOLD_PX) {
        suppressClickForFieldDragRef.current = true
      }
      let nextX = clampPercent(startSlotX + ((currentX - startX) / rect.width) * 100)
      let nextY = clampPercent(startSlotY + ((currentY - startY) / rect.height) * 100)
      if (slot.slot_index === 0) {
        const clamped = clampPointerForGkSlot(nextX, nextY)
        nextX = clamped.x
        nextY = clamped.y
      }
      lastPosition = { x: nextX, y: nextY }
      setDragOffset({ x: deltaX, y: deltaY })
      if (moveIsTouch) moveEvent.preventDefault()
    }

    const onEnd = () => {
      const hadRealDrag = suppressClickForFieldDragRef.current
      setDragging(false)
      setDragOffset({ x: 0, y: 0 })
      if (hadRealDrag) {
        onPositionChange?.(slot.slot_index, lastPosition)
      } else if (isEditMode) {
        /*
         * With `.is-draggable` we use touch-action:none for dragging. Mobile browsers often omit the
         * synthetic click, so rely on gesture end — and skip one duplicate click on desktop (same tap).
         */
        skipNextSyntheticCardClickRef.current = true
        onClick(player, slot)
      }
      if (isTouch) {
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
      } else {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onEnd)
      }
    }

    if (isTouch) {
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    } else {
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onEnd)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`nr-slot-filled ${slotThumb ? 'has-photo-card' : ''} ${isEditMode ? 'is-draggable' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={dragging ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` } : undefined}
      onClick={() => {
        if (skipNextSyntheticCardClickRef.current) {
          skipNextSyntheticCardClickRef.current = false
          return
        }
        if (suppressClickForFieldDragRef.current) {
          suppressClickForFieldDragRef.current = false
          return
        }
        onClick(player, slot)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (suppressClickForFieldDragRef.current) {
            suppressClickForFieldDragRef.current = false
            return
          }
          if (skipNextSyntheticCardClickRef.current) {
            skipNextSyntheticCardClickRef.current = false
            return
          }
          onClick(player, slot)
        }
      }}
      onMouseDown={isEditMode ? handlePointerStart : undefined}
      onTouchStart={isEditMode ? handlePointerStart : undefined}
    >
      <div className="nr-slot-top-badge">
        <strong>{overallLabel}</strong>
        <span>{roleLabel}</span>
      </div>
      <div className={`nr-slot-filled-main ${slotThumb ? 'has-photo' : 'has-initials'}`}>
        <div className="nr-slot-avatar-mini">
          {slotThumb ? (
            <img
              src={slotThumb}
              alt={player.player_name || 'player'}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <span className="nr-player-initials">{getPlayerInitials(player.player_name)}</span>
          )}
        </div>
        <span className="nr-slot-name-chip">
          <span className="nr-slot-name-initials">{initialsLabel}</span>
          <span>{getShortPlayerName(player.player_name)}</span>
        </span>
      </div>
      {typeof onRemove === 'function' && (
        <span
          role="button"
          aria-label={lang === 'en' ? 'Remove from slot' : 'Rimuovi dallo slot'}
          title={lang === 'en' ? 'Remove from slot' : 'Rimuovi dallo slot'}
          className="nr-slot-remove"
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            onRemove(player.id, player)
          }}
        >
          <X size={14} />
        </span>
      )}
    </div>
  )
}

function SlotEmptyCard({ slot, onEmptyClick, isEditMode = false, onPositionChange }) {
  const [dragging, setDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const suppressClickForFieldDragRef = React.useRef(false)
  const skipNextSyntheticClickRef = React.useRef(false)

  React.useEffect(() => {
    if (!isEditMode) suppressClickForFieldDragRef.current = false
  }, [isEditMode])

  const handlePointerStart = (event) => {
    if (!isEditMode) return
    event.stopPropagation()
    suppressClickForFieldDragRef.current = false
    const isTouch = event.type.startsWith('touch')
    const container = event.currentTarget.closest('[data-field-container]')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const startX = isTouch ? event.touches[0].clientX : event.clientX
    const startY = isTouch ? event.touches[0].clientY : event.clientY
    const startSlotX = Number(slot.x)
    const startSlotY = Number(slot.y)
    let lastPosition = { x: startSlotX, y: startSlotY }
    setDragging(true)

    const onMove = (moveEvent) => {
      const moveIsTouch = moveEvent.type.startsWith('touch')
      const currentX = moveIsTouch ? moveEvent.touches[0].clientX : moveEvent.clientX
      const currentY = moveIsTouch ? moveEvent.touches[0].clientY : moveEvent.clientY
      const deltaX = currentX - startX
      const deltaY = currentY - startY
      if (deltaX * deltaX + deltaY * deltaY > FIELD_SLOT_DRAG_THRESHOLD_PX * FIELD_SLOT_DRAG_THRESHOLD_PX) {
        suppressClickForFieldDragRef.current = true
      }
      let nextX = clampPercent(startSlotX + ((currentX - startX) / rect.width) * 100)
      let nextY = clampPercent(startSlotY + ((currentY - startY) / rect.height) * 100)
      if (slot.slot_index === 0) {
        const clamped = clampPointerForGkSlot(nextX, nextY)
        nextX = clamped.x
        nextY = clamped.y
      }
      lastPosition = { x: nextX, y: nextY }
      setDragOffset({ x: deltaX, y: deltaY })
      if (moveIsTouch) moveEvent.preventDefault()
    }

    const onEnd = () => {
      const hadRealDrag = suppressClickForFieldDragRef.current
      setDragging(false)
      setDragOffset({ x: 0, y: 0 })
      if (hadRealDrag) {
        onPositionChange?.(slot.slot_index, lastPosition)
      } else if (isEditMode) {
        skipNextSyntheticClickRef.current = true
        onEmptyClick(slot)
      }
      if (isTouch) {
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchend', onEnd)
      } else {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onEnd)
      }
    }

    if (isTouch) {
      document.addEventListener('touchmove', onMove, { passive: false })
      document.addEventListener('touchend', onEnd)
    } else {
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onEnd)
    }
  }

  return (
    <button
      type="button"
      className={`nr-slot-empty ${isEditMode ? 'is-draggable' : ''} ${dragging ? 'is-dragging' : ''}`}
      style={dragging ? { transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` } : undefined}
      onClick={() => {
        if (skipNextSyntheticClickRef.current) {
          skipNextSyntheticClickRef.current = false
          return
        }
        if (suppressClickForFieldDragRef.current) {
          suppressClickForFieldDragRef.current = false
          return
        }
        if (!isEditMode) onEmptyClick(slot)
      }}
      onMouseDown={isEditMode ? handlePointerStart : undefined}
      onTouchStart={isEditMode ? handlePointerStart : undefined}
    >
      <Plus size={18} />
      <span>{slot.position || '?'}</span>
    </button>
  )
}

function SlotCard({
  slot,
  player,
  onEmptyClick,
  onPlayerClick,
  onRemove,
  lang,
  isEditMode = false,
  onPositionChange,
  activeCoach = null,
  tacticalSettings = null
}) {
  return (
    <div className="nr-slot-card" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
      {player ? (
        <SlotPlayerCard
          player={player}
          slot={slot}
          onClick={onPlayerClick}
          onRemove={onRemove}
          lang={lang}
          isEditMode={isEditMode}
          onPositionChange={onPositionChange}
          activeCoach={activeCoach}
          tacticalSettings={tacticalSettings}
        />
      ) : (
        <SlotEmptyCard slot={slot} onEmptyClick={onEmptyClick} isEditMode={isEditMode} onPositionChange={onPositionChange} />
      )}
    </div>
  )
}

function CatalogCard({ card, lang, onSelect }) {
  return (
    <button
      type="button"
      className="nr-catalog-card"
      onClick={() => onSelect(card)}
    >
      <div className="nr-catalog-card-media">
        {card.source_card_front_url ? (
          <img src={card.source_card_front_url} alt={card.player_name} />
        ) : (
          <div className="nr-slot-avatar-fallback"><User size={18} /></div>
        )}
      </div>
      <div className="nr-catalog-card-copy">
        <strong>{card.player_name}</strong>
        <p>{card.card_type} · {card.position} · {card.playing_style || '-'}</p>
        <div className="nr-catalog-card-meta">
          <span>OVR {card.overall_level_1 ?? card.overall_max_level ?? '-'}</span>
          <em>{lang === 'en' ? 'Free catalog' : 'Catalogo libero'}</em>
        </div>
      </div>
      <ChevronRight size={16} />
    </button>
  )
}

function CoachCatalogCard({ coach, lang, t, onSelect, disabled }) {
  const image = getCoachCardImage(coach)
  const bestPlaystyle = getBestCoachPlaystyle(coach)
  const boosterCount = Array.isArray(coach.stat_boosters) ? coach.stat_boosters.length : 0
  const category = getCoachDisplayCategory(coach.category)

  return (
    <button
      type="button"
      className="nr-catalog-card nr-coach-catalog-card"
      onClick={() => onSelect(coach)}
      disabled={disabled}
    >
      <div className="nr-catalog-card-media">
        {image ? (
          <img src={image} alt={coach.coach_name} />
        ) : (
          <div className="nr-slot-avatar-fallback"><User size={18} /></div>
        )}
      </div>
      <div className="nr-catalog-card-copy">
        <strong>{coach.coach_name}</strong>
        <p>{category || (lang === 'en' ? 'Coach catalog' : 'Catalogo allenatori')} · {coach.pack_type || 'Special'}</p>
        <div className="nr-catalog-card-meta">
          <span>
            {bestPlaystyle
              ? `${t(bestPlaystyle[0]) || bestPlaystyle[0].replace(/_/g, ' ')} ${bestPlaystyle[1]}`
              : (lang === 'en' ? 'Tactics ready' : 'Tattiche pronte')}
          </span>
          <em>{boosterCount > 0 ? `${boosterCount} booster` : (lang === 'en' ? 'No booster' : 'Nessun booster')}</em>
        </div>
      </div>
      {disabled ? <RefreshCw size={16} className="nr-spin" /> : <ChevronRight size={16} />}
    </button>
  )
}

function CoachCatalogModal({
  show,
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  loading,
  saving,
  results,
  total,
  activePlaystyle,
  onClose,
  onSelectCoach,
  onUploadFallback,
  lang,
  t
}) {
  if (!show) return null

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!saving) onClose()
      }}
      title={lang === 'en' ? 'Choose coach from catalog' : 'Scegli allenatore da catalogo'}
      subtitle={lang === 'en' ? 'Coach catalog' : 'Catalogo allenatori'}
      className="nr-picker-shell nr-coach-picker-shell"
    >
      <div className="nr-picker-toolbar">
        <div className="nr-picker-search-actions">
          <label className="nr-search-input">
            <Search size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={lang === 'en' ? 'Search coach name' : 'Cerca nome allenatore'}
              disabled={saving}
            />
          </label>
          <button type="button" className="nr-secondary-button nr-upload-inline-button" onClick={onUploadFallback} disabled={saving}>
            <Upload size={14} />
            {lang === 'en' ? 'Upload photos' : 'Carica le foto'}
          </button>
        </div>
        <div className="nr-catalog-meta">
          <span>
            {total > 0
              ? (lang === 'en' ? `${results.length} of ${total} coaches` : `${results.length} di ${total} allenatori`)
              : (lang === 'en' ? 'No coaches loaded yet' : 'Nessun allenatore caricato')}
          </span>
          <label>
            {lang === 'en' ? 'Sort' : 'Ordina'}
            <select value={sort} onChange={(event) => onSortChange(event.target.value)} disabled={saving}>
              <option value="name_asc">{lang === 'en' ? 'Name A-Z' : 'Nome A-Z'}</option>
              <option value="best_playstyle" disabled={!activePlaystyle}>
                {lang === 'en' ? 'Best for team style' : 'Migliore per stile squadra'}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div className="nr-picker-body single">
        <div className="nr-picker-results">
          <section>
            <div className="nr-section-head">
              <div>
                <h3>{lang === 'en' ? 'Catalog coaches' : 'Allenatori catalogo'}</h3>
                {activePlaystyle ? (
                  <p>
                    {lang === 'en'
                      ? `Sorted against current team style: ${t(activePlaystyle) || activePlaystyle.replace(/_/g, ' ')}.`
                      : `Ordinabile sullo stile squadra attuale: ${t(activePlaystyle) || activePlaystyle.replace(/_/g, ' ')}.`}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="nr-catalog-list">
              {loading ? (
                <div className="nr-empty-state">{lang === 'en' ? 'Loading...' : 'Caricamento...'}</div>
              ) : results.length > 0 ? (
                results.map((coach) => (
                  <CoachCatalogCard
                    key={coach.id}
                    coach={coach}
                    lang={lang}
                    t={t}
                    onSelect={onSelectCoach}
                    disabled={saving}
                  />
                ))
              ) : (
                <div className="nr-empty-state">
                  {lang === 'en'
                    ? 'No coaches found. If your coach is missing, use Upload photos next to search.'
                    : 'Nessun allenatore trovato. Se manca il tuo allenatore, usa Carica le foto accanto alla ricerca.'}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function CoachPhotoUploadModal({
  show,
  images,
  onImagesChange,
  onUpload,
  onClose,
  uploading,
  onOptimizeError,
  lang,
  t
}) {
  if (!show) return null

  const imageTypes = [
    {
      key: 'main',
      label: lang === 'en' ? 'Coach card' : 'Carta allenatore',
      description: lang === 'en' ? 'Main screenshot with name and tactical skills.' : 'Schermata principale con nome e abilita tattiche.',
      required: true
    },
    {
      key: 'connection',
      label: lang === 'en' ? 'Connection / booster' : 'Collegamento / booster',
      description: lang === 'en' ? 'Optional second screenshot for connection or booster details.' : 'Seconda schermata opzionale per collegamento o booster.',
      required: false
    }
  ]
  const getImageForType = (type) => images.find((img) => img.type === type)
  const removeImage = (type) => onImagesChange(images.filter((img) => img.type !== type))

  const handleFileSelect = async (event, preferredType = null) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type?.startsWith('image/'))
    if (files.length === 0) return

    try {
      let nextImages = [...images]
      for (const file of files) {
        if (nextImages.length >= 2) break
        const optimized = await optimizeImageFile(file)
        const type = preferredType && !nextImages.some((img) => img.type === preferredType)
          ? preferredType
          : nextImages.some((img) => img.type === 'main')
            ? 'connection'
            : 'main'
        const nextImage = { file, dataUrl: optimized.dataUrl, type, name: file.name, id: Date.now() + nextImages.length }
        const existingIndex = nextImages.findIndex((img) => img.type === type)
        if (existingIndex >= 0) {
          nextImages[existingIndex] = nextImage
        } else {
          nextImages = [...nextImages, nextImage]
        }
      }
      onImagesChange(nextImages.slice(0, 2))
    } catch (err) {
      const message = getImageOptimizeUserMessage(err, t)
      if (onOptimizeError) onOptimizeError(message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!uploading) onClose()
      }}
      title={lang === 'en' ? 'Add coach from photo' : 'Aggiungi allenatore da foto'}
      subtitle={lang === 'en' ? 'Coach photo extraction' : 'Estrazione foto coach'}
      className="nr-photo-upload-shell"
    >
      <div className="nr-photo-upload-body">
        <div className="nr-photo-upload-intro">
          <Sparkles size={18} />
          <span>
            {lang === 'en'
              ? 'Upload the coach screenshots. We will save the extracted coach in your personal coaches and set him active.'
              : 'Carica le schermate allenatore. Salviamo il coach estratto nei tuoi allenatori personali e lo impostiamo attivo.'}
          </span>
        </div>

        <div className="nr-photo-step-row">
          {imageTypes.map((type, index) => {
            const image = getImageForType(type.key)
            return (
              <div key={type.key} className={`nr-photo-step ${uploading && image ? 'extracting' : image ? 'selected' : ''}`}>
                <span>{uploading && image ? <RefreshCw size={14} className="nr-spin" /> : image ? <Upload size={13} /> : index + 1}</span>
                <small>
                  <strong>{type.label}</strong>
                  <em>{image ? (lang === 'en' ? 'Selected' : 'Selezionata') : type.required ? (lang === 'en' ? 'Needed' : 'Necessaria') : (lang === 'en' ? 'Optional' : 'Opzionale')}</em>
                </small>
              </div>
            )
          })}
        </div>

        <div className="nr-photo-upload-grid nr-coach-photo-grid">
          {imageTypes.map(({ key, label, description, required }) => {
            const image = getImageForType(key)
            return (
              <section key={key} className="nr-photo-upload-card">
                <div className="nr-photo-card-head">
                  <div>
                    <strong>{label}</strong>
                    <p>{description}</p>
                  </div>
                  <span>{required ? (lang === 'en' ? 'Needed' : 'Necessaria') : (lang === 'en' ? 'Optional' : 'Opzionale')}</span>
                </div>

                {image ? (
                  <div className="nr-photo-preview">
                    <img src={image.dataUrl} alt={label} />
                    <div>
                      <span>
                        {image.name || (lang === 'en' ? 'Selected photo' : 'Foto selezionata')}
                        <small>{lang === 'en' ? 'Will be extracted when you confirm.' : 'Sara estratta quando confermi.'}</small>
                      </span>
                      <button type="button" className="nr-secondary-button" onClick={() => removeImage(key)} disabled={uploading}>
                        {lang === 'en' ? 'Remove' : 'Rimuovi'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="nr-photo-pick-row">
                    <label className="nr-secondary-button">
                      <input type="file" accept="image/*" multiple onChange={(event) => handleFileSelect(event, key)} disabled={uploading} />
                      <Upload size={14} />
                      {lang === 'en' ? 'Upload' : 'Carica'}
                    </label>
                    <label className="nr-secondary-button">
                      <input type="file" accept="image/*" capture="environment" onChange={(event) => handleFileSelect(event, key)} disabled={uploading} />
                      <Camera size={14} />
                      {lang === 'en' ? 'Camera' : 'Fotocamera'}
                    </label>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="nr-modal-footer">
          <button type="button" className="nr-secondary-button" onClick={onClose} disabled={uploading}>
            {t('cancel')}
          </button>
          <button type="button" className="nr-primary-button" onClick={onUpload} disabled={uploading || images.length === 0}>
            {uploading ? <RefreshCw size={14} className="nr-spin" /> : <CheckCircle2 size={14} />}
            {uploading
              ? (lang === 'en' ? 'Extracting coach...' : 'Estrazione coach...')
              : (lang === 'en' ? 'Save coach from photos' : 'Salva coach da foto')}
          </button>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function CoachDetailsModal({ show, coach, onClose, onReplaceFromCatalog, onReplaceFromPhoto, saving, lang, t }) {
  if (!show || !coach) return null

  const image = getCoachCardImage(coach)
  const bestPlaystyle = getBestCoachPlaystyle(coach)
  const infoRows = [
    [lang === 'en' ? 'Age' : 'Eta', coach.age],
    [lang === 'en' ? 'Nationality' : 'Nazionalita', coach.nationality],
    [lang === 'en' ? 'Team' : 'Squadra', coach.team],
    [lang === 'en' ? 'Category' : 'Categoria', getCoachDisplayCategory(coach.category)],
    [lang === 'en' ? 'Type' : 'Tipo', coach.pack_type]
  ].filter(([, value]) => value !== null && value !== undefined && value !== '')
  const playstyles = Object.entries(coach.playing_style_competence || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .sort((left, right) => Number(right[1]) - Number(left[1]))
  const boosters = Array.isArray(coach.stat_boosters) ? coach.stat_boosters : []
  const connection = coach.connection && typeof coach.connection === 'object' ? coach.connection : null
  const hasDetails = infoRows.length > 0 || playstyles.length > 0 || coach.training_affinity_description || boosters.length > 0 || connection

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onClose}
      title={coach.coach_name || (lang === 'en' ? 'Coach details' : 'Dettaglio allenatore')}
      subtitle={lang === 'en' ? 'Coach details' : 'Dettaglio allenatore'}
      className="nr-coach-details-shell"
    >
      <div className="nr-coach-details-body">
        <div className="nr-coach-details-hero">
          <div className="nr-coach-details-image">
            {image ? <img src={image} alt={coach.coach_name || 'coach'} /> : <Star size={22} />}
          </div>
          <div>
            <span className="nr-mini-kicker">{coach.is_active ? (lang === 'en' ? 'Active coach' : 'Coach attivo') : (lang === 'en' ? 'Saved coach' : 'Coach salvato')}</span>
            <h3>{coach.coach_name || '-'}</h3>
            <p>
              {bestPlaystyle
                ? `${formatCoachLabel(bestPlaystyle[0], t)} ${bestPlaystyle[1]}`
                : (coach.category || coach.team || (lang === 'en' ? 'Personal coach' : 'Allenatore personale'))}
            </p>
          </div>
        </div>

        {!hasDetails && (
          <div className="nr-empty-state">
            <span>{lang === 'en' ? 'No extra coach details available yet.' : 'Nessun dettaglio allenatore aggiuntivo disponibile.'}</span>
          </div>
        )}

        {infoRows.length > 0 && (
          <EnterpriseSection title={lang === 'en' ? 'Information' : 'Informazioni'}>
            <div className="nr-coach-info-grid">
              {infoRows.map(([label, value]) => (
                <div key={label} className="nr-coach-info-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </EnterpriseSection>
        )}

        {playstyles.length > 0 && (
          <EnterpriseSection title={lang === 'en' ? 'Playing style competence' : 'Competenza stili di gioco'}>
            <div className="nr-coach-style-list">
              {playstyles.map(([style, value]) => (
                <div key={style} className="nr-coach-style-row">
                  <span>{formatCoachLabel(style, t)}</span>
                  <strong>{typeof value === 'object' ? '-' : value}</strong>
                </div>
              ))}
            </div>
          </EnterpriseSection>
        )}

        {coach.training_affinity_description && (
          <EnterpriseSection title={lang === 'en' ? 'Training affinity' : 'Affinita di allenamento'}>
            <p className="nr-coach-description">{coach.training_affinity_description}</p>
          </EnterpriseSection>
        )}

        {boosters.length > 0 && (
          <EnterpriseSection title={lang === 'en' ? 'Stat boosters' : 'Stat boosters'}>
            <div className="nr-coach-style-list">
              {boosters.map((booster, index) => (
                <div key={`${booster.stat_name || booster.name || 'booster'}-${index}`} className="nr-coach-style-row">
                  <span>{formatCoachLabel(booster.stat_name || booster.name || booster.booster_name || 'Booster', t)}</span>
                  <strong>{booster.bonus !== null && booster.bonus !== undefined ? `+${booster.bonus}` : ''}</strong>
                </div>
              ))}
            </div>
          </EnterpriseSection>
        )}

        {connection && (
          <EnterpriseSection title={lang === 'en' ? 'Connection' : 'Collegamento'}>
            <div className="nr-coach-connection">
              {connection.name && <strong>{connection.name}</strong>}
              {connection.description && <p>{connection.description}</p>}
              {connection.focal_point && (
                <span>
                  <b>{lang === 'en' ? 'Focal point' : 'Punto focale'}:</b> {connection.focal_point.playing_style || '-'} ({connection.focal_point.position || '-'})
                </span>
              )}
              {connection.key_man && (
                <span>
                  <b>{lang === 'en' ? 'Key man' : 'Uomo chiave'}:</b> {connection.key_man.playing_style || '-'} ({connection.key_man.position || '-'})
                </span>
              )}
            </div>
          </EnterpriseSection>
        )}

        <div className="nr-modal-footer">
          <button type="button" className="nr-secondary-button" onClick={onReplaceFromPhoto} disabled={saving}>
            <Upload size={14} />
            {lang === 'en' ? 'Replace from photo' : 'Sostituisci da foto'}
          </button>
          <button type="button" className="nr-primary-button" onClick={onReplaceFromCatalog} disabled={saving}>
            <Search size={14} />
            {lang === 'en' ? 'Change from catalog' : 'Cambia da catalogo'}
          </button>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function EnterpriseReservePicker({ reserves, lang, onPick, slotPosition, onAddNew, pickDisabled = false }) {
  const orderedReserves = [...reserves].sort((first, second) => {
    const firstFit = getSlotCompatibility(slotPosition, first.position) === 'perfect' ? 0 : 1
    const secondFit = getSlotCompatibility(slotPosition, second.position) === 'perfect' ? 0 : 1
    return firstFit - secondFit
  })

  return (
    <EnterpriseSection title={lang === 'en' ? 'Available reserves' : 'Riserve disponibili'}>
      <div className="nr-reserve-inline-list">
        {orderedReserves.length > 0 ? orderedReserves.map((player) => {
          const compatibility = getSlotCompatibility(slotPosition, player.position)
          return (
          <button key={player.id} type="button" className="nr-bench-item" onClick={() => onPick(player)} disabled={pickDisabled}>
            <div className="nr-bench-item-copy">
              <strong>{player.player_name}</strong>
              <span>{player.position || '-'} · {player.role || player.playing_style_name || '-'} · {compatibilityLabel(compatibility, lang)}</span>
            </div>
            <span className={`nr-fit-pill compat-${compatibility}`}>{compatibilityLabel(compatibility, lang)}</span>
            <ChevronRight size={16} />
          </button>
          )
        }) : (
          <div className="nr-empty-state">
            <span>{lang === 'en' ? 'No reserves available yet. Add a new player instead.' : 'Nessuna riserva disponibile. Aggiungi un nuovo giocatore.'}</span>
            <button type="button" className="nr-secondary-button" onClick={onAddNew}>
              {lang === 'en' ? 'Add new player' : 'Aggiungi nuovo'}
            </button>
          </div>
        )}
      </div>
    </EnterpriseSection>
  )
}

function CatalogPickerModal({
  show,
  slot,
  mode = 'slot',
  searchQuery,
  onSearchChange,
  sort,
  onSortChange,
  loading,
  loadingMore,
  results,
  total,
  hasMore,
  reserves,
  onClose,
  onSelectCatalogCard,
  onSelectReserve,
  onLoadMore,
  onUploadFallback,
  onCatalogViewChange,
  lang
}) {
  const isReserveMode = mode === 'reserve'
  const slotPosition = isReserveMode ? '' : slot?.position
  const [slotFlow, setSlotFlow] = React.useState(isReserveMode ? 'catalog' : 'choice')

  React.useEffect(() => {
    if (!show) return
    setSlotFlow(isReserveMode ? 'catalog' : 'choice')
  }, [show, isReserveMode, slot?.slot_index])

  const showCatalog = isReserveMode || slotFlow === 'catalog'

  React.useEffect(() => {
    if (!show) {
      onCatalogViewChange?.(false)
      return
    }
    onCatalogViewChange?.(showCatalog)
  }, [show, showCatalog, onCatalogViewChange])

  if (!show) return null

  const showChoice = !isReserveMode && slotFlow === 'choice'
  const showReserves = !isReserveMode && slotFlow === 'reserves'
  const sortOptions = [
    { id: 'name_asc', label: lang === 'en' ? 'Name A-Z' : 'Nome A-Z' },
    { id: 'ovr_desc', label: lang === 'en' ? 'OVR high first' : 'OVR piu alto' },
    { id: 'role_asc', label: lang === 'en' ? 'Role A-Z' : 'Ruolo A-Z' }
  ]
  const resultCountLabel = total > 0
    ? (lang === 'en' ? `${results.length} of ${total} cards` : `${results.length} di ${total} carte`)
    : (lang === 'en' ? 'No cards loaded yet' : 'Nessuna carta caricata')
  const title = isReserveMode
    ? (lang === 'en' ? 'Add reserve' : 'Aggiungi riserva')
    : showChoice
      ? `${lang === 'en' ? 'Add player in' : 'Aggiungi giocatore in'} ${slotPosition}`
      : showReserves
        ? `${lang === 'en' ? 'Choose a reserve for' : 'Scegli una riserva per'} ${slotPosition}`
        : `${lang === 'en' ? 'Choose from catalog for' : 'Scegli dal catalogo per'} ${slotPosition}`
  const description = isReserveMode
    ? (lang === 'en'
        ? 'Search the official catalog or upload photos if the player is not available.'
        : 'Cerca nel catalogo ufficiale oppure carica foto se il giocatore non e disponibile.')
    : showChoice
      ? (lang === 'en'
          ? 'First choose the source. Existing reserves and new players are separate flows.'
          : 'Prima scegli la sorgente. Riserve esistenti e nuovi giocatori sono flussi separati.')
      : showReserves
        ? (lang === 'en'
            ? 'Pick one player already in your reserves. The slot will be filled immediately.'
            : 'Scegli un giocatore gia presente tra le riserve. Lo slot verra riempito subito.')
        : (lang === 'en'
            ? 'Search freely, then tap a card to confirm the selection.'
            : 'Cerca liberamente, poi tocca una carta per confermare la selezione.')

  const goBackToChoice = () => setSlotFlow('choice')

  return (
    <ModalPortal>
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className={`nr-modal-shell nr-picker-shell ${isReserveMode ? 'reserve-mode' : 'slot-mode'}`} onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            <span className="nr-mini-kicker">
              {isReserveMode ? (lang === 'en' ? 'Reserve target' : 'Target riserva') : (lang === 'en' ? 'Slot target' : 'Slot target')}
            </span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className="nr-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {showChoice && (
          <div className="nr-picker-choice-panel">
            <button
              type="button"
              className={`nr-picker-choice-card ${reserves.length > 0 ? 'primary' : ''}`}
              onClick={() => setSlotFlow('reserves')}
              disabled={reserves.length === 0}
            >
              <span className="nr-choice-icon"><User size={18} /></span>
              <div>
                <strong>{reserves.length > 0 ? (lang === 'en' ? 'Use a reserve' : 'Usa una riserva') : (lang === 'en' ? 'No reserves available' : 'Nessuna riserva disponibile')}</strong>
                <p>{reserves.length > 0
                  ? (lang === 'en' ? `${reserves.length} players already in your bench.` : `${reserves.length} giocatori gia in panchina.`)
                  : (lang === 'en' ? 'Add a new player from catalog or photo instead.' : 'Aggiungi un nuovo giocatore da catalogo o foto.')}</p>
              </div>
              <ChevronRight size={18} />
            </button>

            <button type="button" className={`nr-picker-choice-card ${reserves.length === 0 ? 'primary' : ''}`} onClick={() => setSlotFlow('catalog')}>
              <span className="nr-choice-icon"><Search size={18} /></span>
              <div>
                <strong>{lang === 'en' ? 'Add new player' : 'Aggiungi nuovo'}</strong>
                <p>{lang === 'en' ? 'Search the catalog first, then use photo upload only if needed.' : 'Cerca prima nel catalogo, poi usa la foto solo se serve.'}</p>
              </div>
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {showReserves && (
          <div className="nr-picker-subnav">
            <button type="button" className="nr-secondary-button" onClick={goBackToChoice}>
              {lang === 'en' ? 'Back to choices' : 'Torna alle scelte'}
            </button>
          </div>
        )}

        {showCatalog && (
          <>
            <div className="nr-picker-subnav">
              {!isReserveMode && (
                <button type="button" className="nr-secondary-button" onClick={goBackToChoice}>
                  {lang === 'en' ? 'Back to choices' : 'Torna alle scelte'}
                </button>
              )}
            </div>

            <div className="nr-picker-toolbar">
              <div className="nr-picker-search-actions">
                <label className="nr-search-input">
                  <Search size={16} />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={lang === 'en' ? 'Search player, role, or card type' : 'Cerca giocatore, ruolo o tipo carta'}
                  />
                </label>
                <button type="button" className="nr-secondary-button nr-upload-inline-button" onClick={onUploadFallback}>
                  <Upload size={14} />
                  {lang === 'en' ? 'Upload photo' : 'Carica foto'}
                </button>
              </div>
              <div className="nr-catalog-meta">
                <span>{resultCountLabel}</span>
                <label>
                  {lang === 'en' ? 'Sort' : 'Ordina'}
                  <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
                    {sortOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </>
        )}

        {showReserves && (
          <div className="nr-picker-body single">
            <div className="nr-picker-results">
              <EnterpriseReservePicker
                reserves={reserves}
                lang={lang}
                onPick={onSelectReserve}
                slotPosition={slotPosition}
                onAddNew={() => setSlotFlow('catalog')}
              />
            </div>
          </div>
        )}

        {showCatalog && (
          <div className="nr-picker-body single">
            <div className="nr-picker-results">
              <section>
              <div className="nr-section-head">
                <h3>{isReserveMode ? (lang === 'en' ? 'Catalog cards' : 'Carte catalogo') : (lang === 'en' ? 'Catalog results' : 'Risultati catalogo')}</h3>
              </div>
              <div className="nr-catalog-list">
                {loading ? (
                  <div className="nr-empty-state">{lang === 'en' ? 'Loading...' : 'Caricamento...'}</div>
                ) : results.length > 0 ? (
                  <>
                    {results.map((card) => (
                      <CatalogCard
                        key={card.id}
                        card={card}
                        lang={lang}
                        onSelect={onSelectCatalogCard}
                      />
                    ))}
                    {hasMore && (
                      <button type="button" className="nr-load-more-button" onClick={onLoadMore} disabled={loadingMore}>
                        {loadingMore ? (lang === 'en' ? 'Loading more...' : 'Caricamento...') : (lang === 'en' ? 'Show more cards' : 'Mostra altri giocatori')}
                      </button>
                    )}
                  </>
                ) : (
                  <div className="nr-empty-state">
                    {lang === 'en' ? 'No cards found with this search.' : 'Nessuna carta trovata con questa ricerca.'}
                  </div>
                )}
              </div>
            </section>
            </div>

          </div>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}

const PLAYER_UPLOAD_EXAMPLES = [
  {
    key: 'stats',
    src: '/examples/player-upload/thuram-statistiche.png',
    labels: { it: 'Statistiche', en: 'Stats' }
  },
  {
    key: 'skills',
    src: '/examples/player-upload/thuram-abilita.png',
    labels: { it: 'Abilita', en: 'Skills' }
  },
  {
    key: 'booster',
    src: '/examples/player-upload/thuram-booster.png',
    labels: { it: 'Booster', en: 'Booster' }
  }
]

function PhotoUploadExamples({ lang }) {
  return (
    <section className="nr-photo-example-panel">
      <div className="nr-photo-example-copy">
        <strong>{lang === 'en' ? 'Example screenshots' : 'Esempi di screenshot'}</strong>
        <p>
          {lang === 'en'
            ? 'Use these screens as a guide: stats, skills and boosters must be readable before extraction.'
            : 'Usa queste schermate come guida: statistiche, abilita e booster devono essere leggibili prima dell estrazione.'}
        </p>
      </div>
      <div className="nr-photo-example-grid">
        {PLAYER_UPLOAD_EXAMPLES.map((example) => (
          <a
            key={example.key}
            href={example.src}
            target="_blank"
            rel="noreferrer"
            className="nr-photo-example-card"
          >
            <img src={example.src} alt={example.labels[lang === 'en' ? 'en' : 'it']} />
            <span>{example.labels[lang === 'en' ? 'en' : 'it']}</span>
          </a>
        ))}
      </div>
    </section>
  )
}

function PhotoUploadModal({
  show,
  mode,
  slot,
  images,
  onImagesChange,
  onUpload,
  onClose,
  uploading,
  onOptimizeError,
  completionTarget,
  lang,
  t
}) {
  if (!show) return null

  const labelByKey = {
    card: lang === 'en' ? 'Card / stats' : 'Carta / statistiche',
    stats: lang === 'en' ? 'Skills photo' : 'Foto abilita',
    skills: lang === 'en' ? 'Boosters photo' : 'Foto booster'
  }
  const descByKey = {
    card: lang === 'en' ? 'Needed to create the player and read visible stats.' : 'Necessaria per creare il giocatore e leggere le statistiche visibili.',
    stats: lang === 'en' ? 'Recommended to complete player skills.' : 'Consigliata per completare le abilita.',
    skills: lang === 'en' ? 'Only upload it if this player has boosters.' : 'Caricala solo se questo giocatore ha booster.'
  }
  const imageTypes = PHOTO_TYPE_KEYS.map((key) => ({
    ...getPhotoTypeConfig(key),
    label: labelByKey[key],
    description: descByKey[key]
  }))
  const destination = mode === 'reserve'
    ? (lang === 'en' ? 'Reserve bench' : 'Riserve')
    : mode === 'complete'
      ? (completionTarget?.player_name || (lang === 'en' ? 'existing player' : 'giocatore esistente'))
    : (slot?.position || (lang === 'en' ? 'selected slot' : 'slot selezionato'))
  const completionStatus = completionTarget ? getPhotoProfileCompletion(completionTarget, lang) : null
  const missingText = completionStatus?.missing?.map((section) => section.label).join(', ')

  const getImageForType = (type) => images.find((img) => img.type === type)
  const removeImage = (type) => onImagesChange(images.filter((img) => img.type !== type))

  const handleFileSelect = async (event, type) => {
    const file = event.target.files?.[0]
    if (!file || !file.type?.startsWith('image/')) return

    try {
      const optimized = await optimizeImageFile(file)
      const nextImage = { file, dataUrl: optimized.dataUrl, type, name: file.name }
      const existingIndex = images.findIndex((img) => img.type === type)
      if (existingIndex >= 0) {
        const next = [...images]
        next[existingIndex] = nextImage
        onImagesChange(next)
      } else {
        onImagesChange([...images, nextImage])
      }
    } catch (err) {
      const message = getImageOptimizeUserMessage(err, t)
      if (onOptimizeError) onOptimizeError(message)
    } finally {
      event.target.value = ''
    }
  }

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!uploading) onClose()
      }}
      title={mode === 'reserve'
        ? (lang === 'en' ? 'Add reserve from photo' : 'Aggiungi riserva da foto')
        : mode === 'complete'
          ? (lang === 'en' ? 'Complete player with photos' : 'Completa giocatore con foto')
        : `${lang === 'en' ? 'Add player from photo' : 'Aggiungi giocatore da foto'} · ${destination}`}
      subtitle={lang === 'en' ? 'Photo extraction' : 'Estrazione foto'}
      className="nr-photo-upload-shell"
    >
      <div className="nr-photo-upload-body">
        <div className="nr-photo-upload-intro">
          <Sparkles size={18} />
          <span>
            {lang === 'en'
              ? mode === 'complete'
                ? 'Upload the missing screenshots. We will add only new data to this player without replacing him.'
                : 'Upload one or more screenshots. We will extract the player, then you will confirm roles before saving.'
              : mode === 'complete'
                ? 'Carica le schermate mancanti. Aggiungiamo solo i nuovi dati a questo giocatore senza sostituirlo.'
                : 'Carica una o piu schermate. Estraiamo il giocatore, poi confermi i ruoli prima del salvataggio.'}
          </span>
        </div>

        {mode === 'complete' && completionStatus && (
          <div className="nr-warning-box">
            <AlertTriangle size={16} />
            <span>
              {completionStatus.isComplete
                ? (lang === 'en'
                  ? 'This profile already looks complete. Use this only if you want to add corrected photos.'
                  : 'Questo profilo sembra gia completo. Usa questa funzione solo se vuoi aggiungere foto corrette.')
                : (lang === 'en'
                  ? `Missing sections: ${missingText}. If the photo belongs to another player, use Replace from photo instead.`
                  : `Sezioni mancanti: ${missingText}. Se la foto e di un altro giocatore, usa Sostituisci da foto.`)}
            </span>
          </div>
        )}

        <div className="nr-photo-step-row">
          {imageTypes.map((type, index) => {
            const image = getImageForType(type.key)
            const statusLabel = uploading && image
              ? (lang === 'en' ? 'Extracting' : 'Estrazione')
              : image
                ? (lang === 'en' ? 'Selected, not extracted yet' : 'Selezionata, non ancora estratta')
                : (lang === 'en' ? 'Not selected' : 'Non selezionata')
            return (
              <div key={type.key} className={`nr-photo-step ${uploading && image ? 'extracting' : image ? 'selected' : ''}`}>
                <span>{uploading && image ? <RefreshCw size={14} className="nr-spin" /> : image ? <Upload size={13} /> : index + 1}</span>
                <small>
                  <strong>{type.label}</strong>
                  <em>{statusLabel}</em>
                </small>
              </div>
            )
          })}
        </div>

        <PhotoUploadExamples lang={lang} />

        <div className="nr-photo-upload-grid">
          {imageTypes.map(({ key, label, description, color, bgColor, borderColor }) => {
            const image = getImageForType(key)
            return (
              <section
                key={key}
                className="nr-photo-upload-card"
                style={{
                  '--photo-color': color,
                  '--photo-bg': bgColor,
                  '--photo-border': borderColor
                }}
              >
                <div className="nr-photo-card-head">
                  <div>
                    <strong>{label}</strong>
                    <p>{description}</p>
                  </div>
                  <span>{image
                    ? (lang === 'en' ? 'Ready to extract' : 'Da estrarre')
                    : key === 'card'
                      ? (lang === 'en' ? 'Needed' : 'Necessaria')
                      : key === 'stats'
                        ? (lang === 'en' ? 'Recommended' : 'Consigliata')
                        : (lang === 'en' ? 'Only if present' : 'Solo se presente')}</span>
                </div>

                {image ? (
                  <div className="nr-photo-preview">
                    <img src={image.dataUrl} alt={label} />
                    <div>
                      <span>
                        {image.name || (lang === 'en' ? 'Selected photo' : 'Foto selezionata')}
                        <small>{lang === 'en' ? 'Will be extracted when you press Extract data from photos.' : 'Sara estratta quando premi Estrai dati dalle foto.'}</small>
                      </span>
                      <button type="button" className="nr-secondary-button" onClick={() => removeImage(key)} disabled={uploading}>
                        {lang === 'en' ? 'Remove' : 'Rimuovi'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="nr-photo-pick-row">
                    <label className="nr-secondary-button">
                      <input type="file" accept="image/*" onChange={(event) => handleFileSelect(event, key)} disabled={uploading} />
                      <Upload size={14} />
                      {lang === 'en' ? 'Upload' : 'Carica'}
                    </label>
                    <label className="nr-secondary-button">
                      <input type="file" accept="image/*" capture="environment" onChange={(event) => handleFileSelect(event, key)} disabled={uploading} />
                      <Camera size={14} />
                      {lang === 'en' ? 'Camera' : 'Fotocamera'}
                    </label>
                  </div>
                )}
              </section>
            )
          })}
        </div>

        <div className="nr-modal-footer">
          <button type="button" className="nr-secondary-button" onClick={onClose} disabled={uploading}>
            {t('cancel')}
          </button>
          <button type="button" className="nr-primary-button" onClick={onUpload} disabled={uploading || images.length === 0}>
            {uploading ? <RefreshCw size={14} className="nr-spin" /> : <CheckCircle2 size={14} />}
            {uploading
              ? (lang === 'en' ? 'Extracting data...' : 'Estrazione dati...')
              : (lang === 'en' ? 'Extract data from photos' : 'Estrai dati dalle foto')}
          </button>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function PhotoExtractionReviewModal({
  show,
  playerData,
  mode,
  slot,
  completionTarget,
  lang,
  onContinue,
  onCancel
}) {
  if (!show || !playerData) return null

  const baseReady = Boolean(playerData.player_name && playerData.overall_rating && (playerData.position || playerData.original_positions?.length))
  const isCompletion = mode === 'complete' && completionTarget
  const extractedStatsReady = hasPlayerStats(playerData)
  const extractedSkillsReady = hasPlayerSkills(playerData)
  const extractedBoostersReady = hasPlayerBoosters(playerData)
  const statsReady = isCompletion ? hasPlayerStats(completionTarget) || extractedStatsReady : extractedStatsReady
  const skillsReady = isCompletion ? hasPlayerSkills(completionTarget) || extractedSkillsReady : extractedSkillsReady
  const boostersReady = isCompletion ? hasPlayerBoosters(completionTarget) || extractedBoostersReady : extractedBoostersReady
  const destination = mode === 'reserve'
    ? (lang === 'en' ? 'Reserve bench' : 'Riserve')
    : mode === 'complete'
      ? (completionTarget?.player_name || (lang === 'en' ? 'existing player' : 'giocatore esistente'))
    : (slot?.position || (lang === 'en' ? 'selected slot' : 'slot selezionato'))
  const rows = [
    {
      key: 'base',
      label: lang === 'en' ? 'Base player data' : 'Dati base giocatore',
      ready: baseReady,
      detail: `${playerData.player_name || '-'} · ${playerData.position || '-'} · OVR ${playerData.overall_rating ?? '-'}`
    },
    {
      key: 'stats',
      label: lang === 'en' ? 'Performance stats' : 'Statistiche',
      ready: statsReady,
      newData: extractedStatsReady,
      detail: extractedStatsReady
        ? (lang === 'en' ? 'New stats detected from this upload' : 'Nuove statistiche rilevate da questo upload')
        : statsReady
          ? (lang === 'en' ? 'Already present on this player' : 'Gia presenti su questo giocatore')
          : (lang === 'en' ? 'Not detected yet' : 'Non rilevate')
    },
    {
      key: 'skills',
      label: lang === 'en' ? 'Skills' : 'Abilita',
      ready: skillsReady,
      newData: extractedSkillsReady,
      detail: extractedSkillsReady
        ? (lang === 'en' ? 'New skills detected from this upload' : 'Nuove abilita rilevate da questo upload')
        : skillsReady
          ? (lang === 'en' ? 'Already present on this player' : 'Gia presenti su questo giocatore')
          : (lang === 'en' ? 'Can be completed later' : 'Completabile dopo')
    },
    {
      key: 'boosters',
      label: 'Boosters',
      ready: boostersReady,
      newData: extractedBoostersReady,
      detail: extractedBoostersReady
        ? (lang === 'en' ? 'New boosters detected from this upload' : 'Nuovi booster rilevati da questo upload')
        : boostersReady
          ? (lang === 'en' ? 'Already present on this player' : 'Gia presenti su questo giocatore')
          : (lang === 'en' ? 'Optional, can be completed later' : 'Opzionali, completabili dopo')
    }
  ]
  const hasNewCompletionData = rows.some((row) => row.key !== 'base' && row.newData)

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onCancel}
      title={isCompletion
        ? (lang === 'en' ? 'Review added data' : 'Controlla dati aggiunti')
        : (lang === 'en' ? 'Extraction complete' : 'Estrazione completata')}
      subtitle={lang === 'en' ? `Review before saving to ${destination}` : `Controlla prima di salvare in ${destination}`}
      className="nr-photo-review-shell"
    >
      <div className="nr-photo-review-body">
        <div className="nr-photo-review-hero">
          <div>
            <span className="nr-mini-kicker">{lang === 'en' ? 'Extracted player' : 'Giocatore estratto'}</span>
            <h3>{playerData.player_name || '-'}</h3>
            <p>{playerData.position || '-'} · OVR {playerData.overall_rating ?? '-'}</p>
          </div>
          <CheckCircle2 size={28} />
        </div>

        <div className="nr-photo-review-list">
          {rows.map((row) => (
            <div key={row.key} className={`nr-photo-review-row ${row.ready ? 'ready' : 'missing'}`}>
              <span>{row.ready ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
              <div>
                <strong>{row.label}</strong>
                <p>{row.detail}</p>
              </div>
              <em>{isCompletion
                ? row.newData
                  ? (lang === 'en' ? 'New' : 'Nuovo')
                  : row.ready
                    ? (lang === 'en' ? 'Present' : 'Presente')
                    : (lang === 'en' ? 'To complete' : 'Da completare')
                : row.ready ? (lang === 'en' ? 'Extracted' : 'Estratto') : (lang === 'en' ? 'To complete' : 'Da completare')}</em>
            </div>
          ))}
        </div>

        <div className="nr-warning-box">
          <AlertTriangle size={16} />
          <span>
            {isCompletion
              ? hasNewCompletionData
                ? (lang === 'en'
                  ? 'This will update the same player and keep existing data. It will not replace the player or move him.'
                  : 'Questo aggiorna lo stesso giocatore e mantiene i dati esistenti. Non sostituisce e non sposta il giocatore.')
                : (lang === 'en'
                  ? 'No new useful section was detected. You can cancel and upload clearer missing screenshots.'
                  : 'Non e stata rilevata nessuna nuova sezione utile. Puoi annullare e caricare schermate mancanti piu chiare.')
              : (lang === 'en'
                ? 'Only required data blocks saving. Optional missing sections can be completed later from the player editor.'
                : "Solo i dati obbligatori bloccano il salvataggio. Le sezioni opzionali mancanti si possono completare dopo dall'editor.")}
          </span>
        </div>

        <div className="nr-modal-footer">
          <button type="button" className="nr-secondary-button" onClick={onCancel}>
            {lang === 'en' ? 'Cancel' : 'Annulla'}
          </button>
          <button type="button" className="nr-primary-button" onClick={onContinue}>
            {isCompletion
              ? (lang === 'en' ? 'Save added data' : 'Salva dati aggiunti')
              : (lang === 'en' ? 'Confirm roles' : 'Conferma ruoli')}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function QuickPlayerPanel({
  player,
  slot,
  onClose,
  onRemoveFromSlot,
  onDeletePlayer,
  onOpenReplace,
  onUploadPhoto,
  onCompletePhotoProfile,
  onMoveReserveToStarter,
  onReplaceWithReserve,
  benchReserveCount = 0,
  lang
}) {
  if (!player) return null
  const cardImage = resolvePlayerCardImageUrl(player)
  const profileCompletion = getPhotoProfileCompletion(player, lang)
  const actionableMissing = profileCompletion.missing.filter((section) => section.key !== 'boosters')
  const missingLabels = actionableMissing.map((section) => section.label).join(', ')

  return (
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className="nr-modal-shell nr-quick-shell" onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            <span className="nr-mini-kicker">{lang === 'en' ? 'Player details' : 'Dettaglio giocatore'}</span>
            <h2>{player.player_name}</h2>
            <p>{player.position || '-'} · {player.role || player.playing_style_name || player.card_type || '-'}</p>
          </div>
          <button type="button" className="nr-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="nr-quick-body">
          <div className="nr-picker-detail-hero">
            {cardImage ? (
              <img src={cardImage} alt={player.player_name} />
            ) : (
              <div className="nr-slot-avatar-fallback"><User size={18} /></div>
            )}
            <div>
              <span className="nr-mini-kicker">
                {player?.metadata?.catalog_card_type || (lang === 'en' ? 'Roster player' : 'Giocatore rosa')}
              </span>
              <h3>{player.player_name}</h3>
              <p>{player.position || '-'} · {player.role || player.playing_style_name || '-'}</p>
            </div>
          </div>

          {actionableMissing.length > 0 && (
            <div className="nr-complete-photo-callout">
              <AlertTriangle size={16} />
              <div>
                <strong>{lang === 'en' ? 'Profile to complete' : 'Profilo da completare'}</strong>
                <p>
                  {lang === 'en'
                    ? `Missing ${missingLabels}. Add only the missing screenshots without replacing this player.`
                    : `Mancano ${missingLabels}. Aggiungi solo le schermate mancanti senza sostituire questo giocatore.`}
                </p>
              </div>
              <button type="button" className="nr-primary-button" onClick={() => onCompletePhotoProfile(player, slot)}>
                <Upload size={14} />
                {lang === 'en' ? 'Complete with photos' : 'Completa con foto'}
              </button>
            </div>
          )}

          <div className="nr-quick-actions">
            <button type="button" className="nr-primary-button" onClick={() => onOpenReplace(player, true)}>
              <Pencil size={14} />
              {lang === 'en' ? 'Edit player' : 'Modifica giocatore'}
            </button>
            {slot?.slot_index != null && (
              <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player)}>
                {lang === 'en' ? 'Replace from catalog' : 'Sostituisci da catalogo'}
              </button>
            )}
            {slot?.slot_index != null && benchReserveCount > 0 && (
              <button type="button" className="nr-secondary-button" onClick={() => onReplaceWithReserve?.()}>
                {lang === 'en' ? 'Replace with reserve' : 'Sostituisci con riserva'}
              </button>
            )}
            {slot?.slot_index != null && (
              <button type="button" className="nr-secondary-button" onClick={() => onRemoveFromSlot(player.id)}>
                {lang === 'en' ? 'Move to reserves' : 'Sposta in riserva'}
              </button>
            )}
            {slot?.slot_index != null && (
              <button type="button" className="nr-secondary-button" onClick={onUploadPhoto}>
                <Upload size={14} />
                {lang === 'en' ? 'Replace from photo' : 'Sostituisci da foto'}
              </button>
            )}
            {slot?.slot_index == null && (
              <button type="button" className="nr-primary-button" onClick={() => onMoveReserveToStarter(player)}>
                <ArrowRight size={14} />
                {lang === 'en' ? 'Move to starters' : 'Sposta tra i titolari'}
              </button>
            )}
          </div>

          <div className="nr-danger-zone">
            <span>{lang === 'en' ? 'Danger area' : 'Area pericolosa'}</span>
            <button type="button" className="nr-danger-button" onClick={() => onDeletePlayer(player.id)}>
              <Trash2 size={14} />
              {lang === 'en' ? 'Delete permanently' : 'Elimina definitivamente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function StarterReserveReplacementModal({ show, slot, reserves, assigning, onClose, onPickReserve, lang }) {
  if (!show || !slot) return null
  const slotPosition = slot.position || ''

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!assigning) onClose()
      }}
      title={lang === 'en' ? 'Replace with reserve' : 'Sostituisci con riserva'}
      subtitle={
        lang === 'en'
          ? `Slot ${slotPosition || '?'} · ${slot.slot_index + 1}. The current starter moves to the bench (direct swap if the bench is full).`
          : `Slot ${slotPosition || '?'} · ${slot.slot_index + 1}. Il titolare attuale va in panchina (scambio diretto anche se la panchina e piena).`
      }
      className="nr-picker-shell"
    >
      <div className="nr-picker-body single">
        <EnterpriseReservePicker
          reserves={reserves}
          lang={lang}
          slotPosition={slotPosition}
          onPick={onPickReserve}
          onAddNew={onClose}
          pickDisabled={assigning}
        />
      </div>
    </EnterpriseModalFrame>
  )
}

function ReserveStarterSlotModal({ show, player, slotChoices, assigning, onClose, onSelectSlot, lang }) {
  if (!show || !player) return null

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!assigning) onClose()
      }}
      title={lang === 'en' ? 'Choose starter slot' : 'Scegli slot titolare'}
      subtitle={lang === 'en' ? 'Move reserve to starters' : 'Sposta riserva tra i titolari'}
      className="nr-picker-shell"
    >
      <div className="nr-picker-body single">
        <div className="nr-picker-results">
          <section>
            <div className="nr-section-head">
              <div>
                <h3>{player.player_name}</h3>
                <p>
                  {lang === 'en'
                    ? 'Pick any slot. If occupied, the current starter will move to reserves.'
                    : 'Scegli qualsiasi slot. Se occupato, il titolare attuale andra in riserva.'}
                </p>
              </div>
            </div>
            <div className="nr-catalog-list">
              {slotChoices.map(({ slot, occupant }) => (
                <button
                  key={slot.slot_index}
                  type="button"
                  className="nr-bench-item"
                  onClick={() => onSelectSlot(slot)}
                  disabled={assigning}
                >
                  <div className="nr-bench-item-copy">
                    <strong>{slot.position || '-'} · Slot {slot.slot_index + 1}</strong>
                    <span>
                      {occupant
                        ? (lang === 'en' ? `Replaces ${occupant.player_name}` : `Sostituisce ${occupant.player_name}`)
                        : (lang === 'en' ? 'Free slot' : 'Slot libero')}
                    </span>
                  </div>
                  <span className={`nr-fit-pill ${occupant ? 'compat-adaptable' : 'compat-perfect'}`}>
                    {occupant
                      ? (lang === 'en' ? 'Swap' : 'Scambio')
                      : (lang === 'en' ? 'Free' : 'Libero')}
                  </span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

function BuildCoachPlayerPickerModal({ show, players, buildingPlayerId, onClose, onPick, lang }) {
  if (!show) return null
  const sortedPlayers = [...(Array.isArray(players) ? players : [])]
    .filter((player) => player?.id && player?.player_name)
    .sort((a, b) => {
      const firstSlot = a.slot_index == null ? 99 : Number(a.slot_index)
      const secondSlot = b.slot_index == null ? 99 : Number(b.slot_index)
      if (firstSlot !== secondSlot) return firstSlot - secondSlot
      return String(a.player_name || '').localeCompare(String(b.player_name || ''))
    })

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={() => {
        if (!buildingPlayerId) onClose()
      }}
      title={lang === 'en' ? 'Choose player' : 'Scegli giocatore'}
      subtitle={lang === 'en' ? 'Guided build for one player' : 'Build guidata singolo giocatore'}
      className="nr-picker-shell"
    >
      <div className="nr-picker-body single">
        <div className="nr-picker-results">
          <section>
            <div className="nr-section-head">
              <div>
                <h3>{lang === 'en' ? 'Starters and reserves' : 'Titolari e riserve'}</h3>
                <p>{lang === 'en'
                  ? 'Choose a player already in your squad: we will suggest a game-ready progression build.'
                  : 'Scegli un giocatore gia nella rosa: ti suggeriamo una build pronta da replicare in gioco.'}</p>
              </div>
            </div>
            <div className="nr-catalog-list">
              {sortedPlayers.map((player) => {
                const thumb = resolvePlayerCardImageUrl(player)
                const isBuilding = buildingPlayerId === player.id
                return (
                  <button
                    key={player.id}
                    type="button"
                    className="nr-bench-item"
                    onClick={() => onPick(player)}
                    disabled={!!buildingPlayerId}
                  >
                    <div className="nr-reserve-card-media">
                      {thumb ? (
                        <img src={thumb} alt={player.player_name} loading="lazy" draggable={false} />
                      ) : (
                        <div className="nr-reserve-initials">{getPlayerInitials(player.player_name)}</div>
                      )}
                    </div>
                    <div className="nr-bench-item-copy">
                      <strong>{player.player_name}</strong>
                      <span>
                        {player.slot_index == null
                          ? (lang === 'en' ? 'Reserve' : 'Riserva')
                          : `${lang === 'en' ? 'Starter' : 'Titolare'} · Slot ${Number(player.slot_index) + 1}`}
                        {' · '}
                        {player.position || '-'} · OVR {rosterFormationOvr(player)}
                      </span>
                    </div>
                    <span className="nr-reserve-position-pill">
                      {isBuilding ? (lang === 'en' ? 'Calculating' : 'Calcolo') : (lang === 'en' ? 'Optimize' : 'Ottimizza')}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </EnterpriseModalFrame>
  )
}

const MAX_RESERVES = 12
const GK_GOAL_AREA = { xMin: 36, xMax: 64, yMin: 83, yMax: 96 }
const DEFAULT_SLOT_POSITIONS = {
  0: { x: 50, y: 90, position: 'PT' },
  1: { x: 20, y: 65, position: 'DC' },
  2: { x: 40, y: 65, position: 'DC' },
  3: { x: 60, y: 65, position: 'DC' },
  4: { x: 80, y: 65, position: 'DC' },
  5: { x: 30, y: 52, position: 'CC' },
  6: { x: 50, y: 58, position: 'MED' },
  7: { x: 70, y: 52, position: 'CC' },
  8: { x: 25, y: 34, position: 'SP' },
  9: { x: 50, y: 28, position: 'P' },
  10: { x: 75, y: 34, position: 'SP' }
}

function normalizeLayoutPayload(layoutPayload, previousLayout = null) {
  const raw = layoutPayload && typeof layoutPayload === 'object' ? layoutPayload : {}
  const rawSlots = raw.slot_positions
  let parsedSlots = {}

  if (rawSlots && typeof rawSlots === 'object') {
    parsedSlots = rawSlots
  } else if (typeof rawSlots === 'string') {
    try {
      const maybeObject = JSON.parse(rawSlots)
      if (maybeObject && typeof maybeObject === 'object') {
        parsedSlots = maybeObject
      }
    } catch (_) {
      parsedSlots = {}
    }
  }

  const baseSlots = Object.keys(parsedSlots).length > 0
    ? parsedSlots
    : (previousLayout?.slot_positions || DEFAULT_SLOT_POSITIONS)

  return {
    formation: raw.formation || previousLayout?.formation || '4-3-3',
    slot_positions: completeSlotPositions(baseSlots)
  }
}
const BOOSTER_PRESETS = [
  { value: 'Tiro', labels: { en: 'Shooting', it: 'Tiro' } },
  { value: 'Calci di punizione', labels: { en: 'Set pieces', it: 'Calci di punizione' } },
  { value: 'Gioco aereo', labels: { en: 'Aerial play', it: 'Gioco aereo' } },
  { value: 'Passaggio', labels: { en: 'Passing', it: 'Passaggio' } },
  { value: 'Gestione del pallone', labels: { en: 'Ball handling', it: 'Gestione del pallone' } },
  { value: 'Tecnica', labels: { en: 'Technique', it: 'Tecnica' } },
  { value: 'Difesa', labels: { en: 'Defending', it: 'Difesa' } },
  { value: 'Duelli', labels: { en: 'Duels', it: 'Duelli' } },
  { value: 'Agilità', labels: { en: 'Agility', it: 'Agilita' } },
  { value: 'Fisicità', labels: { en: 'Physicality', it: 'Fisicita' } },
  { value: 'Portiere', labels: { en: 'Goalkeeper', it: 'Portiere' } },
  { value: 'Istinto da attaccante', labels: { en: 'Striker instinct', it: 'Istinto da attaccante' } },
  { value: 'Pilastro difensivo', labels: { en: 'Defensive pillar', it: 'Pilastro difensivo' } },
  { value: 'Tuttocampo', labels: { en: 'Box-to-box', it: 'Tuttocampo' } },
  { value: 'Saracinesca', labels: { en: 'Wall', it: 'Saracinesca' } },
  { value: 'Crossatore', labels: { en: 'Crosser', it: 'Crossatore' } },
  { value: 'Fantasista', labels: { en: 'Fantasia', it: 'Fantasista' } },
  { value: 'Regista', labels: { en: 'Playmaker', it: 'Regista' } },
  { value: 'Fondamenta', labels: { en: 'Fundamentals', it: 'Fondamenta' } },
  { value: 'Precisione', labels: { en: 'Precision', it: 'Precisione' } },
  { value: 'Motore offensivo', labels: { en: 'Offensive engine', it: 'Motore offensivo' } },
  { value: 'Proteggi il possesso', labels: { en: 'Ball protection', it: 'Proteggi il possesso' } },
  { value: 'Equilibrio', labels: { en: 'Balance', it: 'Equilibrio' } },
  { value: 'Contropiedista', labels: { en: 'Counter', it: 'Contropiedista' } },
  { value: 'Blocco aereo', labels: { en: 'Aerial block', it: 'Blocco aereo' } },
  { value: 'Spaccapartita', labels: { en: 'Game changer', it: 'Spaccapartita' } },
  { value: 'Forza', labels: { en: 'Strength', it: 'Forza' } },
  { value: 'Movimento senza palla', labels: { en: 'Off-ball movement', it: 'Movimento senza palla' } },
  { value: 'Rubapalla', labels: { en: 'Ball winner', it: 'Rubapalla' } },
  { value: 'Finishing', labels: { en: 'Finishing', it: 'Finalizzazione' } },
  { value: 'Low Pass', labels: { en: 'Low pass', it: 'Passaggio rasoterra' } },
  { value: 'Lofted Pass', labels: { en: 'Lofted pass', it: 'Passaggio alto' } },
  { value: 'Dribbling', labels: { en: 'Dribbling', it: 'Dribbling' } },
  { value: 'Ball Control', labels: { en: 'Ball control', it: 'Controllo palla' } },
  { value: 'Speed', labels: { en: 'Speed', it: 'Velocita' } },
  { value: 'Acceleration', labels: { en: 'Acceleration', it: 'Accelerazione' } },
  { value: 'Defensive Awareness', labels: { en: 'Defensive awareness', it: 'Consapevolezza difensiva' } },
  { value: 'Tackling', labels: { en: 'Tackling', it: 'Contrasto' } },
  { value: 'Aggression', labels: { en: 'Aggression', it: 'Aggressivita' } },
  { value: 'Physical Contact', labels: { en: 'Physical contact', it: 'Contatto fisico' } },
  { value: 'Stamina', labels: { en: 'Stamina', it: 'Resistenza' } }
]

function clampPercent(value, min = 5, max = 95) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return min
  return Math.max(min, Math.min(max, parsed))
}

function clampGkInGoalMouth(x, y) {
  const nx = Number(x)
  const ny = Number(y)
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) return { x: 50, y: 90 }
  return {
    x: Math.max(GK_GOAL_AREA.xMin, Math.min(GK_GOAL_AREA.xMax, nx)),
    y: Math.max(GK_GOAL_AREA.yMin, Math.min(GK_GOAL_AREA.yMax, ny))
  }
}

function clampPointerForGkSlot(x, y) {
  const xx = clampPercent(x)
  const yy = clampPercent(y)
  if (yy > 80) return clampGkInGoalMouth(xx, yy)
  return { x: xx, y: yy }
}

function normalizeSlotPositionsDxSx(slotPositions) {
  const output = { ...(slotPositions || {}) }
  Object.entries(output).forEach(([key, value]) => {
    if (!value) return
    const x = value.x != null ? Number(value.x) : null
    const position = String(value.position || '').trim().toUpperCase()
    if (x == null || !Number.isFinite(x)) return
    if (position === 'TD' && x < 50) output[key] = { ...value, position: 'TS' }
    if (position === 'TS' && x > 50) output[key] = { ...value, position: 'TD' }
  })
  return output
}

function completeSlotPositions(slotPositions) {
  const complete = { ...(slotPositions || {}) }
  for (let index = 0; index <= 10; index += 1) {
    if (!complete[index]) complete[index] = DEFAULT_SLOT_POSITIONS[index]
  }
  return normalizeSlotPositionsDxSx(complete)
}

function calculatePositionFromCoordinates(slotIndex, x, y, attackSlots = null) {
  const xx = clampPercent(x)
  const yy = clampPercent(y)
  const centerLow = 26
  const centerHigh = 74
  const wingLow = 28
  const wingHigh = 72

  if (yy > 80) return 'PT'
  if (yy >= 63 && yy <= 80) {
    if (xx < 24) return 'TS'
    if (xx > 76) return 'TD'
    return 'DC'
  }
  if (yy >= 40 && yy <= 62) {
    if (xx < wingLow) return 'CLS'
    if (xx > wingHigh) return 'CLD'
    if (yy >= 40 && yy <= 44 && xx >= centerLow && xx <= centerHigh) return 'TRQ'
    if (xx >= centerLow && xx <= centerHigh && yy >= 45 && yy <= 52) return 'CC'
    if (xx >= centerLow && xx <= centerHigh && yy >= 50 && yy <= 62) return 'MED'
    return 'MED'
  }
  if (yy < 40) {
    if (xx < 30) return 'ESA'
    if (xx > 70) return 'EDA'
    if (yy >= 36 && yy <= 40 && xx >= 30 && xx <= 70) return 'TRQ'
    if (attackSlots && attackSlots.length > 1) {
      const sorted = [...attackSlots].sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y
        return (a.x ?? 50) - (b.x ?? 50)
      })
      const currentIndex = sorted.findIndex((slot) => Number(slot.slotIndex) === Number(slotIndex))
      if (currentIndex === 0) return 'P'
      return 'SP'
    }
    if (yy < 25) return 'P'
    if (yy < 35) return 'P'
    return 'SP'
  }
  return 'MED'
}

function applyMedCcHysteresis(previousRole, computedRole, x, y) {
  const previous = String(previousRole || '').trim().toUpperCase()
  const computed = String(computedRole || '').trim().toUpperCase()
  if (!(previous === 'MED' || previous === 'CC')) return computedRole
  if (!(computed === 'MED' || computed === 'CC')) return computedRole
  if (previous === computed) return computedRole

  const xx = clampPercent(x)
  const yy = clampPercent(y)
  const ccCore = xx >= 30 && xx <= 70 && yy >= 45 && yy <= 52
  const outsideCcHold = xx < 27 || xx > 73 || yy < 42 || yy > 60

  if (computed === 'CC') return ccCore ? 'CC' : previous
  if (computed === 'MED') return outsideCcHold ? 'MED' : previous
  return computedRole
}

function hasPlayerSkill(skills, skill) {
  const normalized = normalizeSkillKey(skill)
  return (Array.isArray(skills) ? skills : []).some((entry) => normalizeSkillKey(entry) === normalized)
}

function parseBoosterLevel(rawEffect) {
  const match = String(rawEffect || '').match(/([+-]?\d+)/)
  const parsed = match ? Number(match[1]) : 1
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  if (parsed > 5) return 5
  return parsed
}

function detectBoosterPreset(name) {
  const normalizedName = String(name || '').trim().toLowerCase()
  if (!normalizedName) return 'custom'
  const preset = BOOSTER_PRESETS.find((entry) => entry.value.toLowerCase() === normalizedName)
  return preset ? preset.value : 'custom'
}

function normalizeBoosterEntry(entry) {
  const baseName = String(entry?.name || '').trim()
  const level = parseBoosterLevel(entry?.effect)
  const preset = detectBoosterPreset(baseName)
  return {
    name: baseName || (preset !== 'custom' ? preset : ''),
    effect: `+${level}`,
    preset,
    level
  }
}

/** PESDB `players_payload` spesso non include booster; in gioco ogni carta ha slot con categorie predefinite. */
function getDefaultCatalogBoostersByPosition(position) {
  const pos = String(position || '').toUpperCase().trim()
  const pair = (a, b) => [
    normalizeBoosterEntry({ name: a, effect: '+1' }),
    normalizeBoosterEntry({ name: b, effect: '+1' })
  ]
  if (pos === 'PT') return pair('Portiere', 'Fisicità')
  if (pos === 'P') return pair('Tiro', 'Istinto da attaccante')
  if (pos === 'SP') return pair('Tiro', 'Passaggio')
  if (pos === 'TRQ') return pair('Fantasista', 'Tecnica')
  if (pos === 'CLS' || pos === 'CLD') return pair('Crossatore', 'Agilità')
  if (pos === 'ESA' || pos === 'EDA') return pair('Agilità', 'Tiro')
  if (pos === 'MED' || pos === 'CC') return pair('Tuttocampo', 'Passaggio')
  if (pos === 'DC' || pos === 'TD' || pos === 'TS') return pair('Difesa', 'Pilastro difensivo')
  return pair('Tecnica', 'Passaggio')
}

function resolveCatalogAvailableBoosters(payload, card) {
  const raw = Array.isArray(payload?.available_boosters)
    ? payload.available_boosters
    : Array.isArray(payload?.boosters)
      ? payload.boosters
      : []
  const normalized = raw.map((entry) => normalizeBoosterEntry(entry)).filter((entry) => String(entry?.name || '').trim())
  if (normalized.length > 0) {
    return { boosters: normalized, usedCatalogDefaults: false }
  }
  return {
    boosters: getDefaultCatalogBoostersByPosition(payload?.position || card?.position),
    usedCatalogDefaults: true
  }
}

function normalizeBaseStatsForEditor(baseStats = {}) {
  const attacking = baseStats?.attacking || {}
  const defending = baseStats?.defending || {}
  const athleticism = baseStats?.athleticism || {}
  const goalkeeping = baseStats?.goalkeeping || {}
  const getStat = (bucket, key, ...aliases) => {
    if (bucket?.[key] !== undefined) return bucket[key]
    if (baseStats?.[key] !== undefined) return baseStats[key]
    for (const alias of aliases) {
      if (bucket?.[alias] !== undefined) return bucket[alias]
      if (baseStats?.[alias] !== undefined) return baseStats[alias]
    }
    return ''
  }

  return {
    offensive_awareness: getStat(attacking, 'offensive_awareness', 'offensiveAwareness', 'Offensive Awareness'),
    finishing: getStat(attacking, 'finishing', 'Finishing'),
    low_pass: getStat(attacking, 'low_pass', 'lowPass', 'Low Pass'),
    lofted_pass: getStat(attacking, 'lofted_pass', 'loftedPass', 'Lofted Pass'),
    dribbling: getStat(attacking, 'dribbling', 'Dribbling'),
    ball_control: getStat(attacking, 'ball_control', 'ballControl', 'Ball Control'),
    tight_possession: getStat(attacking, 'tight_possession', 'tightPossession', 'Tight Possession'),
    heading: getStat(attacking, 'heading', 'Heading'),
    set_piece_taking: getStat(attacking, 'set_piece_taking', 'setPieceTaking', 'place_kicking', 'Set Piece Taking'),
    curl: getStat(attacking, 'curl', 'Curl'),
    defensive_awareness: getStat(defending, 'defensive_awareness', 'defensiveAwareness', 'Defensive Awareness'),
    defensive_engagement: getStat(defending, 'defensive_engagement', 'ballWinning', 'Defensive Engagement'),
    tackling: getStat(defending, 'tackling', 'trackingBack', 'Tackling'),
    aggression: getStat(defending, 'aggression', 'Aggression'),
    speed: getStat(athleticism, 'speed', 'Speed'),
    acceleration: getStat(athleticism, 'acceleration', 'Acceleration'),
    kicking_power: getStat(athleticism, 'kicking_power', 'kickingPower', 'Kicking Power'),
    physical_contact: getStat(athleticism, 'physical_contact', 'physicalContact', 'strength', 'Physical Contact'),
    balance: getStat(athleticism, 'balance', 'Balance', 'Body Control'),
    stamina: getStat(athleticism, 'stamina', 'Stamina'),
    jump: getStat(athleticism, 'jump', 'Jump', 'Jumping'),
    gk_awareness: getStat(goalkeeping, 'gk_awareness', 'gkAwareness', 'awareness', 'GK Awareness'),
    gk_catching: getStat(goalkeeping, 'gk_catching', 'gkCatching', 'catching', 'GK Catching'),
    gk_parrying: getStat(goalkeeping, 'gk_parrying', 'gkClearing', 'parrying', 'GK Parrying'),
    gk_reflexes: getStat(goalkeeping, 'gk_reflexes', 'gkReflexes', 'reflexes', 'GK Reflexes'),
    gk_reach: getStat(goalkeeping, 'gk_reach', 'gkReach', 'reach', 'GK Reach')
  }
}

function mapPreviewBaseStatsToFormFields(previewBaseStats = {}) {
  const flat = normalizeBaseStatsForEditor(previewBaseStats)
  const out = {}
  for (const key of Object.keys(flat)) {
    const v = flat[key]
    out[key] = v === '' || v == null ? '' : String(Number(v))
  }
  return out
}

function playProfileStatsFromPreview(preview) {
  return preview?.playProfileStatsNested || nestedEffectiveStatsFromGameplayPreview(preview)
}

function buildBoostersDraftForPreview(boostersDraft = [], player = {}) {
  return boostersDraft.map((entry, idx) => {
    const maxLevel = idx === 1 ? 1 : 5
    const level = Math.min(maxLevel, Math.max(1, Number(entry?.level) || parseBoosterLevel(entry?.effect)))
    return {
      name: String(entry?.name || '').trim(),
      effect: `+${level}`
    }
  })
}

/** Solo booster equipaggiato in rosa — senza active_booster_name non si applica nessuno (come Play). */
function resolveActiveBoosterName(boostersDraft = [], player = {}) {
  const current = String(player?.active_booster_name || '').trim()
  if (!current) return null
  const names = boostersDraft.map((entry) => String(entry?.name || '').trim()).filter(Boolean)
  if (names.some((name) => name.toLowerCase() === current.toLowerCase())) return current
  return null
}

/** Solo persistenza: blocca OVR troppo bassi o crolli sospetti. L'anteprima live non deve usare questa funzione. */
function isSafeBuildPreviewForSave(preview, player) {
  if (!preview?.ok || preview?.overBudget) return false
  const nextOverall = Number(preview?.afterOverall)
  if (!Number.isFinite(nextOverall)) return false
  const currentOverall = Number(player?.overall_rating)
  if (nextOverall < 70) return false
  if (Number.isFinite(currentOverall) && currentOverall >= 85 && nextOverall < currentOverall - 20) return false
  return true
}

function buildBaseStatsPayloadFromEditor(form) {
  const toNum = (value) => {
    if (value === '' || value === null || value === undefined) return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  const attacking = {}
  const defending = {}
  const athleticism = {}
  const goalkeeping = {}

  const mapValue = (bucket, key, value) => {
    const parsed = toNum(value)
    if (parsed === null) return
    bucket[key] = parsed
  }

  mapValue(attacking, 'offensive_awareness', form.offensive_awareness)
  mapValue(attacking, 'finishing', form.finishing)
  mapValue(attacking, 'low_pass', form.low_pass)
  mapValue(attacking, 'lofted_pass', form.lofted_pass)
  mapValue(attacking, 'dribbling', form.dribbling)
  mapValue(attacking, 'ball_control', form.ball_control)
  mapValue(attacking, 'tight_possession', form.tight_possession)
  mapValue(attacking, 'heading', form.heading)
  mapValue(attacking, 'set_piece_taking', form.set_piece_taking)
  mapValue(attacking, 'curl', form.curl)

  mapValue(defending, 'defensive_awareness', form.defensive_awareness)
  mapValue(defending, 'defensive_engagement', form.defensive_engagement)
  mapValue(defending, 'tackling', form.tackling)
  mapValue(defending, 'aggression', form.aggression)

  mapValue(athleticism, 'speed', form.speed)
  mapValue(athleticism, 'acceleration', form.acceleration)
  mapValue(athleticism, 'kicking_power', form.kicking_power)
  mapValue(athleticism, 'physical_contact', form.physical_contact)
  mapValue(athleticism, 'balance', form.balance)
  mapValue(athleticism, 'stamina', form.stamina)
  mapValue(athleticism, 'jump', form.jump)

  mapValue(goalkeeping, 'gk_awareness', form.gk_awareness)
  mapValue(goalkeeping, 'gk_catching', form.gk_catching)
  mapValue(goalkeeping, 'gk_parrying', form.gk_parrying)
  mapValue(goalkeeping, 'gk_reflexes', form.gk_reflexes)
  mapValue(goalkeeping, 'gk_reach', form.gk_reach)

  const output = {}
  if (Object.keys(attacking).length > 0) output.attacking = attacking
  if (Object.keys(defending).length > 0) output.defending = defending
  if (Object.keys(athleticism).length > 0) output.athleticism = athleticism
  if (Object.keys(goalkeeping).length > 0) output.goalkeeping = goalkeeping
  return output
}

/** eFootball: slot collegamento (secondo) ammette solo booster +1. */
function clampBoosterEntryForSlot(entry, slotIndex) {
  const n = normalizeBoosterEntry(entry)
  if (slotIndex === 1 && n.level > 1) return { ...n, level: 1, effect: '+1' }
  return n
}

function BoosterHexBadge({ active, level, onClick, disabled, ariaLabel, title }) {
  const filterId = React.useId().replace(/:/g, 'booster')
  const stroke = active ? '#5cf0ff' : '#6b7389'
  const fillHex = active ? 'rgba(0, 48, 62, 0.72)' : 'rgba(26, 30, 42, 0.92)'
  const interactive = Boolean(onClick) && !disabled
  const inner = (
    <>
      <svg viewBox="0 0 80 80" width="56" height="56" aria-hidden="true" focusable="false" className="nr-booster-hex-svg">
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter={active ? `url(#${filterId})` : undefined}>
          <polygon
            points="40,7 69,24 69,56 40,73 11,56 11,24"
            fill={fillHex}
            stroke={stroke}
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
        </g>
        <g stroke={stroke} fill="none" strokeLinecap="round" vectorEffect="non-scaling-stroke">
          <circle cx="40" cy="40" r="11.5" strokeWidth="2.7" strokeDasharray="48 24" transform="rotate(-95 40 40)" />
          <line strokeWidth="2.7" x1="26" y1="40" x2="54" y2="40" />
        </g>
      </svg>
      {active && level != null ? (
        <span className="nr-booster-hex-level">+{level}</span>
      ) : null}
    </>
  )
  if (interactive) {
    return (
      <button
        type="button"
        title={title}
        className={`nr-booster-hex-badge nr-booster-hex-badge--interactive ${active ? 'nr-booster-hex-badge--active' : 'nr-booster-hex-badge--idle'}`}
        onClick={onClick}
        aria-label={ariaLabel || title || 'Booster'}
      >
        {inner}
      </button>
    )
  }
  return (
    <div className={`nr-booster-hex-badge ${active ? 'nr-booster-hex-badge--active' : 'nr-booster-hex-badge--idle'}`} title={title}>
      {inner}
    </div>
  )
}

function PremiumPlayerModal({
  show,
  player,
  slot,
  onClose,
  onSave,
  onBuildCoach,
  onRemoveFromSlot,
  onDeletePlayer,
  onOpenReplace,
  saving,
  building,
  activeCoach,
  tacticalSettings,
  lang,
  t
}) {
  const cardImage = resolvePlayerCardImageUrl(player)
  const [form, setForm] = React.useState({
    player_name: '',
    position: '',
    overall_rating: '',
    card_type: '',
    role: '',
    age: '',
    nationality: '',
    club_name: '',
    offensive_awareness: '',
    finishing: '',
    low_pass: '',
    lofted_pass: '',
    dribbling: '',
    ball_control: '',
    tight_possession: '',
    heading: '',
    set_piece_taking: '',
    curl: '',
    defensive_awareness: '',
    defensive_engagement: '',
    tackling: '',
    aggression: '',
    speed: '',
    acceleration: '',
    kicking_power: '',
    physical_contact: '',
    balance: '',
    stamina: '',
    jump: '',
    gk_awareness: '',
    gk_catching: '',
    gk_parrying: '',
    gk_reflexes: '',
    gk_reach: ''
  })
  const [skillsDraft, setSkillsDraft] = React.useState([])
  const [selectedSkillPreset, setSelectedSkillPreset] = React.useState('')
  const [boostersDraft, setBoostersDraft] = React.useState([])
  const [showAllSkills, setShowAllSkills] = React.useState(false)
  const [originalPositionsDraft, setOriginalPositionsDraft] = React.useState([])
  const [showPositionEditor, setShowPositionEditor] = React.useState(false)
  const [interactiveBuildSliders, setInteractiveBuildSliders] = React.useState(null)

  React.useEffect(() => {
    if (!show || !player) return
    const slotProgressionPosition = slot?.position ?? null
    let normalizedStats = normalizeBaseStatsForEditor(getPlayerDisplayStats(player) || {})
    let overallRatingStr = player.overall_rating != null ? String(player.overall_rating) : ''
    const savedBuild = getPlayerBuildCoachData(player)
    const rawSavedSliders = savedBuild?.sliders && typeof savedBuild.sliders === 'object' ? savedBuild.sliders : null
    const savedSliders = rawSavedSliders ? sanitizeBuildCoachSliders(rawSavedSliders) : null
    const hasSavedSliders = savedSliders && Object.keys(savedSliders).length > 0
    if (hasSavedSliders) {
      const previewPlayer = buildPlayerForPlayProfilePreview(player, {
        activeBoosterName: player.active_booster_name,
        availableBoosters: player.available_boosters
      })
      const openPreview = previewGameplayBuildFromSliders({
        player: previewPlayer,
        sliders: savedSliders,
        slotPosition: slotProgressionPosition
      })
      const profileStats = playProfileStatsFromPreview(openPreview)
      if (profileStats && typeof profileStats === 'object' && Number.isFinite(openPreview.afterOverall)) {
        normalizedStats = { ...normalizedStats, ...mapPreviewBaseStatsToFormFields(profileStats) }
        overallRatingStr = String(openPreview.afterOverall)
      }
    }
    setForm({
      player_name: player.player_name || '',
      position: player.position || '',
      overall_rating: overallRatingStr,
      card_type: player.card_type || '',
      role: player.role || player.playing_style_name || '',
      age: player.age != null ? String(player.age) : '',
      nationality: player.nationality || '',
      club_name: player.club_name || '',
      ...normalizedStats
    })
    setSkillsDraft(normalizePlayerSkillsArray(Array.isArray(player.skills) ? player.skills : []))
    setSelectedSkillPreset('')
    setShowAllSkills(false)
    setOriginalPositionsDraft(buildInitialPositionsFromPlayer(player))
    setShowPositionEditor(false)
    setBoostersDraft(
      Array.isArray(player.available_boosters)
        ? player.available_boosters.map((entry, idx) => clampBoosterEntryForSlot(entry, idx))
        : []
    )
    setInteractiveBuildSliders(hasSavedSliders ? savedSliders : null)
  }, [show, player, player?.updated_at, slot?.position])

  if (!show || !player) return null

  const addSkill = (skillValue) => {
    const normalized = String(skillValue || '').trim()
    if (!normalized) return
    if (hasPlayerSkill(skillsDraft, normalized)) {
      setSelectedSkillPreset('')
      setShowAllSkills(true)
      return
    }
    setSkillsDraft((prev) => [...prev, normalized])
    setSelectedSkillPreset('')
    setShowAllSkills(true)
  }

  const removeSkill = (skill) => {
    setSkillsDraft((prev) => prev.filter((entry) => entry !== skill))
  }

  const addBooster = () => {
    const defaultPreset = BOOSTER_PRESETS[0]?.value || 'custom'
    setBoostersDraft((prev) => {
      if (prev.length >= 2) return prev
      const slotIndex = prev.length
      const entry = normalizeBoosterEntry({ name: defaultPreset, effect: '+1' })
      return [...prev, clampBoosterEntryForSlot(entry, slotIndex)]
    })
  }

  const updateBooster = (index, key, value) => {
    setBoostersDraft((prev) => prev.map((entry, idx) => idx === index ? { ...(entry || {}), [key]: value } : entry))
  }

  const updateBoosterPreset = (index, presetValue) => {
    setBoostersDraft((prev) => prev.map((entry, idx) => {
      if (idx !== index) return entry
      if (presetValue === 'custom') {
        const next = { ...(entry || {}), preset: 'custom', name: entry?.name || '' }
        return index === 1 ? clampBoosterEntryForSlot(next, 1) : next
      }
      const next = {
        ...(entry || {}),
        preset: presetValue,
        name: presetValue
      }
      return index === 1 ? clampBoosterEntryForSlot(next, 1) : next
    }))
  }

  const updateBoosterLevel = (index, level) => {
    const maxLevel = index === 1 ? 1 : 5
    const nextLevel = Math.min(maxLevel, Math.max(1, Number(level) || 1))
    setBoostersDraft((prev) => prev.map((entry, idx) => {
      if (idx !== index) return entry
      return {
        ...(entry || {}),
        level: nextLevel,
        effect: `+${nextLevel}`
      }
    }))
  }

  const removeBooster = (index) => {
    setBoostersDraft((prev) => prev.filter((_, idx) => idx !== index))
  }

  const boosterCount = boostersDraft.length
  const roleCount = originalPositionsDraft.length
  const visibleSkills = showAllSkills ? skillsDraft : skillsDraft.slice(0, 10)
  const hiddenSkillsCount = Math.max(0, skillsDraft.length - visibleSkills.length)
  const buildCoachData = getPlayerBuildCoachData(player)
  const buildSliders = buildCoachData?.sliders && typeof buildCoachData.sliders === 'object'
    ? buildCoachData.sliders
    : null
  const buildPointsUsed = buildCoachData?.points_used ?? buildCoachData?.pointsUsed ?? null
  const buildPointsAvailable = buildCoachData?.points_available ?? buildCoachData?.pointsAvailable ?? null
  const buildTargetPosition = buildCoachData?.target_position || buildCoachData?.targetPosition || null
  const buildReasonsLines = pickBilingualList(buildCoachData?.reasons, lang)
  const buildWarningLines = pickBilingualList(buildCoachData?.warnings, lang)

  const slotProgressionPosition = slot?.position ?? null
  const teamPlayingStyle = tacticalSettings?.team_playing_style ?? null

  const effectiveBuildSliders = buildSliders
    ? sanitizeBuildCoachSliders(interactiveBuildSliders ?? buildSliders)
    : null
  const previewBoosters = buildBoostersDraftForPreview(boostersDraft, player)
  const previewPlayer = buildPlayerForPlayProfilePreview(player, {
    activeBoosterName: resolveActiveBoosterName(boostersDraft, player),
    availableBoosters: previewBoosters
  })
  const buildAllocationLivePreview = effectiveBuildSliders && player
    ? previewGameplayBuildFromSliders({
      player: previewPlayer,
      sliders: effectiveBuildSliders,
      slotPosition: slotProgressionPosition,
      coach: activeCoach,
      teamStyle: teamPlayingStyle
    })
    : null
  const liveBuildPointsUsed =
    buildAllocationLivePreview?.pointsUsed ?? buildPointsUsed
  const liveBuildPointsAvailable =
    buildAllocationLivePreview?.pointsAvailable ?? buildPointsAvailable
  const liveBuildOverBudget = Boolean(buildAllocationLivePreview?.overBudget)

  const applyPreviewToForm = (slidersSnapshot) => {
    const preview = previewGameplayBuildFromSliders({
      player: previewPlayer,
      sliders: slidersSnapshot,
      slotPosition: slotProgressionPosition,
      coach: activeCoach,
      teamStyle: teamPlayingStyle
    })
    const profileStats = playProfileStatsFromPreview(preview)
    if (!preview || !Number.isFinite(Number(preview.afterOverall))) return
    if (!profileStats || typeof profileStats !== 'object') return
    setForm((prev) => ({
      ...prev,
      ...mapPreviewBaseStatsToFormFields(profileStats),
      overall_rating: String(preview.afterOverall)
    }))
  }

  const handleBuildMacroSliderInput = (key, rawValue) => {
    if (!buildSliders) return
    const cur = sanitizeBuildCoachSliders(interactiveBuildSliders ?? buildSliders)
    const next = setBuildSliderTicks({
      player,
      sliders: cur,
      key,
      targetTicks: rawValue,
      slotPosition: slotProgressionPosition
    })
    setInteractiveBuildSliders(next)
    applyPreviewToForm(next)
  }

  const handleBuildMacroNudge = (key, delta) => {
    if (!buildSliders) return
    const cur = sanitizeBuildCoachSliders(interactiveBuildSliders ?? buildSliders)
    const next = tryApplyBuildSliderDelta({
      player,
      sliders: cur,
      key,
      delta,
      slotPosition: slotProgressionPosition
    })
    if (!next) return
    setInteractiveBuildSliders(next)
    applyPreviewToForm(next)
  }

  const getEditorSavePayload = () => {
    const sliderPayloadPreview =
      buildSliders && interactiveBuildSliders != null
        ? previewGameplayBuildFromSliders({
          player: previewPlayer,
          sliders: sanitizeBuildCoachSliders(interactiveBuildSliders ?? buildSliders),
          slotPosition: slotProgressionPosition,
          coach: activeCoach,
          teamStyle: teamPlayingStyle
        })
        : null

    const payload = {
      player_name: form.player_name.trim(),
      position: originalPositionsDraft[0]?.position || form.position,
      overall_rating: null,
      card_type: form.card_type,
      role: form.role,
      age: form.age ? Number(form.age) : null,
      nationality: form.nationality,
      club_name: form.club_name,
      skills: normalizePlayerSkillsArray(skillsDraft),
      available_boosters: boostersDraft.map((entry, idx) => {
        const maxLevel = idx === 1 ? 1 : 5
        const level = Math.min(maxLevel, Math.max(1, Number(entry?.level) || parseBoosterLevel(entry?.effect)))
        return {
          name: String(entry?.name || '').trim(),
          effect: `+${level}`
        }
      }),
      active_booster_name: resolveActiveBoosterName(boostersDraft, player),
      original_positions: originalPositionsDraft,
      base_stats: buildBaseStatsPayloadFromEditor(form),
      metadata: { catalog_booster_reminder: false }
    }

    const shouldPersistBuildPreview =
      sliderPayloadPreview?.ok &&
      interactiveBuildSliders != null &&
      isSafeBuildPreviewForSave(sliderPayloadPreview, player)

    if (shouldPersistBuildPreview) {
      const preview = sliderPayloadPreview
      const effectiveNested = playProfileStatsFromPreview(preview)
      const baselineNested = nestedBaselineStatsFromGameplayPreview(preview)
      if (effectiveNested) payload.base_stats = effectiveNested
      payload.overall_rating = preview.fieldOverall ?? preview.afterOverall
      const appPosition = String(payload.position || player.position || '').trim().toUpperCase()
      payload.position_ratings = {
        ...(player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {}),
        ...(preview.targetPosition
          ? { [preview.targetPosition]: preview.fieldOverall ?? preview.afterOverall }
          : {}),
        ...(appPosition ? { [appPosition]: preview.fieldOverall ?? preview.afterOverall } : {})
      }

      const now = new Date().toISOString()
      const prevDp = player.development_points || {}
      const prevBc = prevDp.build_coach || {}
      const prevMetaBc = player.metadata?.build_coach || {}
      payload.development_points = {
        ...prevDp,
        build_coach: {
          ...prevBc,
          sliders: preview.sliders,
          points_used: preview.pointsUsed,
          points_available: preview.pointsAvailable,
          target_position: preview.targetPosition,
          updated_at: now
        }
      }
      payload.metadata = {
        catalog_booster_reminder: false,
        build_coach: {
          ...prevMetaBc,
          ...(baselineNested
            ? {
                before: {
                  ...(prevMetaBc.before || {}),
                  base_stats: baselineNested
                }
              }
            : {}),
          after: {
            ...(prevMetaBc.after || {}),
            play_profile_overall: preview.playProfileOverall ?? preview.afterOverall,
            field_overall: preview.fieldOverall ?? preview.afterOverall,
            overall_rating: preview.playProfileOverall ?? preview.afterOverall,
            overall_cap: preview.overallCap ?? null,
            effective_base_stats: effectiveNested
          }
        }
      }
    }

    return payload
  }

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onClose}
      title={player.player_name}
      subtitle={lang === 'en' ? 'Player editor' : 'Editor giocatore'}
      className="nr-premium-player-shell"
    >
      <div className="nr-premium-player-scroll">
      <div className="nr-premium-player-layout">
        <section className="nr-premium-hero">
          <div className="nr-premium-hero-top">
            <div className="nr-premium-hero-copy">
              <span className="nr-mini-kicker">
                {player?.metadata?.catalog_card_type || player.card_type || (lang === 'en' ? 'Roster player' : 'Giocatore rosa')}
              </span>
              <h3>{player.player_name}</h3>
              <p>{player.role || player.playing_style_name || '-'} · {player.position || '-'}</p>
            </div>
            <div className="nr-premium-overall">
              <span>OVR</span>
              <strong>
                {buildAllocationLivePreview != null && Number.isFinite(buildAllocationLivePreview.afterOverall)
                  ? buildAllocationLivePreview.afterOverall
                  : rosterFormationOvr(player, slot)}
              </strong>
            </div>
          </div>

          <div className="nr-premium-hero-main">
            <div className="nr-premium-card-frame">
              {cardImage ? (
                <img src={cardImage} alt={player.player_name} />
              ) : (
                <div className="nr-slot-avatar-fallback"><User size={26} /></div>
              )}
            </div>

            <div className="nr-premium-side-stats">
              <div>
                <span>{lang === 'en' ? 'Height' : 'Altezza'}</span>
                <strong>{player.height ?? '-'}</strong>
              </div>
              <div>
                <span>{lang === 'en' ? 'Weight' : 'Peso'}</span>
                <strong>{player.weight ?? '-'}</strong>
              </div>
              <div>
                <span>{lang === 'en' ? 'Age' : 'Eta'}</span>
                <strong>{player.age ?? '-'}</strong>
              </div>
              <div>
                <span>{lang === 'en' ? 'Club' : 'Club'}</span>
                <strong>{player.club_name || '-'}</strong>
              </div>
              <div>
                <span>{lang === 'en' ? 'Nationality' : 'Nazionalita'}</span>
                <strong>{player.nationality || '-'}</strong>
              </div>
              <div>
                <span>{lang === 'en' ? 'Card type' : 'Tipo carta'}</span>
                <strong>{player.card_type || '-'}</strong>
              </div>
            </div>
          </div>

          <div className="nr-premium-summary-row">
            <div><span>{lang === 'en' ? 'Skills' : 'Abilita'}</span><strong>{skillsDraft.length}</strong></div>
            <div><span>{lang === 'en' ? 'Boosters' : 'Boosters'}</span><strong>{boosterCount}</strong></div>
            <div><span>{lang === 'en' ? 'Roles' : 'Ruoli'}</span><strong>{roleCount}</strong></div>
          </div>
        </section>

        <section className="nr-premium-sections">
          <EnterpriseSection title={lang === 'en' ? 'Player setup' : 'Setup giocatore'}>
            <div className="nr-form-grid">
              <EnterpriseInput label="OVR" value={form.overall_rating} type="number" onChange={(value) => setForm((prev) => ({ ...prev, overall_rating: value }))} />
            </div>
            <div className="nr-build-coach-inline">
              <div>
                <strong>{lang === 'en' ? 'Guided build' : 'Build guidata'}</strong>
                <p>{lang === 'en'
                  ? 'Suggested growth points for role, native skills, team style and squad needs. Highest OVR is not always the best build.'
                  : 'Punti crescita consigliati per ruolo, abilità native, stile squadra e bisogni della rosa. L’OVR più alto non è sempre la build migliore.'}</p>
              </div>
              <button
                type="button"
                className="nr-primary-button"
                onClick={() => onBuildCoach?.(player)}
                disabled={saving || building}
              >
                {building ? <RefreshCw size={14} className="nr-spin" /> : <Sparkles size={14} />}
                {building ? (lang === 'en' ? 'Calculating...' : 'Calcolo...') : (lang === 'en' ? 'Suggest build' : 'Consiglia build')}
              </button>
            </div>
            {buildSliders && (
              <div className="nr-build-copy-card">
                <div className="nr-build-copy-head">
                  <div>
                    <strong>{lang === 'en' ? 'Build ready to copy in game' : 'Build pronta da copiare in gioco'}</strong>
                    <p>{lang === 'en'
                      ? 'Use these progression values in the game if you want to reproduce this build. The shown OVR includes active boosters and coach bonuses when available.'
                      : 'Usa questi valori nella schermata progressione del gioco se vuoi replicare questa build. L’OVR mostrato include booster e bonus coach attivi quando disponibili.'}</p>
                  </div>
                  <div className="nr-build-copy-meta">
                    {buildTargetPosition && <span>{buildTargetPosition}</span>}
                    {liveBuildPointsUsed !== null && liveBuildPointsAvailable !== null && (
                      <span className={liveBuildOverBudget ? 'nr-build-pt-over' : undefined}>
                        {liveBuildPointsUsed}/{liveBuildPointsAvailable} PT
                        {liveBuildOverBudget
                          ? (lang === 'en' ? ' · over budget' : ' · budget superato')
                          : ''}
                      </span>
                    )}
                  </div>
                </div>
                <p className="nr-build-slider-hint">
                  {lang === 'en'
                    ? 'Adjust the sliders: PT costs and role limits follow the game, stats and final OVR update live.'
                    : 'Regola gli slider: costi PT e limiti ruolo seguono il gioco, statistiche e OVR finale si aggiornano in tempo reale.'}
                </p>
                <div className="nr-build-slider-grid nr-build-slider-grid--interactive">
                  {BUILD_SLIDER_ORDER.map((key) => {
                    const blocked = isBuildMacroBlockedForPlayer(player, key, slotProgressionPosition)
                    const ticks = Number(effectiveBuildSliders?.[key] || 0)
                    const canInc =
                      !blocked &&
                      tryApplyBuildSliderDelta({
                        player,
                        sliders: effectiveBuildSliders,
                        key,
                        delta: 1,
                        slotPosition: slotProgressionPosition
                      }) != null
                    const canDec = !blocked && ticks > 0
                    return (
                      <div
                        key={key}
                        className={`nr-build-slider-row ${ticks > 0 ? 'is-active' : ''} ${blocked ? 'is-blocked' : ''}`}
                      >
                        <span className="nr-build-slider-row-label">{getBuildSliderLabel(key, lang)}</span>
                        <input
                          type="range"
                          min={0}
                          max={MAX_TACCE_PER_MACRO}
                          step={1}
                          value={blocked ? 0 : ticks}
                          disabled={blocked || saving || building}
                          onChange={(event) => handleBuildMacroSliderInput(key, Number(event.target.value))}
                          aria-label={getBuildSliderLabel(key, lang)}
                        />
                        <div className="nr-build-slider-row-controls">
                          <button
                            type="button"
                            className="nr-build-macro-nudge"
                            disabled={!canDec || saving || building}
                            onClick={() => handleBuildMacroNudge(key, -1)}
                            aria-label={lang === 'en' ? 'Decrease' : 'Diminuisci'}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="nr-build-slider-row-val">{ticks}</span>
                          <button
                            type="button"
                            className="nr-build-macro-nudge"
                            disabled={!canInc || saving || building}
                            onClick={() => handleBuildMacroNudge(key, 1)}
                            aria-label={lang === 'en' ? 'Increase' : 'Aumenta'}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {(buildReasonsLines.length > 0 || buildWarningLines.length > 0) && (
              <div className="nr-build-coach-notes">
                {buildWarningLines.length > 0 ? (
                  <div className="nr-build-coach-notes-warn" role="status">
                    {buildWarningLines.map((line, idx) => (
                      <p key={`bcw-${idx}`}>{line}</p>
                    ))}
                  </div>
                ) : null}
                {buildReasonsLines.length > 0 ? (
                  <div className="nr-build-coach-notes-reasons">
                    <strong>{lang === 'en' ? 'Why these points' : 'Perché questi punti'}</strong>
                    <ul>
                      {buildReasonsLines.map((line, idx) => (
                        <li key={`bcr-${idx}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
            <div className="nr-role-editor-card">
              <div className="nr-role-editor-head">
                <div>
                  <strong>{lang === 'en' ? 'Playable roles' : 'Ruoli giocabili'}</strong>
                  <p>{lang === 'en' ? 'Main role is the first selected role.' : 'Il ruolo principale e il primo ruolo selezionato.'}</p>
                </div>
                <button type="button" className="nr-secondary-button" onClick={() => setShowPositionEditor(true)}>
                  {lang === 'en' ? 'Edit roles' : 'Modifica ruoli'}
                </button>
              </div>
              <div className="nr-role-chip-row">
                {originalPositionsDraft.length > 0 ? originalPositionsDraft.map((entry) => (
                  <span
                    key={`${entry.position}-${entry.competence}`}
                    className="nr-role-chip"
                    title={t(getPositionRoleTranslationKey(entry.position))}
                  >
                    {entry.position} · {entry.competence || (lang === 'en' ? 'High' : 'Alta')}
                  </span>
                )) : (
                  <span className="nr-skill-empty">{lang === 'en' ? 'No playable roles set.' : 'Nessun ruolo giocabile impostato.'}</span>
                )}
              </div>
            </div>
            <p className="nr-setup-readonly-note">
              {lang === 'en'
                ? 'Base data (name, age, club, nationality) syncs from catalog/photo source. You can edit OVR, playable roles and performance stats here.'
                : 'I dati base (nome, eta, club, nazionalita) seguono la sorgente catalogo/foto. Qui puoi modificare OVR, ruoli giocabili e statistiche.'}
            </p>
          </EnterpriseSection>

          <div className="nr-premium-toolbar-row">
            <div className="nr-secondary-actions">
              {player.slot_index !== null && player.slot_index !== undefined && (
                <>
                  <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player)}>
                    {lang === 'en' ? 'Replace from catalog' : 'Sostituisci da catalogo'}
                  </button>
                  <button type="button" className="nr-secondary-button" onClick={() => onRemoveFromSlot(player.id)}>
                    {lang === 'en' ? 'Move to reserves' : 'Sposta in riserva'}
                  </button>
                </>
              )}
            </div>
            <div className="nr-danger-zone">
              <span>{lang === 'en' ? 'Danger area' : 'Area pericolosa'}</span>
              <button type="button" className="nr-danger-button" onClick={() => onDeletePlayer(player.id)}>
                <Trash2 size={14} />
                {lang === 'en' ? 'Delete permanently' : 'Elimina definitivamente'}
              </button>
            </div>
          </div>

          <div className="nr-reference-main-grid">
            <section className="nr-reference-left">
              <EnterpriseSection title={t('attacking')}>
                <div className="nr-stat-pairs">
                  <CompactStatInput label={t('offensive_awareness')} value={form.offensive_awareness} onChange={(value) => setForm((prev) => ({ ...prev, offensive_awareness: value }))} />
                  <CompactStatInput label={t('finishing')} value={form.finishing} onChange={(value) => setForm((prev) => ({ ...prev, finishing: value }))} />
                  <CompactStatInput label={t('low_pass')} value={form.low_pass} onChange={(value) => setForm((prev) => ({ ...prev, low_pass: value }))} />
                  <CompactStatInput label={t('lofted_pass')} value={form.lofted_pass} onChange={(value) => setForm((prev) => ({ ...prev, lofted_pass: value }))} />
                  <CompactStatInput label={t('dribbling')} value={form.dribbling} onChange={(value) => setForm((prev) => ({ ...prev, dribbling: value }))} />
                  <CompactStatInput label={t('ball_control')} value={form.ball_control} onChange={(value) => setForm((prev) => ({ ...prev, ball_control: value }))} />
                  <CompactStatInput label={t('tight_possession')} value={form.tight_possession} onChange={(value) => setForm((prev) => ({ ...prev, tight_possession: value }))} />
                  <CompactStatInput label={t('heading')} value={form.heading} onChange={(value) => setForm((prev) => ({ ...prev, heading: value }))} />
                  <CompactStatInput label={t('place_kicking')} value={form.set_piece_taking} onChange={(value) => setForm((prev) => ({ ...prev, set_piece_taking: value }))} />
                  <CompactStatInput label={t('curl')} value={form.curl} onChange={(value) => setForm((prev) => ({ ...prev, curl: value }))} />
                </div>
              </EnterpriseSection>
            </section>

            <section className="nr-reference-center">
              <EnterpriseSection title={t('defending')}>
                <div className="nr-stat-pairs">
                  <CompactStatInput label={t('defensive_awareness')} value={form.defensive_awareness} onChange={(value) => setForm((prev) => ({ ...prev, defensive_awareness: value }))} />
                  <CompactStatInput label={t('defensive_engagement')} value={form.defensive_engagement} onChange={(value) => setForm((prev) => ({ ...prev, defensive_engagement: value }))} />
                  <CompactStatInput label={t('tackling')} value={form.tackling} onChange={(value) => setForm((prev) => ({ ...prev, tackling: value }))} />
                  <CompactStatInput label={t('aggression')} value={form.aggression} onChange={(value) => setForm((prev) => ({ ...prev, aggression: value }))} />
                </div>
              </EnterpriseSection>

            </section>

            <section className="nr-reference-right">
              <EnterpriseSection title={t('athleticism')}>
                <div className="nr-stat-pairs">
                  <CompactStatInput label={t('speed')} value={form.speed} onChange={(value) => setForm((prev) => ({ ...prev, speed: value }))} />
                  <CompactStatInput label={t('acceleration')} value={form.acceleration} onChange={(value) => setForm((prev) => ({ ...prev, acceleration: value }))} />
                  <CompactStatInput label={t('kicking_power')} value={form.kicking_power} onChange={(value) => setForm((prev) => ({ ...prev, kicking_power: value }))} />
                  <CompactStatInput label={t('physical_contact')} value={form.physical_contact} onChange={(value) => setForm((prev) => ({ ...prev, physical_contact: value }))} />
                  <CompactStatInput label={t('balance')} value={form.balance} onChange={(value) => setForm((prev) => ({ ...prev, balance: value }))} />
                  <CompactStatInput label={t('stamina')} value={form.stamina} onChange={(value) => setForm((prev) => ({ ...prev, stamina: value }))} />
                  <CompactStatInput label={t('jump')} value={form.jump} onChange={(value) => setForm((prev) => ({ ...prev, jump: value }))} />
                </div>
              </EnterpriseSection>
            </section>

            <section className="nr-reference-goalkeeping">
              <EnterpriseSection title={t('goalkeeping')}>
                <div className="nr-stat-pairs">
                  <CompactStatInput label={t('goalkeeping')} value={form.gk_awareness} onChange={(value) => setForm((prev) => ({ ...prev, gk_awareness: value }))} />
                  <CompactStatInput label={t('gk_catching')} value={form.gk_catching} onChange={(value) => setForm((prev) => ({ ...prev, gk_catching: value }))} />
                  <CompactStatInput label={t('gk_parrying')} value={form.gk_parrying} onChange={(value) => setForm((prev) => ({ ...prev, gk_parrying: value }))} />
                  <CompactStatInput label={t('gk_reflexes')} value={form.gk_reflexes} onChange={(value) => setForm((prev) => ({ ...prev, gk_reflexes: value }))} />
                  <CompactStatInput label={t('gk_reach')} value={form.gk_reach} onChange={(value) => setForm((prev) => ({ ...prev, gk_reach: value }))} />
                </div>
              </EnterpriseSection>
            </section>
          </div>

          <div className="nr-reference-support-grid">
            <section className="nr-reference-skills">
              <EnterpriseSection title={lang === 'en' ? 'Skills' : 'Abilita'}>
                <div className="nr-skill-command-panel">
                  <label className="nr-form-field">
                    <span>{t('nuovaRosaSelectOfficialSkill')}</span>
                    <select
                      value={selectedSkillPreset}
                      onChange={(event) => {
                        const value = event.target.value
                        setSelectedSkillPreset(value)
                        if (value) addSkill(value)
                      }}
                    >
                      <option value="">{t('nuovaRosaChooseOfficialSkill')}</option>
                      {PLAYER_SKILL_PRESETS.map((skill) => (
                        <option key={skill} value={skill} disabled={hasPlayerSkill(skillsDraft, skill)}>
                          {getSkillDisplayLabel(skill, lang)}
                        </option>
                      ))}
                    </select>
                  </label>

                </div>

                <div className="nr-skill-chip-row">
                  {visibleSkills.length > 0 ? visibleSkills.map((skill) => (
                    <button key={skill} type="button" className="nr-skill-chip" onClick={() => removeSkill(skill)}>
                      {getSkillDisplayLabel(skill, lang)}
                      <X size={12} />
                    </button>
                  )) : (
                    <span className="nr-skill-empty">{lang === 'en' ? 'No skills yet.' : 'Nessuna abilita ancora.'}</span>
                  )}
                </div>
                {skillsDraft.length > 10 ? (
                  <button type="button" className="nr-secondary-button nr-skills-toggle" onClick={() => setShowAllSkills((prev) => !prev)}>
                    {showAllSkills
                      ? (lang === 'en' ? 'Show less' : 'Mostra meno')
                      : (lang === 'en' ? `Show all (${skillsDraft.length})` : `Mostra tutte (${skillsDraft.length})`)}
                  </button>
                ) : null}
                {!showAllSkills && hiddenSkillsCount > 0 ? (
                  <span className="nr-skill-hidden-counter">
                    {lang === 'en'
                      ? `${hiddenSkillsCount} hidden skills`
                      : `${hiddenSkillsCount} abilita nascoste`}
                  </span>
                ) : null}
              </EnterpriseSection>
            </section>

            <section className="nr-reference-boosters">
              <EnterpriseSection title={lang === 'en' ? 'Boosters' : 'Boosters'}>
                <div className="nr-booster-slot-grid">
                  {[0, 1].map((slotIndex) => {
                    const booster = boostersDraft[slotIndex]
                    const selectedPreset = booster?.preset || detectBoosterPreset(booster?.name)
                    const rawLevel = Number(booster?.level || parseBoosterLevel(booster?.effect || '+1'))
                    const activeLevel = slotIndex === 1 ? Math.min(1, rawLevel) : Math.min(5, rawLevel)
                    const hexAddOnly = !booster && (
                      (slotIndex === 0 && boostersDraft.length === 0)
                      || (slotIndex === 1 && boostersDraft.length === 1)
                    )
                    const addHint = lang === 'en' ? 'Add booster' : 'Aggiungi booster'
                    return (
                      <div key={`booster-slot-${slotIndex}`} className="nr-booster-slot-card nr-booster-slot-card--ef">
                        <div className="nr-booster-slot-top">
                          <BoosterHexBadge
                            active={Boolean(booster)}
                            level={booster ? activeLevel : null}
                            onClick={hexAddOnly ? addBooster : undefined}
                            title={hexAddOnly ? addHint : undefined}
                            ariaLabel={hexAddOnly ? addHint : undefined}
                          />
                          <div className="nr-booster-slot-top-copy">
                            <div className="nr-booster-row-head">
                              <span className="nr-booster-slot-only">{slotIndex + 1}</span>
                              {booster ? (
                                <button
                                  type="button"
                                  className="nr-icon-button"
                                  onClick={() => removeBooster(slotIndex)}
                                  aria-label={lang === 'en' ? 'Remove booster' : 'Rimuovi booster'}
                                >
                                  <X size={12} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {booster ? (
                          <>
                            <label className="nr-form-field nr-form-field--tight">
                              <span className="nr-booster-cat-lbl">{lang === 'en' ? 'Type' : 'Tipo'}</span>
                              <select
                                aria-label={lang === 'en' ? 'Booster category' : 'Categoria booster'}
                                value={selectedPreset}
                                onChange={(event) => updateBoosterPreset(slotIndex, event.target.value)}
                              >
                                {BOOSTER_PRESETS.map((preset) => (
                                  <option key={preset.value} value={preset.value}>
                                    {lang === 'en' ? preset.labels.en : preset.labels.it}
                                  </option>
                                ))}
                                <option value="custom">{lang === 'en' ? 'Custom' : 'Personalizzato'}</option>
                              </select>
                            </label>
                            {selectedPreset === 'custom' ? (
                              <EnterpriseInput
                                label={lang === 'en' ? 'Name' : 'Nome'}
                                value={String(booster?.name || '')}
                                onChange={(value) => updateBooster(slotIndex, 'name', value)}
                                placeholder={lang === 'en' ? 'Custom' : 'Personalizzato'}
                              />
                            ) : null}
                            <div className="nr-booster-level-compact">
                              <span className="nr-booster-level-compact-lbl">
                                {lang === 'en' ? 'Level' : 'Livello'}
                              </span>
                              {slotIndex === 0 ? (
                                <div className="nr-booster-level-buttons nr-booster-level-buttons--inline">
                                  {[1, 2, 3, 4, 5].map((levelValue) => (
                                    <button
                                      key={`${slotIndex}-${levelValue}`}
                                      type="button"
                                      className={`nr-booster-level-btn ${activeLevel === levelValue ? 'is-active' : ''}`}
                                      onClick={() => updateBoosterLevel(0, levelValue)}
                                    >
                                      +{levelValue}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="nr-booster-level-pill" title={lang === 'en' ? 'Link slot: +1 only' : 'Collegamento: solo +1'}>+1</span>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </EnterpriseSection>
            </section>
          </div>
        </section>
      </div>
      </div>

      <div className="nr-modal-footer nr-modal-footer--sticky">
        <p className="nr-modal-footer-hint">
          {buildSliders
            ? (lang === 'en'
              ? 'Build is saved automatically when you use Suggest build. Use Save if you changed stats, skills or boosters.'
              : 'La build si salva da sola con Consiglia build. Usa Salva se hai modificato statistiche, abilita o booster.')
            : (lang === 'en'
              ? 'Save to keep changes to this player.'
              : 'Salva per confermare le modifiche al giocatore.')}
        </p>
        <div className="nr-modal-footer-actions">
          <button type="button" className="nr-secondary-button" onClick={onClose} disabled={saving || building}>
            {lang === 'en' ? 'Cancel' : 'Annulla'}
          </button>
          <button
            type="button"
            className="nr-primary-button"
            disabled={saving || building}
            onClick={() => onSave(getEditorSavePayload())}
          >
            {saving ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (lang === 'en' ? 'Save player' : 'Salva giocatore')}
            <Save size={16} />
          </button>
        </div>
      </div>
      {showPositionEditor && (
        <PositionSelectionModal
          playerName={player.player_name}
          overallRating={form.overall_rating || player.overall_rating}
          mainPosition={originalPositionsDraft[0]?.position || form.position || player.position}
          selectedPositions={originalPositionsDraft}
          onPositionsChange={setOriginalPositionsDraft}
          onConfirm={() => setShowPositionEditor(false)}
          uploading={false}
          onCancel={() => setShowPositionEditor(false)}
        />
      )}
    </EnterpriseModalFrame>
  )
}

export default withAuth(function NuovaRosaLabPage() {
  const { t, lang } = useTranslation()

  const [layout, setLayout] = React.useState(null)
  const [titolari, setTitolari] = React.useState([])
  const [riserve, setRiserve] = React.useState([])
  const [activeCoach, setActiveCoach] = React.useState(null)
  const [tacticalSettings, setTacticalSettings] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null)
  const [selectedSlot, setSelectedSlot] = React.useState(null)
  const [selectedPlayer, setSelectedPlayer] = React.useState(null)
  const [showAssignModal, setShowAssignModal] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [pickerMode, setPickerMode] = React.useState('slot')
  const [pickerLoading, setPickerLoading] = React.useState(false)
  const [pickerLoadingMore, setPickerLoadingMore] = React.useState(false)
  const [pickerQuery, setPickerQuery] = React.useState('')
  const [pickerSort, setPickerSort] = React.useState('name_asc')
  const [pickerResults, setPickerResults] = React.useState([])
  const [pickerTotal, setPickerTotal] = React.useState(0)
  const [pickerHasMore, setPickerHasMore] = React.useState(false)
  const [pickerCatalogActive, setPickerCatalogActive] = React.useState(false)
  const catalogLoadSeqRef = React.useRef(0)
  const catalogAbortRef = React.useRef(null)
  const pickerQueryRef = React.useRef('')
  const [confirmModal, setConfirmModal] = React.useState(null)
  const [showPremiumEditorModal, setShowPremiumEditorModal] = React.useState(false)
  const [savingPlayerEditor, setSavingPlayerEditor] = React.useState(false)
  const [buildingRoster, setBuildingRoster] = React.useState(false)
  const [buildingPlayerId, setBuildingPlayerId] = React.useState(null)
  const [buildCoachOverlay, setBuildCoachOverlay] = React.useState(null)
  const [buildCoachPlayerPickerOpen, setBuildCoachPlayerPickerOpen] = React.useState(false)
  const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)
  const [fieldEditMode, setFieldEditMode] = React.useState(false)
  const [customPositions, setCustomPositions] = React.useState({})
  const [savingFieldLayout, setSavingFieldLayout] = React.useState(false)
  const [showPhotoUploadModal, setShowPhotoUploadModal] = React.useState(false)
  const [photoUploadMode, setPhotoUploadMode] = React.useState('slot')
  const [photoUploadSlot, setPhotoUploadSlot] = React.useState(null)
  const [photoUploadImages, setPhotoUploadImages] = React.useState([])
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false)
  const [extractedPlayerData, setExtractedPlayerData] = React.useState(null)
  const [selectedOriginalPositions, setSelectedOriginalPositions] = React.useState([])
  const [positionModalCtx, setPositionModalCtx] = React.useState(null)
  const [catalogPositionCtx, setCatalogPositionCtx] = React.useState(null)
  const [showPhotoReviewModal, setShowPhotoReviewModal] = React.useState(false)
  const [photoCompletionTarget, setPhotoCompletionTarget] = React.useState(null)
  const [coachCatalogOpen, setCoachCatalogOpen] = React.useState(false)
  const [coachCatalogLoading, setCoachCatalogLoading] = React.useState(false)
  const [coachCatalogQuery, setCoachCatalogQuery] = React.useState('')
  const [coachCatalogSort, setCoachCatalogSort] = React.useState('name_asc')
  const [coachCatalogResults, setCoachCatalogResults] = React.useState([])
  const [coachCatalogTotal, setCoachCatalogTotal] = React.useState(0)
  const [savingCoach, setSavingCoach] = React.useState(false)
  const [showCoachPhotoUploadModal, setShowCoachPhotoUploadModal] = React.useState(false)
  const [coachPhotoImages, setCoachPhotoImages] = React.useState([])
  const [showCoachDetailsModal, setShowCoachDetailsModal] = React.useState(false)
  const [reserveSlotPickerPlayer, setReserveSlotPickerPlayer] = React.useState(null)
  const [starterReservePickerSlot, setStarterReservePickerSlot] = React.useState(null)

  const activeTeamPlaystyle = tacticalSettings?.team_playing_style || null

  const showToast = React.useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  React.useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const fetchRoster = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) {
        setError(t('sessionExpiredRedirect'))
        return
      }

      const res = await fetch(`/api/formation?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        },
        cache: 'no-store'
      })

      if (!res.ok) throw new Error('Failed to load formation data')

      const data = await res.json()
      const stylesLookup = {}
      ;(data.playingStyles || []).forEach((style) => {
        stylesLookup[style.id] = style.name
      })

      const mappedPlayers = (data.players || [])
        .filter((player) => player?.id && player?.player_name)
        .map((player) => ({
          ...player,
          player_name: String(player.player_name || '').trim(),
          position: player.position ? String(player.position).trim() : null,
          overall_rating: player.overall_rating != null ? Number(player.overall_rating) : null,
          slot_index: player.slot_index != null ? Number(player.slot_index) : null,
          age: player.age != null ? Number(player.age) : null,
          playing_style_name: player.playing_style_id ? stylesLookup[player.playing_style_id] || null : null
        }))

      setLayout((prev) => normalizeLayoutPayload(data?.layout, prev))
      setActiveCoach(data.activeCoach || null)
      setTacticalSettings(data.tacticalSettings || null)
      setTitolari(
        mappedPlayers
          .filter((player) => player.slot_index !== null && player.slot_index >= 0 && player.slot_index <= 10)
          .sort((a, b) => a.slot_index - b.slot_index)
      )
      setRiserve(
        mappedPlayers
          .filter((player) => player.slot_index === null)
          .sort((a, b) => String(a.player_name || '').localeCompare(String(b.player_name || '')))
      )

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
      }
    } catch (err) {
      console.error('[NuovaRosaLab] load error:', err)
      setError(err.message || t('errorLoadingData'))
    } finally {
      setLoading(false)
    }
  }, [t])

  React.useEffect(() => {
    fetchRoster()
  }, [fetchRoster])

  const refreshDiagnosticAfterSave = React.useCallback(async () => {
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }

      if (token) {
        await fetch('/api/refresh-diagnostic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      }
    } catch (_) {}
  }, [])

  const resetPickerCatalogResults = React.useCallback(() => {
    if (catalogAbortRef.current) {
      catalogAbortRef.current.abort()
      catalogAbortRef.current = null
    }
    catalogLoadSeqRef.current += 1
    setPickerResults([])
    setPickerTotal(0)
    setPickerHasMore(false)
    setPickerLoading(true)
  }, [])

  const handlePickerSearchChange = React.useCallback((value) => {
    pickerQueryRef.current = value
    setPickerQuery(value)
    resetPickerCatalogResults()
  }, [resetPickerCatalogResults])

  const handlePickerSortChange = React.useCallback((value) => {
    setPickerSort(value)
    resetPickerCatalogResults()
  }, [resetPickerCatalogResults])

  const handleCatalogViewChange = React.useCallback((active) => {
    setPickerCatalogActive(active)
    if (active) {
      setPickerLoading(true)
    }
  }, [])

  const loadCatalog = React.useCallback(async (slot, query = '', mode = 'slot', options = {}) => {
    if (mode !== 'reserve' && !slot) return
    const offset = Number(options.offset || 0)
    const append = !!options.append
    const sort = options.sort || 'name_asc'
    const normalizedQuery = String(query ?? '').trim()
    const requestSeq = ++catalogLoadSeqRef.current

    if (!append && catalogAbortRef.current) {
      catalogAbortRef.current.abort()
    }
    const abortController = new AbortController()
    if (!append) {
      catalogAbortRef.current = abortController
    }

    if (append) {
      setPickerLoadingMore(true)
    } else {
      setPickerLoading(true)
    }
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const params = new URLSearchParams({
        q: normalizedQuery,
        limit: '80',
        offset: String(offset),
        sort
      })
      if (mode !== 'reserve') {
        params.set('slot_position', String(slot?.position || ''))
      }
      const response = await fetch(`/api/player-catalog/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store',
        signal: abortController.signal
      })
      const data = await safeJsonResponse(response, 'Catalog load failed')
      if (requestSeq !== catalogLoadSeqRef.current) return
      if (!append && normalizedQuery !== String(pickerQueryRef.current || '').trim()) return
      const nextResults = Array.isArray(data.results) ? data.results : []
      setPickerResults((prev) => {
        if (!append) return nextResults
        const seen = new Set(prev.map((card) => card.id))
        return [...prev, ...nextResults.filter((card) => !seen.has(card.id))]
      })
      setPickerTotal(Number(data.total || 0))
      setPickerHasMore(!!data.hasMore)
    } catch (err) {
      if (err?.name === 'AbortError') return
      if (requestSeq !== catalogLoadSeqRef.current) return
      console.error('[NuovaRosaLab] catalog error:', err)
      showToast(lang === 'en' ? 'Unable to load the catalog.' : 'Impossibile caricare il catalogo.', 'error')
      if (!append) {
        setPickerResults([])
        setPickerTotal(0)
        setPickerHasMore(false)
      }
    } finally {
      if (requestSeq !== catalogLoadSeqRef.current) return
      if (append) {
        setPickerLoadingMore(false)
      } else {
        setPickerLoading(false)
        if (catalogAbortRef.current === abortController) {
          catalogAbortRef.current = null
        }
      }
    }
  }, [lang, showToast, t])

  React.useEffect(() => {
    pickerQueryRef.current = pickerQuery
  }, [pickerQuery])

  React.useEffect(() => {
    if (!pickerOpen || !pickerCatalogActive) return
    if (pickerMode !== 'reserve' && !selectedSlot) return
    const timer = window.setTimeout(() => {
      loadCatalog(selectedSlot, pickerQuery, pickerMode, { sort: pickerSort })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [pickerOpen, pickerCatalogActive, selectedSlot, pickerQuery, pickerMode, pickerSort, loadCatalog])

  const loadMoreCatalog = React.useCallback(() => {
    if (pickerLoading || pickerLoadingMore || !pickerHasMore) return
    loadCatalog(selectedSlot, pickerQuery, pickerMode, {
      offset: pickerResults.length,
      append: true,
      sort: pickerSort
    })
  }, [loadCatalog, pickerHasMore, pickerLoading, pickerLoadingMore, pickerMode, pickerQuery, pickerResults.length, pickerSort, selectedSlot])

  const openPickerForSlot = React.useCallback((slot) => {
    if (catalogAbortRef.current) {
      catalogAbortRef.current.abort()
      catalogAbortRef.current = null
    }
    catalogLoadSeqRef.current += 1
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setSelectedSlot(slot)
    setPickerMode('slot')
    pickerQueryRef.current = ''
    setPickerQuery('')
    setPickerSort('name_asc')
    setPickerResults([])
    setPickerTotal(0)
    setPickerHasMore(false)
    setPickerLoading(false)
    setPickerCatalogActive(false)
    setCatalogPositionCtx(null)
    setPickerOpen(true)
  }, [])

  const openPickerForReserve = React.useCallback(() => {
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }
    if (catalogAbortRef.current) {
      catalogAbortRef.current.abort()
      catalogAbortRef.current = null
    }
    catalogLoadSeqRef.current += 1
    setSelectedSlot(null)
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setPickerMode('reserve')
    pickerQueryRef.current = ''
    setPickerQuery('')
    setPickerSort('name_asc')
    setPickerResults([])
    setPickerTotal(0)
    setPickerHasMore(false)
    setPickerLoading(false)
    setPickerCatalogActive(true)
    setCatalogPositionCtx(null)
    setPickerOpen(true)
  }, [riserve.length, showToast, t])

  const closePicker = React.useCallback(() => {
    if (catalogAbortRef.current) {
      catalogAbortRef.current.abort()
      catalogAbortRef.current = null
    }
    catalogLoadSeqRef.current += 1
    setPickerOpen(false)
    setPickerMode('slot')
    setPickerQuery('')
    setPickerSort('name_asc')
    setPickerResults([])
    setPickerTotal(0)
    setPickerHasMore(false)
    setPickerCatalogActive(false)
    setCatalogPositionCtx(null)
  }, [])

  const openPhotoUploadFlow = React.useCallback((mode = null, slot = null) => {
    const nextMode = mode || (pickerMode === 'reserve' ? 'reserve' : 'slot')
    const nextSlot = slot || selectedSlot

    if (nextMode === 'reserve' && riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }
    if (nextMode === 'slot' && !nextSlot) {
      showToast(lang === 'en' ? 'Select a slot before uploading a photo.' : 'Seleziona uno slot prima di caricare una foto.', 'error')
      return
    }

    setPickerOpen(false)
    setShowAssignModal(false)
    setShowPremiumEditorModal(false)
    setSelectedPlayer(null)
    setExtractedPlayerData(null)
    setSelectedOriginalPositions([])
    setPositionModalCtx(null)
    setCatalogPositionCtx(null)
    setShowPhotoReviewModal(false)
    setPhotoCompletionTarget(null)
    setPhotoUploadMode(nextMode)
    setPhotoUploadSlot(nextMode === 'slot' ? nextSlot : null)
    setSelectedSlot(nextMode === 'slot' ? nextSlot : null)
    setPhotoUploadImages([])
    setShowPhotoUploadModal(true)
  }, [lang, pickerMode, riserve.length, selectedSlot, showToast, t])

  const openPhotoCompletionFlow = React.useCallback((player, slot = null) => {
    if (!player?.id) return
    const completion = getPhotoProfileCompletion(player, lang)
    setPickerOpen(false)
    setShowAssignModal(false)
    setShowPremiumEditorModal(false)
    setSelectedPlayer(null)
    setExtractedPlayerData(null)
    setSelectedOriginalPositions([])
    setPositionModalCtx(null)
    setCatalogPositionCtx(null)
    setShowPhotoReviewModal(false)
    setPhotoCompletionTarget(player)
    setPhotoUploadMode('complete')
    setPhotoUploadSlot(slot || null)
    setSelectedSlot(slot || null)
    setPhotoUploadImages([])
    setShowPhotoUploadModal(true)
    if (completion.isComplete) {
      showToast(
        lang === 'en'
          ? 'This profile already looks complete. Upload only if you need to correct or add data.'
          : 'Questo profilo sembra gia completo. Carica foto solo se devi correggere o aggiungere dati.',
        'warning'
      )
    }
  }, [lang, showToast])

  const closePhotoUpload = React.useCallback(() => {
    if (uploadingPhoto) return
    setShowPhotoUploadModal(false)
    setPhotoUploadImages([])
    setPhotoUploadSlot(null)
    setPhotoUploadMode('slot')
    setShowPhotoReviewModal(false)
    setPhotoCompletionTarget(null)
  }, [uploadingPhoto])

  const openCoachCatalog = React.useCallback(() => {
    setPickerOpen(false)
    setShowAssignModal(false)
    setShowPremiumEditorModal(false)
    setShowCoachPhotoUploadModal(false)
    setShowCoachDetailsModal(false)
    setCoachPhotoImages([])
    setCoachCatalogQuery('')
    setCoachCatalogSort(activeTeamPlaystyle ? 'best_playstyle' : 'name_asc')
    setCoachCatalogResults([])
    setCoachCatalogTotal(0)
    setCoachCatalogOpen(true)
  }, [activeTeamPlaystyle])

  const closeCoachCatalog = React.useCallback(() => {
    if (savingCoach) return
    setCoachCatalogOpen(false)
    setCoachCatalogQuery('')
    setCoachCatalogResults([])
    setCoachCatalogTotal(0)
    setCoachCatalogSort('name_asc')
  }, [savingCoach])

  const openCoachPhotoUpload = React.useCallback(() => {
    setPickerOpen(false)
    setShowAssignModal(false)
    setShowPremiumEditorModal(false)
    setCoachCatalogOpen(false)
    setShowCoachDetailsModal(false)
    setCoachPhotoImages([])
    setShowCoachPhotoUploadModal(true)
  }, [])

  const openCoachDetails = React.useCallback(() => {
    if (!activeCoach?.coach_name) return
    setPickerOpen(false)
    setShowAssignModal(false)
    setShowPremiumEditorModal(false)
    setCoachCatalogOpen(false)
    setShowCoachPhotoUploadModal(false)
    setShowCoachDetailsModal(true)
  }, [activeCoach])

  const closeCoachDetails = React.useCallback(() => {
    setShowCoachDetailsModal(false)
  }, [])

  const closeCoachPhotoUpload = React.useCallback(() => {
    if (savingCoach) return
    setShowCoachPhotoUploadModal(false)
    setCoachPhotoImages([])
  }, [savingCoach])

  const loadCoachCatalog = React.useCallback(async (query = '', options = {}) => {
    setCoachCatalogLoading(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const sort = options.sort || coachCatalogSort
      const params = new URLSearchParams({
        q: query,
        limit: '80',
        offset: '0',
        sort
      })
      if (sort === 'best_playstyle' && activeTeamPlaystyle) {
        params.set('playstyle', activeTeamPlaystyle)
      }

      const response = await fetch(`/api/coach-catalog/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      })
      const data = await safeJsonResponse(response, 'Coach catalog load failed')
      setCoachCatalogResults(Array.isArray(data.results) ? data.results : [])
      setCoachCatalogTotal(Number(data.total || 0))
    } catch (err) {
      console.error('[NuovaRosaLab] coach catalog error:', err)
      showToast(lang === 'en' ? 'Unable to load the coach catalog.' : 'Impossibile caricare il catalogo allenatori.', 'error')
      setCoachCatalogResults([])
      setCoachCatalogTotal(0)
    } finally {
      setCoachCatalogLoading(false)
    }
  }, [activeTeamPlaystyle, coachCatalogSort, lang, showToast, t])

  React.useEffect(() => {
    if (!coachCatalogOpen) return
    const timer = window.setTimeout(() => {
      loadCoachCatalog(coachCatalogQuery, { sort: coachCatalogSort })
    }, 180)
    return () => window.clearTimeout(timer)
  }, [coachCatalogOpen, coachCatalogQuery, coachCatalogSort, loadCoachCatalog])

  const saveCoachAndSetActive = React.useCallback(async (coachPayload) => {
    if (!coachPayload?.coach_name) {
      throw new Error(lang === 'en' ? 'Coach data is incomplete.' : 'Dati allenatore incompleti.')
    }

    let token = getTokenFallback()
    if (!token && supabase) {
      const { data: session } = await supabase.auth.getSession()
      token = session?.session?.access_token
    }
    if (!token) throw new Error(t('sessionExpired'))

    const saveResponse = await fetch('/api/supabase/save-coach', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': lang === 'en' ? 'en' : 'it'
      },
      body: JSON.stringify({ coach: coachPayload })
    })
    const saved = await safeJsonResponse(saveResponse, lang === 'en' ? 'Unable to save coach.' : 'Impossibile salvare l allenatore.')

    const activeResponse = await fetch('/api/supabase/set-active-coach', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': lang === 'en' ? 'en' : 'it'
      },
      body: JSON.stringify({ coach_id: saved.coach_id })
    })
    await safeJsonResponse(activeResponse, lang === 'en' ? 'Unable to set active coach.' : 'Impossibile impostare l allenatore attivo.')

    await fetchRoster()
    await refreshDiagnosticAfterSave()
    return saved
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, t])

  const handleSelectCatalogCoach = React.useCallback(async (coach) => {
    setSavingCoach(true)
    try {
      await saveCoachAndSetActive(buildCoachPayloadFromCatalog(coach))
      setCoachCatalogOpen(false)
      setCoachCatalogQuery('')
      setCoachCatalogResults([])
      setCoachCatalogTotal(0)
      showToast(lang === 'en' ? 'Coach added and set active.' : 'Allenatore aggiunto e impostato attivo.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] save catalog coach error:', err)
      const { message } = mapErrorToUserMessage(err, lang === 'en' ? 'Unable to save coach.' : 'Impossibile salvare l allenatore.', lang)
      showToast(message, 'error')
    } finally {
      setSavingCoach(false)
    }
  }, [lang, saveCoachAndSetActive, showToast])

  const extractCoachFromPhotos = React.useCallback(async (images) => {
    let token = getTokenFallback()
    if (!token && supabase) {
      const { data: session } = await supabase.auth.getSession()
      token = session?.session?.access_token
    }
    if (!token) throw new Error(t('sessionExpired'))

    let coachData = null
    const allExtractedData = {}
    const photoSlots = {}
    const errors = []
    let extractedCoachCount = 0

    const orderedImages = [...images].sort((first, second) => {
      const order = { main: 0, connection: 1 }
      return (order[first.type] ?? 99) - (order[second.type] ?? 99)
    })

    for (const image of orderedImages) {
      const response = await fetch('/api/extract-coach', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl: image.dataUrl })
      })

      let data = null
      try {
        data = await response.json()
      } catch (_) {
        errors.push(`${lang === 'en' ? 'Server error' : 'Errore server'}: ${response.status} ${response.statusText}`)
        continue
      }

      if (!response.ok) {
        const { message } = mapErrorToUserMessage(data?.error || '', lang === 'en' ? 'Unknown error' : 'Errore sconosciuto', lang)
        errors.push(message)
        continue
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }

      if (!data?.coach) continue

      const slotType = extractedCoachCount === 0 ? 'main' : 'connection'

      if (!coachData) {
        coachData = data.coach
      } else {
        coachData = mergeCoachPhotoData(coachData, data.coach)
      }

      allExtractedData[slotType] = data.coach
      photoSlots[slotType] = true
      extractedCoachCount += 1
    }

    if (!coachData || !coachData.coach_name) {
      const creditError = errors.find((error) => {
        const message = String(error || '').toLowerCase()
        return message.includes('credit') || message.includes('crediti') || message.includes('credito') || message.includes('hero points') || message.includes('recharge') || message.includes('ricarica')
      })
      if (creditError) throw new Error(creditError)
      const quotaError = errors.find((error) => String(error || '').toLowerCase().includes('quota') || String(error || '').toLowerCase().includes('billing'))
      if (quotaError) throw new Error(t('openAQuotaError'))
      if (errors.length > 0) {
        throw new Error(`${lang === 'en' ? 'Unable to extract coach data' : 'Impossibile estrarre i dati allenatore'}: ${errors[0]}`)
      }
      throw new Error(lang === 'en' ? 'No coach data extracted from the uploaded photos.' : 'Nessun dato allenatore estratto dalle foto caricate.')
    }

    return {
      ...coachData,
      photo_slots: photoSlots,
      extracted_photos: allExtractedData
    }
  }, [lang, t])

  const handleCoachPhotoUpload = React.useCallback(async () => {
    if (coachPhotoImages.length === 0) return

    setSavingCoach(true)
    try {
      const coachPayload = await extractCoachFromPhotos(coachPhotoImages)
      await saveCoachAndSetActive(coachPayload)
      setShowCoachPhotoUploadModal(false)
      setCoachPhotoImages([])
      showToast(lang === 'en' ? 'Coach saved and set active.' : 'Allenatore salvato e impostato attivo.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] coach photo upload error:', err)
      const { message } = mapErrorToUserMessage(err, lang === 'en' ? 'Unable to upload coach photos.' : 'Impossibile caricare le foto allenatore.', lang)
      showToast(message, 'error')
    } finally {
      setSavingCoach(false)
    }
  }, [coachPhotoImages, extractCoachFromPhotos, lang, saveCoachAndSetActive, showToast])

  const checkPhotoMissingData = React.useCallback((playerData) => {
    const missing = { required: [], optional: [] }
    if (!playerData.player_name || String(playerData.player_name).trim().length === 0) {
      missing.required.push({ field: 'player_name', label: lang === 'en' ? 'Player name' : 'Nome giocatore' })
    }
    if (playerData.overall_rating == null || Number(playerData.overall_rating) === 0) {
      missing.required.push({ field: 'overall_rating', label: 'OVR' })
    }
    if (!playerData.position && (!Array.isArray(playerData.original_positions) || playerData.original_positions.length === 0)) {
      missing.required.push({ field: 'position', label: lang === 'en' ? 'Position' : 'Ruolo' })
    }
    if (!playerData.base_stats || Object.keys(playerData.base_stats || {}).length === 0) {
      missing.optional.push({ field: 'base_stats', label: lang === 'en' ? 'Stats' : 'Statistiche' })
    }
    if (!Array.isArray(playerData.skills) || playerData.skills.length === 0) {
      missing.optional.push({ field: 'skills', label: lang === 'en' ? 'Skills' : 'Abilita' })
    }
    if (!Array.isArray(playerData.available_boosters) && !Array.isArray(playerData.boosters)) {
      missing.optional.push({ field: 'boosters', label: 'Boosters' })
    }
    return missing
  }, [lang])

  const extractPlayerFromPhotos = React.useCallback(async (images) => {
    let token = getTokenFallback()
    if (!token && supabase) {
      const { data: session } = await supabase.auth.getSession()
      token = session?.session?.access_token
    }
    if (!token) throw new Error(t('sessionExpired'))

    let playerData = null
    const allExtractedData = {}
    const photoSlots = {}
    const errors = []

    for (const image of images) {
      const response = await fetch('/api/extract-player', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrl: image.dataUrl })
      })

      let data = null
      try {
        data = await response.json()
      } catch (_) {
        errors.push(`${lang === 'en' ? 'Server error' : 'Errore server'}: ${response.status} ${response.statusText}`)
        continue
      }

      if (!response.ok) {
        const { message } = mapErrorToUserMessage(data?.error || '', lang === 'en' ? 'Unknown error' : 'Errore sconosciuto', lang)
        errors.push(message)
        continue
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credits-consumed'))
      }

      if (!data?.player) continue

      if (!playerData) {
        playerData = data.player
      } else {
        const currentName = String(data.player.player_name || '').trim().toLowerCase()
        const existingName = String(playerData.player_name || '').trim().toLowerCase()
        const currentAge = data.player.age != null ? Number(data.player.age) : null
        const existingAge = playerData.age != null ? Number(playerData.age) : null
        if (currentName && existingName && currentAge && existingAge && (currentName !== existingName || currentAge !== existingAge)) {
          throw new Error(lang === 'en'
            ? `The uploaded photos seem to describe different players: ${playerData.player_name} vs ${data.player.player_name}.`
            : `Le foto caricate sembrano riferirsi a giocatori diversi: ${playerData.player_name} vs ${data.player.player_name}.`)
        }
        const { overall_rating, ...extractedWithoutRating } = data.player
        playerData = {
          ...playerData,
          ...extractedWithoutRating,
          base_stats: data.player.base_stats || playerData.base_stats,
          skills: data.player.skills || playerData.skills,
          com_skills: data.player.com_skills || playerData.com_skills,
          available_boosters: data.player.available_boosters || data.player.boosters || playerData.available_boosters,
          boosters: data.player.boosters || playerData.boosters
        }
      }

      allExtractedData[image.type] = data.player
      if (image.type === 'card') {
        photoSlots.card = true
        if (data.player?.base_stats && Object.keys(data.player.base_stats || {}).length > 0) {
          photoSlots.statistiche = true
        }
      } else if (image.type === 'stats') {
        photoSlots.abilita = true
      } else if (image.type === 'skills') {
        photoSlots.booster = true
        if (data.player?.skills?.length || data.player?.com_skills?.length) {
          photoSlots.abilita = true
        }
      }
    }

    if (!playerData || !playerData.player_name) {
      const quotaError = errors.find((error) => String(error).toLowerCase().includes('quota') || String(error).toLowerCase().includes('billing'))
      if (quotaError) throw new Error(t('openAQuotaError'))
      if (errors.length > 0) {
        throw new Error(`${lang === 'en' ? 'Unable to extract player data' : 'Impossibile estrarre i dati giocatore'}: ${errors[0]}`)
      }
      throw new Error(lang === 'en' ? 'No player data extracted from the uploaded photos.' : 'Nessun dato giocatore estratto dalle foto caricate.')
    }

    const ratings = Object.values(allExtractedData)
      .map((entry) => entry?.overall_rating)
      .filter((rating) => rating != null && Number(rating) > 0)
    if (ratings.length > 0) {
      playerData.overall_rating = Math.max(...ratings.map(Number))
    }

    return { playerData, photoSlots }
  }, [lang, t])

  const handlePhotoUploadExtract = React.useCallback(async () => {
    if (photoUploadImages.length === 0) return
    if (photoUploadMode === 'reserve' && riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }
    if (photoUploadMode === 'slot' && !photoUploadSlot) {
      showToast(lang === 'en' ? 'Select a slot before uploading a photo.' : 'Seleziona uno slot prima di caricare una foto.', 'error')
      return
    }
    if (photoUploadMode === 'complete' && !photoCompletionTarget?.id) {
      showToast(lang === 'en' ? 'Select the player to complete first.' : 'Seleziona prima il giocatore da completare.', 'error')
      return
    }

    setUploadingPhoto(true)
    try {
      const { playerData, photoSlots } = await extractPlayerFromPhotos(photoUploadImages)
      const missing = checkPhotoMissingData(playerData)
      if (photoUploadMode !== 'complete' && missing.required.length > 0) {
        showToast(
          lang === 'en'
            ? `Missing required data: ${missing.required.map((entry) => entry.label).join(', ')}. Upload a clearer photo or use the catalog.`
            : `Dati obbligatori mancanti: ${missing.required.map((entry) => entry.label).join(', ')}. Carica una foto piu chiara o usa il catalogo.`,
          'error'
        )
        return
      }
      if (photoUploadMode === 'complete' && !isSameExtractedPlayer(photoCompletionTarget, playerData)) {
        throw new Error(lang === 'en'
          ? `These photos seem to belong to another player. Use Replace from photo if you want to change ${photoCompletionTarget.player_name}.`
          : `Queste foto sembrano di un altro giocatore. Usa Sostituisci da foto se vuoi cambiare ${photoCompletionTarget.player_name}.`)
      }
      const mainPosition = playerData.position || 'AMF'
      const initialPositions = Array.isArray(playerData.original_positions) && playerData.original_positions.length > 0
        ? playerData.original_positions
        : [{ position: mainPosition, competence: 'Alta' }]
      const slotIndex = photoUploadMode === 'slot'
        ? photoUploadSlot.slot_index
        : photoUploadMode === 'complete'
          ? photoCompletionTarget.slot_index ?? null
          : null

      setSelectedOriginalPositions(initialPositions)
      setExtractedPlayerData({
        ...playerData,
        photo_slots: photoSlots,
        slot_index: slotIndex
      })
      setPositionModalCtx({
        mode: photoUploadMode === 'complete' ? 'complete' : 'photo',
        slotIndex,
        slotPosition: photoUploadMode === 'slot' ? photoUploadSlot?.position : null,
        uploadMode: photoUploadMode,
        photoSlots
      })
      setShowPhotoUploadModal(false)
      setShowPhotoReviewModal(true)
    } catch (err) {
      console.error('[NuovaRosaLab] photo extraction error:', err)
      const { message } = mapErrorToUserMessage(err, lang === 'en' ? 'Unable to upload photo.' : 'Impossibile caricare la foto.', lang)
      showToast(message, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }, [checkPhotoMissingData, extractPlayerFromPhotos, lang, photoCompletionTarget, photoUploadImages, photoUploadMode, photoUploadSlot, riserve.length, showToast, t])

  const resetPhotoPositionFlow = React.useCallback(() => {
    setPositionModalCtx(null)
    setExtractedPlayerData(null)
    setSelectedOriginalPositions([])
    setPhotoUploadImages([])
    setPhotoUploadSlot(null)
    setPhotoUploadMode('slot')
    setShowPhotoReviewModal(false)
    setPhotoCompletionTarget(null)
    setSelectedSlot(null)
  }, [])

  const handleSavePhotoCompletion = React.useCallback(async () => {
    if (!photoCompletionTarget?.id || !extractedPlayerData || !positionModalCtx) return

    const hasUsefulExtractedData = hasPlayerStats(extractedPlayerData) || hasPlayerSkills(extractedPlayerData) || hasPlayerBoosters(extractedPlayerData)
    if (!hasUsefulExtractedData) {
      showToast(
        lang === 'en'
          ? 'No new useful data was detected. Upload clearer missing screenshots before saving.'
          : 'Non sono stati rilevati nuovi dati utili. Carica schermate mancanti piu chiare prima di salvare.',
        'warning'
      )
      return
    }

    setUploadingPhoto(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const payload = {
        ...(hasPlayerStats(extractedPlayerData) ? { base_stats: extractedPlayerData.base_stats } : {}),
        ...(Array.isArray(extractedPlayerData.skills) && extractedPlayerData.skills.length > 0 ? { skills: extractedPlayerData.skills } : {}),
        ...(Array.isArray(extractedPlayerData.com_skills) && extractedPlayerData.com_skills.length > 0 ? { com_skills: extractedPlayerData.com_skills } : {}),
        ...(hasPlayerBoosters(extractedPlayerData)
          ? { available_boosters: extractedPlayerData.available_boosters || extractedPlayerData.boosters }
          : {}),
        ...(positionModalCtx.photoSlots ? { photo_slots: positionModalCtx.photoSlots } : {})
      }

      const response = await fetch(`/api/players/${photoCompletionTarget.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      await safeJsonResponse(response, t('errorUpdatingPlayer'))

      await fetchRoster()
      await refreshDiagnosticAfterSave()
      resetPhotoPositionFlow()
      showToast(lang === 'en' ? 'Player completed with photos.' : 'Giocatore completato con foto.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] photo completion error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorUpdatingPlayer'), lang)
      showToast(message, 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }, [extractedPlayerData, fetchRoster, lang, photoCompletionTarget, positionModalCtx, refreshDiagnosticAfterSave, resetPhotoPositionFlow, showToast, t])

  const handleSavePhotoPlayerWithPositions = React.useCallback(async () => {
    if (!extractedPlayerData || selectedOriginalPositions.length === 0 || !positionModalCtx) return

    const slotIndexToSave = positionModalCtx.slotIndex ?? null
    if (slotIndexToSave === null && riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    const savePlayer = async ({ allowDuplicateStarterReplace = false } = {}) => {
      setUploadingPhoto(true)
      try {
        let token = getTokenFallback()
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) throw new Error(t('sessionExpired'))

        const playerName = String(extractedPlayerData.player_name || '').trim().toLowerCase()
        const playerAge = extractedPlayerData.age != null ? Number(extractedPlayerData.age) : null
        const isSamePlayer = (player) => {
          const currentName = String(player?.player_name || '').trim().toLowerCase()
          const currentAge = player?.age != null ? Number(player.age) : null
          if (playerName && currentName && playerAge && currentAge) return playerName === currentName && playerAge === currentAge
          return Boolean(playerName && currentName && playerName === currentName)
        }

        const duplicateReserve = riserve.find((player) => isSamePlayer(player))
        const duplicateStarter = slotIndexToSave !== null
          ? titolari.find((player) => isSamePlayer(player) && player.slot_index !== slotIndexToSave)
          : null
        const duplicateStarterWhileSavingReserve = slotIndexToSave === null
          ? titolari.find((player) => isSamePlayer(player))
          : null

        if (duplicateStarterWhileSavingReserve) {
          throw new Error(lang === 'en'
            ? `${extractedPlayerData.player_name} is already in your starting eleven. Move or replace that player before saving a reserve copy.`
            : `${extractedPlayerData.player_name} e gia tra i titolari. Sposta o sostituisci quel giocatore prima di salvarlo come riserva.`)
        }

        if (duplicateStarter && !allowDuplicateStarterReplace) {
          setUploadingPhoto(false)
          setConfirmModal({
            ...showConfirmConfig({
              title: lang === 'en' ? 'Player already in lineup' : 'Giocatore gia titolare',
              message: lang === 'en'
                ? `${extractedPlayerData.player_name} is already assigned to another slot. Replace that starter?`
                : `${extractedPlayerData.player_name} e gia assegnato a un altro slot. Vuoi sostituire quel titolare?`,
              details: lang === 'en'
                ? 'The existing starter will move to reserves if there is room.'
                : 'Il titolare esistente verra spostato in riserva se c e spazio.',
              confirmLabel: lang === 'en' ? 'Replace starter' : 'Sostituisci titolare',
              cancelLabel: t('cancel')
            }),
            onConfirm: async () => {
              setConfirmModal(null)
              await savePlayer({ allowDuplicateStarterReplace: true })
            },
            onCancel: () => setConfirmModal(null)
          })
          return
        }

        if (duplicateStarter && allowDuplicateStarterReplace) {
          if (!duplicateReserve && riserve.length >= MAX_RESERVES) {
            throw new Error(t('maxReservesReached'))
          }
          if (duplicateReserve) {
            const deleteResponse = await fetch('/api/supabase/delete-player', {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ player_id: duplicateReserve.id })
            })
            await safeJsonResponse(deleteResponse, t('errorDeletingDuplicateReserve'))
          }
          const moveResponse = await fetch(`/api/players/${duplicateStarter.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ slot_index: null })
          })
          await safeJsonResponse(moveResponse, t('errorUpdatingPlayer'))
        }

        if (slotIndexToSave === null && duplicateReserve) {
          const confirmed = await new Promise((resolve) => {
            setUploadingPhoto(false)
            setConfirmModal({
              ...showConfirmConfig({
                title: lang === 'en' ? 'Reserve already exists' : 'Riserva gia presente',
                message: lang === 'en'
                  ? `${extractedPlayerData.player_name} is already in reserves. Replace the old reserve?`
                  : `${extractedPlayerData.player_name} e gia nelle riserve. Vuoi sostituire la vecchia riserva?`,
                confirmLabel: t('replace'),
                cancelLabel: t('cancel')
              }),
              onConfirm: () => {
                setConfirmModal(null)
                resolve(true)
              },
              onCancel: () => {
                setConfirmModal(null)
                resolve(false)
              }
            })
          })
          if (!confirmed) return
          setUploadingPhoto(true)
          const deleteResponse = await fetch('/api/supabase/delete-player', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ player_id: duplicateReserve.id })
          })
          await safeJsonResponse(deleteResponse, t('errorDeletingDuplicateReserve'))
        }

        const response = await fetch('/api/supabase/save-player', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player: buildPhotoPlayerSavePayload(extractedPlayerData, {
              originalPositions: selectedOriginalPositions,
              slotIndex: slotIndexToSave,
              fieldPosition: positionModalCtx.slotPosition || photoUploadSlot?.position || null,
              photoSlots: positionModalCtx.photoSlots || extractedPlayerData.photo_slots
            })
          })
        })
        await safeJsonResponse(response, t('errorSavingPlayerGeneric'))

        await fetchRoster()
        await refreshDiagnosticAfterSave()
        resetPhotoPositionFlow()
        showToast(lang === 'en' ? 'Player saved from photo.' : 'Giocatore salvato da foto.', 'success')
      } catch (err) {
        console.error('[NuovaRosaLab] photo save error:', err)
        const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
        showToast(message, 'error')
      } finally {
        setUploadingPhoto(false)
      }
    }

    await savePlayer()
  }, [extractedPlayerData, fetchRoster, lang, positionModalCtx, refreshDiagnosticAfterSave, resetPhotoPositionFlow, riserve, selectedOriginalPositions, showToast, t, titolari])

  const showCatalogDuplicateAlert = React.useCallback((existingPlayer, card) => {
    if (!existingPlayer) return
    const location = existingPlayer.slot_index == null
      ? (lang === 'en' ? 'reserves' : 'riserve')
      : `${lang === 'en' ? 'starter slot' : 'slot titolare'} ${Number(existingPlayer.slot_index) + 1}`
    const playerName = existingPlayer.player_name || card?.player_name || card?.name || (lang === 'en' ? 'This player' : 'Questo giocatore')

    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Player already in squad' : 'Giocatore già in rosa',
        message: lang === 'en'
          ? `${playerName} is already saved in your squad.`
          : `${playerName} è già salvato nella tua rosa.`,
        details: lang === 'en'
          ? `You can find him in ${location}. Open his card to edit data, photos, boosters or build.`
          : `Lo trovi in ${location}. Apri la scheda per modificare dati, foto, booster o build.`,
        confirmLabel: lang === 'en' ? 'Open player card' : 'Apri scheda',
        cancelLabel: lang === 'en' ? 'Close' : 'Chiudi',
        variant: 'info'
      }),
      onConfirm: () => {
        setConfirmModal(null)
        closePicker()
        setSelectedSlot(null)
        setSelectedPlayer(existingPlayer)
        setShowAssignModal(false)
        setShowPremiumEditorModal(true)
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [closePicker, lang])

  const handleSaveCatalogCardToSlot = React.useCallback((card) => {
    if (!selectedSlot || !card) return

    const duplicate = findCatalogDuplicatePlayer(card, [...titolari, ...riserve])
    if (duplicate) {
      showCatalogDuplicateAlert(duplicate, card)
      return
    }

    const compatibility = getSlotCompatibility(selectedSlot.position, card.position)
    const isOutOfRole = compatibility === 'out_of_role'
    const cardSummary = `${card.player_name} · ${card.position || '-'} · OVR ${card.overall_level_1 ?? card.overall_max_level ?? '-'}`
    const targetSummary = selectedSlot.position || (lang === 'en' ? 'selected slot' : 'slot selezionato')

    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Confirm catalog player' : 'Conferma giocatore catalogo',
        message: lang === 'en'
          ? `Assign ${card.player_name} to ${targetSummary}?`
          : `Assegnare ${card.player_name} a ${targetSummary}?`,
        details: isOutOfRole
          ? (lang === 'en'
              ? `${cardSummary}\nCard role differs from the slot, but the catalog remains free.`
              : `${cardSummary}\nIl ruolo carta e diverso dallo slot, ma il catalogo resta libero.`)
          : cardSummary,
        confirmLabel: lang === 'en' ? 'Assign player' : 'Assegna giocatore',
        cancelLabel: lang === 'en' ? 'Cancel' : t('cancel')
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        setPickerOpen(false)
        setSelectedOriginalPositions(buildInitialPositionsFromCatalogCard(card))
        setCatalogPositionCtx({
          card,
          mode: 'slot',
          slotIndex: selectedSlot.slot_index,
          slotPosition: selectedSlot.position || null,
          forcedOutOfRole: isOutOfRole
        })
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, riserve, selectedSlot, showCatalogDuplicateAlert, t, titolari])

  const handleSaveCatalogCardAsReserve = React.useCallback((card) => {
    if (!card) return
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    const duplicate = findCatalogDuplicatePlayer(card, [...titolari, ...riserve])
    if (duplicate) {
      showCatalogDuplicateAlert(duplicate, card)
      return
    }

    const cardSummary = `${card.player_name} · ${card.position || '-'} · OVR ${card.overall_level_1 ?? card.overall_max_level ?? '-'}`
    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Confirm reserve' : 'Conferma riserva',
        message: lang === 'en'
          ? `Add ${card.player_name} to reserves?`
          : `Aggiungere ${card.player_name} in riserva?`,
        details: cardSummary,
        confirmLabel: lang === 'en' ? 'Add reserve' : 'Aggiungi riserva',
        cancelLabel: lang === 'en' ? 'Cancel' : t('cancel')
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        setPickerOpen(false)
        setSelectedOriginalPositions(buildInitialPositionsFromCatalogCard(card))
        setCatalogPositionCtx({
          card,
          mode: 'reserve',
          slotIndex: null,
          forcedOutOfRole: false
        })
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, riserve, showCatalogDuplicateAlert, showToast, t, titolari])

  const createPlayerFromCatalog = React.useCallback(async (card, { slotIndex = null, slotPosition = null, forcedOutOfRole = false, originalPositions = [] } = {}) => {
    if (!card) return

    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const playerPayload = buildPlayerPayloadFromCatalog(card, slotIndex, {
        originalPositions: originalPositions.length > 0 ? originalPositions : null,
        fieldPosition: slotIndex !== null ? slotPosition : null
      })
      if (forcedOutOfRole) {
        playerPayload.metadata = {
          ...(playerPayload.metadata || {}),
          forced_out_of_role: true,
          forced_slot_position: slotPosition || null
        }
      }

      const response = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: playerPayload })
      })

      const data = await safeJsonResponse(response, t('errorSavingPlayerGeneric'))
      await fetchRoster()
      closePicker()
      await refreshDiagnosticAfterSave()
      showToast(
        slotIndex === null
          ? (lang === 'en' ? 'Reserve added successfully.' : 'Riserva aggiunta con successo.')
          : (lang === 'en' ? 'Player added successfully.' : 'Giocatore aggiunto con successo.'),
        'upgrade'
      )
      return data
    } catch (err) {
      console.error('[NuovaRosaLab] save catalog player error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    }
  }, [lang, t, fetchRoster, closePicker, refreshDiagnosticAfterSave, showToast])

  const handleSaveCatalogPlayerWithPositions = React.useCallback(async () => {
    if (!catalogPositionCtx?.card || selectedOriginalPositions.length === 0) return
    if (catalogPositionCtx.mode === 'reserve' && riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    const duplicateLate = findCatalogDuplicatePlayer(catalogPositionCtx.card, [...titolari, ...riserve])
    if (duplicateLate) {
      setCatalogPositionCtx(null)
      setSelectedOriginalPositions([])
      showCatalogDuplicateAlert(duplicateLate, catalogPositionCtx.card)
      return
    }

    setAssigning(true)
    try {
      const savedPlayer = await createPlayerFromCatalog(catalogPositionCtx.card, {
        slotIndex: catalogPositionCtx.slotIndex,
        slotPosition: catalogPositionCtx.slotPosition || null,
        forcedOutOfRole: catalogPositionCtx.forcedOutOfRole,
        originalPositions: selectedOriginalPositions
      })
      if (savedPlayer) {
        setCatalogPositionCtx(null)
        setSelectedOriginalPositions([])
      }
    } finally {
      setAssigning(false)
    }
  }, [catalogPositionCtx, createPlayerFromCatalog, riserve.length, selectedOriginalPositions, showCatalogDuplicateAlert, showToast, t, titolari, riserve])

  const handleSelectReserveForSlot = React.useCallback(async (player, targetSlot = selectedSlot) => {
    if (!targetSlot || !player?.id) return

    const positions = Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions
      : (player.position ? [{ position: player.position, competence: 'Alta' }] : [])
    const isOriginal = positions.some((entry) => String(entry?.position || '').toUpperCase() === String(targetSlot.position || '').toUpperCase())

    const continueAssign = async () => {
      setAssigning(true)
      try {
        let token = getTokenFallback()
        if (!token && supabase) {
          const { data: session } = await supabase.auth.getSession()
          token = session?.session?.access_token
        }
        if (!token) throw new Error(t('sessionExpired'))

        const response = await fetch('/api/supabase/assign-player-to-slot', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            slot_index: targetSlot.slot_index,
            player_id: player.id
          })
        })

        await safeJsonResponse(response, t('errorAssigningPlayer'))
        setShowAssignModal(false)
        setSelectedPlayer(null)
        closePicker()
        await fetchRoster()
        await refreshDiagnosticAfterSave()
        showToast(t('playerAssignedSuccessfully'), 'success')
      } catch (err) {
        console.error('[NuovaRosaLab] assign reserve error:', err)
        const { message } = mapErrorToUserMessage(err, t('errorAssigningPlayer'), lang)
        showToast(message, 'error')
      } finally {
        setAssigning(false)
      }
    }

    const playerSummary = `${player.player_name} · ${player.position || '-'} · OVR ${rosterFormationOvr(player)}`
    const targetSummary = targetSlot.position ? `${targetSlot.position}` : (lang === 'en' ? 'selected slot' : 'slot selezionato')
    const isOutOfRole = !isOriginal && targetSlot.position
    setConfirmModal({
      ...showConfirmConfig({
        title: isOutOfRole
          ? (lang === 'en' ? 'Confirm role change' : 'Conferma cambio ruolo')
          : (lang === 'en' ? 'Assign reserve to slot' : 'Assegna riserva allo slot'),
        message: isOutOfRole
          ? (lang === 'en'
              ? `${player.player_name} is not natural for ${targetSummary}. Assign anyway?`
              : `${player.player_name} non e naturale per ${targetSummary}. Vuoi assegnarlo comunque?`)
          : (lang === 'en'
              ? `Assign ${player.player_name} to ${targetSummary}?`
              : `Assegnare ${player.player_name} a ${targetSummary}?`),
        details: isOutOfRole
          ? (lang === 'en'
              ? `${playerSummary}\nYou can still edit role compatibility later.`
              : `${playerSummary}\nPuoi comunque modificare la compatibilita ruolo in seguito.`)
          : playerSummary,
        confirmLabel: lang === 'en' ? 'Assign player' : 'Assegna giocatore',
        cancelLabel: t('cancel')
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        await continueAssign()
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [closePicker, fetchRoster, lang, refreshDiagnosticAfterSave, selectedSlot, showToast, t])

  const handleRemoveFromSlot = React.useCallback(async (playerId) => {
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    setAssigning(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch('/api/supabase/remove-player-from-slot', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player_id: playerId })
      })
      let data = null
      try {
        data = await response.json()
      } catch (_) {
        data = null
      }

      if (!response.ok) {
        if (data?.duplicate_reserve_id) {
          setConfirmModal({
            ...showConfirmConfig({
              title: t('duplicatePlayerTitle'),
              message: lang === 'en'
                ? 'A duplicate reserve already exists for this player. Replace it to continue?'
                : 'Esiste gia una riserva duplicata per questo giocatore. Vuoi sostituirla per continuare?',
              details: lang === 'en'
                ? 'The old reserve copy will be deleted and the player will be moved from the slot.'
                : 'La copia riserva precedente verra eliminata e il giocatore verra spostato dallo slot.',
              confirmLabel: lang === 'en' ? 'Replace' : t('replace'),
              cancelLabel: t('cancel')
            }),
            onConfirm: async () => {
              setConfirmModal(null)
              try {
                const deleteRes = await fetch('/api/supabase/delete-player', {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ player_id: data.duplicate_reserve_id })
                })
                await safeJsonResponse(deleteRes, t('errorDeletingDuplicateReserve'))

                const retryRes = await fetch('/api/supabase/remove-player-from-slot', {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ player_id: playerId })
                })
                await safeJsonResponse(retryRes, t('errorRemovalAfterDuplicate'))
                setSelectedPlayer(null)
                setShowAssignModal(false)
                setSelectedSlot(null)
                await fetchRoster()
                await refreshDiagnosticAfterSave()
                showToast(lang === 'en' ? 'Player moved to reserves.' : 'Giocatore spostato in riserva.', 'success')
              } catch (retryErr) {
                console.error('[NuovaRosaLab] remove retry error:', retryErr)
                const { message } = mapErrorToUserMessage(retryErr, t('errorRemovalAfterDuplicate'), lang)
                showToast(message, 'error')
              }
            },
            onCancel: () => setConfirmModal(null)
          })
          return
        }

        if ((data?.error || '').toLowerCase().includes('massimo 12 riserve') || (data?.error || '').toLowerCase().includes('max 12 reserves')) {
          showToast(t('maxReservesReached'), 'error')
          return
        }

        throw new Error(data?.error || t('errorRemovalAfterDuplicate'))
      }
      setSelectedPlayer(null)
      setShowAssignModal(false)
      setSelectedSlot(null)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Player moved to reserves.' : 'Giocatore spostato in riserva.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] remove error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorRemovalAfterDuplicate'), lang)
      showToast(message, 'error')
    } finally {
      setAssigning(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, riserve.length, showToast, t])

  const openReserveStarterSlotPicker = React.useCallback((player) => {
    if (!player?.id) return
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setSelectedSlot(null)
    setStarterReservePickerSlot(null)
    setReserveSlotPickerPlayer(player)
  }, [])

  const openStarterReservePicker = React.useCallback((slot) => {
    if (!slot || riserve.length === 0) return
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setReserveSlotPickerPlayer(null)
    setStarterReservePickerSlot(slot)
  }, [riserve.length])

  const handleMoveReserveToStarterSlot = React.useCallback(async (slot) => {
    if (!reserveSlotPickerPlayer?.id || !slot) return
    setReserveSlotPickerPlayer(null)
    await handleSelectReserveForSlot(reserveSlotPickerPlayer, slot)
  }, [handleSelectReserveForSlot, reserveSlotPickerPlayer])

  const handlePickReserveForStarterSlot = React.useCallback(async (reservePlayer) => {
    if (!starterReservePickerSlot || !reservePlayer?.id) return
    const slot = starterReservePickerSlot
    setStarterReservePickerSlot(null)
    await handleSelectReserveForSlot(reservePlayer, slot)
  }, [handleSelectReserveForSlot, starterReservePickerSlot])

  const handleDeletePlayer = React.useCallback((playerId, isReserve = false) => {
    setConfirmModal({
      ...showConfirmConfig({
        title: t('confirm'),
        message: isReserve ? t('confirmDeleteReserve') : t('confirmDeletePlayer'),
        details: '',
        confirmLabel: t('delete'),
        cancelLabel: t('cancel'),
        confirmVariant: 'danger',
        presentation: 'sheet'
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        try {
          let token = getTokenFallback()
          if (!token && supabase) {
            const { data: session } = await supabase.auth.getSession()
            token = session?.session?.access_token
          }
          if (!token) throw new Error(t('sessionExpired'))

          const response = await fetch('/api/supabase/delete-player', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ player_id: playerId })
          })
          await safeJsonResponse(response, t('deleteReserveError'))
          setSelectedPlayer(null)
          setShowAssignModal(false)
          setSelectedSlot(null)
          await fetchRoster()
          await refreshDiagnosticAfterSave()
          showToast(t('playerDeletedSuccessfully'), 'success')
        } catch (err) {
          console.error('[NuovaRosaLab] delete error:', err)
          const { message } = mapErrorToUserMessage(err, t('deleteReserveError'), lang)
          showToast(message, 'error')
        }
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const handlePremiumPlayerSave = React.useCallback(async (payload) => {
    if (!selectedPlayer?.id) return
    setSavingPlayerEditor(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch(`/api/players/${selectedPlayer.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      await safeJsonResponse(response, t('errorSavingPlayerGeneric'))
      setSelectedPlayer(null)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Player updated.' : 'Giocatore aggiornato.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] premium save error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    } finally {
      setSavingPlayerEditor(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, selectedPlayer, showToast, t])

  const runBuildCoachForPlayer = React.useCallback(async (player, options = {}) => {
    if (!player?.id) return
    setBuildingPlayerId(player.id)
    setBuildCoachOverlay({
      title: lang === 'en' ? 'Preparing player build' : 'Preparo la build giocatore',
      message: lang === 'en'
        ? 'We are assigning growth points and updating the visible stats.'
        : 'Stiamo assegnando i punti crescita e aggiornando le statistiche visibili.'
    })
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch(`/api/build-coach/player/${player.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await safeJsonResponse(response, lang === 'en' ? 'Unable to calculate build.' : 'Impossibile calcolare la build.')
      const updatedResponse = await fetch(`/api/players/${player.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
        cache: 'no-store'
      })
      const updatedData = await safeJsonResponse(updatedResponse, lang === 'en' ? 'Unable to reload player.' : 'Impossibile ricaricare il giocatore.')
      if (updatedData?.player) {
        setSelectedPlayer(updatedData.player)
        if (options.openEditor) {
          const slotIndex = updatedData.player.slot_index != null ? Number(updatedData.player.slot_index) : null
          const baseSlots = completeSlotPositions(
            layout?.slot_positions && typeof layout.slot_positions === 'object'
              ? layout.slot_positions
              : DEFAULT_SLOT_POSITIONS
          )
          setSelectedSlot(slotIndex !== null
            ? {
                slot_index: slotIndex,
                x: Number(baseSlots?.[slotIndex]?.x ?? 50),
                y: Number(baseSlots?.[slotIndex]?.y ?? 50),
                position: baseSlots?.[slotIndex]?.position || updatedData.player.position || '?'
              }
            : null)
          setShowAssignModal(false)
          setShowPremiumEditorModal(true)
        }
      }
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      const after = data?.result?.after_overall
      showToast(
        lang === 'en'
          ? `Build saved (stats + OVR${after ? ` ${after}` : ''}). Use Save only if you edit skills or boosters.`
          : `Build salvata (statistiche + OVR${after ? ` ${after}` : ''}). Usa Salva solo se modifichi abilita o booster.`,
        'success'
      )
    } catch (err) {
      console.error('[NuovaRosaLab] build coach player error:', err)
      const rawMessage = String(err?.message || '')
      const isMaxLevelOne = rawMessage.includes('max_level_one')
      const isNonProgressionType = rawMessage.includes('non_progression_card_type')
      const { message } = mapErrorToUserMessage(
        err,
        isMaxLevelOne
          ? (lang === 'en'
              ? 'No growth points for this card (max level 1). If the card levels up in-game, set the correct max level on the player profile.'
              : 'Nessun punto crescita per questa carta (livello massimo 1). Se in gioco si potenzia, imposta il livello massimo corretto nel profilo giocatore.')
          : isNonProgressionType
            ? (lang === 'en'
                ? 'This card type has fixed progression in the game and cannot be optimized.'
                : 'Questo tipo di carta ha progressione fissa nel gioco e non può essere ottimizzata.')
            : (lang === 'en' ? 'Unable to calculate build.' : 'Impossibile calcolare la build.'),
        lang
      )
      showToast(message, 'error')
    } finally {
      setBuildingPlayerId(null)
      setBuildCoachOverlay(null)
    }
  }, [fetchRoster, lang, layout, refreshDiagnosticAfterSave, showToast, t])

  const requestBuildCoachForPlayer = React.useCallback((player, options = {}) => {
    if (!player?.id) return
    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Suggest player build' : 'Consiglia build giocatore',
        message: lang === 'en'
          ? 'We will suggest growth points for this player using role, native skills, team style and squad context. Highest OVR is not always the best choice.'
          : 'Consigliamo i punti crescita usando ruolo, abilita native, stile squadra e contesto rosa. L’OVR più alto non è sempre la scelta migliore.',
        details: lang === 'en'
          ? 'The OVR shown after the build follows the game view: active boosters and coach bonuses are included when available. You can edit everything later.'
          : 'L’OVR mostrato dopo la build segue la vista del gioco: include booster e bonus coach attivi quando disponibili. Potrai modificare tutto in seguito.',
        confirmLabel: lang === 'en' ? 'Suggest build' : 'Consiglia build',
        cancelLabel: t('cancel'),
        variant: 'info'
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        await runBuildCoachForPlayer(player, options)
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, runBuildCoachForPlayer, t])

  const runBuildCoachForRoster = React.useCallback(async () => {
    setBuildingRoster(true)
    setBuildCoachOverlay({
      title: lang === 'en' ? 'Optimizing squad' : 'Ottimizzazione rosa',
      message: lang === 'en'
        ? 'We are preparing growth builds for starters and reserves. This may take a few seconds.'
        : 'Stiamo preparando le build crescita di titolari e riserve. Potrebbero servire alcuni secondi.'
    })
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch('/api/build-coach/roster', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      const data = await safeJsonResponse(response, lang === 'en' ? 'Unable to optimize squad.' : 'Impossibile ottimizzare la rosa.')
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      const summary = data?.summary || {}
      showToast(
        lang === 'en'
          ? `Squad optimized: ${summary.updated || 0} players updated.`
          : `Rosa ottimizzata: ${summary.updated || 0} giocatori aggiornati.`,
        summary.skipped ? 'warning' : 'upgrade'
      )
    } catch (err) {
      console.error('[NuovaRosaLab] build coach roster error:', err)
      const { message } = mapErrorToUserMessage(err, lang === 'en' ? 'Unable to optimize squad.' : 'Impossibile ottimizzare la rosa.', lang)
      showToast(message, 'error')
    } finally {
      setBuildingRoster(false)
      setBuildCoachOverlay(null)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const requestBuildCoachForRoster = React.useCallback(() => {
    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Optimize squad builds' : 'Ottimizza build rosa',
        message: lang === 'en'
          ? 'We will prepare growth builds based on role, native skills, team style and squad needs, not just the highest possible OVR.'
          : 'Prepariamo le build in base a ruolo, abilita native, stile squadra e bisogni della rosa, non solo all’OVR più alto possibile.',
        details: lang === 'en'
          ? 'Card profile stats and OVR match eFootball Play (level-1 base + your PT + equipped booster only). Coach bonuses are not on the card profile. You can edit every player after the suggestion.'
          : 'Statistiche e OVR del profilo carta come in eFootball Play (base livello 1 + PT + solo booster equipaggiato). I bonus allenatore non compaiono sul profilo carta. Potrai modificare ogni giocatore dopo il suggerimento.',
        confirmLabel: lang === 'en' ? 'Prepare builds' : 'Prepara build',
        cancelLabel: t('cancel'),
        variant: 'info'
      }),
      onConfirm: async () => {
        setConfirmModal(null)
        await runBuildCoachForRoster()
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, runBuildCoachForRoster, t])

  const handleSaveTacticalSettings = React.useCallback(async (settings) => {
    setSavingTacticalSettings(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch('/api/supabase/save-tactical-settings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      const data = await safeJsonResponse(response, t('errorSavingTacticalSettings'))
      setTacticalSettings(data.settings)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(t('tacticalSettingsSaved'), 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] tactical settings error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingTacticalSettings'), lang)
      showToast(message, 'error')
    } finally {
      setSavingTacticalSettings(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const slots = React.useMemo(() => {
    const base = completeSlotPositions(
      layout?.slot_positions && typeof layout.slot_positions === 'object'
        ? layout.slot_positions
        : DEFAULT_SLOT_POSITIONS
    )

    return Array.from({ length: 11 }, (_, index) => ({
      slot_index: index,
      x: Number(customPositions?.[index]?.x ?? base?.[index]?.x ?? 50),
      y: Number(customPositions?.[index]?.y ?? base?.[index]?.y ?? 50),
      position: customPositions?.[index]?.position || base?.[index]?.position || '?'
    }))
  }, [customPositions, layout])

  const startersBySlot = React.useMemo(() => {
    const map = new Map()
    titolari.forEach((player) => map.set(player.slot_index, player))
    return map
  }, [titolari])

  const starterSlotChoices = React.useMemo(() => {
    return slots.map((slot) => ({
      slot,
      occupant: startersBySlot.get(slot.slot_index) || null
    }))
  }, [slots, startersBySlot])

  const allRosterPlayers = React.useMemo(() => [...titolari, ...riserve], [titolari, riserve])

  const handleFieldPositionChange = React.useCallback((slotIndex, position) => {
    const allAttackSlots = []
    Object.entries(customPositions || {}).forEach(([idx, pos]) => {
      if (pos?.y < 40) allAttackSlots.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
    })
    if (position?.y < 40) {
      allAttackSlots.push({ slotIndex: Number(slotIndex), x: position.x, y: position.y })
    }
    Object.entries(layout?.slot_positions || {}).forEach(([idx, pos]) => {
      if (pos?.y < 40 && !customPositions?.[idx]) {
        allAttackSlots.push({ slotIndex: Number(idx), x: pos.x, y: pos.y })
      }
    })

    const computedRole = calculatePositionFromCoordinates(
      slotIndex,
      position.x,
      position.y,
      allAttackSlots.length > 1 ? allAttackSlots : null
    )
    const previousRole =
      customPositions?.[slotIndex]?.position ||
      customPositions?.[String(slotIndex)]?.position ||
      layout?.slot_positions?.[slotIndex]?.position ||
      layout?.slot_positions?.[String(slotIndex)]?.position ||
      null
    const nextRole = applyMedCcHysteresis(previousRole, computedRole, position.x, position.y)
    let nextX = clampPercent(position.x)
    let nextY = clampPercent(position.y)
    if (String(nextRole).toUpperCase() === 'PT') {
      const clamped = clampGkInGoalMouth(nextX, nextY)
      nextX = clamped.x
      nextY = clamped.y
    }

    setCustomPositions((prev) => ({
      ...prev,
      [slotIndex]: {
        x: nextX,
        y: nextY,
        position: nextRole
      }
    }))
  }, [customPositions, layout])

  const saveFieldLayout = React.useCallback(async (skipOutOfRoleWarning = false) => {
    if (!layout || Object.keys(customPositions).length === 0) {
      setFieldEditMode(false)
      setCustomPositions({})
      return
    }
    setSavingFieldLayout(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const updatedSlotPositions = completeSlotPositions(layout.slot_positions)
      Object.entries(customPositions).forEach(([slotIndex, pos]) => {
        let x = clampPercent(pos.x)
        let y = clampPercent(pos.y)
        let position = pos.position || updatedSlotPositions[slotIndex]?.position || '?'
        if (String(position).toUpperCase() === 'PT') {
          const clamped = clampGkInGoalMouth(x, y)
          x = clamped.x
          y = clamped.y
        }
        updatedSlotPositions[slotIndex] = {
          ...(updatedSlotPositions[slotIndex] || {}),
          x,
          y,
          position
        }
      })

      const playersOutOfRole = Object.entries(customPositions)
        .map(([slotIndex, pos]) => {
          const player = titolari.find((entry) => Number(entry.slot_index) === Number(slotIndex))
          if (!player || !pos?.position) return null
          const originalPositions = Array.isArray(player.original_positions) && player.original_positions.length > 0
            ? player.original_positions
            : (player.position ? [{ position: player.position, competence: 'Alta' }] : [])
          const isOriginal = originalPositions.some((entry) => String(entry?.position || '').toUpperCase() === String(pos.position).toUpperCase())
          if (isOriginal || originalPositions.length === 0) return null
          return {
            player,
            newRole: pos.position,
            originalPositions,
            originalPositionsLabel: originalPositions.map((entry) => entry.position).filter(Boolean).join(', ')
          }
        })
        .filter(Boolean)

      if (!skipOutOfRoleWarning) {
        if (playersOutOfRole.length > 0) {
          setSavingFieldLayout(false)
          const details = playersOutOfRole
            .map(({ player, newRole, originalPositionsLabel }) => `${player.player_name}: ${originalPositionsLabel} -> ${newRole}`)
            .join('\n')
          setConfirmModal({
            ...showConfirmConfig({
              title: lang === 'en' ? 'Players out of role' : 'Giocatori fuori ruolo',
              message: lang === 'en'
                ? 'Some moved players are no longer in one of their original roles.'
                : 'Alcuni giocatori spostati non sono piu in uno dei loro ruoli originali.',
              details,
              confirmLabel: lang === 'en' ? 'Save anyway' : 'Salva comunque',
              cancelLabel: t('cancel')
            }),
            onConfirm: async () => {
              setConfirmModal(null)
              await saveFieldLayout(true)
            },
            onCancel: () => setConfirmModal(null)
          })
          return
        }
      }

      if (skipOutOfRoleWarning && playersOutOfRole.length > 0) {
        await Promise.all(playersOutOfRole.map(async ({ player, newRole, originalPositions }) => {
          const roleExists = originalPositions.some((entry) => String(entry?.position || '').toUpperCase() === String(newRole).toUpperCase())
          if (roleExists) return
          const updatedOriginalPositions = [
            ...originalPositions,
            { position: newRole, competence: 'Intermedia' }
          ]
          await fetch(`/api/players/${player.id}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ original_positions: updatedOriginalPositions })
          })
        }))
      }

      const effectiveFormation = getFormationNameFromSlotPositions(updatedSlotPositions) || layout.formation || 'Custom'

      const response = await fetch('/api/supabase/save-formation-layout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          formation: effectiveFormation,
          slot_positions: updatedSlotPositions,
          preserve_slots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        })
      })
      await safeJsonResponse(response, t('errorSavingFormation'))
      setFieldEditMode(false)
      setCustomPositions({})
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(t('positionsSavedSuccessfully'), 'success')
    } catch (err) {
      const { message } = mapErrorToUserMessage(err, t('errorSavingFormation'), lang)
      showToast(message, 'error')
    } finally {
      setSavingFieldLayout(false)
    }
  }, [customPositions, fetchRoster, lang, layout, refreshDiagnosticAfterSave, showToast, t, titolari])

  return (
    <main className="nr-page">
      <section className="nr-hero-card">
        <div className="nr-hero-copy">
          <h1>{lang === 'en' ? 'My squad' : 'La mia rosa'}</h1>
          <div className="nr-coach-header-panel">
            <button
              type="button"
              className={`nr-coach-header-main ${activeCoach?.coach_name ? 'is-clickable' : ''}`}
              onClick={openCoachDetails}
              disabled={!activeCoach?.coach_name}
              title={activeCoach?.coach_name ? (lang === 'en' ? 'Open coach details' : 'Apri dettagli allenatore') : undefined}
            >
              <div className="nr-coach-avatar">
                {getCoachCardImage(activeCoach) ? (
                  <img src={getCoachCardImage(activeCoach)} alt={activeCoach?.coach_name || 'coach'} />
                ) : (
                  <Star size={18} />
                )}
              </div>
              <div>
                <span>{lang === 'en' ? 'Coach' : 'Allenatore'}</span>
                <strong>{activeCoach?.coach_name || (lang === 'en' ? 'Not selected yet' : 'Non selezionato')}</strong>
                <p>
                  {activeCoach?.coach_name
                    ? (getBestCoachPlaystyle(activeCoach)
                      ? `${t(getBestCoachPlaystyle(activeCoach)[0]) || getBestCoachPlaystyle(activeCoach)[0].replace(/_/g, ' ')} ${getBestCoachPlaystyle(activeCoach)[1]}`
                      : (activeCoach.category || activeCoach.team || (lang === 'en' ? 'Active coach' : 'Coach attivo')))
                    : (lang === 'en'
                      ? 'Choose from catalog or upload screenshots.'
                      : 'Scegli da catalogo o carica screenshot.')}
                </p>
                {activeCoach?.coach_name && (
                  <small>{lang === 'en' ? 'Click to view details' : 'Clicca per vedere i dettagli'}</small>
                )}
              </div>
            </button>
            <div className="nr-coach-header-actions">
              <button type="button" className="nr-primary-button" onClick={openCoachCatalog} disabled={savingCoach}>
                <Search size={14} />
                {activeCoach?.coach_name
                  ? (lang === 'en' ? 'Change catalog' : 'Cambia da catalogo')
                  : (lang === 'en' ? 'Choose catalog' : 'Scegli catalogo')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="nr-card nr-empty-state">{t('nuovaRosaLoading')}</section>
      ) : error ? (
        <section className="nr-card nr-empty-state">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </section>
      ) : (
        <div className="nr-main-stack">
          <section className="nr-build-workspace-row">
            <div className="nr-build-coach-command-card">
              <div className="nr-build-coach-command-head">
                <div>
                  <span className="nr-mini-kicker">{lang === 'en' ? 'Guided builds' : 'Build guidate'}</span>
                  <p>{lang === 'en' ? 'Choose where you want a suggestion' : 'Scegli dove vuoi un consiglio'}</p>
                </div>
                <Sparkles size={20} />
              </div>
              <div className="nr-build-coach-command-grid">
                <button type="button" className="nr-build-coach-action primary" onClick={requestBuildCoachForRoster} disabled={buildingRoster || loading}>
                  {buildingRoster ? <RefreshCw size={18} className="nr-spin" /> : <Sparkles size={18} />}
                  <span>
                    <strong>{lang === 'en' ? 'Prepare squad builds' : 'Prepara build rosa'}</strong>
                    <small>{lang === 'en' ? 'Not just highest OVR: role and squad needs' : 'Non solo OVR alto: ruolo e bisogni rosa'}</small>
                  </span>
                </button>
                <button type="button" className="nr-build-coach-action" onClick={() => setBuildCoachPlayerPickerOpen(true)} disabled={buildingRoster || allRosterPlayers.length === 0}>
                  <User size={18} />
                  <span>
                    <strong>{lang === 'en' ? 'Suggest one build' : 'Consiglia una build'}</strong>
                    <small>{lang === 'en' ? 'Final OVR with active bonuses' : 'OVR finale con bonus attivi'}</small>
                  </span>
                </button>
              </div>
              <div className="nr-build-coach-secondary-grid">
                <div className="nr-formation-inline-tile">
                  <span>{lang === 'en' ? 'Formation' : 'Modulo'}</span>
                  <strong>{layout?.formation || '4-3-3'}</strong>
                </div>
                <button type="button" className="nr-move-players-wide-button" onClick={() => setFieldEditMode(true)} disabled={fieldEditMode}>
                  <ArrowRight size={14} />
                  <span>{lang === 'en' ? 'Move positions' : 'Muovi posizioni'}</span>
                </button>
              </div>
            </div>
          </section>
          <section className="nr-workspace-block">
            {fieldEditMode && (
              <div className="nr-field-edit-actions">
                <button type="button" className="nr-secondary-button" onClick={() => { setFieldEditMode(false); setCustomPositions({}) }} disabled={savingFieldLayout}>
                  {t('cancel')}
                </button>
                <button type="button" className="nr-primary-button" onClick={() => saveFieldLayout()} disabled={savingFieldLayout}>
                  {savingFieldLayout ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (lang === 'en' ? 'Save positions' : 'Salva posizioni')}
                </button>
              </div>
            )}
            <div className="nr-field-shell">
              <div className="nr-field-formation-badge">
                <span>{lang === 'en' ? 'Formation' : 'Formazione'}</span>
                <strong>{layout?.formation || '4-3-3'}</strong>
              </div>
              <div className={`nr-field ${fieldEditMode ? 'is-editing' : ''}`} data-field-container>
                <div className="nr-field-texture" />
                <div className="nr-field-dark-vignette" />
                <div className="nr-field-mid-line" />
                <div className="nr-field-center-circle" />
                <div className="nr-field-center-dot" />
                <div className="nr-field-penalty-top-outer" />
                <div className="nr-field-penalty-top-inner" />
                <div className="nr-field-penalty-bottom-outer" />
                <div className="nr-field-penalty-bottom-inner" />
                <div className="nr-field-side-left" />
                <div className="nr-field-side-right" />
                <div className="nr-field-zone-top" />
                <div className="nr-field-zone-bottom" />
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.slot_index}
                    slot={slot}
                    player={startersBySlot.get(slot.slot_index)}
                    onEmptyClick={openPickerForSlot}
                    onPlayerClick={(player, slotData) => {
                      setSelectedSlot(slotData)
                      setSelectedPlayer(player)
                      setShowAssignModal(true)
                    }}
                    onRemove={(playerId) => handleDeletePlayer(playerId, false)}
                    lang={lang}
                    isEditMode={fieldEditMode}
                    onPositionChange={handleFieldPositionChange}
                    activeCoach={activeCoach}
                    tacticalSettings={tacticalSettings}
                  />
                ))}
              </div>
            </div>
          </section>

          <TacticalSettingsPanel
            titolari={titolari}
            tacticalSettings={tacticalSettings}
            onSave={handleSaveTacticalSettings}
            saving={savingTacticalSettings}
          />

          <section className="nr-reserve-section">
            <div className="nr-card-head">
              <div>
                <span className="nr-mini-kicker">{t('nuovaRosaReserves')}</span>
                <h2>{riserve.length}/{MAX_RESERVES}</h2>
              </div>
              <button
                type="button"
                className="nr-icon-button"
                onClick={openPickerForReserve}
                disabled={riserve.length >= MAX_RESERVES}
                aria-label={riserve.length >= MAX_RESERVES
                  ? (lang === 'en' ? 'Reserves are full' : 'Riserve al completo')
                  : (lang === 'en' ? 'Add reserve' : 'Aggiungi riserva')}
                title={riserve.length >= MAX_RESERVES
                  ? (lang === 'en' ? 'Reserves are full' : 'Riserve al completo')
                  : (lang === 'en' ? 'Add reserve' : 'Aggiungi riserva')}
              >
                <Plus size={16} />
              </button>
            </div>
            {riserve.length >= MAX_RESERVES && (
              <div className="nr-limit-note">
                {lang === 'en' ? 'Reserve bench full. Delete a reserve before adding another one.' : 'Panchina riserve piena. Elimina una riserva prima di aggiungerne un altra.'}
              </div>
            )}
            <div className="nr-reserve-grid">
              {riserve.length > 0 ? riserve.map((player) => {
                const reserveThumb = resolvePlayerCardImageUrl(player)
                return (
                  <div
                    key={player.id}
                    className="nr-reserve-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (selectedSlot && showAssignModal) {
                        handleSelectReserveForSlot(player)
                      } else {
                        setSelectedSlot(null)
                        setSelectedPlayer(player)
                        setShowAssignModal(true)
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        if (selectedSlot && showAssignModal) {
                          handleSelectReserveForSlot(player)
                        } else {
                          setSelectedSlot(null)
                          setSelectedPlayer(player)
                          setShowAssignModal(true)
                        }
                      }
                    }}
                  >
                    <div className="nr-reserve-card-media">
                      {reserveThumb ? (
                        <img src={reserveThumb} alt={player.player_name} loading="lazy" draggable={false} />
                      ) : (
                        <div className="nr-reserve-initials">{getPlayerInitials(player.player_name)}</div>
                      )}
                    </div>
                    <div className="nr-reserve-card-copy">
                      <strong>{player.player_name}</strong>
                      <span>{player.role || player.playing_style_name || player.card_type || '-'}</span>
                    </div>
                    <span className="nr-reserve-position-pill">{player.position || '-'}</span>
                    <ChevronRight size={14} />
                    <button
                      type="button"
                      className="nr-reserve-edit"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSelectedSlot(null)
                        setSelectedPlayer(player)
                        setShowAssignModal(false)
                        setShowPremiumEditorModal(true)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      aria-label={lang === 'en' ? 'Edit reserve' : 'Modifica riserva'}
                      title={lang === 'en' ? 'Edit reserve' : 'Modifica riserva'}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="nr-reserve-remove"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleDeletePlayer(player.id, true)
                      }}
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      aria-label={lang === 'en' ? 'Delete reserve' : 'Elimina riserva'}
                      title={lang === 'en' ? 'Delete reserve' : 'Elimina riserva'}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )
              }) : (
                <div className="nr-empty-state">
                  <span>{t('nuovaRosaNoReserves')}</span>
                </div>
              )}
            </div>
          </section>

        </div>
      )}

      <CatalogPickerModal
        show={pickerOpen}
        slot={selectedSlot}
        mode={pickerMode}
        searchQuery={pickerQuery}
        onSearchChange={handlePickerSearchChange}
        sort={pickerSort}
        onSortChange={handlePickerSortChange}
        onCatalogViewChange={handleCatalogViewChange}
        loading={pickerLoading}
        loadingMore={pickerLoadingMore}
        results={pickerResults}
        total={pickerTotal}
        hasMore={pickerHasMore}
        reserves={riserve}
        onClose={closePicker}
        onSelectCatalogCard={pickerMode === 'reserve' ? handleSaveCatalogCardAsReserve : handleSaveCatalogCardToSlot}
        onSelectReserve={handleSelectReserveForSlot}
        onLoadMore={loadMoreCatalog}
        onUploadFallback={() => openPhotoUploadFlow(pickerMode, selectedSlot)}
        lang={lang}
      />

      <CoachDetailsModal
        show={showCoachDetailsModal}
        coach={activeCoach}
        onClose={closeCoachDetails}
        onReplaceFromCatalog={openCoachCatalog}
        onReplaceFromPhoto={openCoachPhotoUpload}
        saving={savingCoach}
        lang={lang}
        t={t}
      />

      <CoachCatalogModal
        show={coachCatalogOpen}
        searchQuery={coachCatalogQuery}
        onSearchChange={setCoachCatalogQuery}
        sort={coachCatalogSort}
        onSortChange={setCoachCatalogSort}
        loading={coachCatalogLoading}
        saving={savingCoach}
        results={coachCatalogResults}
        total={coachCatalogTotal}
        activePlaystyle={activeTeamPlaystyle}
        onClose={closeCoachCatalog}
        onSelectCoach={handleSelectCatalogCoach}
        onUploadFallback={openCoachPhotoUpload}
        lang={lang}
        t={t}
      />

      <CoachPhotoUploadModal
        show={showCoachPhotoUploadModal}
        images={coachPhotoImages}
        onImagesChange={setCoachPhotoImages}
        onUpload={handleCoachPhotoUpload}
        onClose={closeCoachPhotoUpload}
        uploading={savingCoach}
        onOptimizeError={(message) => showToast(message, 'error')}
        lang={lang}
        t={t}
      />

      <PhotoUploadModal
        show={showPhotoUploadModal}
        mode={photoUploadMode}
        slot={photoUploadSlot}
        images={photoUploadImages}
        onImagesChange={setPhotoUploadImages}
        onUpload={handlePhotoUploadExtract}
        onClose={closePhotoUpload}
        uploading={uploadingPhoto}
        onOptimizeError={(message) => showToast(message, 'error')}
        completionTarget={photoCompletionTarget}
        lang={lang}
        t={t}
      />

      <PhotoExtractionReviewModal
        show={showPhotoReviewModal}
        playerData={extractedPlayerData}
        mode={positionModalCtx?.uploadMode}
        slot={photoUploadSlot}
        completionTarget={photoCompletionTarget}
        lang={lang}
        onContinue={positionModalCtx?.uploadMode === 'complete'
          ? handleSavePhotoCompletion
          : () => setShowPhotoReviewModal(false)}
        onCancel={resetPhotoPositionFlow}
      />

      {positionModalCtx && extractedPlayerData && positionModalCtx.uploadMode !== 'complete' && !showPhotoReviewModal && (
        <PositionSelectionModal
          playerName={extractedPlayerData.player_name}
          overallRating={extractedPlayerData.overall_rating}
          mainPosition={extractedPlayerData.position}
          selectedPositions={selectedOriginalPositions}
          onPositionsChange={setSelectedOriginalPositions}
          onConfirm={handleSavePhotoPlayerWithPositions}
          uploading={uploadingPhoto}
          onCancel={resetPhotoPositionFlow}
        />
      )}

      {catalogPositionCtx?.card && (
        <PositionSelectionModal
          playerName={catalogPositionCtx.card.player_name}
          overallRating={catalogPositionCtx.card.overall_level_1 ?? catalogPositionCtx.card.overall_max_level}
          mainPosition={catalogPositionCtx.card?.players_payload?.position || catalogPositionCtx.card.position}
          selectedPositions={selectedOriginalPositions}
          onPositionsChange={setSelectedOriginalPositions}
          onConfirm={handleSaveCatalogPlayerWithPositions}
          uploading={assigning}
          onCancel={() => {
            setCatalogPositionCtx(null)
            setSelectedOriginalPositions([])
          }}
        />
      )}

      <ReserveStarterSlotModal
        show={!!reserveSlotPickerPlayer}
        player={reserveSlotPickerPlayer}
        slotChoices={starterSlotChoices}
        assigning={assigning}
        onClose={() => setReserveSlotPickerPlayer(null)}
        onSelectSlot={handleMoveReserveToStarterSlot}
        lang={lang}
      />

      <StarterReserveReplacementModal
        show={!!starterReservePickerSlot}
        slot={starterReservePickerSlot}
        reserves={riserve}
        assigning={assigning}
        onClose={() => setStarterReservePickerSlot(null)}
        onPickReserve={handlePickReserveForStarterSlot}
        lang={lang}
      />

      <BuildCoachPlayerPickerModal
        show={buildCoachPlayerPickerOpen}
        players={allRosterPlayers}
        buildingPlayerId={buildingPlayerId}
        onClose={() => setBuildCoachPlayerPickerOpen(false)}
        onPick={(player) => {
          setBuildCoachPlayerPickerOpen(false)
          requestBuildCoachForPlayer(player, { openEditor: true })
        }}
        lang={lang}
      />

      <QuickPlayerPanel
        player={showAssignModal ? selectedPlayer : null}
        slot={selectedSlot}
        onClose={() => {
          setShowAssignModal(false)
          setSelectedSlot(null)
          setSelectedPlayer(null)
        }}
        onRemoveFromSlot={handleRemoveFromSlot}
        onDeletePlayer={handleDeletePlayer}
        onUploadPhoto={() => openPhotoUploadFlow('slot', selectedSlot)}
        onCompletePhotoProfile={openPhotoCompletionFlow}
        onMoveReserveToStarter={openReserveStarterSlotPicker}
        onReplaceWithReserve={() => openStarterReservePicker(selectedSlot)}
        benchReserveCount={riserve.length}
        onOpenReplace={(player, openEditor = false) => {
          if (openEditor) {
            setShowAssignModal(false)
            setSelectedPlayer(player)
            setShowPremiumEditorModal(true)
            return
          }
          const slot = player?.slot_index != null ? slots.find((entry) => entry.slot_index === player.slot_index) : null
          setShowAssignModal(false)
          setSelectedPlayer(null)
          if (slot) {
            openPickerForSlot(slot)
          }
        }}
        lang={lang}
      />

      <PremiumPlayerModal
        player={showPremiumEditorModal ? selectedPlayer : null}
        slot={selectedSlot}
        show={showPremiumEditorModal && !!selectedPlayer}
        onClose={() => {
          setShowPremiumEditorModal(false)
          setSelectedPlayer(null)
        }}
        onSave={handlePremiumPlayerSave}
        onBuildCoach={requestBuildCoachForPlayer}
        saving={savingPlayerEditor}
        building={buildingPlayerId === selectedPlayer?.id}
        onRemoveFromSlot={handleRemoveFromSlot}
        onDeletePlayer={handleDeletePlayer}
        onOpenReplace={(player) => {
          const slot = player?.slot_index != null ? slots.find((entry) => entry.slot_index === player.slot_index) : null
          setShowPremiumEditorModal(false)
          setSelectedPlayer(null)
          if (slot) {
            openPickerForSlot(slot)
          }
        }}
        lang={lang}
        activeCoach={activeCoach}
        tacticalSettings={tacticalSettings}
        t={t}
      />

      {confirmModal?.show && (
        <ConfirmModal
          show={confirmModal.show}
          title={confirmModal.title}
          message={confirmModal.message}
          details={confirmModal.details}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          confirmVariant={confirmModal.confirmVariant}
          variant={confirmModal.variant}
          presentation={confirmModal.presentation}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      {buildCoachOverlay && (
        <div className="nr-build-coach-overlay" role="status" aria-live="polite">
          <div className="nr-build-coach-progress-card">
            <div className="nr-build-coach-progress-icon">
              <span className="nr-build-coach-logo-scan" />
              <span className="nr-build-coach-logo-orbit" />
              <img src="/logo.png" alt="" />
            </div>
            <div>
              <span className="nr-build-coach-progress-kicker">AI Coach</span>
              <strong>{buildCoachOverlay.title}</strong>
              <p>{buildCoachOverlay.message}</p>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`nr-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <style jsx global>{`
        body:has(.nr-page) {
          background:
            radial-gradient(circle at 18% 8%, rgba(0, 212, 255, 0.22), transparent 28%),
            radial-gradient(circle at 86% 12%, rgba(124, 58, 237, 0.22), transparent 30%),
            radial-gradient(circle at 50% 95%, rgba(251, 191, 36, 0.12), transparent 32%),
            linear-gradient(135deg, #020510 0%, #061226 40%, #030712 100%) !important;
        }

        .nr-page {
          width: min(1440px, 100%);
          margin: 0 auto;
          padding: clamp(18px, 3vw, 32px);
          position: relative;
          isolation: isolate;
        }

        .nr-page:before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 0 17%, rgba(0, 212, 255, 0.08) 17.3% 17.7%, transparent 18% 42%, rgba(124, 58, 237, 0.08) 42.2% 42.6%, transparent 43%),
            radial-gradient(circle at 12% 8%, rgba(0, 212, 255, 0.20), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(168, 85, 247, 0.20), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(52, 211, 153, 0.11), transparent 34%);
          z-index: -1;
        }

        .nr-page:after {
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
          animation: nrArenaDrift 18s linear infinite;
        }

        .nr-spin {
          animation: nrSpin 0.9s linear infinite;
        }

        @keyframes nrSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes nrArenaDrift {
          from { transform: translate3d(0, 0, 0); }
          to { transform: translate3d(-58px, -58px, 0); }
        }

        .nr-card,
        .nr-hero-card,
        .nr-modal-shell {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: linear-gradient(180deg, rgba(8, 12, 28, 0.96), rgba(5, 8, 20, 0.96));
          border-radius: 18px;
        }

        .nr-hero-card {
          padding: clamp(10px, 2vw, 16px);
          display: block;
          gap: 14px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          border-color: rgba(0, 212, 255, 0.34);
          background:
            radial-gradient(circle at 8% 12%, rgba(0, 212, 255, 0.22), transparent 32%),
            radial-gradient(circle at 82% 22%, rgba(255, 177, 66, 0.16), transparent 30%),
            linear-gradient(135deg, rgba(10, 19, 43, 0.98), rgba(6, 9, 24, 0.96) 58%, rgba(9, 22, 39, 0.98));
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.36),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .nr-hero-card:after {
          content: '';
          position: absolute;
          inset: auto -10% -55% 35%;
          height: 220px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.22), transparent);
          transform: rotate(-7deg);
          pointer-events: none;
        }

        .nr-hero-copy,
        .nr-hero-side {
          position: relative;
          z-index: 1;
        }

        .nr-hero-copy {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
        }

        .nr-hero-copy h1 {
          font-size: clamp(20px, 2.2vw, 28px);
          line-height: 1.05;
          letter-spacing: -0.03em;
          text-shadow: 0 0 32px rgba(0, 212, 255, 0.18);
          margin: 0;
        }

        .nr-hero-copy p {
          max-width: 720px;
          font-size: 15px;
          line-height: 1.6;
        }

        .nr-hero-side {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            radial-gradient(circle at top right, rgba(52, 211, 153, 0.16), transparent 34%),
            rgba(255, 255, 255, 0.045);
          padding: 16px;
          align-self: stretch;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
        }

        .nr-mini-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 212, 255, 0.82);
        }

        .nr-hero-copy h1,
        .nr-card-head h2,
        .nr-modal-header h2,
        .nr-picker-detail h3,
        .nr-quick-body h3 {
          margin: 8px 0 0;
          color: #fff;
        }

        .nr-hero-copy p,
        .nr-modal-header p,
        .nr-empty-state span,
        .nr-warning-box span {
          color: rgba(255, 255, 255, 0.78);
        }

        .nr-hero-actions,
        .nr-secondary-actions,
        .nr-quick-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .nr-complete-photo-callout {
          border-radius: 16px;
          border: 1px solid rgba(245, 158, 11, 0.3);
          background:
            radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 34%),
            rgba(245, 158, 11, 0.07);
          padding: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
        }

        .nr-complete-photo-callout > svg {
          color: #fbbf24;
        }

        .nr-complete-photo-callout strong {
          display: block;
          color: #fff;
          font-size: 13px;
          margin-bottom: 3px;
        }

        .nr-complete-photo-callout p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.4;
        }

        .nr-primary-button,
        .nr-secondary-button,
        .nr-danger-button,
        .nr-icon-button {
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.3);
          background: rgba(0, 212, 255, 0.1);
          color: #fff;
          padding: 11px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .nr-primary-button:hover,
        .nr-secondary-button:hover,
        .nr-danger-button:hover,
        .nr-icon-button:hover {
          transform: translateY(-1px);
          border-color: rgba(0, 212, 255, 0.55);
        }

        .nr-primary-button:disabled,
        .nr-secondary-button:disabled,
        .nr-danger-button:disabled,
        .nr-icon-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .nr-danger-button {
          border-color: rgba(255, 59, 48, 0.35);
          background: rgba(255, 59, 48, 0.12);
        }

        .nr-danger-zone {
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          margin-top: 4px;
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
        }

        .nr-danger-zone > span,
        .nr-limit-note {
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-premium-toolbar-row .nr-danger-zone {
          width: 100%;
        }

        .nr-limit-note {
          margin: -2px 0 12px;
          color: rgba(255, 177, 66, 0.86);
        }

        .nr-icon-button {
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
        }

        .nr-main-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-card {
          padding: 18px;
        }

        .nr-workspace-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-build-workspace-row {
          display: block;
        }

        .nr-build-coach-command-card {
          border-radius: 20px;
          border: 1px solid rgba(0, 212, 255, 0.22);
          background:
            radial-gradient(circle at 100% 0%, rgba(0, 212, 255, 0.18), transparent 32%),
            linear-gradient(180deg, rgba(9, 14, 31, 0.96), rgba(5, 8, 20, 0.95));
          padding: 14px;
          box-shadow: 0 14px 40px rgba(0, 0, 0, 0.28);
        }

        .nr-build-coach-command-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .nr-build-coach-command-head p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
        }

        .nr-build-coach-command-head > svg {
          color: var(--primary-cyan, #00d4ff);
          filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.4));
        }

        .nr-build-coach-command-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 10px;
        }

        .nr-build-coach-secondary-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-build-coach-action,
        .nr-formation-inline-tile,
        .nr-move-players-wide-button {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.78);
          color: #fff;
          min-height: 62px;
          padding: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          text-align: left;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }

        .nr-formation-inline-tile {
          cursor: default;
          min-height: 46px;
          justify-content: center;
          text-align: center;
          flex-direction: column;
          gap: 2px;
          padding: 8px 10px;
          background:
            radial-gradient(circle at 0% 0%, rgba(0, 212, 255, 0.12), transparent 40%),
            rgba(15, 23, 42, 0.7);
        }

        .nr-formation-inline-tile span {
          color: rgba(0, 212, 255, 0.78);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .nr-formation-inline-tile strong {
          color: #fff;
          font-size: 20px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .nr-move-players-wide-button {
          min-height: 46px;
          justify-content: center;
          text-align: center;
          color: rgba(255, 255, 255, 0.88);
          font-weight: 850;
          background: rgba(15, 23, 42, 0.72);
        }

        .nr-build-coach-action.primary {
          border-color: rgba(34, 211, 238, 0.48);
          background: linear-gradient(135deg, rgba(6, 182, 212, 0.9), rgba(124, 58, 237, 0.9));
          box-shadow: 0 10px 24px rgba(34, 211, 238, 0.2);
        }

        .nr-build-coach-action:hover:not(:disabled),
        .nr-move-players-wide-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(0, 212, 255, 0.48);
          background: rgba(15, 23, 42, 0.95);
        }

        .nr-build-coach-action.primary:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(8, 211, 238, 0.96), rgba(139, 92, 246, 0.96));
          box-shadow: 0 14px 30px rgba(34, 211, 238, 0.28);
        }

        .nr-build-coach-action:disabled,
        .nr-move-players-wide-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .nr-build-coach-action span {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nr-build-coach-action strong {
          font-size: 13px;
          line-height: 1.1;
        }

        .nr-build-coach-action small {
          color: rgba(255, 255, 255, 0.72);
          font-size: 11px;
        }

        .nr-workspace-head {
          padding: 0 2px;
          margin-bottom: 6px;
        }

        .nr-field-edit-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-bottom: 8px;
        }

        .nr-reserve-section {
          padding-top: 6px;
        }

        .nr-card-head,
        .nr-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .nr-modal-header {
          position: relative;
          padding-right: 56px;
        }

        .nr-modal-header .nr-icon-button {
          flex-shrink: 0;
          position: fixed;
          top: max(16px, env(safe-area-inset-top, 0px));
          right: 16px;
          /* Keep above picker content, but below global confirm modals. */
          z-index: 100300;
          width: 46px;
          height: 46px;
          border-color: rgba(255, 255, 255, 0.28);
          background: rgba(3, 7, 18, 0.96);
          color: #fff;
          box-shadow: 0 18px 48px rgba(0, 0, 0, 0.46), 0 0 0 1px rgba(0, 212, 255, 0.18);
        }

        .nr-field-shell {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0, 212, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(5, 8, 21, 0.4) 0%, rgba(10, 14, 39, 0.3) 50%, rgba(5, 8, 21, 0.4) 100%),
            linear-gradient(90deg, rgba(22, 163, 74, 0.08) 0%, rgba(34, 197, 94, 0.12) 50%, rgba(22, 163, 74, 0.08) 100%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(34, 197, 94, 0.05) 2px,
              rgba(34, 197, 94, 0.05) 4px
            ),
            linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.15) 50%, rgba(16, 185, 129, 0.12) 100%);
          width: 100%;
          max-width: clamp(540px, 94vw, 720px);
          min-height: clamp(292px, 39vh, 422px);
          aspect-ratio: 2 / 3;
          margin: 0 auto 18px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        .nr-field-formation-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 4;
          display: inline-flex;
          align-items: baseline;
          gap: 7px;
          padding: 6px 9px;
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.2);
          background: rgba(3, 7, 18, 0.54);
          color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(7px);
          pointer-events: none;
        }

        .nr-field-formation-badge span {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 212, 255, 0.75);
        }

        .nr-field-formation-badge strong {
          font-size: 13px;
          color: #fff;
        }

        .nr-field {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: inherit;
          background: transparent;
        }

        .nr-field.is-editing {
          outline: 2px solid rgba(251, 191, 36, 0.42);
          outline-offset: -4px;
        }

        .nr-field-texture,
        .nr-field-dark-vignette,
        .nr-field-mid-line,
        .nr-field-center-circle,
        .nr-field-center-dot,
        .nr-field-penalty-top-outer,
        .nr-field-penalty-top-inner,
        .nr-field-penalty-bottom-outer,
        .nr-field-penalty-bottom-inner,
        .nr-field-side-left,
        .nr-field-side-right,
        .nr-field-zone-top,
        .nr-field-zone-bottom {
          position: absolute;
          pointer-events: none;
        }

        .nr-field-texture {
          inset: 0;
          background:
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(34, 197, 94, 0.015) 10px,
              rgba(34, 197, 94, 0.015) 20px
            );
          opacity: 0.6;
        }

        .nr-field-dark-vignette {
          inset: 0;
          background:
            radial-gradient(ellipse at center, transparent 0%, rgba(5, 8, 21, 0.3) 100%),
            linear-gradient(180deg, rgba(5, 8, 21, 0.2) 0%, transparent 20%, transparent 80%, rgba(5, 8, 21, 0.2) 100%);
        }

        .nr-field-mid-line {
          top: 50%;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.5);
          transform: translateY(-50%);
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.4);
        }

        .nr-field-center-circle {
          top: 50%;
          left: 50%;
          width: 120px;
          height: 120px;
          border: 3px solid rgba(255, 255, 255, 0.4);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 16px rgba(255, 255, 255, 0.3);
        }

        .nr-field-center-dot {
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          background: rgba(255, 255, 255, 0.5);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.4);
        }

        .nr-field-penalty-top-outer {
          top: 8%;
          left: 10%;
          right: 10%;
          height: 18%;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-bottom: none;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 -2px 10px rgba(255, 255, 255, 0.2);
        }

        .nr-field-penalty-top-inner {
          top: 8%;
          left: 20%;
          right: 20%;
          height: 8%;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-bottom: none;
          border-radius: 8px 8px 0 0;
          box-shadow: 0 -2px 8px rgba(255, 255, 255, 0.2);
        }

        .nr-field-penalty-bottom-outer {
          bottom: 8%;
          left: 10%;
          right: 10%;
          height: 18%;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-top: none;
          border-radius: 0 0 12px 12px;
          box-shadow: 0 2px 10px rgba(255, 255, 255, 0.2);
        }

        .nr-field-penalty-bottom-inner {
          bottom: 8%;
          left: 20%;
          right: 20%;
          height: 8%;
          border: 3px solid rgba(255, 255, 255, 0.35);
          border-top: none;
          border-radius: 0 0 8px 8px;
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.2);
        }

        .nr-field-side-left {
          top: 0;
          bottom: 0;
          left: 5%;
          width: 2px;
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .nr-field-side-right {
          top: 0;
          bottom: 0;
          right: 5%;
          width: 2px;
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
        }

        .nr-field-zone-top {
          top: 25%;
          left: 5%;
          right: 5%;
          height: 1px;
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.15);
        }

        .nr-field-zone-bottom {
          top: 75%;
          left: 5%;
          right: 5%;
          height: 1px;
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 6px rgba(255, 255, 255, 0.15);
        }

        .nr-slot-card {
          position: absolute;
          transform: translate(-50%, -50%);
          width: clamp(76px, 8.6vw, 108px);
          max-width: 108px;
          overflow: visible;
        }

        .nr-slot-empty,
        .nr-slot-filled,
        .nr-bench-item,
        .nr-catalog-card {
          width: 100%;
          border: 1px solid rgba(0, 212, 255, 0.22);
          border-radius: 14px;
          background: rgba(9, 14, 31, 0.92);
          color: #fff;
          cursor: pointer;
        }

        .nr-slot-empty {
          min-height: 46px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(0, 212, 255, 0.08);
        }

        .nr-slot-filled {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          text-align: left;
          touch-action: manipulation;
          min-height: 78px;
          border-radius: 14px;
          overflow: visible;
          background:
            radial-gradient(circle at 20% 0%, rgba(0, 212, 255, 0.22), transparent 42%),
            linear-gradient(180deg, rgba(11, 41, 94, 0.93) 0%, rgba(8, 25, 66, 0.95) 100%);
          box-shadow: 0 6px 18px rgba(0, 212, 255, 0.22), 0 0 14px rgba(8, 145, 178, 0.2);
        }

        .nr-slot-filled::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: inherit;
          pointer-events: none;
          z-index: 0;
        }

        .nr-slot-filled.is-draggable,
        .nr-slot-empty.is-draggable {
          cursor: move;
          touch-action: none;
        }

        .nr-slot-filled.is-dragging,
        .nr-slot-empty.is-dragging {
          opacity: 0.75;
          z-index: 10;
        }

        .nr-slot-filled.has-photo-card {
          width: clamp(78px, 7vw, 92px);
          min-height: clamp(84px, 7.1vw, 96px);
          margin: 0 auto;
          padding: 12px 4px 5px;
        }

        .nr-slot-top-badge {
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.34);
          background: linear-gradient(135deg, rgba(3, 7, 18, 0.94), rgba(12, 74, 110, 0.92));
          color: #fff;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.38), 0 0 12px rgba(0, 212, 255, 0.22);
          white-space: nowrap;
          pointer-events: none;
        }

        .nr-slot-top-badge strong {
          font-size: 11px;
          line-height: 1;
          font-weight: 950;
          color: #d9f99d;
          font-variant-numeric: tabular-nums;
        }

        .nr-slot-top-badge span {
          font-size: 9px;
          line-height: 1;
          font-weight: 900;
          letter-spacing: 0.04em;
          color: #e0f2fe;
        }

        .nr-picker-detail-hero img,
        .nr-catalog-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .nr-slot-filled-main {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .nr-slot-avatar-mini {
          position: relative;
          width: 100%;
          height: clamp(50px, 6vw, 64px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background:
            radial-gradient(circle at 30% 20%, rgba(0, 212, 255, 0.34), transparent 38%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(12, 74, 110, 0.9));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.85);
          flex-shrink: 0;
        }

        .nr-slot-filled-main.has-photo .nr-slot-avatar-mini {
          width: clamp(64px, 6vw, 76px);
          height: clamp(70px, 6.8vw, 82px);
          border-radius: 10px;
        }

        .nr-slot-avatar-mini img {
          position: relative;
          z-index: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 42%;
          transform: scale(1.02);
          transform-origin: center center;
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }

        .nr-reserve-card-media::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 38%, rgba(3, 7, 18, 0.72) 100%);
          pointer-events: none;
        }

        .nr-player-initials,
        .nr-reserve-initials {
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.02em;
          color: #e0f2fe;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.42);
        }

        .nr-slot-caption-row {
          display: none;
        }

        .nr-slot-name-chip {
          min-width: 0;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 2px 5px;
          border-radius: 999px;
          background: rgba(3, 7, 18, 0.62);
          border: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 8.5px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.92);
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: center;
        }

        .nr-slot-name-initials {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 15px;
          height: 15px;
          border-radius: 999px;
          background: rgba(0, 212, 255, 0.16);
          color: #bae6fd;
          font-size: 7px;
          font-weight: 950;
          letter-spacing: -0.02em;
        }

        .nr-bench-item-copy strong,
        .nr-catalog-card-copy strong {
          font-size: 10px;
          line-height: 1.1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nr-slot-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1px solid rgba(239, 68, 68, 0.6);
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          z-index: 4;
        }

        .nr-slot-remove svg {
          width: 13px;
          height: 13px;
          display: block;
          stroke-width: 2.6;
        }

        .nr-slot-remove:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.6) 100%);
          transform: scale(1.15) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
        }

        .nr-bench-item-copy span,
        .nr-catalog-card-copy p,
        .nr-catalog-card-meta {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.75);
          font-style: normal;
        }

        .nr-field-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
          align-items: center;
          padding: 8px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(4, 8, 18, 0.42);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(10px);
        }

        .nr-build-coach-main-button {
          border: 1px solid rgba(34, 211, 238, 0.62);
          background:
            radial-gradient(circle at 16% 18%, rgba(255, 255, 255, 0.18), transparent 22%),
            linear-gradient(135deg, rgba(6, 182, 212, 0.92), rgba(124, 58, 237, 0.9));
          color: #fff;
          padding: 10px 15px;
          min-height: 48px;
          border-radius: 15px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          box-shadow: 0 10px 26px rgba(6, 182, 212, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
          transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
        }

        .nr-build-coach-main-button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: brightness(1.08);
          box-shadow: 0 14px 32px rgba(6, 182, 212, 0.34), 0 0 22px rgba(168, 85, 247, 0.24);
        }

        .nr-build-coach-main-button:disabled {
          opacity: 0.58;
          cursor: not-allowed;
          transform: none;
        }

        .nr-build-coach-main-button span {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.05;
        }

        .nr-build-coach-main-button strong {
          font-size: 13px;
          letter-spacing: 0.01em;
        }

        .nr-build-coach-main-button small {
          margin-top: 3px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.78;
        }

        .nr-move-players-button {
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(15, 23, 42, 0.72);
          color: rgba(255, 255, 255, 0.82);
          padding: 11px 14px;
          min-height: 44px;
          border-radius: 13px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .nr-move-players-button:hover {
          transform: translateY(-1px);
          border-color: rgba(148, 163, 184, 0.55);
          background: rgba(15, 23, 42, 0.94);
        }

        .nr-reserve-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(150px, 18vw, 190px), 1fr));
          gap: 10px;
        }

        .nr-reserve-card {
          position: relative;
          border-radius: 14px;
          border: 1px solid rgba(0, 212, 255, 0.16);
          background:
            radial-gradient(circle at 0% 0%, rgba(0, 212, 255, 0.13), transparent 40%),
            linear-gradient(180deg, rgba(8, 16, 36, 0.92), rgba(7, 13, 30, 0.94));
          color: #fff;
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) auto auto;
          gap: 9px;
          align-items: center;
          text-align: left;
          width: 100%;
          min-height: 68px;
          padding: 7px;
          cursor: pointer;
          transition: border-color 0.18s ease, transform 0.18s ease, background 0.18s ease;
        }

        .nr-reserve-card:hover {
          transform: translateY(-1px) scale(1.01);
          border-color: rgba(0, 212, 255, 0.34);
          background: linear-gradient(180deg, rgba(10, 20, 44, 0.95), rgba(8, 16, 36, 0.96));
        }

        .nr-reserve-remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.3) 0%, rgba(220, 38, 38, 0.4) 100%);
          border: 1px solid rgba(239, 68, 68, 0.6);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          z-index: 2;
        }

        .nr-reserve-edit {
          position: absolute;
          top: 8px;
          right: 42px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.22), rgba(124, 58, 237, 0.24));
          border: 1px solid rgba(0, 212, 255, 0.48);
          color: #ffffff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.22s ease;
          box-shadow: 0 2px 8px rgba(0, 212, 255, 0.28);
          z-index: 2;
        }

        .nr-reserve-edit:hover {
          transform: scale(1.12);
          border-color: rgba(0, 212, 255, 0.72);
          box-shadow: 0 4px 14px rgba(0, 212, 255, 0.42);
        }

        .nr-reserve-remove:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.6) 100%);
          transform: scale(1.15) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
        }

        .nr-reserve-card-media {
          position: relative;
          width: 44px;
          height: 54px;
          border-radius: 11px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background:
            radial-gradient(circle at 30% 20%, rgba(0, 212, 255, 0.34), transparent 38%),
            linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(12, 74, 110, 0.9));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nr-reserve-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          transform: scale(1.04);
        }

        .nr-reserve-card-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nr-reserve-card-copy strong {
          font-size: 11px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nr-reserve-card-copy span {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.75);
        }

        .nr-reserve-position-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.24);
          background: rgba(0, 212, 255, 0.08);
          color: #dff8ff;
          padding: 5px 8px;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }

        .nr-bench-list,
        .nr-catalog-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-bench-item,
        .nr-catalog-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          text-align: left;
        }

        .nr-bench-item-copy,
        .nr-catalog-card-copy {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nr-catalog-card {
          padding: 10px;
        }

        .nr-catalog-card-media,
        .nr-picker-detail-hero img {
          width: 58px;
          height: 76px;
          flex-shrink: 0;
        }

        .nr-coach-catalog-card .nr-catalog-card-media {
          width: 64px;
          height: 86px;
        }

        .nr-catalog-card-meta {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .compat-perfect { color: #34d399; }
        .compat-adaptable { color: #fbbf24; }
        .compat-out_of_role { color: #f87171; }

        .nr-stats-grid,
        .nr-picker-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-stats-grid div,
        .nr-picker-stats div {
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 12px;
        }

        .nr-hero-side .nr-stats-grid div {
          border-color: rgba(0, 212, 255, 0.18);
          background:
            linear-gradient(180deg, rgba(0, 212, 255, 0.08), rgba(255, 255, 255, 0.035));
        }

        .nr-hero-side .nr-stats-grid div:nth-child(2) {
          border-color: rgba(52, 211, 153, 0.22);
          background:
            linear-gradient(180deg, rgba(52, 211, 153, 0.1), rgba(255, 255, 255, 0.035));
        }

        .nr-hero-side .nr-stats-grid div:nth-child(3) {
          border-color: rgba(255, 177, 66, 0.24);
          background:
            linear-gradient(180deg, rgba(255, 177, 66, 0.11), rgba(255, 255, 255, 0.035));
        }

        .nr-stats-grid span,
        .nr-picker-stats span {
          display: block;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 4px;
        }

        .nr-stats-grid strong,
        .nr-picker-stats strong {
          color: #fff;
          font-size: 18px;
        }

        .nr-coach-header-panel {
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.2);
          background:
            radial-gradient(circle at top right, rgba(0, 212, 255, 0.14), transparent 38%),
            rgba(255, 255, 255, 0.045);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nr-coach-header-main {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          padding: 0;
          text-align: left;
        }

        .nr-coach-header-main.is-clickable {
          cursor: pointer;
          border-radius: 14px;
          transition: background 0.18s ease, transform 0.18s ease;
        }

        .nr-coach-header-main.is-clickable:hover {
          background: rgba(255, 255, 255, 0.035);
          transform: translateY(-1px);
        }

        .nr-coach-header-main:disabled {
          cursor: default;
        }

        .nr-coach-avatar {
          width: 54px;
          height: 68px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background:
            linear-gradient(180deg, rgba(0, 212, 255, 0.16), rgba(255, 255, 255, 0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 212, 255, 0.9);
          overflow: hidden;
          flex-shrink: 0;
        }

        .nr-coach-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nr-coach-header-main span {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(0, 212, 255, 0.78);
          margin-bottom: 3px;
        }

        .nr-coach-header-main strong {
          display: block;
          color: #fff;
          font-size: 16px;
          line-height: 1.2;
        }

        .nr-coach-header-main p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-coach-header-main small {
          display: block;
          margin-top: 5px;
          color: rgba(0, 212, 255, 0.7);
          font-size: 11px;
        }

        .nr-coach-header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .nr-coach-header-actions .nr-primary-button,
        .nr-coach-header-actions .nr-secondary-button {
          flex: 1;
          min-width: 140px;
          justify-content: center;
          padding: 9px 10px;
        }

        .nr-coach-details-shell {
          width: min(760px, calc(100vw - 24px));
        }

        .nr-coach-details-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-coach-details-hero {
          border-radius: 18px;
          border: 1px solid rgba(0, 212, 255, 0.18);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.12), transparent 34%),
            rgba(255, 255, 255, 0.035);
          padding: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
        }

        .nr-coach-details-image {
          width: 76px;
          height: 98px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(0, 212, 255, 0.16), rgba(255, 255, 255, 0.05));
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(0, 212, 255, 0.9);
          overflow: hidden;
        }

        .nr-coach-details-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nr-coach-details-hero h3 {
          margin: 4px 0;
          color: #fff;
          font-size: 22px;
        }

        .nr-coach-details-hero p,
        .nr-coach-description,
        .nr-coach-connection p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }

        .nr-coach-info-grid,
        .nr-coach-style-list,
        .nr-coach-connection {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nr-coach-info-row,
        .nr-coach-style-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
        }

        .nr-coach-info-row strong,
        .nr-coach-style-row strong,
        .nr-coach-connection strong {
          color: #fff;
        }

        .nr-coach-connection span {
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
        }

        .nr-modal-backdrop {
          position: fixed;
          inset: 0;
          /* Page-level picker/backdrop layer (global ConfirmModal stays above). */
          z-index: 100200;
          background: rgba(7, 10, 20, 0.8);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: max(18px, env(safe-area-inset-top, 0px)) 14px max(42px, env(safe-area-inset-bottom, 0px));
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .nr-modal-shell {
          width: min(1280px, calc(100vw - 24px));
          max-height: none;
          position: relative;
          overflow: visible;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 18px;
          margin: auto 0;
        }

        .nr-picker-body {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          gap: 18px;
        }

        .nr-picker-shell.reserve-mode .nr-picker-body {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
        }

        .nr-picker-body.single {
          grid-template-columns: minmax(0, 1fr);
        }

        .nr-picker-choice-panel {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
          margin-top: 18px;
        }

        .nr-picker-choice-card {
          min-height: 148px;
          border-radius: 18px;
          border: 1px solid rgba(0, 212, 255, 0.18);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.12), transparent 34%),
            rgba(255, 255, 255, 0.035);
          color: #fff;
          padding: 18px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 14px;
          align-items: center;
          text-align: left;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .nr-picker-choice-card.primary {
          border-color: rgba(52, 211, 153, 0.28);
          background:
            radial-gradient(circle at top left, rgba(52, 211, 153, 0.14), transparent 36%),
            rgba(255, 255, 255, 0.035);
        }

        .nr-picker-choice-card:hover {
          transform: translateY(-2px);
          border-color: rgba(0, 212, 255, 0.42);
          background: rgba(0, 212, 255, 0.08);
        }

        .nr-picker-choice-card:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
        }

        .nr-picker-choice-card:disabled:hover {
          transform: none;
          border-color: rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.025);
        }

        .nr-picker-choice-card strong {
          display: block;
          margin-bottom: 6px;
          font-size: 18px;
        }

        .nr-picker-choice-card p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }

        .nr-choice-icon {
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.18);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(124, 238, 255, 0.95);
        }

        .nr-picker-subnav {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          margin: 16px 0 12px;
        }

        .nr-photo-upload-shell {
          width: min(760px, calc(100vw - 24px));
        }

        .nr-photo-upload-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nr-photo-upload-intro {
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.14);
          background: rgba(0, 212, 255, 0.06);
          padding: 14px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          line-height: 1.45;
        }

        .nr-photo-step-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-photo-step {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.7);
        }

        .nr-photo-step span {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          flex-shrink: 0;
        }

        .nr-photo-step.selected {
          color: #d1fae5;
          border-color: rgba(52, 211, 153, 0.28);
          background: rgba(52, 211, 153, 0.08);
        }

        .nr-photo-step.extracting {
          color: #bae6fd;
          border-color: rgba(56, 189, 248, 0.32);
          background: rgba(56, 189, 248, 0.09);
        }

        .nr-photo-step small {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .nr-photo-step small strong {
          color: inherit;
          font-size: 12px;
          line-height: 1.15;
        }

        .nr-photo-step small em {
          color: rgba(255, 255, 255, 0.56);
          font-size: 10px;
          font-style: normal;
          line-height: 1.2;
        }

        .nr-photo-example-panel {
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.18);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.1), transparent 34%),
            rgba(255, 255, 255, 0.025);
          padding: 14px;
        }

        .nr-photo-example-copy strong {
          display: block;
          color: #fff;
          font-size: 14px;
          margin-bottom: 4px;
        }

        .nr-photo-example-copy p {
          margin: 0 0 12px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          line-height: 1.45;
        }

        .nr-photo-example-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-photo-example-card {
          display: block;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(0, 0, 0, 0.18);
          color: #fff;
          text-decoration: none;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }

        .nr-photo-example-card:hover {
          transform: translateY(-1px);
          border-color: rgba(0, 212, 255, 0.36);
        }

        .nr-photo-example-card img {
          width: 100%;
          height: clamp(76px, 15vw, 108px);
          object-fit: cover;
          display: block;
        }

        .nr-photo-example-card span {
          display: block;
          padding: 7px 6px;
          text-align: center;
          color: rgba(255, 255, 255, 0.88);
          font-size: 11px;
          font-weight: 700;
        }

        .nr-photo-upload-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nr-photo-upload-card {
          border-radius: 16px;
          border: 1px solid var(--photo-border);
          background: var(--photo-bg);
          padding: 14px;
        }

        .nr-photo-card-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .nr-photo-card-head strong {
          display: block;
          color: var(--photo-color);
          font-size: 15px;
          margin-bottom: 4px;
        }

        .nr-photo-card-head p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.4;
        }

        .nr-photo-card-head > span {
          align-self: flex-start;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 10px;
          white-space: nowrap;
        }

        .nr-photo-pick-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-photo-pick-row input,
        .nr-photo-upload-card input[type="file"] {
          display: none;
        }

        .nr-photo-preview {
          display: grid;
          grid-template-columns: 120px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
        }

        .nr-photo-preview img {
          width: 120px;
          height: 82px;
          border-radius: 12px;
          object-fit: cover;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .nr-photo-preview div {
          display: flex;
          gap: 10px;
          justify-content: space-between;
          align-items: center;
          min-width: 0;
        }

        .nr-photo-preview span {
          color: rgba(255, 255, 255, 0.75);
          font-size: 13px;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nr-photo-preview span small {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.52);
          font-size: 11px;
          line-height: 1.25;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nr-photo-review-shell {
          width: min(640px, calc(100vw - 24px));
        }

        .nr-photo-review-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-photo-review-hero {
          border-radius: 18px;
          border: 1px solid rgba(52, 211, 153, 0.24);
          background:
            radial-gradient(circle at top right, rgba(52, 211, 153, 0.14), transparent 34%),
            rgba(52, 211, 153, 0.06);
          padding: 16px;
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: center;
          color: #d1fae5;
        }

        .nr-photo-review-hero h3 {
          margin: 4px 0;
          color: #fff;
          font-size: 22px;
        }

        .nr-photo-review-hero p {
          margin: 0;
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
        }

        .nr-photo-review-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-photo-review-row {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          padding: 12px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
        }

        .nr-photo-review-row.ready {
          border-color: rgba(52, 211, 153, 0.22);
          background: rgba(52, 211, 153, 0.06);
        }

        .nr-photo-review-row.missing {
          border-color: rgba(245, 158, 11, 0.24);
          background: rgba(245, 158, 11, 0.06);
        }

        .nr-photo-review-row > span {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.08);
          color: currentColor;
        }

        .nr-photo-review-row.ready > span {
          color: #34d399;
        }

        .nr-photo-review-row.missing > span {
          color: #fbbf24;
        }

        .nr-photo-review-row strong {
          display: block;
          color: #fff;
          font-size: 13px;
          margin-bottom: 2px;
        }

        .nr-photo-review-row p {
          margin: 0;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-photo-review-row em {
          color: rgba(255, 255, 255, 0.58);
          font-size: 11px;
          font-style: normal;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .nr-spin {
          animation: nr-spin 1s linear infinite;
        }

        @keyframes nr-spin {
          to { transform: rotate(360deg); }
        }

        .nr-picker-shell.reserve-mode .nr-picker-results {
          gap: 14px;
        }


        .nr-picker-shell.reserve-mode .nr-modal-header {
          border-bottom: 1px solid rgba(0, 212, 255, 0.1);
          padding-bottom: 14px;
        }

        .nr-picker-results {
          min-height: 0;
          max-height: calc(92vh - 180px);
          overflow: auto;
          padding-right: 6px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .nr-picker-detail,
        .nr-quick-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-picker-detail-hero {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }

        .nr-picker-toolbar {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 14px;
        }

        .nr-picker-search-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: stretch;
          gap: 10px;
        }

        .nr-search-input {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid rgba(0, 212, 255, 0.22);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
        }

        .nr-search-input input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 14px;
          -webkit-appearance: none;
          appearance: none;
          touch-action: manipulation;
        }

        .nr-upload-inline-button {
          min-height: 46px;
          white-space: nowrap;
        }

        .nr-catalog-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          font-weight: 700;
        }

        .nr-catalog-meta label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nr-catalog-meta select {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          color: #fff;
          padding: 8px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .nr-catalog-meta option {
          color: #111827;
        }

        .nr-load-more-button {
          width: 100%;
          border: 1px solid rgba(0, 212, 255, 0.28);
          border-radius: 14px;
          background: rgba(0, 212, 255, 0.08);
          color: #eafcff;
          padding: 12px 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .nr-load-more-button:disabled {
          opacity: 0.62;
          cursor: wait;
        }

        .nr-section-head h3 {
          margin: 0 0 8px;
          color: #fff;
          font-size: 15px;
        }

        .nr-warning-box,
        .nr-empty-state {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          padding: 14px;
          display: flex;
          gap: 10px;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .nr-warning-box {
          justify-content: flex-start;
          border-color: rgba(255, 149, 0, 0.28);
          background: rgba(255, 149, 0, 0.08);
        }

        .nr-toast {
          position: fixed;
          right: 18px;
          bottom: 18px;
          z-index: 100300;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(6, 10, 22, 0.96);
          color: #fff;
          max-width: min(420px, calc(100vw - 32px));
        }

        .nr-toast.error {
          border-color: rgba(255, 59, 48, 0.3);
        }

        .nr-toast.success {
          border-color: rgba(52, 211, 153, 0.35);
        }

        .nr-toast.upgrade {
          border-color: rgba(251, 191, 36, 0.42);
          background:
            radial-gradient(circle at 0% 50%, rgba(251, 191, 36, 0.16), transparent 38%),
            rgba(6, 10, 22, 0.96);
          box-shadow: 0 12px 34px rgba(251, 146, 60, 0.2), 0 0 0 1px rgba(251, 191, 36, 0.08) inset;
        }

        .nr-section-card {
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.03);
          padding: 16px;
        }

        .nr-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .nr-build-coach-inline {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(0, 212, 255, 0.2);
          background: linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(168, 85, 247, 0.08));
        }

        .nr-build-coach-inline strong {
          display: block;
          color: #fff;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .nr-build-coach-inline p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-build-copy-card {
          margin-top: 12px;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(251, 191, 36, 0.24);
          background:
            radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.12), transparent 36%),
            rgba(255, 255, 255, 0.035);
        }

        .nr-build-copy-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .nr-build-copy-head strong {
          display: block;
          color: #fff;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .nr-build-copy-head p {
          margin: 0;
          color: rgba(255, 255, 255, 0.66);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-build-copy-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        .nr-build-copy-meta span {
          border: 1px solid rgba(251, 191, 36, 0.24);
          background: rgba(251, 191, 36, 0.08);
          color: #fde68a;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .nr-build-slider-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
        }

        .nr-build-slider-grid--interactive {
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .nr-build-slider-hint {
          margin: 0 0 8px;
          font-size: 11px;
          line-height: 1.35;
          color: rgba(255, 255, 255, 0.55);
        }

        .nr-build-slider-row {
          display: grid;
          grid-template-columns: minmax(80px, 1fr) minmax(0, 2.2fr) 102px;
          align-items: center;
          gap: 8px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 18, 0.44);
          padding: 7px 9px;
        }

        .nr-build-slider-row.is-active {
          border-color: rgba(0, 212, 255, 0.22);
          background:
            linear-gradient(135deg, rgba(0, 212, 255, 0.08), rgba(124, 58, 237, 0.06)),
            rgba(2, 6, 18, 0.52);
        }

        .nr-build-slider-row.is-blocked {
          opacity: 0.42;
        }

        .nr-build-slider-row-label {
          color: rgba(255, 255, 255, 0.78);
          font-size: 11px;
          font-weight: 800;
          line-height: 1.2;
        }

        .nr-build-slider-row-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: flex-end;
        }

        .nr-build-macro-nudge {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.35);
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
        }

        .nr-build-macro-nudge:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .nr-build-slider-row input[type='range'] {
          width: 100%;
          min-width: 0;
        }

        .nr-build-slider-row-val {
          font-size: 13px;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
          color: #d9f99d;
          min-width: 1.75ch;
          text-align: center;
        }

        .nr-build-slider-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(2, 6, 18, 0.44);
          padding: 7px 9px;
          min-height: 36px;
        }

        .nr-build-slider-chip.is-active {
          border-color: rgba(0, 212, 255, 0.25);
          background:
            linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(124, 58, 237, 0.08)),
            rgba(2, 6, 18, 0.52);
        }

        .nr-build-slider-chip span {
          color: rgba(255, 255, 255, 0.76);
          font-size: 11px;
          font-weight: 800;
          min-width: 0;
          white-space: normal;
          overflow-wrap: break-word;
          line-height: 1.2;
        }

        .nr-build-coach-notes {
          margin-top: 10px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.22);
        }

        .nr-build-coach-notes-warn {
          margin-bottom: 10px;
          font-size: 12px;
          color: rgba(255, 196, 120, 0.95);
        }

        .nr-build-coach-notes-warn p {
          margin: 0 0 4px;
        }

        .nr-build-coach-notes-warn p:last-child {
          margin-bottom: 0;
        }

        .nr-build-coach-notes-reasons strong {
          display: block;
          font-size: 12px;
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.9);
        }

        .nr-build-coach-notes-reasons ul {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          line-height: 1.4;
          color: rgba(255, 255, 255, 0.78);
        }

        .nr-build-coach-notes-reasons li {
          margin-bottom: 4px;
        }

        .nr-build-slider-chip strong {
          color: #d9f99d;
          font-size: 14px;
          font-weight: 950;
          font-variant-numeric: tabular-nums;
        }

        .nr-build-coach-overlay {
          position: fixed;
          inset: 0;
          z-index: 100600;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgba(3, 7, 18, 0.62);
          backdrop-filter: blur(8px);
        }

        .nr-build-coach-progress-card {
          width: min(430px, calc(100vw - 28px));
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(0, 212, 255, 0.32);
          background:
            linear-gradient(135deg, rgba(0, 212, 255, 0.12), rgba(168, 85, 247, 0.12)),
            rgba(8, 13, 29, 0.96);
          box-shadow: 0 18px 60px rgba(0, 0, 0, 0.48);
          overflow: hidden;
        }

        .nr-build-coach-progress-icon {
          position: relative;
          width: 54px;
          height: 54px;
          flex: 0 0 54px;
          display: grid;
          place-items: center;
          border-radius: 16px;
          color: var(--primary-cyan, #00d4ff);
          background:
            radial-gradient(circle, rgba(0, 212, 255, 0.12), rgba(168, 85, 247, 0.08) 62%, transparent 76%);
          border: 1px solid rgba(0, 212, 255, 0.22);
          overflow: hidden;
          isolation: isolate;
        }

        .nr-build-coach-progress-icon img {
          position: relative;
          z-index: 2;
          width: 42px;
          max-height: 42px;
          object-fit: contain;
          filter: drop-shadow(0 0 9px rgba(0, 212, 255, 0.48));
          animation: nrBrandInterference 1.18s steps(2, end) infinite;
        }

        .nr-build-coach-logo-orbit {
          position: absolute;
          inset: 5px;
          border-radius: 14px;
          border: 1px dashed rgba(255, 255, 255, 0.18);
          animation: nrBrandOrbit 3.8s linear infinite;
        }

        .nr-build-coach-logo-scan {
          position: absolute;
          z-index: 3;
          left: 6px;
          right: 6px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.95), transparent);
          box-shadow: 0 0 12px rgba(0, 212, 255, 0.72);
          animation: nrBrandLogoScan 1.35s ease-in-out infinite;
        }

        .nr-build-coach-progress-kicker {
          display: inline-flex;
          margin-bottom: 4px;
          color: #67e8f9;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .nr-build-coach-progress-card strong {
          display: block;
          color: #fff;
          font-size: 16px;
          margin-bottom: 6px;
        }

        .nr-build-coach-progress-card p {
          margin: 0;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.45;
          font-size: 13px;
        }

        @keyframes nrBrandInterference {
          0%, 100% { transform: translate(0, 0) skewX(0deg); opacity: 1; }
          12% { transform: translate(-1px, 1px) skewX(-1deg); }
          20% { transform: translate(1px, -1px) skewX(1deg); filter: drop-shadow(2px 0 rgba(255, 0, 102, 0.30)) drop-shadow(-2px 0 rgba(0, 212, 255, 0.44)); }
          44% { transform: translate(0, 0); }
          62% { transform: translate(-1px, 0) skewX(0.6deg); }
        }

        @keyframes nrBrandLogoScan {
          0% { top: 7px; opacity: 0; }
          20%, 78% { opacity: 1; }
          100% { top: calc(100% - 9px); opacity: 0; }
        }

        @keyframes nrBrandOrbit {
          to { transform: rotate(360deg); }
        }

        .nr-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nr-form-field span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.65);
        }

        .nr-form-field input,
        .nr-form-field select {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 14, 31, 0.92);
          color: #fff;
          padding: 12px;
          outline: none;
        }

        .nr-modal-footer {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .nr-reserve-inline-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-fit-pill {
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 4px 8px;
          font-size: 10px;
          line-height: 1;
          white-space: nowrap;
          opacity: 0.9;
        }

        .nr-booster-row-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .nr-booster-row-head span {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.86);
        }

        .nr-booster-control-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
        }

        .nr-booster-level-panel {
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 14, 31, 0.92);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nr-booster-level-panel span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.66);
        }

        .nr-booster-level-buttons {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .nr-booster-level-buttons--single {
          grid-template-columns: 1fr;
          max-width: 100px;
        }

        .nr-booster-level-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .nr-booster-level-label {
          font-size: 11px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.55);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .nr-booster-hex-badge {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }

        .nr-booster-hex-badge--interactive {
          cursor: pointer;
          border: none;
          padding: 0;
          margin: 0;
          background: transparent;
          font: inherit;
          border-radius: 14px;
        }

        .nr-booster-hex-badge--interactive:focus-visible {
          outline: 2px solid rgba(0, 212, 255, 0.55);
          outline-offset: 3px;
        }

        .nr-booster-hex-level {
          font-size: 13px;
          font-weight: 900;
          color: #8aebff;
          line-height: 1;
          margin-top: -4px;
          text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);
        }

        .nr-booster-hex-badge--idle .nr-booster-hex-level {
          display: none;
        }

        .nr-booster-hex-badge--active .nr-booster-hex-svg {
          filter: drop-shadow(0 0 12px rgba(0, 212, 255, 0.5));
        }

        .nr-booster-slot-top {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 2px;
        }

        .nr-booster-slot-top-copy {
          flex: 1;
          min-width: 0;
        }

        .nr-booster-slot-only {
          font-size: 16px;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.88);
          letter-spacing: 0.04em;
        }

        .nr-form-field--tight {
          margin-top: 4px;
        }

        .nr-booster-cat-lbl {
          font-size: 11px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 4px;
        }

        .nr-booster-level-compact {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 4px;
        }

        .nr-booster-level-compact-lbl {
          font-size: 11px;
          font-weight: 650;
          color: rgba(255, 255, 255, 0.55);
        }

        .nr-booster-level-buttons--inline {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 6px;
        }

        .nr-booster-level-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 44px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid rgba(0, 212, 255, 0.35);
          background: rgba(0, 212, 255, 0.12);
          color: #7ceeff;
          font-size: 13px;
          font-weight: 800;
          align-self: flex-start;
        }

        .nr-booster-slot-card--ef {
          border-color: rgba(0, 212, 255, 0.26);
          background:
            radial-gradient(circle at 0% 0%, rgba(0, 212, 255, 0.12), transparent 42%),
            linear-gradient(180deg, rgba(8, 18, 28, 0.55), rgba(10, 12, 22, 0.96));
        }

        .nr-booster-level-btn {
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 6px;
          cursor: pointer;
        }

        .nr-booster-level-btn.is-active {
          border-color: rgba(0, 212, 255, 0.45);
          background: rgba(0, 212, 255, 0.16);
          color: #7ceeff;
        }

        .nr-booster-slot-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .nr-booster-slot-card {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-inline-builder {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: end;
          margin-top: 12px;
        }

        .nr-skill-command-panel {
          border-radius: 16px;
          border: 1px solid rgba(0, 212, 255, 0.14);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.12), transparent 36%),
            rgba(255, 255, 255, 0.025);
          padding: 12px;
        }

        .nr-skill-command-panel .nr-form-field select {
          border-color: rgba(0, 212, 255, 0.26);
          background: rgba(5, 16, 34, 0.96);
          box-shadow: inset 0 0 0 1px rgba(0, 212, 255, 0.06);
        }

        .nr-editor-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-premium-player-shell {
          width: min(1320px, calc(100vw - 24px));
          max-height: min(94vh, 980px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .nr-premium-player-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .nr-modal-footer--sticky {
          flex-shrink: 0;
          margin-top: 0;
          padding: 12px 0 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(180deg, rgba(8, 12, 28, 0.72), rgba(8, 12, 28, 0.98));
          position: sticky;
          bottom: 0;
          z-index: 6;
        }

        .nr-modal-footer-hint {
          margin: 0 0 10px;
          font-size: 12px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.62);
          flex: 1 1 100%;
        }

        .nr-modal-footer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          width: 100%;
        }

        .nr-modal-footer.nr-modal-footer--sticky {
          flex-direction: column;
          align-items: stretch;
        }

        .nr-premium-player-layout {
          display: grid;
          grid-template-columns: minmax(280px, 0.62fr) minmax(0, 1.38fr);
          gap: 14px;
          align-items: start;
        }

        .nr-premium-hero {
          border-radius: 18px;
          padding: 14px;
          background:
            radial-gradient(circle at top, rgba(255, 145, 0, 0.18), transparent 38%),
            linear-gradient(180deg, rgba(24, 16, 10, 0.98), rgba(10, 12, 20, 0.98));
          border: 1px solid rgba(255, 166, 0, 0.18);
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-self: start;
        }

        .nr-premium-hero-top,
        .nr-premium-hero-main {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-direction: column;
          align-items: center;
        }

        .nr-premium-hero-copy h3 {
          margin: 4px 0 0;
          font-size: 24px;
          color: #fff;
        }

        .nr-premium-hero-copy p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.8);
        }

        .nr-premium-overall {
          min-width: 88px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }

        .nr-premium-overall span {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
        }

        .nr-premium-overall strong {
          font-size: 34px;
          color: #fff;
          line-height: 1;
        }

        .nr-premium-card-frame {
          width: min(160px, 62%);
          aspect-ratio: 0.72;
          min-height: 0;
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid rgba(255, 177, 66, 0.25);
          background: rgba(255, 255, 255, 0.04);
          align-self: center;
        }

        .nr-premium-card-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .nr-premium-side-stats {
          flex: 1;
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          align-self: stretch;
        }

        .nr-premium-side-stats div,
        .nr-premium-summary-row div {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.04);
          padding: 9px;
        }

        .nr-premium-side-stats span,
        .nr-premium-summary-row span {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          margin-bottom: 4px;
        }

        .nr-premium-side-stats strong,
        .nr-premium-summary-row strong {
          color: #fff;
          font-size: 16px;
        }

        .nr-premium-summary-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .nr-premium-sections {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          overflow: auto;
          padding-right: 4px;
        }

        .nr-premium-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .nr-reference-main-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        @media (max-width: 1500px) and (min-width: 1101px) {
          .nr-reference-main-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .nr-reference-support-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(260px, 0.9fr);
          gap: 10px;
          align-items: start;
          margin-top: 10px;
        }

        .nr-reference-left,
        .nr-reference-center,
        .nr-reference-right {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .nr-stat-pairs {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }

        .nr-stat-compact-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 8px 10px;
        }

        .nr-stat-compact-label {
          margin: 0;
          min-width: 0;
          white-space: normal;
          overflow-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
          line-height: 1.25;
          font-size: 11.5px;
          color: rgba(255, 255, 255, 0.82);
        }

        .nr-stat-stepper {
          display: grid;
          grid-template-columns: 28px 46px 28px;
          align-items: center;
          gap: 4px;
          padding: 3px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(9, 14, 30, 0.95);
        }

        .nr-stat-stepper button {
          width: 28px;
          height: 28px;
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.84);
          font-size: 15px;
          font-weight: 900;
          line-height: 1;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .nr-stat-stepper button:hover {
          background: rgba(0, 212, 255, 0.13);
          color: #fff;
        }

        .nr-stat-compact-input {
          width: 46px;
          height: 28px;
          padding: 0 2px;
          text-align: center;
          border: 0;
          outline: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.045);
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          appearance: textfield;
          -moz-appearance: textfield;
        }

        .nr-stat-compact-input::-webkit-outer-spin-button,
        .nr-stat-compact-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .nr-stat-stepper.tone-elite {
          border-color: rgba(64, 222, 122, 0.55);
          box-shadow: inset 0 0 0 1px rgba(64, 222, 122, 0.22);
        }

        .nr-stat-stepper.tone-elite .nr-stat-compact-input {
          color: #8affb3;
        }

        .nr-stat-stepper.tone-good {
          border-color: rgba(172, 222, 64, 0.5);
          box-shadow: inset 0 0 0 1px rgba(172, 222, 64, 0.2);
        }

        .nr-stat-stepper.tone-good .nr-stat-compact-input {
          color: #d9ff7e;
        }

        .nr-stat-stepper.tone-ok {
          border-color: rgba(251, 191, 36, 0.52);
          box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.2);
        }

        .nr-stat-stepper.tone-ok .nr-stat-compact-input {
          color: #ffd878;
        }

        .nr-stat-stepper.tone-low {
          border-color: rgba(255, 83, 83, 0.52);
          box-shadow: inset 0 0 0 1px rgba(255, 83, 83, 0.22);
        }

        .nr-stat-stepper.tone-low .nr-stat-compact-input {
          color: #ff9a9a;
        }

        .nr-stat-stepper.tone-neutral {
          border-color: rgba(255, 255, 255, 0.14);
        }

        .nr-stat-stepper.tone-neutral .nr-stat-compact-input {
          color: #fff;
        }

        .nr-mini-profile-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .nr-mini-profile-grid div {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.04);
          padding: 10px;
        }

        .nr-mini-profile-grid span {
          display: block;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.62);
          margin-bottom: 4px;
        }

        .nr-mini-profile-grid strong {
          color: #fff;
          font-size: 16px;
        }

        .nr-premium-toolbar-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 2px;
        }

        .nr-setup-readonly-note {
          margin: 10px 0 0;
          font-size: 12px;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.68);
        }

        .nr-role-editor-card {
          margin-top: 12px;
          border-radius: 14px;
          border: 1px solid rgba(0, 212, 255, 0.16);
          background:
            radial-gradient(circle at top left, rgba(0, 212, 255, 0.1), transparent 38%),
            rgba(255, 255, 255, 0.035);
          padding: 12px;
        }

        .nr-role-editor-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }

        .nr-role-editor-head strong {
          display: block;
          color: #fff;
          font-size: 13px;
        }

        .nr-role-editor-head p {
          margin: 4px 0 0;
          color: rgba(255, 255, 255, 0.64);
          font-size: 12px;
          line-height: 1.35;
        }

        .nr-role-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .nr-role-chip {
          border-radius: 999px;
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: rgba(0, 212, 255, 0.08);
          color: #eafcff;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
        }

        .nr-skill-chip-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
          max-height: 170px;
          overflow: auto;
          padding-right: 4px;
        }

        .nr-skills-toggle {
          margin-top: 10px;
        }

        .nr-skill-hidden-counter {
          display: inline-block;
          margin-top: 8px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.66);
        }

        .nr-skill-chip,
        .nr-skill-empty {
          border-radius: 999px;
          padding: 8px 10px;
          background: rgba(0, 212, 255, 0.09);
          border: 1px solid rgba(0, 212, 255, 0.14);
          color: #fff;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .nr-skill-empty {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.7);
        }

        .nr-slot-avatar-fallback {
          width: 100%;
          height: 100%;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.72);
        }

        @media (max-width: 1100px) {
          .nr-main-stack,
          .nr-hero-card,
          .nr-picker-body,
          .nr-premium-player-layout,
          .nr-premium-stats-grid,
          .nr-reference-main-grid,
          .nr-reference-support-grid {
            grid-template-columns: 1fr;
          }

          .nr-picker-results {
            max-height: none;
          }
        }

        @media (max-width: 768px) {
          .nr-modal-backdrop {
            align-items: flex-start;
            justify-content: stretch;
            padding: max(10px, env(safe-area-inset-top, 0px)) 0 max(72px, env(safe-area-inset-bottom, 0px));
            background: rgba(3, 7, 18, 0.98);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
          }

          .nr-page {
            padding: 10px;
          }

          .nr-card {
            padding: 12px;
          }

          .nr-workspace-head {
            margin-bottom: 4px;
          }

          .nr-field {
            min-height: 520px;
          }

          .nr-field-shell {
            width: 100%;
            max-width: none;
            min-height: clamp(460px, 68vh, 820px);
            margin-bottom: 8px;
            border-radius: 12px;
          }

          .nr-form-grid,
          .nr-picker-choice-panel,
          .nr-premium-summary-row,
          .nr-stat-pairs,
          .nr-mini-profile-grid {
            grid-template-columns: 1fr;
          }

          .nr-booster-slot-grid {
            grid-template-columns: 1fr;
          }

          .nr-premium-hero-main,
          .nr-premium-hero-top {
            flex-direction: column;
          }

          .nr-premium-side-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nr-premium-summary-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .nr-role-editor-head {
            flex-direction: column;
            align-items: stretch;
          }

          .nr-slot-card {
            width: min(104px, 27vw);
          }

          .nr-slot-filled {
            min-height: 72px;
            border-radius: 12px;
            padding: 4px;
          }

          .nr-slot-filled.has-photo-card {
            width: min(82px, 82%);
            min-height: 88px;
            padding: 4px;
          }

          .nr-slot-avatar-mini {
            height: 50px;
            border-radius: 10px;
          }

          .nr-slot-filled-main.has-photo .nr-slot-avatar-mini {
            width: 66px;
            height: 74px;
          }

          .nr-slot-role-chip {
            left: 5px;
            bottom: 5px;
            font-size: 8px;
            padding: 1px 6px;
          }

          .nr-slot-remove {
            top: -7px;
            right: -7px;
            width: 20px;
            height: 20px;
          }

          .nr-slot-remove svg {
            width: 12px;
            height: 12px;
          }

          .nr-stats-grid,
          .nr-picker-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nr-modal-shell {
            width: 100%;
            max-height: none;
            border-radius: 18px 18px 0 0;
            align-self: flex-start;
            overflow: visible;
            padding: 12px;
            padding-bottom: max(180px, calc(env(safe-area-inset-bottom, 0px) + 156px));
            margin: 0;
            box-shadow: none;
          }

          .nr-modal-header {
            padding-right: 58px;
          }

          .nr-modal-header .nr-icon-button {
            top: max(10px, env(safe-area-inset-top, 0px));
            right: 10px;
            width: 44px;
            height: 44px;
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.38);
          }

          .nr-quick-shell,
          .nr-picker-shell {
            padding-bottom: max(180px, calc(env(safe-area-inset-bottom, 0px) + 156px));
          }

          .nr-quick-body,
          .nr-picker-results,
          .nr-premium-sections {
            max-height: none;
            overflow: visible;
            padding-bottom: 28px;
          }

          .nr-picker-search-actions {
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
          }

          .nr-search-input {
            padding: 11px 10px;
          }

          .nr-search-input input {
            font-size: 16px;
          }

          .nr-upload-inline-button {
            min-width: 96px;
            padding: 0 10px;
          }

          .nr-catalog-card,
          .nr-secondary-button,
          .nr-primary-button,
          .nr-icon-button {
            transition: none !important;
          }

          .nr-picker-shell.reserve-mode .nr-picker-body {
            grid-template-columns: 1fr;
          }

          .nr-premium-player-shell {
            max-height: calc(100dvh - max(20px, env(safe-area-inset-top, 0px)) - max(20px, env(safe-area-inset-bottom, 0px)));
            overflow: hidden;
            padding-bottom: 0;
          }

          .nr-premium-player-scroll {
            padding-bottom: 12px;
          }

          .nr-modal-footer.nr-modal-footer--sticky {
            padding: 10px 0 max(12px, env(safe-area-inset-bottom, 0px));
          }

          .nr-premium-hero {
            padding: 10px;
            border-radius: 14px;
            gap: 8px;
          }

          .nr-premium-hero-top {
            flex-direction: row;
            align-items: center;
            width: 100%;
            text-align: left;
          }

          .nr-premium-hero-main {
            gap: 8px;
          }

          .nr-premium-hero-copy h3 {
            font-size: 20px;
            line-height: 1.05;
            margin-top: 2px;
          }

          .nr-premium-hero-copy p {
            font-size: 13px;
            margin-top: 2px;
          }

          .nr-premium-overall {
            min-width: 58px;
            border-radius: 14px;
            padding: 8px;
          }

          .nr-premium-overall span {
            font-size: 10px;
          }

          .nr-premium-overall strong {
            font-size: 24px;
          }

          .nr-premium-card-frame {
            width: min(104px, 34vw);
            min-height: 0;
          }

          .nr-modal-footer:not(.nr-modal-footer--sticky) {
            position: static;
            margin: 12px 0 0;
            padding: 10px 0 max(96px, calc(env(safe-area-inset-bottom, 0px) + 84px));
            background: transparent;
          }

          .nr-complete-photo-callout {
            grid-template-columns: auto minmax(0, 1fr);
          }

          .nr-complete-photo-callout .nr-primary-button {
            grid-column: 1 / -1;
            width: 100%;
            justify-content: center;
          }

          .nr-inline-builder {
            grid-template-columns: 1fr;
          }

          .nr-booster-level-buttons {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .nr-booster-level-buttons--single {
            grid-template-columns: 1fr;
            max-width: 100px;
          }

          .nr-booster-level-buttons--inline {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .nr-reserve-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .nr-reserve-card {
            grid-template-columns: 34px minmax(0, 1fr) auto;
            gap: 6px;
            padding: 6px;
            min-height: 58px;
            border-radius: 10px;
          }

          .nr-reserve-card-media {
            width: 34px;
            height: 44px;
          }

          .nr-reserve-card-copy strong {
            font-size: 10px;
          }

          .nr-reserve-card-copy span {
            font-size: 9px;
          }

          .nr-reserve-position-pill {
            display: none;
          }

          .nr-toast {
            right: 12px;
            left: 12px;
            bottom: 12px;
            max-width: none;
          }
        }
      `}</style>
    </main>
  )
})
