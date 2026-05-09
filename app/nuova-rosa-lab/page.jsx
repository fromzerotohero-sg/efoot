'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import ConfirmModal from '@/components/ConfirmModal'
import TacticalSettingsPanel from '@/components/TacticalSettingsPanel'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Gift,
  Pencil,
  Plus,
  Search,
  Save,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  X,
  Zap
} from 'lucide-react'

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

function buildCatalogMetadata(card) {
  return {
    catalog_source: card?.source || null,
    catalog_source_player_id: card?.source_player_id || null,
    catalog_card_instance_key: card?.card_instance_key || null,
    catalog_player_identity_key: card?.player_identity_key || null,
    catalog_card_type: card?.card_type || null,
    catalog_pack_name: card?.pack_name || null,
    catalog_card_front_url: card?.source_card_front_url || null,
    catalog_card_back_url: card?.source_card_back_url || null,
    catalog_link_method: 'catalog_picker',
    catalog_link_confidence: 'high',
    catalog_linked_at: new Date().toISOString()
  }
}

function buildPlayerPayloadFromCatalog(card, slotIndex = null) {
  const payload = card?.players_payload && typeof card.players_payload === 'object'
    ? card.players_payload
    : {}

  const metadata = {
    ...(payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}),
    ...buildCatalogMetadata(card)
  }

  return {
    ...payload,
    player_name: payload.player_name || card.player_name,
    position: payload.position || card.position,
    card_type: payload.card_type || card.card_type,
    role: payload.role || card.playing_style || null,
    overall_rating:
      payload.overall_rating ??
      card.overall_level_1 ??
      card.overall_max_level ??
      null,
    slot_index: slotIndex,
    metadata
  }
}

function getPlayerCardImage(player) {
  return (
    player?.metadata?.catalog_card_front_url ||
    player?.metadata?.source_card_front_url ||
    player?.extracted_data?.metadata?.catalog_card_front_url ||
    player?.extracted_data?.metadata?.source_card_front_url ||
    player?.extracted_data?.source_card_front_url ||
    null
  )
}

function buildSetupStage({ totalPlayers, starters, hasFormation, hasCoach, hasTactics }) {
  if (totalPlayers === 0) return 'empty'
  if (totalPlayers <= 5) return 'starter_seeded'
  if (!hasFormation || starters < 11) return 'partial'
  if (hasFormation && starters >= 11 && (!hasCoach || !hasTactics)) return 'formation_ready'
  return 'system_ready'
}

function getTokenFallback() {
  return localStorage.getItem('auth_token')
}

function showConfirmConfig({ title, message, details, confirmLabel, cancelLabel, confirmVariant = 'primary' }) {
  return {
    show: true,
    title,
    message,
    details,
    variant: 'warning',
    confirmLabel,
    cancelLabel,
    confirmVariant,
    presentation: 'sheet'
  }
}

function EnterpriseModalFrame({ show, onClose, title, subtitle, children, className = '' }) {
  if (!show) return null

  return (
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

function EnterpriseSelect({ label, value, onChange, options }) {
  return (
    <label className="nr-form-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{label}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
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
  return (
    <label className="nr-stat-compact-row">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`nr-stat-compact-input tone-${toneClass}`}
      />
    </label>
  )
}

const FIELD_SLOT_DRAG_THRESHOLD_PX = 10

function SlotPlayerCard({ player, slot, onClick, onRemove, lang, isEditMode = false, onPositionChange }) {
  const [dragging, setDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 })
  const suppressClickForFieldDragRef = React.useRef(false)
  /** After opening from pointer release (edit mode), skip one synthetic click to avoid double-open on desktop */
  const skipNextSyntheticCardClickRef = React.useRef(false)
  const slotThumb = React.useMemo(() => player?.photo_url || getPlayerCardImage(player), [player])

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
      className={`nr-slot-filled ${isEditMode ? 'is-draggable' : ''} ${dragging ? 'is-dragging' : ''}`}
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
      <div className="nr-slot-filled-main">
        <div className="nr-slot-avatar-mini">
          {slotThumb ? (
            <img
              src={slotThumb}
              alt={player.player_name || 'player'}
              loading="lazy"
              draggable={false}
            />
          ) : (
            <User size={20} />
          )}
        </div>
        <span className="nr-slot-role-chip">{isEditMode ? (slot.position || player.position || '-') : (player.position || slot.position || '-')}</span>
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
            onRemove(player.id)
          }}
        >
          <X size={14} />
        </span>
      )}
    </div>
  )
}

function SlotCard({ slot, player, onEmptyClick, onPlayerClick, onRemove, lang, isEditMode = false, onPositionChange }) {
  return (
    <div className="nr-slot-card" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
      {player ? (
        <SlotPlayerCard player={player} slot={slot} onClick={onPlayerClick} onRemove={onRemove} lang={lang} isEditMode={isEditMode} onPositionChange={onPositionChange} />
      ) : (
        <button type="button" className="nr-slot-empty" onClick={() => onEmptyClick(slot)}>
          <Plus size={18} />
          <span>{slot.position || '?'}</span>
        </button>
      )}
    </div>
  )
}

function CatalogCard({ card, slotPosition, lang, onSelect, selected }) {
  const compatibility = getSlotCompatibility(slotPosition, card.position)
  return (
    <button
      type="button"
      className={`nr-catalog-card ${selected ? 'selected' : ''}`}
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
          <span>{card.overall_level_1 ?? card.overall_max_level ?? '-'}</span>
          <em className={`compat-${compatibility}`}>{compatibilityLabel(compatibility, lang)}</em>
        </div>
      </div>
      <ChevronRight size={16} />
    </button>
  )
}

