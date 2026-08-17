'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Layers3, X, Save, RotateCcw, ShieldCheck, Swords, Copy, AlertCircle, CheckCircle2 } from 'lucide-react'

const POSITIONS = ['PT','DC','TD','TS','MED','CC','TRQ','CLD','CLS','EDA','ESA','SP','P']

function authToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
}

function cloneSlots(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function completeSlots(value) {
  const out = cloneSlots(value)
  for (let i = 0; i <= 10; i += 1) {
    if (!out[i] && out[String(i)]) out[i] = out[String(i)]
  }
  return out
}

function starterMap(players) {
  const map = {}
  for (const player of Array.isArray(players) ? players : []) {
    const slot = Number(player?.slot_index)
    if (Number.isInteger(slot) && slot >= 0 && slot <= 10) map[slot] = player
  }
  return map
}

function shortName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts[parts.length - 1].slice(0, 13)
}

function Pitch({ slots, playersBySlot, onMove, onRoleChange, disabled }) {
  const ref = React.useRef(null)
  const dragging = React.useRef(null)

  const placeFromEvent = React.useCallback((slot, event) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const clientX = event.clientX ?? event.touches?.[0]?.clientX
    const clientY = event.clientY ?? event.touches?.[0]?.clientY
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return
    const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100))
    onMove(slot, x, y)
  }, [onMove])

  const onPointerDown = (slot, event) => {
    if (disabled) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragging.current = slot
  }
  const onPointerMove = (slot, event) => {
    if (disabled || dragging.current !== slot) return
    placeFromEvent(slot, event)
  }
  const onPointerUp = (slot, event) => {
    if (disabled || dragging.current !== slot) return
    placeFromEvent(slot, event)
    dragging.current = null
  }

  return (
    <div className="ff-pitch" ref={ref} aria-label="Campo formazione">
      <div className="ff-half" />
      <div className="ff-circle" />
      <div className="ff-box ff-box-top" />
      <div className="ff-box ff-box-bottom" />
      {Array.from({ length: 11 }, (_, slot) => {
        const pos = slots?.[slot] || slots?.[String(slot)]
        if (!pos) return null
        const player = playersBySlot[slot]
        return (
          <div
            key={slot}
            className={`ff-player${disabled ? ' is-disabled' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onPointerDown={(e) => onPointerDown(slot, e)}
            onPointerMove={(e) => onPointerMove(slot, e)}
            onPointerUp={(e) => onPointerUp(slot, e)}
            onPointerCancel={() => { dragging.current = null }}
          >
            <strong>{shortName(player?.player_name)}</strong>
            <select
              value={pos.position || player?.position || ''}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => onRoleChange(slot, e.target.value)}
              disabled={disabled}
              aria-label={`Ruolo ${player?.player_name || slot}`}
            >
              {POSITIONS.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
        )
      })}
    </div>
  )
}

export default function FluidFormationConfigurator({ open, onClose }) {
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')
  const [enabled, setEnabled] = React.useState(false)
  const [phase, setPhase] = React.useState('attack')
  const [base, setBase] = React.useState(null)
  const [players, setPlayers] = React.useState([])
  const [draft, setDraft] = React.useState({ attack: null, defense: null })

  const playersBySlot = React.useMemo(() => starterMap(players), [players])
  const starterCount = Object.keys(playersBySlot).length

  const load = React.useCallback(async () => {
    const token = authToken()
    if (!token) {
      setError('Sessione non disponibile. Accedi di nuovo.')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-store' }
      const [formationRes, variantsRes] = await Promise.all([
        fetch(`/api/formation?t=${Date.now()}`, { headers, cache: 'no-store' }),
        fetch(`/api/tactical/formation-variants?t=${Date.now()}`, { headers, cache: 'no-store' })
      ])
      if (!formationRes.ok) throw new Error('Non riesco a caricare la Rosa.')
      if (!variantsRes.ok) throw new Error('Non riesco a caricare la Formazione fluida.')
      const formationData = await formationRes.json()
      const variantsData = await variantsRes.json()
      const baseLayout = formationData.layout || variantsData?.fluid_formation?.base || null
      setBase(baseLayout)
      setPlayers(Array.isArray(formationData.players) ? formationData.players : [])
      const fluid = variantsData.fluid_formation || {}
      const fallback = baseLayout ? {
        formation: baseLayout.formation || '4-3-3',
        slot_positions: completeSlots(baseLayout.slot_positions)
      } : null
      setEnabled(Boolean(fluid.enabled))
      setDraft({
        attack: fluid.attack ? { formation: fluid.attack.formation, slot_positions: completeSlots(fluid.attack.slot_positions) } : (fallback ? { ...fallback, slot_positions: cloneSlots(fallback.slot_positions) } : null),
        defense: fluid.defense ? { formation: fluid.defense.formation, slot_positions: completeSlots(fluid.defense.slot_positions) } : (fallback ? { ...fallback, slot_positions: cloneSlots(fallback.slot_positions) } : null)
      })
    } catch (e) {
      setError(e.message || 'Errore caricamento.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (open) load()
  }, [open, load])

  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const updatePhase = (updater) => {
    setDraft((current) => ({ ...current, [phase]: updater(current[phase]) }))
    setSuccess('')
  }

  const onMove = (slot, x, y) => updatePhase((current) => ({
    ...current,
    slot_positions: {
      ...current.slot_positions,
      [slot]: { ...current.slot_positions[slot], x, y }
    }
  }))

  const onRoleChange = (slot, position) => updatePhase((current) => ({
    ...current,
    slot_positions: {
      ...current.slot_positions,
      [slot]: { ...current.slot_positions[slot], position }
    }
  }))

  const copyBase = () => {
    if (!base) return
    updatePhase(() => ({ formation: base.formation, slot_positions: completeSlots(base.slot_positions) }))
  }

  const copyOther = () => {
    const source = phase === 'attack' ? draft.defense : draft.attack
    if (!source) return
    updatePhase(() => ({ formation: source.formation, slot_positions: cloneSlots(source.slot_positions) }))
  }

  const save = async () => {
    const token = authToken()
    if (!token) return setError('Sessione non disponibile. Accedi di nuovo.')
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/tactical/formation-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(enabled ? { enabled: true, attack: draft.attack, defense: draft.defense } : { enabled: false })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Salvataggio non riuscito.')
      setEnabled(Boolean(data?.fluid_formation?.enabled))
      setSuccess(enabled ? 'Formazione fluida salvata. Le Contromisure v6 useranno Attacco e Difesa.' : 'Formazione fluida disattivata. La configurazione resta conservata.')
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
    } catch (e) {
      setError(e.message || 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null
  const current = draft[phase]

  return createPortal(
    <div className="ff-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <section className="ff-modal" role="dialog" aria-modal="true" aria-labelledby="ff-title">
        <header>
          <div>
            <span className="ff-kicker"><Layers3 size={14} /> eFootball v6</span>
            <h2 id="ff-title">Formazione fluida</h2>
            <p>Configura come gli stessi 11 titolari si dispongono quando attacchi e quando difendi. La tua formazione normale non viene modificata.</p>
          </div>
          <button className="ff-icon" onClick={onClose} aria-label="Chiudi"><X size={20} /></button>
        </header>

        {error && <div className="ff-alert error"><AlertCircle size={17} />{error}</div>}
        {success && <div className="ff-alert success"><CheckCircle2 size={17} />{success}</div>}

        {loading ? (
          <div className="ff-loading">Caricamento configurazione…</div>
        ) : !base || starterCount < 11 ? (
          <div className="ff-empty">
            <AlertCircle size={28} />
            <strong>Completa prima la formazione principale</strong>
            <p>Servono una formazione salvata e 11 titolari. La Formazione fluida non crea una seconda Rosa: usa gli stessi giocatori.</p>
          </div>
        ) : (
          <>
            <div className="ff-switch-row">
              <div>
                <strong>La usi in eFootball?</strong>
                <span>Se no, Hero continuerà a usare la formazione normale.</span>
              </div>
              <button
                type="button"
                className={`ff-toggle ${enabled ? 'on' : ''}`}
                onClick={() => { setEnabled((v) => !v); setSuccess('') }}
                aria-pressed={enabled}
              ><span /></button>
            </div>

            <div className={`ff-editor ${enabled ? '' : 'disabled'}`}>
              <div className="ff-tabs" role="tablist">
                <button className={phase === 'attack' ? 'active' : ''} onClick={() => setPhase('attack')} role="tab" aria-selected={phase === 'attack'}><Swords size={16} /> Attacco</button>
                <button className={phase === 'defense' ? 'active' : ''} onClick={() => setPhase('defense')} role="tab" aria-selected={phase === 'defense'}><ShieldCheck size={16} /> Difesa</button>
              </div>

              {current && (
                <>
                  <div className="ff-toolbar">
                    <label>Modulo <input value={current.formation || ''} onChange={(e) => updatePhase((v) => ({ ...v, formation: e.target.value }))} disabled={!enabled} maxLength={50} /></label>
                    <button onClick={copyBase} disabled={!enabled}><RotateCcw size={15} /> Copia base</button>
                    <button onClick={copyOther} disabled={!enabled}><Copy size={15} /> Copia {phase === 'attack' ? 'Difesa' : 'Attacco'}</button>
                  </div>
                  <div className="ff-help">Trascina i giocatori nella posizione che usi nel Game Plan e imposta il ruolo mostrato in quella fase. Non cambia chi è titolare.</div>
                  <Pitch slots={current.slot_positions} playersBySlot={playersBySlot} onMove={onMove} onRoleChange={onRoleChange} disabled={!enabled} />
                </>
              )}
            </div>

            <footer>
              <span>{enabled ? 'Le due fasi vengono usate nelle Contromisure v6. La formazione principale resta il riferimento per il resto dell’app.' : 'Disattivando non cancelliamo la configurazione: puoi riattivarla in seguito.'}</span>
              <button className="ff-save" onClick={save} disabled={saving || (enabled && (!draft.attack || !draft.defense))}><Save size={17} />{saving ? 'Salvataggio…' : 'Salva'}</button>
            </footer>
          </>
        )}
      </section>

      <style jsx global>{`
        .ff-backdrop{position:fixed;inset:0;z-index:10050;background:rgba(1,5,14,.78);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:18px}
        .ff-modal{width:min(980px,100%);max-height:min(920px,94vh);overflow:auto;background:linear-gradient(160deg,#071225,#040814);border:1px solid rgba(0,212,255,.28);border-radius:22px;box-shadow:0 30px 90px rgba(0,0,0,.55);color:#fff;padding:22px}
        .ff-modal>header{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.ff-modal h2{margin:5px 0 5px;font-size:26px}.ff-modal header p{margin:0;max-width:720px;color:rgba(255,255,255,.7);line-height:1.55;font-size:14px}.ff-kicker{display:inline-flex;align-items:center;gap:6px;color:#56e8ff;text-transform:uppercase;font-weight:800;font-size:11px;letter-spacing:.1em}.ff-icon{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#fff;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;cursor:pointer}
        .ff-alert{display:flex;align-items:center;gap:8px;margin:16px 0;padding:11px 13px;border-radius:11px;font-size:13px}.ff-alert.error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3)}.ff-alert.success{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)}
        .ff-loading,.ff-empty{min-height:260px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;text-align:center;color:rgba(255,255,255,.78)}.ff-empty p{max-width:540px;margin:0;font-size:13px;line-height:1.6}
        .ff-switch-row{display:flex;justify-content:space-between;align-items:center;gap:18px;margin:18px 0;padding:14px 16px;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}.ff-switch-row div{display:flex;flex-direction:column;gap:3px}.ff-switch-row span{color:rgba(255,255,255,.58);font-size:12px}.ff-toggle{width:54px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:#192235;padding:3px;cursor:pointer;flex:0 0 auto}.ff-toggle span{display:block;width:22px;height:22px;border-radius:50%;background:#98a3b7;transition:.2s}.ff-toggle.on{background:rgba(0,212,255,.25);border-color:rgba(0,212,255,.55)}.ff-toggle.on span{transform:translateX(23px);background:#53e8ff}
        .ff-editor.disabled{opacity:.48;filter:saturate(.6)}.ff-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}.ff-tabs button{min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.ff-tabs button.active{border-color:rgba(0,212,255,.55);background:rgba(0,212,255,.12);color:#71ecff}
        .ff-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:8px}.ff-toolbar label{display:flex;flex-direction:column;gap:5px;font-size:11px;color:rgba(255,255,255,.65);font-weight:700}.ff-toolbar input{height:36px;width:120px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:#0b1528;color:#fff;padding:0 10px;font-weight:700}.ff-toolbar button{height:36px;border-radius:9px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.05);color:#fff;padding:0 11px;display:flex;align-items:center;gap:6px;cursor:pointer}.ff-toolbar button:disabled,.ff-toolbar input:disabled{cursor:not-allowed}.ff-help{font-size:12px;color:rgba(255,255,255,.58);margin:0 0 10px;line-height:1.5}
        .ff-pitch{position:relative;width:100%;height:min(580px,62vh);min-height:430px;border-radius:18px;overflow:hidden;touch-action:none;background:linear-gradient(180deg,rgba(16,116,72,.82),rgba(8,75,51,.9));border:1px solid rgba(255,255,255,.15);box-shadow:inset 0 0 55px rgba(0,0,0,.22)}.ff-pitch:before{content:'';position:absolute;inset:4%;border:1px solid rgba(255,255,255,.38);pointer-events:none}.ff-half{position:absolute;left:4%;right:4%;top:50%;border-top:1px solid rgba(255,255,255,.38)}.ff-circle{position:absolute;width:16%;aspect-ratio:1;border:1px solid rgba(255,255,255,.38);border-radius:50%;left:42%;top:50%;transform:translateY(-50%)}.ff-box{position:absolute;left:31%;width:38%;height:15%;border:1px solid rgba(255,255,255,.34)}.ff-box-top{top:4%;border-top:0}.ff-box-bottom{bottom:4%;border-bottom:0}
        .ff-player{position:absolute;transform:translate(-50%,-50%);width:92px;min-height:48px;padding:5px;border-radius:12px;background:linear-gradient(145deg,rgba(4,12,25,.96),rgba(8,30,48,.94));border:1px solid rgba(0,212,255,.46);box-shadow:0 6px 18px rgba(0,0,0,.32);display:flex;flex-direction:column;align-items:center;gap:3px;cursor:grab;user-select:none;touch-action:none;z-index:2}.ff-player:active{cursor:grabbing}.ff-player strong{font-size:10px;max-width:82px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ff-player select{width:56px;height:20px;border:0;border-radius:5px;background:#122137;color:#71ecff;font-size:9px;text-align:center}.ff-player.is-disabled{cursor:default}
        .ff-modal>footer{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.ff-modal>footer>span{font-size:11px;color:rgba(255,255,255,.55);max-width:620px;line-height:1.5}.ff-save{min-width:130px;height:44px;border:1px solid rgba(0,212,255,.48);border-radius:12px;background:linear-gradient(135deg,rgba(0,212,255,.24),rgba(77,70,229,.24));color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.ff-save:disabled{opacity:.55;cursor:wait}
        @media(max-width:640px){.ff-backdrop{padding:0;align-items:stretch}.ff-modal{max-height:none;height:100dvh;border-radius:0;padding:16px}.ff-modal h2{font-size:22px}.ff-pitch{height:56vh;min-height:430px}.ff-player{width:74px;min-height:43px}.ff-player strong{font-size:9px;max-width:66px}.ff-modal>footer{position:sticky;bottom:-16px;background:#050b18;padding:12px 0 16px;z-index:5;flex-direction:column;align-items:stretch}.ff-save{width:100%}}
      `}</style>
    </div>, document.body
  )
}
