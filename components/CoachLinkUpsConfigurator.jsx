'use client'

import React from 'react'
import { createPortal } from 'react-dom'
import { Link2, X, Upload, Camera, Sparkles, Save, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
}

function requirement(side) {
  if (!side) return 'Non visibile'
  return [side.playing_style, side.position].filter(Boolean).join(' · ') || 'Non visibile'
}

export default function CoachLinkUpsConfigurator({ open, onClose }) {
  const [loading, setLoading] = React.useState(false)
  const [analysing, setAnalysing] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [coach, setCoach] = React.useState(null)
  const [plays, setPlays] = React.useState([])
  const [images, setImages] = React.useState([])
  const [error, setError] = React.useState('')
  const [success, setSuccess] = React.useState('')

  const load = React.useCallback(async () => {
    const auth = token()
    if (!auth) return setError('Sessione non disponibile. Accedi di nuovo.')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tactical/coach-link-ups?t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${auth}`, 'Cache-Control': 'no-store' }, cache: 'no-store'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossibile caricare i Collegamenti.')
      setCoach(data.active_coach || null)
      setPlays(Array.isArray(data.link_up_plays) ? data.link_up_plays : [])
    } catch (e) {
      setError(e.message || 'Errore caricamento.')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { if (open) load() }, [open, load])
  React.useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const addImage = async (file) => {
    if (!file || images.length >= 2) return
    if (!file.type?.startsWith('image/')) return setError('Seleziona un file immagine.')
    try {
      const optimized = await optimizeImageFile(file)
      setImages((current) => [...current, optimized.dataUrl].slice(0, 2))
      setError('')
      setSuccess('')
    } catch (e) {
      setError(e?.message || 'Impossibile preparare lo screenshot.')
    }
  }

  const analyse = async () => {
    const auth = token()
    if (!auth) return setError('Sessione non disponibile. Accedi di nuovo.')
    if (!images.length) return setError('Carica almeno uno screenshot del Collegamento.')
    setAnalysing(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/tactical/extract-coach-link-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ images })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Lettura non riuscita.')
      setPlays(Array.isArray(data.link_up_plays) ? data.link_up_plays : [])
      setSuccess(`Lettura completata: ${data.link_up_plays?.length || 0} Collegament${data.link_up_plays?.length === 1 ? 'o' : 'i'} trovato/i. Controlla e salva.`)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
    } catch (e) {
      setError(e.message || 'Lettura non riuscita.')
    } finally {
      setAnalysing(false)
    }
  }

  const save = async () => {
    const auth = token()
    if (!auth) return setError('Sessione non disponibile. Accedi di nuovo.')
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch('/api/tactical/coach-link-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ link_up_plays: plays, source: images.length ? 'user_screenshot_confirmed' : 'user_confirmed' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Salvataggio non riuscito.')
      setPlays(Array.isArray(data.link_up_plays) ? data.link_up_plays : [])
      setSuccess('Collegamenti salvati. Hero li valuterà separatamente in base ai tuoi 11 titolari.')
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
    } catch (e) {
      setError(e.message || 'Salvataggio non riuscito.')
    } finally {
      setSaving(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="lu-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <section className="lu-modal" role="dialog" aria-modal="true" aria-labelledby="lu-title">
        <header>
          <div>
            <span className="lu-kicker"><Link2 size={14} /> eFootball v6</span>
            <h2 id="lu-title">Collegamenti allenatore</h2>
            <p>Alcuni allenatori v6 possono avere due Link-up Play. Carica le schermate che mostrano i Collegamenti: Hero salverà soltanto ciò che è realmente visibile.</p>
          </div>
          <button className="lu-close" onClick={onClose} aria-label="Chiudi"><X size={20} /></button>
        </header>

        {error && <div className="lu-alert error"><AlertCircle size={17} />{error}</div>}
        {success && <div className="lu-alert success"><CheckCircle2 size={17} />{success}</div>}

        {loading ? <div className="lu-loading">Caricamento…</div> : !coach ? (
          <div className="lu-empty"><AlertCircle size={25} /><strong>Nessun allenatore attivo</strong><span>Imposta prima un allenatore attivo nella pagina Allenatori.</span></div>
        ) : (
          <>
            <div className="lu-coach"><span>Allenatore attivo</span><strong>{coach.coach_name}</strong></div>

            <div className="lu-upload-grid">
              {[0, 1].map((index) => (
                <div className="lu-upload" key={index}>
                  {images[index] ? (
                    <>
                      <img src={images[index]} alt={`Screenshot Collegamento ${index + 1}`} />
                      <button onClick={() => setImages((current) => current.filter((_, i) => i !== index))}><Trash2 size={14} /> Rimuovi</button>
                    </>
                  ) : (
                    <>
                      <div className="lu-upload-icon"><Camera size={24} /></div>
                      <strong>Schermata {index + 1}</strong>
                      <span>{index === 0 ? 'Collegamento visibile' : 'Secondo Collegamento, se presente'}</span>
                      <label>
                        <Upload size={15} /> Carica
                        <input type="file" accept="image/*" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = '' }} />
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="lu-cost"><Sparkles size={15} /> L'analisi delle 1-2 schermate avviene in una sola richiesta: <strong>2 HP</strong>.</div>
            <button className="lu-analyse" onClick={analyse} disabled={analysing || !images.length}><Sparkles size={17} />{analysing ? 'Hero sta leggendo…' : 'Leggi Collegamenti (2 HP)'}</button>

            <div className="lu-results">
              <div className="lu-results-head"><strong>Collegamenti salvabili</strong><span>{plays.length}/2</span></div>
              {!plays.length ? <p>Nessun Collegamento disponibile. Se il tuo allenatore non ne ha, non devi aggiungere nulla.</p> : plays.map((play, index) => (
                <article key={`${play.name}-${index}`}>
                  <div className="lu-number">{index + 1}</div>
                  <div>
                    <h3>{play.name || `Collegamento ${index + 1}`}</h3>
                    <dl>
                      <div><dt>Punto focale</dt><dd>{requirement(play.focal_point)}</dd></div>
                      <div><dt>Uomo chiave</dt><dd>{requirement(play.key_man)}</dd></div>
                    </dl>
                    {play.description && <p>{play.description}</p>}
                  </div>
                  <button className="lu-delete" onClick={() => setPlays((current) => current.filter((_, i) => i !== index))} aria-label="Rimuovi Collegamento"><Trash2 size={16} /></button>
                </article>
              ))}
            </div>

            <footer>
              <span>Il vecchio Collegamento resta compatibile. Se ne salvi due, Hero li analizzerà uno per uno e non inventerà che siano entrambi attivabili.</span>
              <button className="lu-save" onClick={save} disabled={saving || plays.length > 2}><Save size={17} />{saving ? 'Salvataggio…' : 'Salva Collegamenti'}</button>
            </footer>
          </>
        )}
      </section>

      <style jsx global>{`
        .lu-backdrop{position:fixed;inset:0;z-index:10060;background:rgba(1,5,14,.8);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;padding:18px}.lu-modal{width:min(860px,100%);max-height:94vh;overflow:auto;color:#fff;background:linear-gradient(160deg,#071225,#040814);border:1px solid rgba(0,212,255,.28);border-radius:22px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.58)}.lu-modal>header{display:flex;justify-content:space-between;gap:16px}.lu-modal h2{margin:5px 0;font-size:25px}.lu-modal header p{margin:0;max-width:680px;color:rgba(255,255,255,.68);line-height:1.55;font-size:13px}.lu-kicker{display:inline-flex;align-items:center;gap:6px;color:#56e8ff;text-transform:uppercase;font-size:11px;font-weight:900;letter-spacing:.1em}.lu-close{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.05);color:#fff;display:grid;place-items:center;cursor:pointer}.lu-alert{margin:15px 0;padding:11px 13px;border-radius:11px;display:flex;align-items:center;gap:8px;font-size:13px}.lu-alert.error{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3)}.lu-alert.success{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)}.lu-loading,.lu-empty{min-height:250px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:rgba(255,255,255,.7)}.lu-coach{margin:18px 0 12px;padding:12px 14px;border-radius:12px;background:rgba(0,212,255,.07);border:1px solid rgba(0,212,255,.17);display:flex;justify-content:space-between;gap:14px}.lu-coach span{color:rgba(255,255,255,.6);font-size:12px}.lu-upload-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lu-upload{min-height:190px;border:1px dashed rgba(0,212,255,.3);border-radius:15px;background:rgba(255,255,255,.025);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;overflow:hidden;position:relative}.lu-upload img{width:100%;height:160px;object-fit:contain;background:#020712}.lu-upload>span{font-size:11px;color:rgba(255,255,255,.55);text-align:center}.lu-upload-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:rgba(0,212,255,.1);color:#62e9ff}.lu-upload label,.lu-upload button{display:flex;align-items:center;gap:6px;padding:8px 11px;border-radius:9px;border:1px solid rgba(0,212,255,.25);background:rgba(0,212,255,.08);color:#fff;font-weight:700;font-size:12px;cursor:pointer}.lu-upload input{display:none}.lu-cost{margin:10px 0;display:flex;align-items:center;gap:7px;color:rgba(255,255,255,.6);font-size:11px}.lu-analyse{width:100%;min-height:44px;border-radius:11px;border:1px solid rgba(251,191,36,.3);background:rgba(251,191,36,.1);color:#ffd76a;font-weight:850;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.lu-analyse:disabled{opacity:.5;cursor:not-allowed}.lu-results{margin-top:18px}.lu-results-head{display:flex;justify-content:space-between;margin-bottom:8px}.lu-results-head span{font-size:12px;color:#65eaff}.lu-results>p{color:rgba(255,255,255,.55);font-size:12px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px}.lu-results article{display:grid;grid-template-columns:34px 1fr 36px;gap:10px;padding:13px;margin-top:8px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:rgba(255,255,255,.03)}.lu-number{width:30px;height:30px;border-radius:9px;background:rgba(0,212,255,.1);color:#65eaff;display:grid;place-items:center;font-weight:900}.lu-results h3{margin:2px 0 8px;font-size:15px}.lu-results dl{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0}.lu-results dl div{padding:7px 8px;background:rgba(255,255,255,.03);border-radius:8px}.lu-results dt{font-size:9px;text-transform:uppercase;color:rgba(255,255,255,.45);font-weight:800}.lu-results dd{margin:2px 0 0;font-size:11px}.lu-results article p{font-size:11px;color:rgba(255,255,255,.58);line-height:1.5;margin:8px 0 0}.lu-delete{border:0;background:transparent;color:rgba(255,255,255,.5);cursor:pointer}.lu-modal>footer{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08)}.lu-modal>footer span{max-width:550px;color:rgba(255,255,255,.5);font-size:11px;line-height:1.5}.lu-save{min-height:43px;padding:0 14px;border-radius:11px;border:1px solid rgba(0,212,255,.4);background:rgba(0,212,255,.14);color:#fff;font-weight:850;display:flex;align-items:center;gap:7px;cursor:pointer}.lu-save:disabled{opacity:.5}.lu-upload strong{font-size:13px}
        @media(max-width:640px){.lu-backdrop{padding:0;align-items:stretch}.lu-modal{height:100dvh;max-height:none;border-radius:0;padding:16px}.lu-upload-grid{grid-template-columns:1fr}.lu-upload{min-height:150px}.lu-upload img{height:130px}.lu-results dl{grid-template-columns:1fr}.lu-modal>footer{position:sticky;bottom:-16px;background:#050b18;padding:12px 0 16px;flex-direction:column;align-items:stretch}.lu-save{justify-content:center}}
      `}</style>
    </div>, document.body
  )
}
