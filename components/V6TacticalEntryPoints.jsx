'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Layers3, Link2, Shield, ArrowRight } from 'lucide-react'
import FluidFormationConfigurator from '@/components/FluidFormationConfigurator'
import CoachLinkUpsConfigurator from '@/components/CoachLinkUpsConfigurator'

export default function V6TacticalEntryPoints() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [fluidOpen, setFluidOpen] = React.useState(false)
  const [linksOpen, setLinksOpen] = React.useState(false)

  const isFormation = pathname === '/gestione-formazione' || pathname === '/nuova-rosa-lab'
  const isCoaches = pathname === '/allenatori'
  const isCounters = pathname === '/contromisure-pre-partita'

  if (!isFormation && !isCoaches && !isCounters) return null

  let icon = <Layers3 size={19} />
  let kicker = 'Novità eFootball v6'
  let title = 'Configura Formazione fluida'
  let text = 'Aggiungi Attacco e Difesa usando gli stessi 11 titolari. La formazione principale resta invariata.'
  let cta = 'Configura'
  let action = () => setFluidOpen(true)

  if (isCoaches) {
    icon = <Link2 size={19} />
    title = 'Controlla i Collegamenti dell’allenatore'
    text = 'Gli allenatori v6 possono avere fino a due Link-up Play. Salva solo quelli realmente presenti sulla tua card.'
    cta = 'Gestisci Collegamenti'
    action = () => setLinksOpen(true)
  }

  if (isCounters) {
    icon = <Shield size={19} />
    title = 'Contromisure v6 con Attacco e Difesa'
    text = 'Se l’avversario usa Formazione fluida, puoi caricare due schermate e Hero confronterà le fasi corrette.'
    cta = 'Apri Contromisure v6'
    action = () => router.push('/contromisure-v6')
  }

  return (
    <>
      <div className="v6-entry-wrap">
        <div className="v6-entry">
          <div className="v6-entry-icon">{icon}</div>
          <div className="v6-entry-copy">
            <span>{kicker}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
          <button onClick={action}>{cta}<ArrowRight size={16} /></button>
        </div>
      </div>
      <FluidFormationConfigurator open={fluidOpen} onClose={() => setFluidOpen(false)} />
      <CoachLinkUpsConfigurator open={linksOpen} onClose={() => setLinksOpen(false)} />
      <style jsx>{`
        .v6-entry-wrap{width:min(1180px,calc(100% - 32px));margin:14px auto 0}.v6-entry{display:grid;grid-template-columns:44px 1fr auto;gap:12px;align-items:center;padding:12px 14px;border:1px solid rgba(0,212,255,.22);border-radius:15px;background:linear-gradient(135deg,rgba(0,212,255,.08),rgba(79,70,229,.08));box-shadow:0 10px 28px rgba(0,0,0,.12);color:#fff}.v6-entry-icon{width:42px;height:42px;border-radius:12px;background:rgba(0,212,255,.1);color:#65eaff;display:grid;place-items:center}.v6-entry-copy{min-width:0}.v6-entry-copy>span{display:block;color:#65eaff;text-transform:uppercase;font-size:9px;font-weight:900;letter-spacing:.09em}.v6-entry-copy>strong{display:block;margin-top:2px;font-size:13px}.v6-entry-copy p{margin:2px 0 0;font-size:11px;line-height:1.4;color:rgba(255,255,255,.58)}.v6-entry button{min-height:38px;border-radius:10px;border:1px solid rgba(0,212,255,.3);background:rgba(0,212,255,.1);color:#fff;font-weight:800;padding:0 12px;display:flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}
        @media(max-width:700px){.v6-entry-wrap{width:calc(100% - 24px);margin-top:10px}.v6-entry{grid-template-columns:36px 1fr;padding:10px}.v6-entry-icon{width:36px;height:36px}.v6-entry button{grid-column:1/-1;width:100%;justify-content:center}.v6-entry-copy p{font-size:10px}}
      `}</style>
    </>
  )
}
