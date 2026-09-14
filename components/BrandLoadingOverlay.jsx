'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

/**
 * Overlay/card di caricamento "brand" condiviso.
 * - default: overlay fixed a tutto schermo con layout verticale e tips rotanti
 * - layout="horizontal": card compatta orizzontale dentro l'overlay (es. Build Coach)
 * - inline: card orizzontale in-page, nessun overlay (es. analisi contromisure)
 * La CSS vive in app/globals.css (.brand-analysis-*): i keyframes brand* sono
 * globali, quindi le classi non possono stare in styled-jsx con scope.
 */
export default function BrandLoadingOverlay({
  kicker,
  title,
  status,
  tips,
  tipLabel = 'Mentre aspetti',
  variant = 'default',
  layout = 'vertical',
  inline = false,
  steps,
}) {
  const tipList = Array.isArray(tips) ? tips.filter(Boolean) : []
  const stepList = Array.isArray(steps) ? steps.filter(Boolean) : []
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    setTipIndex(0)
    if (tipList.length <= 1) return undefined
    const id = window.setInterval(() => {
      setTipIndex((index) => (index + 1) % tipList.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [tipList.length, tips])

  const tip = tipList[tipIndex] || ''
  const variantClass = variant !== 'default' ? ` brand-analysis-overlay--${variant}` : ''

  const logo = (
    <div className="brand-analysis-logo-wrap">
      <span className="brand-analysis-orbit" aria-hidden="true" />
      <span className="brand-analysis-scanline" aria-hidden="true" />
      <img className="brand-analysis-logo" src="/logo.png" alt="" />
    </div>
  )

  const copy = (
    <div className="brand-analysis-copy">
      {kicker ? <span>{kicker}</span> : null}
      {title ? <strong>{title}</strong> : null}
      {status ? <p className="brand-analysis-loading-status">{status}</p> : null}
      {stepList.length > 0 ? (
        <div className="brand-analysis-steps">
          {stepList.map((step, index) => (
            <em key={step}>
              <CheckCircle2 size={13} />
              {index + 1}. {step}
            </em>
          ))}
        </div>
      ) : null}
    </div>
  )

  if (inline) {
    return (
      <section
        className={`brand-analysis-card${variant !== 'default' ? ` brand-analysis-card--${variant}` : ''}`}
        role="status"
        aria-live="polite"
        aria-busy={variant !== 'error'}
      >
        {logo}
        {copy}
      </section>
    )
  }

  const horizontal = layout === 'horizontal'

  return (
    <div
      className={`brand-analysis-overlay${variantClass}${horizontal ? ' brand-analysis-overlay--compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={variant !== 'error'}
    >
      <div className={`brand-analysis-core${horizontal ? ' brand-analysis-core--horizontal' : ''}`}>
        {logo}
        {copy}
        {tip ? (
          <div className="brand-analysis-tip" key={tipIndex}>
            <span className="brand-analysis-tip-label">{tipLabel}</span>
            <p className="brand-analysis-tip-text">{tip}</p>
            {tipList.length > 1 ? (
              <div className="brand-analysis-tip-dots" aria-hidden="true">
                {tipList.map((_, index) => (
                  <span key={index} className={index === tipIndex ? 'is-active' : ''} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
