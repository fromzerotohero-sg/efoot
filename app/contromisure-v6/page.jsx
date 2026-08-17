'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Camera, X, Shield, Swords, Brain, Sparkles, CheckCircle2, AlertCircle, Link2, Target } from 'lucide-react'
import { withAuth } from '@/components/AuthWrapper'
import { optimizeImageFile } from '@/lib/imageUploadOptimizer'

const QUALITY_LABELS = { high: 'Alta', medium: 'Media', low: 'Bassa' }
const SLOT_LABELS = {
  attacco_1: 'Attacco 1',
  attacco_2: 'Attacco 2',
  difesa_1: 'Difesa 1',
  difesa_2: 'Difesa 2'
}
const INSTRUCTION_LABELS = {
  difensivo: 'Difensivo',
  ancoraggio: 'Ancoraggio',
  marcatura_stretta: 'Marcatura stretta',
  marcatura_uomo: 'Marcatura uomo',
  contropiede: 'Contropiede'
}

function token() {
  return typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
}

async function optimizedData(file) {
  if (!file) return null
  const result = await optimizeImageFile(file)
  return result.dataUrl
}

function UploadCard({ title, subtitle, image, onFile, onClear, required }) {
  const inputId = `v6-${title.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section className="v6-upload-card">
      <div className="v6-upload-label">
        <div>{title}</div>
        <span>{required ? 'Necessaria' : 'Opzionale'}</span>
      </div>
      <p>{subtitle}</p>
      {image ? (
        <div className="v6-preview">
          <img src={image} alt={`Formazione ${title}`} />
          <button onClick={onClear}><X size={15} /> Rimuovi</button>
        </div>
      ) : (
        <label htmlFor={inputId} className="v6-drop">
          <Camera size={25} />
          <strong>Carica screenshot</strong>
          <span>PNG/JPG nitido della schermata formazione</span>
          <div><Upload size={15} /> Seleziona immagine</div>
          <input id={inputId} type="file" accept="image/*" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      )}
    </section>
  )
}

function PhaseCard({ icon, title, data }) {
  if (!data) return null
  return (
    <article className="v6-phase-card">
      <div className="v6-phase-title">{icon}<strong>{title}</strong></div>
      <div className="v6-phase-module">{data.formation || 'Modulo non letto'}</div>
      <div className="v6-phase-meta">
        {data.playing_style && <span>{data.playing_style}</span>}
        {data.overall_strength && <span>Forza {data.overall_strength}</span>}
        {Array.isArray(data.players) && <span>{data.players.length}/11 giocatori letti</span>}
      </div>
    </article>
  )
}

function DecisionLabel({ value }) {
  const map = {
    keep_current: 'MANTIENI LA TUA CONFIGURAZIONE',
    use: 'USA FORMAZIONE FLUIDA',
    modify_attack: 'MODIFICA LA FASE DI ATTACCO',
    modify_defense: 'MODIFICA LA FASE DIFENSIVA',
    disable: 'DISATTIVA FORMAZIONE FLUIDA',
    not_needed: 'NON SERVE FORMAZIONE FLUIDA',
    insufficient_data: 'SERVONO PIÙ DATI'
  }
  return <span className={`v6-decision ${value || 'insufficient_data'}`}>{map[value] || map.insufficient_data}</span>
}

function CountermeasuresV6Page() {
  const router = useRouter()
  const [attackImage, setAttackImage] = React.useState(null)
  const [defenseImage, setDefenseImage] = React.useState(null)
  const [extracting, setExtracting] = React.useState(false)
  const [generating, setGenerating] = React.useState(false)
  const [phaseData, setPhaseData] = React.useState(null)
  const [opponentId, setOpponentId] = React.useState(null)
  const [result, setResult] = React.useState(null)
  const [error, setError] = React.useState('')

  const addFile = async (file, setter) => {
    try {
      setError('')
      setter(await optimizedData(file))
      setPhaseData(null)
      setOpponentId(null)
      setResult(null)
    } catch (e) {
      setError(e?.message || 'Impossibile preparare lo screenshot.')
    }
  }

  const analyse = async () => {
    const auth = token()
    if (!auth) return setError('Sessione non disponibile. Accedi di nuovo.')
    if (!attackImage) return setError('Carica la formazione avversaria in Attacco.')
    setExtracting(true)
    setError('')
    setResult(null)
    try {
      const extractRes = await fetch('/api/tactical/extract-opponent-phases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ attackImageDataUrl: attackImage, defenseImageDataUrl: defenseImage || null })
      })
      const extracted = await extractRes.json().catch(() => ({}))
      if (!extractRes.ok) throw new Error(extracted.error || 'Impossibile leggere la formazione.')
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))

      const phases = extracted.phases
      const attack = phases?.attack
      if (!attack) throw new Error('La fase di Attacco non è stata letta.')

      const saveRes = await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({
          formation_name: attack.formation || null,
          playing_style: attack.playing_style || null,
          formation_image: null,
          is_pre_match: true,
          extracted_data: {
            formation: attack.formation,
            playing_style: attack.playing_style,
            tactical_style: attack.tactical_style,
            overall_strength: attack.overall_strength,
            players: attack.players,
            slot_positions: attack.slot_positions,
            coach: attack.coach || null,
            visual_tactical_profile: attack.visual_tactical_profile || null,
            fluid_formation: {
              attack: phases.attack,
              defense: phases.defense,
              fluid_detected: phases.fluid_detected,
              movement_summary: phases.movement_summary || []
            },
            source_version: 'v6.0.0'
          }
        })
      })
      const saved = await saveRes.json().catch(() => ({}))
      if (!saveRes.ok || !saved?.formation?.id) throw new Error(saved.error || 'Impossibile salvare la lettura avversaria.')

      setPhaseData(phases)
      setOpponentId(saved.formation.id)
    } catch (e) {
      setError(e.message || 'Analisi non riuscita.')
    } finally {
      setExtracting(false)
    }
  }

  const generate = async () => {
    const auth = token()
    if (!auth) return setError('Sessione non disponibile. Accedi di nuovo.')
    if (!opponentId) return setError('Analizza prima la formazione avversaria.')
    setGenerating(true)
    setError('')
    try {
      const res = await fetch('/api/tactical/generate-v6-countermeasures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth}` },
        body: JSON.stringify({ opponent_formation_id: opponentId, language: 'it' })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossibile generare il piano partita.')
      setResult(data.countermeasures)
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('credits-consumed'))
    } catch (e) {
      setError(e.message || 'Generazione non riuscita.')
    } finally {
      setGenerating(false)
    }
  }

  const reset = () => {
    setAttackImage(null); setDefenseImage(null); setPhaseData(null); setOpponentId(null); setResult(null); setError('')
  }

  return (
    <main className="v6-counter-page">
      <div className="v6-counter-head">
        <button onClick={() => router.push('/contromisure-pre-partita')}><ArrowLeft size={17} /> Indietro</button>
        <div>
          <span>eFootball v6</span>
          <h1>Contromisure v6</h1>
          <p>Hero confronta il tuo Attacco con la Difesa avversaria e l'Attacco avversario con la tua Difesa.</p>
        </div>
        <div className="v6-head-badge"><Shield size={18} /> Piano partita</div>
      </div>

      {error && <div className="v6-error"><AlertCircle size={17} />{error}</div>}

      {!phaseData && (
        <>
          <div className="v6-explain">
            <div><strong>1</strong><span>Attacco avversario</span><p>Carica sempre la schermata che nel Game Plan usi come fase offensiva.</p></div>
            <div><strong>2</strong><span>Difesa avversaria</span><p>Se usa Formazione fluida, aggiungi anche la schermata della fase difensiva.</p></div>
            <div><strong>3</strong><span>Hero incrocia le fasi</span><p>Se tu hai salvato la Formazione fluida in Rosa, Hero usa anche le tue due configurazioni.</p></div>
          </div>
          <div className="v6-upload-grid">
            <UploadCard title="Attacco" required image={attackImage} subtitle="Come si dispone l’avversario quando ha il possesso." onFile={(file) => addFile(file, setAttackImage)} onClear={() => setAttackImage(null)} />
            <UploadCard title="Difesa" image={defenseImage} subtitle="Aggiungila solo se l’avversario usa una disposizione diversa senza possesso." onFile={(file) => addFile(file, setDefenseImage)} onClear={() => setDefenseImage(null)} />
          </div>
          <div className="v6-cost-row"><Sparkles size={15} /><span>Lettura di 1 o 2 schermate in una sola analisi: <strong>2 HP</strong>.</span></div>
          <button className="v6-primary" disabled={!attackImage || extracting} onClick={analyse}><Brain size={18} />{extracting ? 'Hero sta leggendo le fasi…' : 'Analizza formazioni (2 HP)'}</button>
        </>
      )}

      {phaseData && !result && (
        <section className="v6-review">
          <div className="v6-review-title"><CheckCircle2 size={21} /><div><strong>Formazioni lette</strong><span>Controlla le due fasi prima di generare il piano.</span></div></div>
          <div className="v6-phase-grid">
            <PhaseCard icon={<Swords size={17} />} title="Avversario in Attacco" data={phaseData.attack} />
            {phaseData.defense ? <PhaseCard icon={<Shield size={17} />} title="Avversario in Difesa" data={phaseData.defense} /> : <article className="v6-phase-card muted"><Shield size={18} /><strong>Difesa non fornita</strong><p>Hero non la inventerà: analizzerà il piano con la sola fase disponibile.</p></article>}
          </div>
          {phaseData.defense && (
            <div className="v6-fluid-detect">
              <Target size={17} />
              {phaseData.fluid_detected === true ? 'Le due schermate mostrano una variazione di struttura.' : phaseData.fluid_detected === false ? 'Le due strutture risultano molto simili: Hero non le considererà una variazione di Formazione fluida.' : 'Non è possibile stabilire con certezza se la disposizione cambia tra le due fasi.'}
            </div>
          )}
          <div className="v6-review-actions">
            <button className="v6-secondary" onClick={reset}>Ricomincia</button>
            <button className="v6-primary compact" onClick={generate} disabled={generating}><Brain size={18} />{generating ? 'Hero prepara il piano…' : 'Genera piano v6 (2 HP)'}</button>
          </div>
        </section>
      )}

      {result && (
        <section className="v6-results">
          <div className="v6-result-hero">
            <div><span>Decisione Hero</span><DecisionLabel value={result.fluid_formation_recommendation?.decision} /></div>
            <h2>{result.fluid_formation_recommendation?.title || 'Piano partita'}</h2>
            <p>{result.fluid_formation_recommendation?.reason}</p>
            <div className="v6-actions-grid">
              <div><Swords size={17} /><strong>Quando attacchi</strong><p>{result.fluid_formation_recommendation?.attack_action || result.play_summary?.attacking}</p></div>
              <div><Shield size={17} /><strong>Quando difendi</strong><p>{result.fluid_formation_recommendation?.defense_action || result.play_summary?.defending}</p></div>
            </div>
          </div>

          <div className="v6-two-col">
            <article className="v6-result-card"><h3>Tu attacchi ↔ lui difende</h3><p>{result.analysis?.client_attack_vs_opponent_defense}</p></article>
            <article className="v6-result-card"><h3>Lui attacca ↔ tu difendi</h3><p>{result.analysis?.opponent_attack_vs_client_defense}</p></article>
          </div>

          {(result.analysis?.key_risks?.length > 0 || result.analysis?.key_opportunities?.length > 0) && (
            <div className="v6-two-col">
              <article className="v6-result-card"><h3>Rischi principali</h3><ul>{result.analysis.key_risks.map((x, i) => <li key={i}>{x}</li>)}</ul></article>
              <article className="v6-result-card"><h3>Spazi da sfruttare</h3><ul>{result.analysis.key_opportunities.map((x, i) => <li key={i}>{x}</li>)}</ul></article>
            </div>
          )}

          {result.link_up_recommendations?.length > 0 && (
            <article className="v6-result-card"><h3><Link2 size={18} /> Collegamenti allenatore</h3><div className="v6-link-list">{result.link_up_recommendations.map((item, i) => <div key={i}><strong>{item.name}</strong><span>{item.decision === 'use' ? 'USA' : item.decision === 'do_not_use' ? 'NON USARE' : 'NON ATTIVABILE'}</span><p>{[item.focal_player && `Punto focale: ${item.focal_player}`, item.key_man_player && `Uomo chiave: ${item.key_man_player}`].filter(Boolean).join(' · ')}</p><em>{item.reason}</em></div>)}</div></article>
          )}

          {result.individual_instructions?.length > 0 && (
            <article className="v6-result-card"><h3>Istruzioni individuali</h3><div className="v6-instructions">{result.individual_instructions.map((item, i) => <div key={i}><strong>{item.player_name}</strong><span>{SLOT_LABELS[item.slot] || item.slot} · {INSTRUCTION_LABELS[item.instruction] || item.instruction}</span><p>{item.reason}</p></div>)}</div></article>
          )}

          <article className="v6-result-card key"><h3>Come giocarla</h3><p><strong>Chiave:</strong> {result.play_summary?.match_key}</p><p><strong>Attacco:</strong> {result.play_summary?.attacking}</p><p><strong>Difesa:</strong> {result.play_summary?.defending}</p><p><strong>Evita:</strong> {result.play_summary?.avoid}</p></article>

          <div className="v6-confidence"><span>Qualità dati: <strong>{QUALITY_LABELS[result.data_quality] || 'Media'}</strong></span><span>Confidenza: <strong>{result.confidence}%</strong></span></div>
          <button className="v6-secondary full" onClick={reset}>Prepara un altro avversario</button>
        </section>
      )}

      <style jsx>{`
        :global(body:has(.v6-counter-page)){background:radial-gradient(circle at 12% 5%,rgba(0,212,255,.18),transparent 28%),radial-gradient(circle at 88% 12%,rgba(99,102,241,.2),transparent 30%),linear-gradient(135deg,#020510,#061226 45%,#030712)!important}.v6-counter-page{width:min(1120px,100%);margin:0 auto;padding:28px clamp(14px,4vw,26px) 80px;color:#fff}.v6-counter-head{display:grid;grid-template-columns:auto 1fr auto;gap:16px;align-items:start;margin-bottom:20px;padding:18px;border-radius:18px;border:1px solid rgba(0,212,255,.2);background:rgba(4,11,24,.75);backdrop-filter:blur(12px)}.v6-counter-head>button{height:40px;border-radius:11px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;display:flex;align-items:center;gap:6px;padding:0 11px;cursor:pointer}.v6-counter-head span{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#67eaff;font-weight:900}.v6-counter-head h1{margin:3px 0 4px;font-size:clamp(23px,4vw,32px)}.v6-counter-head p{margin:0;color:rgba(255,255,255,.62);font-size:13px;line-height:1.5}.v6-head-badge{display:flex;gap:7px;align-items:center;color:#ffd76a;font-size:11px;font-weight:800;border:1px solid rgba(251,191,36,.2);background:rgba(251,191,36,.07);padding:9px 11px;border-radius:10px}.v6-error{display:flex;align-items:center;gap:8px;padding:12px 14px;margin-bottom:14px;border:1px solid rgba(239,68,68,.32);background:rgba(239,68,68,.12);border-radius:12px;font-size:13px}.v6-explain{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px}.v6-explain>div{padding:12px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.025);border-radius:13px}.v6-explain strong{width:24px;height:24px;display:grid;place-items:center;border-radius:7px;background:rgba(0,212,255,.1);color:#65eaff;float:left;margin-right:8px}.v6-explain span{font-size:12px;font-weight:800}.v6-explain p{clear:both;padding-top:7px;margin:0;color:rgba(255,255,255,.52);font-size:10px;line-height:1.45}.v6-upload-grid,.v6-phase-grid,.v6-two-col,.v6-actions-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.v6-upload-card{padding:14px;border-radius:16px;border:1px solid rgba(0,212,255,.16);background:rgba(4,12,26,.7)}.v6-upload-label{display:flex;justify-content:space-between;align-items:center}.v6-upload-label div{font-weight:850}.v6-upload-label span{font-size:9px;text-transform:uppercase;color:#65eaff}.v6-upload-card>p{font-size:11px;color:rgba(255,255,255,.55);margin:4px 0 10px}.v6-drop{min-height:250px;border:1px dashed rgba(0,212,255,.35);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;background:radial-gradient(circle,rgba(0,212,255,.08),transparent 60%);cursor:pointer}.v6-drop>span{font-size:10px;color:rgba(255,255,255,.48)}.v6-drop>div{margin-top:8px;padding:8px 10px;display:flex;gap:6px;align-items:center;border-radius:9px;background:rgba(0,212,255,.1);font-size:11px;font-weight:800}.v6-drop input{display:none}.v6-preview{min-height:250px;display:flex;flex-direction:column;gap:8px}.v6-preview img{width:100%;height:220px;object-fit:contain;border-radius:12px;background:#020711}.v6-preview button{align-self:end;border:0;background:transparent;color:rgba(255,255,255,.6);display:flex;gap:5px;align-items:center;cursor:pointer}.v6-cost-row{display:flex;align-items:center;justify-content:center;gap:7px;margin:12px;color:rgba(255,255,255,.6);font-size:11px}.v6-primary,.v6-secondary{min-height:48px;border-radius:12px;font-weight:850;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.v6-primary{width:100%;border:1px solid rgba(0,212,255,.4);background:linear-gradient(135deg,rgba(0,212,255,.19),rgba(79,70,229,.2));color:#fff}.v6-primary:disabled{opacity:.5;cursor:wait}.v6-primary.compact{width:auto;padding:0 18px}.v6-secondary{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;padding:0 16px}.v6-secondary.full{width:100%;margin-top:12px}.v6-review,.v6-results{display:flex;flex-direction:column;gap:12px}.v6-review-title{display:flex;align-items:center;gap:10px;color:#65eaff}.v6-review-title div{display:flex;flex-direction:column}.v6-review-title span{font-size:10px;color:rgba(255,255,255,.5)}.v6-phase-card,.v6-result-card,.v6-result-hero{border:1px solid rgba(0,212,255,.16);background:rgba(4,12,26,.74);border-radius:15px;padding:14px}.v6-phase-card.muted{display:flex;flex-direction:column;justify-content:center;align-items:center;color:rgba(255,255,255,.52);min-height:120px}.v6-phase-card.muted p{font-size:10px;text-align:center;max-width:340px}.v6-phase-title{display:flex;align-items:center;gap:7px;color:#65eaff;font-size:11px}.v6-phase-module{font-size:28px;font-weight:900;margin:8px 0}.v6-phase-meta{display:flex;gap:6px;flex-wrap:wrap}.v6-phase-meta span{font-size:9px;padding:5px 7px;border-radius:7px;background:rgba(255,255,255,.05);color:rgba(255,255,255,.64)}.v6-fluid-detect{padding:10px 12px;border-radius:11px;background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.18);display:flex;align-items:center;gap:8px;color:rgba(255,255,255,.7);font-size:11px}.v6-review-actions{display:flex;justify-content:flex-end;gap:8px}.v6-result-hero{padding:20px;border-color:rgba(251,191,36,.2);background:linear-gradient(135deg,rgba(251,191,36,.07),rgba(0,212,255,.06),rgba(4,12,26,.82))}.v6-result-hero>div:first-child{display:flex;justify-content:space-between;gap:10px;align-items:center}.v6-result-hero>div:first-child>span:first-child{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.5);font-weight:900}.v6-decision{font-size:9px;font-weight:950;letter-spacing:.07em;padding:6px 8px;border-radius:8px;background:rgba(0,212,255,.1);color:#65eaff}.v6-decision.use,.v6-decision.modify_attack,.v6-decision.modify_defense{background:rgba(251,191,36,.1);color:#ffd76a}.v6-decision.disable{background:rgba(239,68,68,.1);color:#fca5a5}.v6-result-hero h2{margin:9px 0 5px}.v6-result-hero>p{color:rgba(255,255,255,.7);font-size:13px;line-height:1.6}.v6-actions-grid>div{padding:12px;border-radius:12px;background:rgba(255,255,255,.035)}.v6-actions-grid svg{color:#65eaff;float:left;margin-right:7px}.v6-actions-grid strong{font-size:11px}.v6-actions-grid p{clear:both;padding-top:6px;margin:0;font-size:11px;line-height:1.55;color:rgba(255,255,255,.65)}.v6-result-card h3{margin:0 0 8px;font-size:14px;color:#fff;display:flex;align-items:center;gap:7px}.v6-result-card>p,.v6-result-card li{font-size:11px;line-height:1.6;color:rgba(255,255,255,.65)}.v6-result-card ul{padding-left:18px;margin:0}.v6-result-card.key{border-color:rgba(251,191,36,.2)}.v6-link-list,.v6-instructions{display:grid;gap:8px}.v6-link-list>div,.v6-instructions>div{padding:10px;border-radius:10px;background:rgba(255,255,255,.035)}.v6-link-list strong,.v6-instructions strong{font-size:12px}.v6-link-list span,.v6-instructions span{float:right;color:#65eaff;font-size:9px;font-weight:900;text-transform:uppercase}.v6-link-list p,.v6-instructions p{font-size:10px;color:rgba(255,255,255,.6);margin:5px 0}.v6-link-list em{font-size:10px;color:rgba(255,255,255,.45)}.v6-confidence{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:10px;color:rgba(255,255,255,.55);font-size:10px}
        @media(max-width:720px){.v6-counter-page{padding-top:14px}.v6-counter-head{grid-template-columns:1fr}.v6-head-badge{display:none}.v6-counter-head>button{width:max-content}.v6-explain,.v6-upload-grid,.v6-phase-grid,.v6-two-col,.v6-actions-grid{grid-template-columns:1fr}.v6-drop{min-height:190px}.v6-preview{min-height:190px}.v6-preview img{height:170px}.v6-review-actions{flex-direction:column}.v6-primary.compact,.v6-secondary{width:100%}}
      `}</style>
    </main>
  )
}

export default withAuth(CountermeasuresV6Page)
