'use client'

import { useEffect, useState } from 'react'

export default function BrandLoadingOverlay({
  kicker,
  title,
  status,
  tips,
  tipLabel = 'Mentre aspetti',
  variant = 'default',
}) {
  const tipList = Array.isArray(tips) ? tips.filter(Boolean) : []
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

  return (
    <div
      className={`brand-analysis-overlay${variant === 'error' ? ' brand-analysis-overlay--error' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={variant !== 'error'}
    >
      <div className="brand-analysis-core">
        <div className="brand-analysis-logo-wrap">
          <span className="brand-analysis-orbit" aria-hidden="true" />
          <span className="brand-analysis-scanline" aria-hidden="true" />
          <img className="brand-analysis-logo" src="/logo.png" alt="" />
        </div>
        <div className="brand-analysis-copy">
          {kicker ? <span>{kicker}</span> : null}
          {title ? <strong>{title}</strong> : null}
          {status ? <p className="brand-analysis-loading-status">{status}</p> : null}
        </div>
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