function EnterpriseReservePicker({ reserves, lang, onPick }) {
  return (
    <EnterpriseSection title={lang === 'en' ? 'Choose from reserves' : 'Scegli dalle riserve'}>
      <div className="nr-reserve-inline-list">
        {reserves.length > 0 ? reserves.map((player) => (
          <button key={player.id} type="button" className="nr-bench-item" onClick={() => onPick(player)}>
            <div className="nr-bench-item-copy">
              <strong>{player.player_name}</strong>
              <span>{player.position || '-'} · OVR {player.overall_rating ?? '-'}</span>
            </div>
            <ChevronRight size={16} />
          </button>
        )) : (
          <div className="nr-empty-state">
            <span>{lang === 'en' ? 'No reserves available yet.' : 'Nessuna riserva disponibile.'}</span>
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
  loading,
  suggested,
  results,
  reserves,
  selectedCard,
  onSelectCard,
  onClose,
  onConfirm,
  onSelectReserve,
  onManualFallback,
  onUploadFallback,
  lang
}) {
  if (!show) return null

  const isReserveMode = mode === 'reserve'
  const slotPosition = isReserveMode ? '' : slot?.position
  const compatibility = selectedCard && !isReserveMode ? getSlotCompatibility(slotPosition, selectedCard.position) : 'unknown'

  return (
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className={`nr-modal-shell nr-picker-shell ${isReserveMode ? 'reserve-mode' : 'slot-mode'}`} onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            <span className="nr-mini-kicker">
              {isReserveMode ? (lang === 'en' ? 'Reserve target' : 'Target riserva') : (lang === 'en' ? 'Slot target' : 'Slot target')}
            </span>
            <h2>
              {isReserveMode
                ? (lang === 'en' ? 'Add reserve from catalog' : 'Aggiungi riserva da catalogo')
                : `${lang === 'en' ? 'Choose a player' : 'Scegli un giocatore'} · ${slotPosition}`}
            </h2>
            <p>
              {isReserveMode
                ? (lang === 'en'
                    ? 'Search the official card catalog and save the selected player directly as a reserve.'
                    : 'Cerca nel catalogo ufficiale e salva il giocatore selezionato direttamente tra le riserve.')
                : (lang === 'en'
                    ? 'We suggest cards that fit this slot, but you can choose any player.'
                    : 'Ti suggeriamo carte adatte a questo slot, ma puoi scegliere qualsiasi giocatore.')}
            </p>
          </div>
          <button type="button" className="nr-icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="nr-picker-toolbar">
          <label className="nr-search-input">
            <Search size={16} />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={lang === 'en' ? 'Search player, role, or card type' : 'Cerca giocatore, ruolo o tipo carta'}
            />
          </label>
        </div>

        <div className="nr-picker-body">
          <div className="nr-picker-results">
            {!isReserveMode && <EnterpriseReservePicker reserves={reserves} lang={lang} onPick={onSelectReserve} />}

            {!isReserveMode && <section>
              <div className="nr-section-head">
                <h3>{lang === 'en' ? 'Suggested for this slot' : 'Suggeriti per questo slot'}</h3>
              </div>
              <div className="nr-catalog-list">
                {loading ? (
                  <div className="nr-empty-state">{lang === 'en' ? 'Loading...' : 'Caricamento...'}</div>
                ) : suggested.length > 0 ? (
                  suggested.map((card) => (
                    <CatalogCard
                      key={card.id}
                      card={card}
                      slotPosition={slotPosition}
                      lang={lang}
                      onSelect={onSelectCard}
                      selected={selectedCard?.id === card.id}
                    />
                  ))
                ) : (
                  <div className="nr-empty-state">
                    {lang === 'en' ? 'No suggested cards found for this slot.' : 'Nessuna carta suggerita trovata per questo slot.'}
                  </div>
                )}
              </div>
            </section>}

            <section>
              <div className="nr-section-head">
                <h3>{isReserveMode ? (lang === 'en' ? 'Catalog cards' : 'Carte catalogo') : (lang === 'en' ? 'All results' : 'Tutti i risultati')}</h3>
              </div>
              <div className="nr-catalog-list">
                {loading ? (
                  <div className="nr-empty-state">{lang === 'en' ? 'Loading...' : 'Caricamento...'}</div>
                ) : results.length > 0 ? (
                  results.map((card) => (
                    <CatalogCard
                      key={card.id}
                      card={card}
                      slotPosition={slotPosition}
                      lang={lang}
                      onSelect={onSelectCard}
                      selected={selectedCard?.id === card.id}
                    />
                  ))
                ) : (
                  <div className="nr-empty-state">
                    {lang === 'en' ? 'No cards found with these filters.' : 'Nessuna carta trovata con questi filtri.'}
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="nr-picker-detail">
            {selectedCard ? (
              <>
                <div className="nr-picker-detail-hero">
                  {selectedCard.source_card_front_url ? (
                    <img src={selectedCard.source_card_front_url} alt={selectedCard.player_name} />
                  ) : (
                    <div className="nr-slot-avatar-fallback"><User size={18} /></div>
                  )}
                  <div>
                    <span className="nr-mini-kicker">{selectedCard.pack_name || selectedCard.card_type}</span>
                    <h3>{selectedCard.player_name}</h3>
                    <p>{selectedCard.card_type} · {selectedCard.position} · {selectedCard.playing_style || '-'}</p>
                  </div>
                </div>

                <div className="nr-picker-stats">
                  <div>
                    <span>OVR</span>
                    <strong>{selectedCard.overall_level_1 ?? selectedCard.overall_max_level ?? '-'}</strong>
                  </div>
                  <div>
                    <span>{lang === 'en' ? 'Role' : 'Ruolo'}</span>
                    <strong>{selectedCard.position || '-'}</strong>
                  </div>
                  <div>
                    <span>{isReserveMode ? (lang === 'en' ? 'Destination' : 'Destinazione') : (lang === 'en' ? 'Fit' : 'Fit')}</span>
                    <strong>{isReserveMode ? (lang === 'en' ? 'Reserve' : 'Riserva') : compatibilityLabel(compatibility, lang)}</strong>
                  </div>
                </div>

                {!isReserveMode && compatibility === 'out_of_role' && (
                  <div className="nr-warning-box">
                    <AlertTriangle size={16} />
                    <span>
                      {lang === 'en'
                        ? 'This card is not natural for the selected slot. You can still continue.'
                        : 'Questa carta non e naturale per lo slot selezionato. Puoi comunque continuare.'}
                    </span>
                  </div>
                )}

                <div className="nr-picker-actions">
                  <button type="button" className="nr-primary-button" onClick={onConfirm}>
                    {isReserveMode ? (lang === 'en' ? 'Add to reserves' : 'Aggiungi in riserva') : (lang === 'en' ? 'Assign to slot' : 'Assegna allo slot')}
                    <ArrowRight size={16} />
                  </button>
                  <div className="nr-secondary-actions">
                    <button type="button" className="nr-secondary-button" onClick={onManualFallback}>
                      {isReserveMode ? (lang === 'en' ? 'Manual reserve' : 'Riserva manuale') : (lang === 'en' ? 'Manual slot player' : 'Giocatore manuale per slot')}
                    </button>
                    <button type="button" className="nr-secondary-button" onClick={onUploadFallback}>
                      {lang === 'en' ? 'Upload player photo' : 'Carica foto giocatore'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="nr-empty-state nr-empty-state-detail">
                <Sparkles size={18} />
                <span>{lang === 'en' ? 'Select a card to preview it before saving.' : 'Seleziona una carta per vederla prima del salvataggio.'}</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function QuickPlayerPanel({
  player,
  slot,
  onClose,
  onRemoveFromSlot,
  onDeletePlayer,
  onOpenBoosters,
  onOpenReplace,
  onUploadPhoto,
  lang
}) {
  if (!player) return null
  const cardImage = getPlayerCardImage(player)

  return (
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className="nr-modal-shell nr-quick-shell" onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            <span className="nr-mini-kicker">{lang === 'en' ? 'Player details' : 'Dettaglio giocatore'}</span>
            <h2>{player.player_name}</h2>
            <p>{player.position || '-'} · OVR {player.overall_rating ?? '-'}</p>
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

          <div className="nr-quick-actions">
            {slot?.slot_index != null && (
              <button type="button" className="nr-primary-button" onClick={() => onRemoveFromSlot(player.id)}>
                {lang === 'en' ? 'Move to reserves' : 'Sposta in riserva'}
              </button>
            )}
            <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player, true)}>
              <Pencil size={14} />
              {lang === 'en' ? 'Edit player' : 'Modifica giocatore'}
            </button>
            <button type="button" className="nr-secondary-button" onClick={onUploadPhoto}>
              <Upload size={14} />
              {lang === 'en' ? 'Upload player photo' : 'Carica foto giocatore'}
            </button>
          </div>

          <div className="nr-secondary-actions">
            <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player)}>
              {lang === 'en' ? 'Choose another card' : "Scegli un'altra carta"}
            </button>
            <button type="button" className="nr-secondary-button" onClick={() => onOpenBoosters(player)}>
              {lang === 'en' ? 'Edit boosters' : 'Modifica boosters'}
            </button>
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

const MANUAL_POSITIONS = ['PT', 'DC', 'TD', 'TS', 'MED', 'CC', 'TRQ', 'CLS', 'CLD', 'ESA', 'EDA', 'SP', 'P']
const MANUAL_CARD_TYPES = ['Standard', 'Trending', 'Highlight', 'Epic', 'Legendary']
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

const PLAYER_SKILL_PRESETS = [
  'Double Touch',
  'Sole Control',
  'Flip Flap',
  'Marseille Turn',
  'Sombrero',
  'Cut Behind & Turn',
  'Scissors Feint',
  'Step On Skill Control',
  'Heading',
  'Long-Range Curler',
  'Long-Range Shooting',
  'Knuckle Shot',
  'Dipping Shot',
  'Rising Shot',
  'Acrobatic Finishing',
  'Heel Trick',
  'First-time Shot',
  'One-touch Pass',
  'Through Passing',
  'Weighted Pass',
  'Pinpoint Crossing',
  'Outside Curler',
  'Rabona',
  'No Look Pass',
  'Low Lofted Pass',
  'GK Low Punt',
  'GK High Punt',
  'Long Throw',
  'GK Long Throw',
  'Penalty Specialist',
  'Gamesmanship',
  'Man Marking',
  'Track Back',
  'Interception',
  'Blocker',
  'Aerial Superiority',
  'Sliding Tackle',
  'Acrobatic Clearance',
  'Captaincy',
  'Super-sub',
  'Fighting Spirit'
]

const PLAYER_SKILL_LABELS = {
  'Double Touch': { en: 'Double Touch', it: 'Doppio tocco' },
  'Sole Control': { en: 'Sole Control', it: 'Controllo di suola' },
  'Flip Flap': { en: 'Flip Flap', it: 'Elastico' },
  'Marseille Turn': { en: 'Marseille Turn', it: 'Veronica' },
  Sombrero: { en: 'Sombrero', it: 'Sombrero' },
  'Cut Behind & Turn': { en: 'Cut Behind & Turn', it: 'Taglio dietro e cambio direzione' },
  'Scissors Feint': { en: 'Scissors Feint', it: 'Doppio passo' },
  'Step On Skill Control': { en: 'Step On Skill Control', it: 'Controllo abilita con suola' },
  Heading: { en: 'Heading', it: 'Colpo di testa' },
  'Long-Range Curler': { en: 'Long-Range Curler', it: 'Tiro a giro da lontano' },
  'Long-Range Shooting': { en: 'Long-Range Shooting', it: 'Tiro dalla distanza' },
  'Knuckle Shot': { en: 'Knuckle Shot', it: 'Tiro a effetto imprevedibile' },
  'Dipping Shot': { en: 'Dipping Shot', it: 'Tiro a scendere' },
  'Rising Shot': { en: 'Rising Shot', it: 'Tiro a salire' },
  'Acrobatic Finishing': { en: 'Acrobatic Finishing', it: 'Finalizzazione acrobatica' },
  'Heel Trick': { en: 'Heel Trick', it: 'Colpo di tacco' },
  'First-time Shot': { en: 'First-time Shot', it: 'Tiro di prima' },
  'One-touch Pass': { en: 'One-touch Pass', it: 'Passaggio di prima' },
  'Through Passing': { en: 'Through Passing', it: 'Passaggio filtrante' },
  'Weighted Pass': { en: 'Weighted Pass', it: 'Passaggio calibrato' },
  'Pinpoint Crossing': { en: 'Pinpoint Crossing', it: 'Cross preciso' },
  'Outside Curler': { en: 'Outside Curler', it: 'Esterno a giro' },
  Rabona: { en: 'Rabona', it: 'Rabona' },
  'No Look Pass': { en: 'No Look Pass', it: 'Passaggio no look' },
  'Low Lofted Pass': { en: 'Low Lofted Pass', it: 'Passaggio alto teso' },
  'GK Low Punt': { en: 'GK Low Punt', it: 'Rinvio basso PT' },
  'GK High Punt': { en: 'GK High Punt', it: 'Rinvio alto PT' },
  'Long Throw': { en: 'Long Throw', it: 'Rimessa lunga' },
  'GK Long Throw': { en: 'GK Long Throw', it: 'Rimessa lunga PT' },
  'Penalty Specialist': { en: 'Penalty Specialist', it: 'Specialista rigori' },
  Gamesmanship: { en: 'Gamesmanship', it: 'Malizia' },
  'Man Marking': { en: 'Man Marking', it: 'Marcatura a uomo' },
  'Track Back': { en: 'Track Back', it: 'Ripiegamento' },
  Interception: { en: 'Interception', it: 'Intercettazione' },
  Blocker: { en: 'Blocker', it: 'Blocco' },
  'Aerial Superiority': { en: 'Aerial Superiority', it: 'Superiorita aerea' },
  'Sliding Tackle': { en: 'Sliding Tackle', it: 'Scivolata' },
  'Acrobatic Clearance': { en: 'Acrobatic Clearance', it: 'Rinvio acrobatico' },
  Captaincy: { en: 'Captaincy', it: 'Leadership' },
  'Super-sub': { en: 'Super-sub', it: 'Super riserva' },
  'Fighting Spirit': { en: 'Fighting Spirit', it: 'Spirito combattivo' }
}

function normalizePlayerSkillKey(skill) {
  return String(skill || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function getPlayerSkillLabel(skill, lang) {
  const raw = String(skill || '').trim()
  const labels = PLAYER_SKILL_LABELS[raw]
    || PLAYER_SKILL_LABELS[
      Object.keys(PLAYER_SKILL_LABELS).find((key) => normalizePlayerSkillKey(key) === normalizePlayerSkillKey(raw))
    ]
  if (!labels) return String(skill || '')
  return lang === 'en' ? labels.en : labels.it
}

function hasPlayerSkill(skills, skill) {
  const normalized = normalizePlayerSkillKey(skill)
  return (Array.isArray(skills) ? skills : []).some((entry) => normalizePlayerSkillKey(entry) === normalized)
}

function parseBoosterLevel(rawEffect) {
  const match = String(rawEffect || '').match(/([+-]?\d+)/)
  const parsed = match ? Number(match[1]) : 1
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  if (parsed > 4) return 4
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

function EnterprisePlayerEditorModal({
  show,
  mode,
  player,
  slot,
  onClose,
  onSave,
  saving,
  lang
}) {
  const [form, setForm] = React.useState({
    player_name: '',
    position: '',
    overall_rating: '',
    card_type: 'Standard',
    role: '',
    age: '',
    nationality: '',
    club_name: ''
  })

  React.useEffect(() => {
    if (!show) return
    setForm({
      player_name: player?.player_name || '',
      position: player?.position || slot?.position || '',
      overall_rating: player?.overall_rating != null ? String(player.overall_rating) : '',
      card_type: player?.card_type || 'Standard',
      role: player?.role || player?.playing_style_name || '',
      age: player?.age != null ? String(player.age) : '',
      nationality: player?.nationality || '',
      club_name: player?.club_name || ''
    })
  }, [show, player, slot])

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onClose}
      title={mode === 'edit' ? (lang === 'en' ? 'Edit player details' : 'Modifica dati giocatore') : (lang === 'en' ? 'Manual player entry' : 'Inserimento manuale giocatore')}
      subtitle={slot?.position ? `${lang === 'en' ? 'Slot' : 'Slot'} · ${slot.position}` : (lang === 'en' ? 'Manual entry' : 'Inserimento manuale')}
      className="nr-editor-shell"
    >
      <div className="nr-editor-grid">
        <EnterpriseSection title={lang === 'en' ? 'Main info' : 'Dati principali'}>
          <div className="nr-form-grid">
            <EnterpriseInput
              label={lang === 'en' ? 'Player name' : 'Nome giocatore'}
              value={form.player_name}
              onChange={(value) => setForm((prev) => ({ ...prev, player_name: value }))}
              placeholder={lang === 'en' ? 'Player name' : 'Nome giocatore'}
            />
            <EnterpriseSelect
              label={lang === 'en' ? 'Position' : 'Posizione'}
              value={form.position}
              onChange={(value) => setForm((prev) => ({ ...prev, position: value }))}
              options={MANUAL_POSITIONS}
            />
            <EnterpriseInput
              label="OVR"
              value={form.overall_rating}
              onChange={(value) => setForm((prev) => ({ ...prev, overall_rating: value }))}
              placeholder="89"
              type="number"
            />
            <EnterpriseSelect
              label={lang === 'en' ? 'Card type' : 'Tipo carta'}
              value={form.card_type}
              onChange={(value) => setForm((prev) => ({ ...prev, card_type: value }))}
              options={MANUAL_CARD_TYPES}
            />
            <EnterpriseInput
              label={lang === 'en' ? 'Playing style / role' : 'Stile / ruolo'}
              value={form.role}
              onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
              placeholder={lang === 'en' ? 'Creative Playmaker' : 'Regista creativo'}
            />
            <EnterpriseInput
              label={lang === 'en' ? 'Age' : 'Eta'}
              value={form.age}
              onChange={(value) => setForm((prev) => ({ ...prev, age: value }))}
              placeholder="25"
              type="number"
            />
          </div>
        </EnterpriseSection>

        <EnterpriseSection title={lang === 'en' ? 'Secondary info' : 'Dati secondari'}>
          <div className="nr-form-grid">
            <EnterpriseInput
              label={lang === 'en' ? 'Nationality' : 'Nazionalita'}
              value={form.nationality}
              onChange={(value) => setForm((prev) => ({ ...prev, nationality: value }))}
              placeholder={lang === 'en' ? 'Argentina' : 'Argentina'}
            />
            <EnterpriseInput
              label={lang === 'en' ? 'Club name' : 'Club'}
              value={form.club_name}
              onChange={(value) => setForm((prev) => ({ ...prev, club_name: value }))}
              placeholder="Barcelona"
            />
          </div>
        </EnterpriseSection>
      </div>

      <div className="nr-modal-footer">
        <button type="button" className="nr-secondary-button" onClick={onClose} disabled={saving}>
          {lang === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        <button type="button" className="nr-primary-button" onClick={() => onSave(form)} disabled={saving}>
          {saving ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (mode === 'edit' ? (lang === 'en' ? 'Save changes' : 'Salva modifiche') : (lang === 'en' ? 'Save player' : 'Salva giocatore'))}
          <Save size={16} />
        </button>
      </div>
    </EnterpriseModalFrame>
  )
}

function EnterpriseBoostersModal({ show, boosters, setBoosters, onClose, onSave, saving, lang }) {
  const list = Array.isArray(boosters) ? boosters : []

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onClose}
      title={lang === 'en' ? 'Boosters' : 'Boosters'}
      subtitle={lang === 'en' ? 'Quick edit' : 'Modifica rapida'}
      className="nr-editor-shell"
    >
      <EnterpriseSection
        title={lang === 'en' ? 'Booster list' : 'Lista booster'}
        actions={
          <button
            type="button"
            className="nr-secondary-button"
            onClick={() => setBoosters([...(list || []), { name: '', effect: '' }])}
            disabled={saving}
          >
            <Plus size={14} />
            {lang === 'en' ? 'Add booster' : 'Aggiungi booster'}
          </button>
        }
      >
        <div className="nr-boosters-list">
          {list.length > 0 ? list.map((booster, index) => (
            <div key={`${index}-${booster?.name || 'booster'}`} className="nr-booster-row">
              <div className="nr-form-grid">
                <EnterpriseInput
                  label={lang === 'en' ? 'Booster name' : 'Nome booster'}
                  value={String(booster?.name || '')}
                  onChange={(value) => setBoosters(list.map((item, idx) => idx === index ? { ...(item || {}), name: value } : item))}
                  placeholder={lang === 'en' ? 'Booster name' : 'Nome booster'}
                />
                <EnterpriseInput
                  label={lang === 'en' ? 'Effect' : 'Effetto'}
                  value={String(booster?.effect || '')}
                  onChange={(value) => setBoosters(list.map((item, idx) => idx === index ? { ...(item || {}), effect: value } : item))}
                  placeholder={lang === 'en' ? 'Effect' : 'Effetto'}
                />
              </div>
              <button
                type="button"
                className="nr-danger-button"
                onClick={() => setBoosters(list.filter((_, idx) => idx !== index))}
                disabled={saving}
              >
                <Trash2 size={14} />
                {lang === 'en' ? 'Remove' : 'Rimuovi'}
              </button>
            </div>
          )) : (
            <div className="nr-empty-state">
              <span>{lang === 'en' ? 'No boosters added yet.' : 'Nessun booster aggiunto ancora.'}</span>
            </div>
          )}
        </div>
      </EnterpriseSection>

      <div className="nr-modal-footer">
        <button type="button" className="nr-secondary-button" onClick={onClose} disabled={saving}>
          {lang === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        <button type="button" className="nr-primary-button" onClick={onSave} disabled={saving}>
          {saving ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (lang === 'en' ? 'Save boosters' : 'Salva boosters')}
          <Save size={16} />
        </button>
      </div>
    </EnterpriseModalFrame>
  )
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
    offensive_awareness: getStat(attacking, 'offensive_awareness', 'Offensive Awareness'),
    finishing: getStat(attacking, 'finishing', 'Finishing'),
    low_pass: getStat(attacking, 'low_pass', 'Low Pass'),
    lofted_pass: getStat(attacking, 'lofted_pass', 'Lofted Pass'),
    dribbling: getStat(attacking, 'dribbling', 'Dribbling'),
    ball_control: getStat(attacking, 'ball_control', 'Ball Control'),
    tight_possession: getStat(attacking, 'tight_possession', 'Tight Possession'),
    heading: getStat(attacking, 'heading', 'Heading'),
    set_piece_taking: getStat(attacking, 'set_piece_taking', 'Set Piece Taking'),
    curl: getStat(attacking, 'curl', 'Curl'),
    defensive_awareness: getStat(defending, 'defensive_awareness', 'Defensive Awareness'),
    defensive_engagement: getStat(defending, 'defensive_engagement', 'Defensive Engagement'),
    tackling: getStat(defending, 'tackling', 'Tackling'),
    aggression: getStat(defending, 'aggression', 'Aggression'),
    speed: getStat(athleticism, 'speed', 'Speed'),
    acceleration: getStat(athleticism, 'acceleration', 'Acceleration'),
    kicking_power: getStat(athleticism, 'kicking_power', 'Kicking Power'),
    physical_contact: getStat(athleticism, 'physical_contact', 'Physical Contact'),
    balance: getStat(athleticism, 'balance', 'Balance', 'Body Control'),
    stamina: getStat(athleticism, 'stamina', 'Stamina'),
    jump: getStat(athleticism, 'jump', 'Jump', 'Jumping'),
    gk_awareness: getStat(goalkeeping, 'gk_awareness', 'GK Awareness'),
    gk_catching: getStat(goalkeeping, 'gk_catching', 'GK Catching'),
    gk_parrying: getStat(goalkeeping, 'gk_parrying', 'GK Parrying'),
    gk_reflexes: getStat(goalkeeping, 'gk_reflexes', 'GK Reflexes'),
    gk_reach: getStat(goalkeeping, 'gk_reach', 'GK Reach')
  }
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

function PremiumPlayerModal({
  show,
  player,
  slot,
  reserves = [],
  assigning = false,
  onAssignFromReserve,
  onClose,
  onSave,
  onRemoveFromSlot,
  onDeletePlayer,
  onOpenReplace,
  onOpenManualEntry,
  onUploadPhoto,
  saving,
  lang,
  t
}) {
  const cardImage = getPlayerCardImage(player)
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

  React.useEffect(() => {
    if (!show || !player) return
    const normalizedStats = normalizeBaseStatsForEditor(player.base_stats || {})
    setForm({
      player_name: player.player_name || '',
      position: player.position || '',
      overall_rating: player.overall_rating != null ? String(player.overall_rating) : '',
      card_type: player.card_type || '',
      role: player.role || player.playing_style_name || '',
      age: player.age != null ? String(player.age) : '',
      nationality: player.nationality || '',
      club_name: player.club_name || '',
      ...normalizedStats
    })
    setSkillsDraft(Array.isArray(player.skills) ? player.skills : [])
    setSelectedSkillPreset('')
    setShowAllSkills(false)
    setBoostersDraft(
      Array.isArray(player.available_boosters)
        ? player.available_boosters.map((entry) => normalizeBoosterEntry(entry))
        : []
    )
  }, [show, player])

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
      return [...prev, normalizeBoosterEntry({ name: defaultPreset, effect: '+1' })]
    })
  }

  const updateBooster = (index, key, value) => {
    setBoostersDraft((prev) => prev.map((entry, idx) => idx === index ? { ...(entry || {}), [key]: value } : entry))
  }

  const updateBoosterPreset = (index, presetValue) => {
    setBoostersDraft((prev) => prev.map((entry, idx) => {
      if (idx !== index) return entry
      if (presetValue === 'custom') {
        return { ...(entry || {}), preset: 'custom', name: entry?.name || '' }
      }
      return {
        ...(entry || {}),
        preset: presetValue,
        name: presetValue
      }
    }))
  }

  const updateBoosterLevel = (index, level) => {
    setBoostersDraft((prev) => prev.map((entry, idx) => {
      if (idx !== index) return entry
      return {
        ...(entry || {}),
        level,
        effect: `+${level}`
      }
    }))
  }

  const removeBooster = (index) => {
    setBoostersDraft((prev) => prev.filter((_, idx) => idx !== index))
  }

  const boosterCount = boostersDraft.length
  const roleCount = Array.isArray(player.original_positions) ? player.original_positions.length : 0
  const visibleSkills = showAllSkills ? skillsDraft : skillsDraft.slice(0, 10)
  const hiddenSkillsCount = Math.max(0, skillsDraft.length - visibleSkills.length)

  return (
    <EnterpriseModalFrame
      show={show}
      onClose={onClose}
      title={player.player_name}
      subtitle={lang === 'en' ? 'Player editor' : 'Editor giocatore'}
      className="nr-premium-player-shell"
    >
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
              <strong>{player.overall_rating ?? '-'}</strong>
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
            <p className="nr-setup-readonly-note">
              {lang === 'en'
                ? 'Base data (name, role, age, club, nationality) is fixed and syncs from catalog/manual source. You can edit only OVR here.'
                : 'I dati base (nome, ruolo, eta, club, nazionalita) sono fissi e seguono la sorgente catalogo/manuale. Qui puoi modificare solo OVR.'}
            </p>
          </EnterpriseSection>

          <div className="nr-premium-toolbar-row">
            <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player)}>
              {lang === 'en' ? 'Choose another card' : "Scegli un'altra carta"}
            </button>
            {player.slot_index !== null && player.slot_index !== undefined && (
              <button type="button" className="nr-secondary-button" onClick={() => onRemoveFromSlot(player.id)}>
                {lang === 'en' ? 'Move to reserves' : 'Sposta in riserva'}
              </button>
            )}
            <button type="button" className="nr-danger-button" onClick={() => onDeletePlayer(player.id)}>
              <Trash2 size={14} />
              {lang === 'en' ? 'Delete permanently' : 'Elimina definitivamente'}
            </button>
          </div>

          {slot?.slot_index != null && (
            <EnterpriseSection
              title={lang === 'en' ? 'Choose from reserves' : 'Scegli dalle riserve'}
              actions={(
                <div className="nr-secondary-actions">
                  <button type="button" className="nr-secondary-button" onClick={onOpenManualEntry}>
                    {lang === 'en' ? 'Manual slot player' : 'Giocatore manuale per slot'}
                  </button>
                  <button type="button" className="nr-secondary-button" onClick={onUploadPhoto}>
                    {lang === 'en' ? 'Upload player photo' : 'Carica foto giocatore'}
                  </button>
                </div>
              )}
            >
              <div className="nr-reserve-inline-list">
                {reserves.length > 0 ? reserves.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="nr-bench-item"
                    onClick={() => onAssignFromReserve?.(entry)}
                    disabled={assigning}
                  >
                    <div className="nr-bench-item-copy">
                      <strong>{entry.player_name}</strong>
                      <span>{entry.position || '-'} · OVR {entry.overall_rating ?? '-'}</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                )) : (
                  <div className="nr-empty-state">
                    <span>{lang === 'en' ? 'No reserves available yet.' : 'Nessuna riserva disponibile.'}</span>
                  </div>
                )}
              </div>
            </EnterpriseSection>
          )}

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
                          {getPlayerSkillLabel(skill, lang)}
                        </option>
                      ))}
                    </select>
                  </label>

                </div>

                <div className="nr-skill-chip-row">
                  {visibleSkills.length > 0 ? visibleSkills.map((skill) => (
                    <button key={skill} type="button" className="nr-skill-chip" onClick={() => removeSkill(skill)}>
                      {getPlayerSkillLabel(skill, lang)}
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
              <EnterpriseSection
                title={lang === 'en' ? 'Boosters' : 'Boosters'}
                actions={
                  <button type="button" className="nr-secondary-button" onClick={addBooster} disabled={boostersDraft.length >= 2}>
                    <Plus size={14} />
                    {lang === 'en' ? 'Add booster slot' : 'Aggiungi slot booster'}
                  </button>
                }
              >
                <div className="nr-booster-slot-grid">
                  {[0, 1].map((slotIndex) => {
                    const booster = boostersDraft[slotIndex]
                    const selectedPreset = booster?.preset || detectBoosterPreset(booster?.name)
                    const activeLevel = Number(booster?.level || parseBoosterLevel(booster?.effect || '+1'))
                    return (
                      <div key={`booster-slot-${slotIndex}`} className="nr-booster-slot-card">
                        <div className="nr-booster-row-head">
                          <span>{lang === 'en' ? `Slot ${slotIndex + 1}` : `Slot ${slotIndex + 1}`}</span>
                          {booster ? (
                            <button type="button" className="nr-icon-button" onClick={() => removeBooster(slotIndex)}>
                              <X size={12} />
                            </button>
                          ) : null}
                        </div>
                        {booster ? (
                          <>
                            <label className="nr-form-field">
                              <span>{lang === 'en' ? 'Booster' : 'Booster'}</span>
                              <select
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
                                label={lang === 'en' ? 'Custom name' : 'Nome personalizzato'}
                                value={String(booster?.name || '')}
                                onChange={(value) => updateBooster(slotIndex, 'name', value)}
                                placeholder={lang === 'en' ? 'Custom booster' : 'Booster personalizzato'}
                              />
                            ) : null}
                            <div className="nr-booster-level-buttons">
                              {[1, 2, 3, 4].map((levelValue) => (
                                <button
                                  key={`${slotIndex}-${levelValue}`}
                                  type="button"
                                  className={`nr-booster-level-btn ${activeLevel === levelValue ? 'is-active' : ''}`}
                                  onClick={() => updateBoosterLevel(slotIndex, levelValue)}
                                >
                                  +{levelValue}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="nr-empty-state">
                            <span>{lang === 'en' ? 'No booster in this slot.' : 'Nessun booster in questo slot.'}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </EnterpriseSection>
            </section>
          </div>
        </section>
      </div>

      <div className="nr-modal-footer">
        <button type="button" className="nr-secondary-button" onClick={onClose} disabled={saving}>
          {lang === 'en' ? 'Cancel' : 'Annulla'}
        </button>
        <button
          type="button"
          className="nr-primary-button"
          disabled={saving}
          onClick={() => onSave({
            player_name: form.player_name.trim(),
            position: form.position,
            overall_rating: form.overall_rating ? Number(form.overall_rating) : null,
            card_type: form.card_type,
            role: form.role,
            age: form.age ? Number(form.age) : null,
            nationality: form.nationality,
            club_name: form.club_name,
            skills: skillsDraft,
            available_boosters: boostersDraft.map((entry) => ({
              name: String(entry?.name || '').trim(),
              effect: String(entry?.effect || '').trim() || '+1'
            })),
            base_stats: buildBaseStatsPayloadFromEditor(form)
          })}
        >
          {saving ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (lang === 'en' ? 'Save player' : 'Salva giocatore')}
          <Save size={16} />
        </button>
      </div>
    </EnterpriseModalFrame>
  )
}

export default withAuth(function NuovaRosaLabPage() {
  const router = useRouter()
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
  const [pickerQuery, setPickerQuery] = React.useState('')
  const [pickerResults, setPickerResults] = React.useState([])
  const [pickerSuggested, setPickerSuggested] = React.useState([])
  const [selectedCatalogCard, setSelectedCatalogCard] = React.useState(null)
  const [confirmModal, setConfirmModal] = React.useState(null)
  const [showManualPlayerModal, setShowManualPlayerModal] = React.useState(false)
  const [manualEditorMode, setManualEditorMode] = React.useState('create')
  const [manualEditorPlayer, setManualEditorPlayer] = React.useState(null)
  const [showPremiumEditorModal, setShowPremiumEditorModal] = React.useState(false)
  const [savingManualEditor, setSavingManualEditor] = React.useState(false)
  const [showManualBoostersModal, setShowManualBoostersModal] = React.useState(false)
  const [manualBoosters, setManualBoosters] = React.useState([])
  const [manualBoostersPlayerId, setManualBoostersPlayerId] = React.useState(null)
  const [savingManualBoosters, setSavingManualBoosters] = React.useState(false)
  const [importingStarterPack, setImportingStarterPack] = React.useState(false)
  const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)
  const [fieldEditMode, setFieldEditMode] = React.useState(false)
  const [customPositions, setCustomPositions] = React.useState({})
  const [savingFieldLayout, setSavingFieldLayout] = React.useState(false)

  const totalPlayers = titolari.length + riserve.length
  const setupStage = buildSetupStage({
    totalPlayers,
    starters: titolari.length,
    hasFormation: Boolean(layout?.formation),
    hasCoach: Boolean(activeCoach?.coach_name),
    hasTactics: Boolean(tacticalSettings?.team_playing_style)
  })

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

  const loadCatalog = React.useCallback(async (slot, query = '', mode = 'slot') => {
    if (mode !== 'reserve' && !slot) return
    setPickerLoading(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const params = new URLSearchParams({
        q: query,
        limit: '24'
      })
      if (mode !== 'reserve') {
        params.set('slot_position', String(slot?.position || ''))
      }
      const response = await fetch(`/api/player-catalog/search?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: 'no-store'
      })
      const data = await safeJsonResponse(response, 'Catalog load failed')
      setPickerResults(Array.isArray(data.results) ? data.results : [])
      setPickerSuggested(Array.isArray(data.suggested) ? data.suggested : [])
    } catch (err) {
      console.error('[NuovaRosaLab] catalog error:', err)
      showToast(lang === 'en' ? 'Unable to load the catalog.' : 'Impossibile caricare il catalogo.', 'error')
      setPickerResults([])
      setPickerSuggested([])
    } finally {
      setPickerLoading(false)
    }
  }, [lang, showToast, t])

  React.useEffect(() => {
    if (!pickerOpen) return
    if (pickerMode !== 'reserve' && !selectedSlot) return
    const timer = window.setTimeout(() => {
      loadCatalog(selectedSlot, pickerQuery, pickerMode)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [pickerOpen, selectedSlot, pickerQuery, pickerMode, loadCatalog])

  const openPickerForSlot = React.useCallback((slot) => {
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setSelectedSlot(slot)
    setPickerMode('slot')
    setSelectedCatalogCard(null)
    setPickerQuery('')
    setPickerOpen(true)
  }, [])

  const openPickerForReserve = React.useCallback(() => {
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }
    setSelectedSlot(null)
    setShowAssignModal(false)
    setSelectedPlayer(null)
    setPickerMode('reserve')
    setSelectedCatalogCard(null)
    setPickerQuery('')
    setPickerOpen(true)
  }, [riserve.length, showToast, t])

  const closePicker = React.useCallback(() => {
    setPickerOpen(false)
    setPickerMode('slot')
    setSelectedCatalogCard(null)
    setPickerQuery('')
  }, [])

  const handleOpenManualFallback = React.useCallback(() => {
    setPickerOpen(false)
    setManualEditorMode('create')
    setManualEditorPlayer(null)
    setShowManualPlayerModal(true)
  }, [])

  const handleUploadFallback = React.useCallback(() => {
    setPickerOpen(false)
    setConfirmModal({
      ...showConfirmConfig({
        title: lang === 'en' ? 'Open legacy photo upload' : 'Apri caricamento foto legacy',
        message: lang === 'en'
          ? 'Photo upload is still managed by the current roster page. We can open it now without touching your data.'
          : 'Il caricamento foto e ancora gestito dalla pagina rosa attuale. Possiamo aprirla ora senza toccare i tuoi dati.',
        details: lang === 'en'
          ? 'Use it when the catalog or manual entry is not enough.'
          : 'Usala quando catalogo o inserimento manuale non bastano.',
        confirmLabel: lang === 'en' ? 'Open roster page' : 'Apri pagina rosa',
        cancelLabel: t('cancel')
      }),
      onConfirm: () => {
        setConfirmModal(null)
        router.push('/gestione-formazione')
      },
      onCancel: () => setConfirmModal(null)
    })
  }, [lang, router, t])

  const handleSaveCatalogCardToSlot = React.useCallback(async () => {
    if (!selectedSlot || !selectedCatalogCard) return

    const compatibility = getSlotCompatibility(selectedSlot.position, selectedCatalogCard.position)
    if (compatibility === 'out_of_role') {
      setConfirmModal({
        ...showConfirmConfig({
          title: lang === 'en' ? 'Confirm role change' : 'Conferma cambio ruolo',
          message: lang === 'en'
            ? `${selectedCatalogCard.player_name} is not natural for ${selectedSlot.position}.`
            : `${selectedCatalogCard.player_name} non e naturale per ${selectedSlot.position}.`,
          details: lang === 'en'
            ? 'You can still continue and correct the player later if needed.'
            : 'Puoi comunque continuare e correggere il giocatore dopo, se serve.',
          confirmLabel: lang === 'en' ? 'Confirm' : t('confirm'),
          cancelLabel: lang === 'en' ? 'Cancel' : t('cancel')
        }),
        onConfirm: async () => {
          setConfirmModal(null)
          await createPlayerFromCatalog(true)
        },
        onCancel: () => setConfirmModal(null)
      })
      return
    }

    await createPlayerFromCatalog(false)
  }, [selectedSlot, selectedCatalogCard, lang, t])

  const handleSaveCatalogCardAsReserve = React.useCallback(async () => {
    if (!selectedCatalogCard) return
    if (riserve.length >= MAX_RESERVES) {
      showToast(t('maxReservesReached'), 'error')
      return
    }

    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const playerPayload = buildPlayerPayloadFromCatalog(selectedCatalogCard, null)
      playerPayload.slot_index = null

      const response = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ player: playerPayload })
      })

      await safeJsonResponse(response, t('errorSavingPlayerGeneric'))
      await fetchRoster()
      closePicker()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Reserve added successfully.' : 'Riserva aggiunta con successo.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] save reserve catalog player error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    }
  }, [closePicker, fetchRoster, lang, refreshDiagnosticAfterSave, riserve.length, selectedCatalogCard, showToast, t])

  const createPlayerFromCatalog = React.useCallback(async (forcedOutOfRole) => {
    if (!selectedSlot || !selectedCatalogCard) return

    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const playerPayload = buildPlayerPayloadFromCatalog(selectedCatalogCard, selectedSlot.slot_index)
      if (forcedOutOfRole) {
        playerPayload.metadata = {
          ...(playerPayload.metadata || {}),
          forced_out_of_role: true,
          forced_slot_position: selectedSlot.position || null
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
      showToast(lang === 'en' ? 'Player added successfully.' : 'Giocatore aggiunto con successo.', 'success')
      return data
    } catch (err) {
      console.error('[NuovaRosaLab] save catalog player error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    }
  }, [selectedSlot, selectedCatalogCard, lang, t, fetchRoster, closePicker, refreshDiagnosticAfterSave, showToast])

  const handleSelectReserveForSlot = React.useCallback(async (player) => {
    if (!selectedSlot || !player?.id) return

    const positions = Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions
      : (player.position ? [{ position: player.position, competence: 'Alta' }] : [])
    const isOriginal = positions.some((entry) => String(entry?.position || '').toUpperCase() === String(selectedSlot.position || '').toUpperCase())

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
            slot_index: selectedSlot.slot_index,
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

    if (!isOriginal && selectedSlot.position) {
      setConfirmModal({
        ...showConfirmConfig({
          title: lang === 'en' ? 'Confirm role change' : 'Conferma cambio ruolo',
          message: lang === 'en'
            ? `${player.player_name} is not natural for ${selectedSlot.position}.`
            : `${player.player_name} non e naturale per ${selectedSlot.position}.`,
          details: lang === 'en'
            ? 'You can still continue and edit the role compatibility later.'
            : 'Puoi comunque continuare e modificare la compatibilita ruolo in seguito.',
          confirmLabel: t('confirm'),
          cancelLabel: t('cancel')
        }),
        onConfirm: async () => {
          setConfirmModal(null)
          await continueAssign()
        },
        onCancel: () => setConfirmModal(null)
      })
      return
    }

    await continueAssign()
  }, [closePicker, fetchRoster, lang, refreshDiagnosticAfterSave, selectedSlot, showToast, t])

  const handleRemoveFromSlot = React.useCallback(async (playerId) => {
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
          throw new Error(data.error)
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
      const rawMessage = String(err?.message || '')
      if (rawMessage.toLowerCase().includes('massimo 12 riserve') || rawMessage.toLowerCase().includes('max 12 reserves')) {
        setConfirmModal({
          ...showConfirmConfig({
            title: lang === 'en' ? 'Reserves are full' : 'Riserve al completo',
            message: lang === 'en'
              ? 'You already have 12 reserves. To free this slot now, you can delete this player.'
              : 'Hai gia 12 riserve. Per liberare subito questo slot, puoi eliminare questo giocatore.',
            details: lang === 'en'
              ? 'This action removes the player from your roster.'
              : 'Questa azione rimuove il giocatore dalla tua rosa.',
            confirmLabel: lang === 'en' ? 'Delete permanently' : 'Elimina definitivamente',
            cancelLabel: t('cancel'),
            confirmVariant: 'danger'
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
            } catch (deleteErr) {
              console.error('[NuovaRosaLab] delete after reserve full error:', deleteErr)
              const { message } = mapErrorToUserMessage(deleteErr, t('deleteReserveError'), lang)
              showToast(message, 'error')
            }
          },
          onCancel: () => setConfirmModal(null)
        })
        return
      }
      const { message } = mapErrorToUserMessage(err, t('errorRemovalAfterDuplicate'), lang)
      showToast(message, 'error')
    } finally {
      setAssigning(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

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

  const handleImportStarterPack = React.useCallback(async () => {
    try {
      setImportingStarterPack(true)
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const response = await fetch('/api/starter-pack/import', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        }
      })
      await safeJsonResponse(response, t('starterPackImportError'))
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(t('starterPackImportSuccess'), 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] starter pack error:', err)
      const { message } = mapErrorToUserMessage(err, t('starterPackImportError'), lang)
      showToast(message, 'error')
    } finally {
      setImportingStarterPack(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const openManualBoostersForPlayer = React.useCallback((player) => {
    if (!player?.id) return
    const existing = Array.isArray(player.available_boosters) ? player.available_boosters : []
    setManualBoosters(existing.length > 0 ? existing : [{ name: '', effect: '' }])
    setManualBoostersPlayerId(player.id)
    setShowManualBoostersModal(true)
  }, [])

  const handleManualEditorSave = React.useCallback(async (form) => {
    setSavingManualEditor(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      if (manualEditorMode === 'edit' && manualEditorPlayer?.id) {
        const response = await fetch(`/api/players/${manualEditorPlayer.id}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            metadata: {
              manual_override_name: form.player_name.trim(),
              manual_override_position: form.position || null,
              manual_override_overall: form.overall_rating ? Number(form.overall_rating) : null,
              manual_override_card_type: form.card_type || null,
              manual_override_role: form.role || null,
              manual_override_nationality: form.nationality || null,
              manual_override_club_name: form.club_name || null
            }
          })
        })
        await safeJsonResponse(response, t('errorSavingPlayerGeneric'))
      } else {
        const payload = {
          player_name: form.player_name.trim(),
          position: form.position || selectedSlot?.position || null,
          overall_rating: form.overall_rating ? Number(form.overall_rating) : null,
          card_type: form.card_type || null,
          role: form.role || null,
          age: form.age ? Number(form.age) : null,
          nationality: form.nationality || null,
          club_name: form.club_name || null,
          slot_index: selectedSlot?.slot_index ?? null,
          photo_slots: { manuale: true },
          metadata: {
            manual_entry: true,
            manual_entry_saved_at: new Date().toISOString()
          },
          extracted_data: { source: 'manual_input' }
        }

        const response = await fetch('/api/supabase/save-player', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ player: payload })
        })
        await safeJsonResponse(response, t('errorSavingPlayerGeneric'))
      }

      setShowManualPlayerModal(false)
      setManualEditorPlayer(null)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Player saved successfully.' : 'Giocatore salvato con successo.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] manual editor error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    } finally {
      setSavingManualEditor(false)
    }
  }, [fetchRoster, lang, manualEditorMode, manualEditorPlayer, refreshDiagnosticAfterSave, selectedSlot, showToast, t])

  const saveManualBoostersForPlayer = React.useCallback(async () => {
    if (!manualBoostersPlayerId) return
    setSavingManualBoosters(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const cleaned = (Array.isArray(manualBoosters) ? manualBoosters : [])
        .map((booster) => ({
          name: typeof booster?.name === 'string' ? booster.name.trim() : '',
          effect: typeof booster?.effect === 'string' ? booster.effect.trim() : ''
        }))
        .filter((booster) => booster.name || booster.effect)

      const playerRes = await fetch(`/api/players/${manualBoostersPlayerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const current = await playerRes.json().catch(() => ({}))
      const existingPhotoSlots = current?.player?.photo_slots && typeof current.player.photo_slots === 'object'
        ? current.player.photo_slots
        : {}

      const patchRes = await fetch(`/api/players/${manualBoostersPlayerId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          available_boosters: cleaned,
          photo_slots: { ...existingPhotoSlots, booster: true }
        })
      })
      await safeJsonResponse(patchRes, t('errorSavingPlayerGeneric'))
      setShowManualBoostersModal(false)
      setManualBoosters([])
      setManualBoostersPlayerId(null)
      setSelectedPlayer(null)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Boosters updated.' : 'Boosters aggiornati.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] boosters error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorSavingPlayerGeneric'), lang)
      showToast(message, 'error')
    } finally {
      setSavingManualBoosters(false)
    }
  }, [manualBoosters, manualBoostersPlayerId, fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const handlePremiumPlayerSave = React.useCallback(async (payload) => {
    if (!selectedPlayer?.id) return
    setSavingManualEditor(true)
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
      setSavingManualEditor(false)
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, selectedPlayer, showToast, t])

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

      let effectiveFormation = layout.formation || 'Custom'
      try {
        const { getFormationNameFromSlotPositions } = await import('../../lib/validateFormationLimits')
        effectiveFormation = getFormationNameFromSlotPositions(updatedSlotPositions) || effectiveFormation
      } catch (_) {}

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

  const stageCopy = React.useMemo(() => {
    const copy = {
      empty: {
        title: t('nuovaRosaStageEmptyTitle'),
        text: t('nuovaRosaStageEmptyText'),
        cta: totalPlayers <= 5 ? t('nuovaRosaStageEmptyCta') : null
      },
      starter_seeded: {
        title: t('nuovaRosaStageSeededTitle'),
        text: t('nuovaRosaStageSeededText'),
        cta: totalPlayers <= 5 ? t('nuovaRosaStageSeededCta') : null
      },
      partial: {
        title: t('nuovaRosaStagePartialTitle'),
        text: t('nuovaRosaStagePartialText'),
        cta: null
      },
      formation_ready: {
        title: t('nuovaRosaStageFormationReadyTitle'),
        text: t('nuovaRosaStageFormationReadyText'),
        cta: null
      },
      system_ready: {
        title: t('nuovaRosaStageSystemReadyTitle'),
        text: t('nuovaRosaStageSystemReadyText'),
        cta: null
      }
    }
    return copy[setupStage] || copy.empty
  }, [setupStage, t, totalPlayers])

  return (
    <main className="nr-page">
      <section className="nr-hero-card">
        <div className="nr-hero-copy">
          <span className="nr-badge"><ShieldCheck size={14} /> {t('nuovaRosaPrivateLab')}</span>
          <h1>{t('nuovaRosaTitle')}</h1>
          <p>{stageCopy.text}</p>
          <div className="nr-hero-actions">
            {stageCopy.cta && (
              <button type="button" className="nr-primary-button" onClick={handleImportStarterPack} disabled={importingStarterPack}>
                {importingStarterPack ? t('starterPackImportLoading') : stageCopy.cta}
                <Gift size={16} />
              </button>
            )}
            <button type="button" className="nr-secondary-button" onClick={() => router.push('/gestione-formazione')}>
              {t('nuovaRosaOpenCurrent')}
            </button>
          </div>
        </div>
        <div className="nr-hero-side">
          <div className="nr-stage-pill"><Zap size={14} /> {t('nuovaRosaStatusLabel')}</div>
          <h2 className="nr-stage-title">{stageCopy.title}</h2>
          <div className="nr-stats-grid">
            <div>
              <span>{t('nuovaRosaPlayers')}</span>
              <strong>{totalPlayers}</strong>
            </div>
            <div>
              <span>{t('nuovaRosaStarters')}</span>
              <strong>{titolari.length}</strong>
            </div>
            <div>
              <span>{t('nuovaRosaFormation')}</span>
              <strong>{layout?.formation || '-'}</strong>
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
          <section className="nr-workspace-block">
            <div className="nr-workspace-head nr-card-head">
              <div>
                <span className="nr-mini-kicker">{t('nuovaRosaWorkspace')}</span>
                <h2>{layout?.formation || '4-3-3'}</h2>
              </div>
              <div className="nr-field-actions">
                {fieldEditMode ? (
                  <>
                    <button type="button" className="nr-secondary-button" onClick={() => { setFieldEditMode(false); setCustomPositions({}) }} disabled={savingFieldLayout}>
                      {t('cancel')}
                    </button>
                    <button type="button" className="nr-primary-button" onClick={() => saveFieldLayout()} disabled={savingFieldLayout}>
                      {savingFieldLayout ? (lang === 'en' ? 'Saving...' : 'Salvataggio...') : (lang === 'en' ? 'Save positions' : 'Salva posizioni')}
                    </button>
                  </>
                ) : (
                  <button type="button" className="nr-secondary-button" onClick={() => setFieldEditMode(true)}>
                    {lang === 'en' ? 'Move players' : 'Sposta giocatori'}
                  </button>
                )}
              </div>
            </div>
            <div className="nr-field-shell">
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
                    onRemove={handleRemoveFromSlot}
                    lang={lang}
                    isEditMode={fieldEditMode}
                    onPositionChange={handleFieldPositionChange}
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
                <h2>{riserve.length}</h2>
              </div>
              <button type="button" className="nr-icon-button" onClick={openPickerForReserve}>
                <Plus size={16} />
              </button>
            </div>
            <div className="nr-reserve-grid">
              {riserve.length > 0 ? riserve.map((player) => (
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
                    {player.photo_url ? (
                      <img src={player.photo_url} alt={player.player_name} loading="lazy" draggable={false} />
                    ) : (
                      <div className="nr-slot-avatar-fallback"><User size={16} /></div>
                    )}
                  </div>
                  <div className="nr-reserve-card-copy">
                    <strong>{player.player_name}</strong>
                    <span>{player.position || '-'}</span>
                  </div>
                  <div className="nr-reserve-card-ovr">
                    <small>OVR</small>
                    <strong>{player.overall_rating ?? '-'}</strong>
                  </div>
                  <ChevronRight size={14} />
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
              )) : (
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
        onSearchChange={setPickerQuery}
        loading={pickerLoading}
        suggested={pickerSuggested}
        results={pickerResults}
        reserves={riserve}
        selectedCard={selectedCatalogCard}
        onSelectCard={setSelectedCatalogCard}
        onClose={closePicker}
        onConfirm={pickerMode === 'reserve' ? handleSaveCatalogCardAsReserve : handleSaveCatalogCardToSlot}
        onSelectReserve={handleSelectReserveForSlot}
        onManualFallback={handleOpenManualFallback}
        onUploadFallback={handleUploadFallback}
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
        onUploadPhoto={handleUploadFallback}
        onOpenBoosters={(player) => {
          setShowAssignModal(false)
          openManualBoostersForPlayer(player)
        }}
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
        reserves={riserve}
        assigning={assigning}
        onAssignFromReserve={handleSelectReserveForSlot}
        show={showPremiumEditorModal && !!selectedPlayer}
        onClose={() => {
          setShowPremiumEditorModal(false)
          setSelectedPlayer(null)
        }}
        onSave={handlePremiumPlayerSave}
        saving={savingManualEditor}
        onRemoveFromSlot={handleRemoveFromSlot}
        onDeletePlayer={handleDeletePlayer}
        onOpenManualEntry={() => {
          setShowPremiumEditorModal(false)
          setManualEditorMode('create')
          setManualEditorPlayer(null)
          setShowManualPlayerModal(true)
        }}
        onUploadPhoto={handleUploadFallback}
        onOpenBoosters={(player) => {
          setShowPremiumEditorModal(false)
          openManualBoostersForPlayer(player)
        }}
        onOpenReplace={(player) => {
          const slot = player?.slot_index != null ? slots.find((entry) => entry.slot_index === player.slot_index) : null
          setShowPremiumEditorModal(false)
          setSelectedPlayer(null)
          if (slot) {
            openPickerForSlot(slot)
          }
        }}
        lang={lang}
        t={t}
      />

      <EnterprisePlayerEditorModal
        show={showManualPlayerModal}
        mode={manualEditorMode}
        player={manualEditorPlayer}
        slot={selectedSlot}
        onClose={() => {
          setShowManualPlayerModal(false)
          setManualEditorPlayer(null)
        }}
        onSave={handleManualEditorSave}
        saving={savingManualEditor}
        lang={lang}
      />

      <EnterpriseBoostersModal
        show={showManualBoostersModal}
        boosters={manualBoosters}
        setBoosters={setManualBoosters}
        onClose={() => {
          setShowManualBoostersModal(false)
          setManualBoosters([])
          setManualBoostersPlayerId(null)
        }}
        onSave={saveManualBoostersForPlayer}
        saving={savingManualBoosters}
        lang={lang}
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

      {toast && (
        <div className={`nr-toast ${toast.type}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <style jsx global>{`
        .nr-page {
          width: min(1440px, 100%);
          margin: 0 auto;
          padding: clamp(18px, 3vw, 32px);
          position: relative;
        }

        .nr-page:before {
          content: '';
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 12% 8%, rgba(0, 212, 255, 0.18), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(168, 85, 247, 0.18), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(52, 211, 153, 0.12), transparent 34%);
          z-index: -1;
        }

        .nr-card,
        .nr-hero-card,
        .nr-modal-shell {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: linear-gradient(180deg, rgba(8, 12, 28, 0.96), rgba(5, 8, 20, 0.96));
          border-radius: 18px;
        }

        .nr-hero-card {
          padding: clamp(14px, 2.8vw, 22px);
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
          gap: 18px;
          margin-bottom: 22px;
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

        .nr-hero-copy h1 {
          font-size: clamp(24px, 3.2vw, 42px);
          line-height: 0.95;
          letter-spacing: -0.04em;
          text-shadow: 0 0 32px rgba(0, 212, 255, 0.18);
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

        .nr-stage-title {
          margin: 0;
          color: #fff;
          font-size: 22px;
          letter-spacing: -0.02em;
        }

        .nr-badge,
        .nr-stage-pill,
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

        .nr-danger-button {
          border-color: rgba(255, 59, 48, 0.35);
          background: rgba(255, 59, 48, 0.12);
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

        .nr-workspace-head {
          padding: 0 2px;
          margin-bottom: 6px;
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

        .nr-field-shell {
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
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px 5px;
          text-align: left;
          touch-action: manipulation;
          min-height: 58px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(11, 41, 94, 0.93) 0%, rgba(8, 25, 66, 0.95) 100%);
          box-shadow: 0 6px 18px rgba(0, 212, 255, 0.22), 0 0 14px rgba(8, 145, 178, 0.2);
        }

        .nr-slot-filled.is-draggable {
          cursor: move;
          touch-action: none;
        }

        .nr-slot-filled.is-dragging {
          opacity: 0.75;
          z-index: 10;
        }

        .nr-picker-detail-hero img,
        .nr-catalog-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .nr-slot-filled-main {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .nr-slot-avatar-mini {
          width: clamp(36px, 4.6vw, 46px);
          height: clamp(36px, 4.6vw, 46px);
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          color: rgba(255, 255, 255, 0.85);
          flex-shrink: 0;
        }

        .nr-slot-avatar-mini img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          transform: scale(1.06);
          transform-origin: center top;
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }

        .nr-slot-role-chip {
          font-size: 9px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.05em;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.12);
          padding: 1px 7px;
          line-height: 1.3;
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
          top: -10px;
          right: -10px;
          width: 24px;
          height: 24px;
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
          z-index: 3;
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
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .nr-reserve-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(150px, 18vw, 190px), 1fr));
          gap: 10px;
        }

        .nr-reserve-card {
          position: relative;
          border-radius: 12px;
          border: 1px solid rgba(0, 212, 255, 0.16);
          background: linear-gradient(180deg, rgba(8, 16, 36, 0.9), rgba(7, 13, 30, 0.92));
          color: #fff;
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) auto auto;
          gap: 7px;
          align-items: center;
          text-align: left;
          width: 100%;
          min-height: 58px;
          padding: 6px;
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

        .nr-reserve-remove:hover {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(220, 38, 38, 0.6) 100%);
          transform: scale(1.15) rotate(90deg);
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
        }

        .nr-reserve-card-media {
          width: 32px;
          height: 42px;
        }

        .nr-reserve-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 9px;
        }

        .nr-reserve-card-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nr-reserve-card-copy strong {
          font-size: 10px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .nr-reserve-card-copy span {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.75);
        }

        .nr-reserve-card-ovr {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          line-height: 1;
        }

        .nr-reserve-card-ovr small {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.6);
          letter-spacing: 0.06em;
        }

        .nr-reserve-card-ovr strong {
          font-size: 12px;
          color: #fcd34d;
          text-shadow: 0 0 8px rgba(252, 211, 77, 0.25);
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

        .nr-catalog-card.selected {
          border-color: rgba(0, 212, 255, 0.75);
          background: rgba(0, 212, 255, 0.12);
        }

        .nr-catalog-card-media,
        .nr-picker-detail-hero img {
          width: 58px;
          height: 76px;
          flex-shrink: 0;
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

        .nr-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100200;
          background: rgba(7, 10, 20, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }

        .nr-modal-shell {
          width: min(1280px, calc(100vw - 24px));
          max-height: min(92vh, 920px);
          overflow: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 18px;
        }

        .nr-picker-body {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          gap: 18px;
        }

        .nr-picker-shell.reserve-mode .nr-picker-body {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
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
          width: 100%;
          border: 0;
          outline: none;
          background: transparent;
          color: #fff;
          font-size: 14px;
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

        .nr-reserve-inline-list,
        .nr-boosters-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .nr-booster-row {
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
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
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
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
          overflow: auto;
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
          grid-template-columns: minmax(0, 1fr) 62px;
          align-items: center;
          gap: 8px;
        }

        .nr-stat-compact-row span {
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.82);
        }

        .nr-stat-compact-input {
          height: 34px;
          padding: 4px 8px;
          text-align: center;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(9, 14, 30, 0.95);
          color: #fff;
          font-weight: 700;
        }

        .nr-stat-compact-input.tone-elite {
          border-color: rgba(64, 222, 122, 0.55);
          box-shadow: inset 0 0 0 1px rgba(64, 222, 122, 0.22);
          color: #8affb3;
        }

        .nr-stat-compact-input.tone-good {
          border-color: rgba(172, 222, 64, 0.5);
          box-shadow: inset 0 0 0 1px rgba(172, 222, 64, 0.2);
          color: #d9ff7e;
        }

        .nr-stat-compact-input.tone-ok {
          border-color: rgba(251, 191, 36, 0.52);
          box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.2);
          color: #ffd878;
        }

        .nr-stat-compact-input.tone-low {
          border-color: rgba(255, 83, 83, 0.52);
          box-shadow: inset 0 0 0 1px rgba(255, 83, 83, 0.22);
          color: #ff9a9a;
        }

        .nr-stat-compact-input.tone-neutral {
          border-color: rgba(255, 255, 255, 0.14);
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
            align-items: flex-end;
            justify-content: stretch;
            padding: 0;
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

          .nr-slot-card {
            width: min(104px, 27vw);
          }

          .nr-stats-grid,
          .nr-picker-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nr-modal-shell {
            width: 100%;
            max-height: 100dvh;
            border-radius: 18px 18px 0 0;
            align-self: flex-end;
            overflow-y: auto;
            padding: 12px;
            padding-bottom: max(132px, calc(env(safe-area-inset-bottom, 0px) + 116px));
          }

          .nr-quick-shell,
          .nr-picker-shell,
          .nr-premium-player-shell {
            padding-bottom: max(132px, calc(env(safe-area-inset-bottom, 0px) + 116px));
          }

          .nr-quick-body,
          .nr-picker-results,
          .nr-premium-sections {
            padding-bottom: 8px;
          }

          .nr-picker-shell.reserve-mode .nr-picker-body {
            grid-template-columns: 1fr;
          }

          .nr-premium-player-shell {
            max-height: 100dvh;
            padding-bottom: max(118px, calc(env(safe-area-inset-bottom, 0px) + 104px));
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

          .nr-modal-footer {
            position: static;
            margin: 12px 0 0;
            padding: 10px 0 max(96px, calc(env(safe-area-inset-bottom, 0px) + 84px));
            background: transparent;
          }

          .nr-inline-builder {
            grid-template-columns: 1fr;
          }

          .nr-booster-level-buttons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nr-reserve-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }

          .nr-reserve-card {
            grid-template-columns: 28px minmax(0, 1fr) auto;
            gap: 6px;
            padding: 6px;
            min-height: 54px;
            border-radius: 10px;
          }

          .nr-reserve-card-media {
            width: 28px;
            height: 38px;
          }

          .nr-reserve-card-copy strong {
            font-size: 10px;
          }

          .nr-reserve-card-copy span {
            font-size: 9px;
          }

          .nr-reserve-card-ovr small {
            font-size: 7px;
          }

          .nr-reserve-card-ovr strong {
            font-size: 11px;
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
