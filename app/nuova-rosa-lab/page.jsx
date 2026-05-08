'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import ConfirmModal from '@/components/ConfirmModal'
import ManualPlayerModal from '@/components/ManualPlayerModal'
import ManualBoostersModal from '@/components/ManualBoostersModal'
import TacticalSettingsPanel from '@/components/TacticalSettingsPanel'
import { safeJsonResponse } from '@/lib/fetchHelper'
import { mapErrorToUserMessage } from '@/lib/errorHelper'
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronRight,
  Gift,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Upload,
  User,
  Users,
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

function SlotPlayerCard({ player, slot, onClick, lang }) {
  const cardImage = player?.metadata?.catalog_card_front_url || null

  return (
    <button type="button" className="nr-slot-filled" onClick={() => onClick(player, slot)}>
      <div className="nr-slot-filled-media">
        {cardImage ? (
          <img src={cardImage} alt={player.player_name} />
        ) : (
          <div className="nr-slot-avatar-fallback">
            <User size={18} />
          </div>
        )}
      </div>
      <div className="nr-slot-filled-copy">
        <strong>{player.player_name}</strong>
        <span>{player.position || slot.position || '-'}</span>
        <em>{player.overall_rating ?? '-'}</em>
      </div>
    </button>
  )
}

function SlotCard({ slot, player, onEmptyClick, onPlayerClick, lang }) {
  return (
    <div className="nr-slot-card" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
      {player ? (
        <SlotPlayerCard player={player} slot={slot} onClick={onPlayerClick} lang={lang} />
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

function CatalogPickerModal({
  show,
  slot,
  searchQuery,
  onSearchChange,
  loading,
  suggested,
  results,
  selectedCard,
  onSelectCard,
  onClose,
  onConfirm,
  onManualFallback,
  onUploadFallback,
  lang
}) {
  if (!show || !slot) return null

  const compatibility = selectedCard ? getSlotCompatibility(slot.position, selectedCard.position) : 'unknown'

  return (
    <div className="nr-modal-backdrop" onClick={onClose}>
      <div className="nr-modal-shell nr-picker-shell" onClick={(event) => event.stopPropagation()}>
        <div className="nr-modal-header">
          <div>
            <span className="nr-mini-kicker">{lang === 'en' ? 'Slot target' : 'Slot target'}</span>
            <h2>{lang === 'en' ? 'Choose a player' : 'Scegli un giocatore'} · {slot.position}</h2>
            <p>
              {lang === 'en'
                ? 'We suggest cards that fit this slot, but you can choose any player.'
                : 'Ti suggeriamo carte adatte a questo slot, ma puoi scegliere qualsiasi giocatore.'}
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
            <section>
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
                      slotPosition={slot.position}
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
            </section>

            <section>
              <div className="nr-section-head">
                <h3>{lang === 'en' ? 'All results' : 'Tutti i risultati'}</h3>
              </div>
              <div className="nr-catalog-list">
                {loading ? (
                  <div className="nr-empty-state">{lang === 'en' ? 'Loading...' : 'Caricamento...'}</div>
                ) : results.length > 0 ? (
                  results.map((card) => (
                    <CatalogCard
                      key={card.id}
                      card={card}
                      slotPosition={slot.position}
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
                    <span>{lang === 'en' ? 'Fit' : 'Fit'}</span>
                    <strong>{compatibilityLabel(compatibility, lang)}</strong>
                  </div>
                </div>

                {compatibility === 'out_of_role' && (
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
                    {lang === 'en' ? 'Add to slot' : 'Aggiungi allo slot'}
                    <ArrowRight size={16} />
                  </button>
                  <div className="nr-secondary-actions">
                    <button type="button" className="nr-secondary-button" onClick={onManualFallback}>
                      {lang === 'en' ? 'Manual entry' : 'Inserimento manuale'}
                    </button>
                    <button type="button" className="nr-secondary-button" onClick={onUploadFallback}>
                      {lang === 'en' ? 'Upload from photos' : 'Carica da foto'}
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

function QuickPlayerPanel({ player, onClose, onRemoveFromSlot, onDeletePlayer, onOpenBoosters, onOpenReplace, lang }) {
  if (!player) return null
  const cardImage = player?.metadata?.catalog_card_front_url || null

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
            {player.slot_index !== null && player.slot_index !== undefined && (
              <button type="button" className="nr-secondary-button" onClick={() => onRemoveFromSlot(player.id)}>
                {lang === 'en' ? 'Move to reserves' : 'Sposta in riserva'}
              </button>
            )}
            <button type="button" className="nr-secondary-button" onClick={() => onOpenReplace(player)}>
              {lang === 'en' ? 'Replace' : 'Sostituisci'}
            </button>
            <button type="button" className="nr-secondary-button" onClick={() => onOpenBoosters(player)}>
              {lang === 'en' ? 'Edit boosters' : 'Modifica boosters'}
            </button>
            <button type="button" className="nr-danger-button" onClick={() => onDeletePlayer(player.id)}>
              <Trash2 size={14} />
              {lang === 'en' ? 'Delete player' : 'Elimina giocatore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RosterIntelligencePanel({ starters, reserves, layout, lang }) {
  const totalPlayers = starters.length + reserves.length
  const missingStarters = Math.max(0, 11 - starters.length)
  const offRolePlayers = starters.filter((player) => {
    const slotPosition = layout?.slot_positions?.[player.slot_index]?.position
    if (!slotPosition) return false
    const positions = Array.isArray(player.original_positions) ? player.original_positions : []
    if (positions.length === 0) return false
    return !positions.some((entry) => String(entry?.position || '').toUpperCase() === String(slotPosition).toUpperCase())
  })

  return (
    <section className="nr-card">
      <div className="nr-card-head">
        <div>
          <span className="nr-mini-kicker">{lang === 'en' ? 'Roster intelligence' : 'Rosa intelligence'}</span>
          <h2>{lang === 'en' ? 'Quick read' : 'Lettura rapida'}</h2>
        </div>
        <Brain size={18} />
      </div>
      <div className="nr-stats-grid">
        <div>
          <span>{lang === 'en' ? 'Players' : 'Giocatori'}</span>
          <strong>{totalPlayers}</strong>
        </div>
        <div>
          <span>{lang === 'en' ? 'Starters missing' : 'Titolari mancanti'}</span>
          <strong>{missingStarters}</strong>
        </div>
        <div>
          <span>{lang === 'en' ? 'Reserves' : 'Riserve'}</span>
          <strong>{reserves.length}</strong>
        </div>
        <div>
          <span>{lang === 'en' ? 'Out of role' : 'Fuori ruolo'}</span>
          <strong>{offRolePlayers.length}</strong>
        </div>
      </div>
    </section>
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
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [pickerLoading, setPickerLoading] = React.useState(false)
  const [pickerQuery, setPickerQuery] = React.useState('')
  const [pickerResults, setPickerResults] = React.useState([])
  const [pickerSuggested, setPickerSuggested] = React.useState([])
  const [selectedCatalogCard, setSelectedCatalogCard] = React.useState(null)
  const [confirmModal, setConfirmModal] = React.useState(null)
  const [showManualPlayerModal, setShowManualPlayerModal] = React.useState(false)
  const [showManualBoostersModal, setShowManualBoostersModal] = React.useState(false)
  const [manualBoosters, setManualBoosters] = React.useState([])
  const [manualBoostersPlayerId, setManualBoostersPlayerId] = React.useState(null)
  const [savingManualBoosters, setSavingManualBoosters] = React.useState(false)
  const [importingStarterPack, setImportingStarterPack] = React.useState(false)
  const [savingTacticalSettings, setSavingTacticalSettings] = React.useState(false)

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

      setLayout(data.layout || null)
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

  const loadCatalog = React.useCallback(async (slot, query = '') => {
    if (!slot) return
    setPickerLoading(true)
    try {
      let token = getTokenFallback()
      if (!token && supabase) {
        const { data: session } = await supabase.auth.getSession()
        token = session?.session?.access_token
      }
      if (!token) throw new Error(t('sessionExpired'))

      const params = new URLSearchParams({
        slot_position: String(slot.position || ''),
        q: query,
        limit: '24'
      })
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
    if (!pickerOpen || !selectedSlot) return
    const timer = window.setTimeout(() => {
      loadCatalog(selectedSlot, pickerQuery)
    }, 180)
    return () => window.clearTimeout(timer)
  }, [pickerOpen, selectedSlot, pickerQuery, loadCatalog])

  const openPickerForSlot = React.useCallback((slot) => {
    setSelectedSlot(slot)
    setSelectedCatalogCard(null)
    setPickerQuery('')
    setPickerOpen(true)
  }, [])

  const closePicker = React.useCallback(() => {
    setPickerOpen(false)
    setSelectedCatalogCard(null)
    setPickerQuery('')
  }, [])

  const handleOpenManualFallback = React.useCallback(() => {
    setPickerOpen(false)
    setShowManualPlayerModal(true)
  }, [])

  const handleUploadFallback = React.useCallback(() => {
    setPickerOpen(false)
    showToast(lang === 'en' ? 'Photo upload remains available in the legacy page for now.' : 'Il caricamento foto resta disponibile nella pagina legacy per ora.', 'warning')
  }, [lang, showToast])

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

  const handleRemoveFromSlot = React.useCallback(async (playerId) => {
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
      await safeJsonResponse(response, t('errorRemovalAfterDuplicate'))
      setSelectedPlayer(null)
      await fetchRoster()
      await refreshDiagnosticAfterSave()
      showToast(lang === 'en' ? 'Player moved to reserves.' : 'Giocatore spostato in riserva.', 'success')
    } catch (err) {
      console.error('[NuovaRosaLab] remove error:', err)
      const { message } = mapErrorToUserMessage(err, t('errorRemovalAfterDuplicate'), lang)
      showToast(message, 'error')
    }
  }, [fetchRoster, lang, refreshDiagnosticAfterSave, showToast, t])

  const handleDeletePlayer = React.useCallback((playerId) => {
    setConfirmModal({
      ...showConfirmConfig({
        title: t('duplicatePlayerTitle'),
        message: t('confirmDeletePlayer'),
        details: '',
        confirmLabel: t('delete'),
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
    const base = layout?.slot_positions && typeof layout.slot_positions === 'object'
      ? layout.slot_positions
      : {
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

    return Array.from({ length: 11 }, (_, index) => ({
      slot_index: index,
      x: Number(base?.[index]?.x ?? 50),
      y: Number(base?.[index]?.y ?? 50),
      position: base?.[index]?.position || '?'
    }))
  }, [layout])

  const startersBySlot = React.useMemo(() => {
    const map = new Map()
    titolari.forEach((player) => map.set(player.slot_index, player))
    return map
  }, [titolari])

  const stageCopy = React.useMemo(() => {
    const copy = {
      empty: {
        title: lang === 'en' ? 'Start your roster with real cards' : 'Inizia la rosa con carte reali',
        text: lang === 'en'
          ? 'Click a slot to open the catalog picker. You can still use manual entry or the starter pack.'
          : 'Clicca uno slot per aprire il picker catalogo. Puoi comunque usare inserimento manuale o starter pack.',
        cta: totalPlayers <= 5 ? (lang === 'en' ? 'Import starter pack' : 'Importa starter pack') : null
      },
      starter_seeded: {
        title: lang === 'en' ? 'You already have a base' : 'Hai gia una base',
        text: lang === 'en'
          ? 'Complete the missing slots faster with the catalog picker, then keep editing like the current roster page.'
          : 'Completa gli slot mancanti piu velocemente con il picker catalogo, poi continua a modificare come nella rosa attuale.',
        cta: totalPlayers <= 5 ? (lang === 'en' ? 'Complete missing players' : 'Completa i mancanti') : null
      },
      partial: {
        title: lang === 'en' ? 'Your roster is in progress' : 'La tua rosa e in costruzione',
        text: lang === 'en'
          ? 'Use the field to add starters, then refine reserves, tactics, and player details.'
          : 'Usa il campo per aggiungere titolari, poi rifinisci riserve, tattiche e dettagli giocatore.',
        cta: null
      },
      formation_ready: {
        title: lang === 'en' ? 'Formation ready' : 'Formazione pronta',
        text: lang === 'en'
          ? 'You have the starting eleven. Add coach and tactics for a more complete system read.'
          : 'Hai gli undici titolari. Aggiungi coach e tattiche per una lettura sistema piu completa.',
        cta: null
      },
      system_ready: {
        title: lang === 'en' ? 'System ready' : 'Sistema pronto',
        text: lang === 'en'
          ? 'Your roster, formation, and tactical context are aligned.'
          : 'Rosa, formazione e contesto tattico sono allineati.',
        cta: null
      }
    }
    return copy[setupStage] || copy.empty
  }, [lang, setupStage, totalPlayers])

  return (
    <main className="nr-page">
      <section className="nr-hero-card">
        <div className="nr-hero-copy">
          <span className="nr-badge"><ShieldCheck size={14} /> {lang === 'en' ? 'Private lab' : 'Lab privato'}</span>
          <h1>{lang === 'en' ? 'New Roster' : 'Nuova Rosa'}</h1>
          <p>{stageCopy.text}</p>
          <div className="nr-hero-actions">
            {stageCopy.cta && (
              <button type="button" className="nr-primary-button" onClick={handleImportStarterPack} disabled={importingStarterPack}>
                {importingStarterPack ? (lang === 'en' ? 'Importing...' : 'Importazione...') : stageCopy.cta}
                <Gift size={16} />
              </button>
            )}
            <button type="button" className="nr-secondary-button" onClick={() => router.push('/gestione-formazione')}>
              {lang === 'en' ? 'Open current roster page' : 'Apri la rosa attuale'}
            </button>
          </div>
        </div>
        <div className="nr-hero-side">
          <div className="nr-stage-pill"><Zap size={14} /> {stageCopy.title}</div>
          <div className="nr-stats-grid">
            <div>
              <span>{lang === 'en' ? 'Players' : 'Giocatori'}</span>
              <strong>{totalPlayers}</strong>
            </div>
            <div>
              <span>{lang === 'en' ? 'Starters' : 'Titolari'}</span>
              <strong>{titolari.length}</strong>
            </div>
            <div>
              <span>{lang === 'en' ? 'Formation' : 'Modulo'}</span>
              <strong>{layout?.formation || '-'}</strong>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="nr-card nr-empty-state">{lang === 'en' ? 'Loading roster...' : 'Caricamento rosa...'}</section>
      ) : error ? (
        <section className="nr-card nr-empty-state">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </section>
      ) : (
        <div className="nr-main-grid">
          <section className="nr-card">
            <div className="nr-card-head">
              <div>
                <span className="nr-mini-kicker">{lang === 'en' ? 'Formation workspace' : 'Workspace formazione'}</span>
                <h2>{layout?.formation || '4-3-3'}</h2>
              </div>
              <Users size={18} />
            </div>
            <div className="nr-field-shell">
              <div className="nr-field">
                {slots.map((slot) => (
                  <SlotCard
                    key={slot.slot_index}
                    slot={slot}
                    player={startersBySlot.get(slot.slot_index)}
                    onEmptyClick={openPickerForSlot}
                    onPlayerClick={(player) => setSelectedPlayer(player)}
                    lang={lang}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="nr-side-column">
            <section className="nr-card">
              <div className="nr-card-head">
                <div>
                  <span className="nr-mini-kicker">{lang === 'en' ? 'Reserves' : 'Riserve'}</span>
                  <h2>{riserve.length}</h2>
                </div>
                <button type="button" className="nr-icon-button" onClick={() => { setSelectedSlot(null); setShowManualPlayerModal(true) }}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="nr-bench-list">
                {riserve.length > 0 ? riserve.map((player) => (
                  <button key={player.id} type="button" className="nr-bench-item" onClick={() => setSelectedPlayer(player)}>
                    <div className="nr-bench-item-copy">
                      <strong>{player.player_name}</strong>
                      <span>{player.position || '-'} · OVR {player.overall_rating ?? '-'}</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                )) : (
                  <div className="nr-empty-state">
                    <span>{lang === 'en' ? 'No reserves yet.' : 'Nessuna riserva ancora.'}</span>
                  </div>
                )}
              </div>
            </section>

            <RosterIntelligencePanel starters={titolari} reserves={riserve} layout={layout} lang={lang} />

            <TacticalSettingsPanel
              titolari={titolari}
              tacticalSettings={tacticalSettings}
              onSave={handleSaveTacticalSettings}
              saving={savingTacticalSettings}
            />
          </section>
        </div>
      )}

      <CatalogPickerModal
        show={pickerOpen}
        slot={selectedSlot}
        searchQuery={pickerQuery}
        onSearchChange={setPickerQuery}
        loading={pickerLoading}
        suggested={pickerSuggested}
        results={pickerResults}
        selectedCard={selectedCatalogCard}
        onSelectCard={setSelectedCatalogCard}
        onClose={closePicker}
        onConfirm={handleSaveCatalogCardToSlot}
        onManualFallback={handleOpenManualFallback}
        onUploadFallback={handleUploadFallback}
        lang={lang}
      />

      <QuickPlayerPanel
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
        onRemoveFromSlot={handleRemoveFromSlot}
        onDeletePlayer={handleDeletePlayer}
        onOpenBoosters={(player) => {
          openManualBoostersForPlayer(player)
          setSelectedPlayer(null)
        }}
        onOpenReplace={(player) => {
          const slot = player?.slot_index != null ? slots.find((entry) => entry.slot_index === player.slot_index) : null
          setSelectedPlayer(null)
          if (slot) openPickerForSlot(slot)
        }}
        lang={lang}
      />

      <ManualPlayerModal
        show={showManualPlayerModal}
        onClose={() => setShowManualPlayerModal(false)}
        onSaved={async () => {
          await fetchRoster()
          await refreshDiagnosticAfterSave()
          setShowManualPlayerModal(false)
          showToast(lang === 'en' ? 'Player saved successfully.' : 'Giocatore salvato con successo.', 'success')
        }}
        slotIndex={selectedSlot?.slot_index ?? null}
      />

      {showManualBoostersModal && (
        <ManualBoostersModal
          boosters={manualBoosters}
          setBoosters={setManualBoosters}
          onClose={() => {
            setShowManualBoostersModal(false)
            setManualBoosters([])
            setManualBoostersPlayerId(null)
          }}
          onSave={saveManualBoostersForPlayer}
          saving={savingManualBoosters}
        />
      )}

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
        }

        .nr-card,
        .nr-hero-card,
        .nr-modal-shell {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background: linear-gradient(180deg, rgba(8, 12, 28, 0.96), rgba(5, 8, 20, 0.96));
          border-radius: 18px;
        }

        .nr-hero-card {
          padding: clamp(20px, 4vw, 30px);
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
          gap: 18px;
          margin-bottom: 22px;
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

        .nr-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.85fr);
          gap: 20px;
        }

        .nr-card {
          padding: 18px;
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
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(6, 10, 24, 0.78);
        }

        .nr-field {
          position: relative;
          min-height: 620px;
          background:
            radial-gradient(circle at center, rgba(30, 160, 90, 0.14), transparent 55%),
            linear-gradient(180deg, rgba(22, 106, 56, 0.35), rgba(10, 55, 28, 0.28));
        }

        .nr-field:before,
        .nr-field:after {
          content: '';
          position: absolute;
          inset: 24px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          pointer-events: none;
        }

        .nr-field:after {
          inset: 50% 24px auto 24px;
          height: 0;
          border-radius: 0;
        }

        .nr-slot-card {
          position: absolute;
          transform: translate(-50%, -50%);
          width: min(124px, 22vw);
          max-width: 124px;
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
          min-height: 92px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: rgba(0, 212, 255, 0.08);
        }

        .nr-slot-filled {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr);
          gap: 10px;
          padding: 8px;
          text-align: left;
        }

        .nr-slot-filled-media img,
        .nr-picker-detail-hero img,
        .nr-catalog-card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }

        .nr-slot-filled-media {
          width: 42px;
          height: 56px;
        }

        .nr-slot-filled-copy {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }

        .nr-slot-filled-copy strong,
        .nr-bench-item-copy strong,
        .nr-catalog-card-copy strong {
          font-size: 12px;
          line-height: 1.2;
        }

        .nr-slot-filled-copy span,
        .nr-slot-filled-copy em,
        .nr-bench-item-copy span,
        .nr-catalog-card-copy p,
        .nr-catalog-card-meta {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.75);
          font-style: normal;
        }

        .nr-side-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
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
        }

        .nr-modal-shell {
          width: min(1280px, calc(100vw - 24px));
          max-height: min(92vh, 920px);
          overflow: hidden;
          padding: 18px;
        }

        .nr-picker-body {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
          gap: 18px;
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
          .nr-main-grid,
          .nr-hero-card,
          .nr-picker-body {
            grid-template-columns: 1fr;
          }

          .nr-picker-results {
            max-height: none;
          }
        }

        @media (max-width: 768px) {
          .nr-page {
            padding: 14px;
          }

          .nr-field {
            min-height: 520px;
          }

          .nr-slot-card {
            width: min(106px, 27vw);
          }

          .nr-stats-grid,
          .nr-picker-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .nr-modal-shell {
            width: 100%;
            max-height: 96vh;
            border-radius: 18px 18px 0 0;
            align-self: flex-end;
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
