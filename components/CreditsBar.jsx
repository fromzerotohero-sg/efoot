"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "@/lib/i18n";
import { supabase, getValidAccessToken } from "@/lib/supabaseClient";
import { safeJsonResponse } from "@/lib/fetchHelper";
import {
  Zap,
  RefreshCw,
  AlertCircle,
  Info,
  ChevronDown,
  ExternalLink,
  Settings,
} from "lucide-react";

const POPOVER_WIDTH = 360;
const POPOVER_Z_INDEX = 10001;

/**
 * Crediti AI – versione compatta: icona in barra utility, clic apre popover con dettaglio.
 * Popover renderizzato in portal (document.body) con z-index alto così resta sempre sopra
 * barra Conoscenza IA, Mostrami come e ogni altro contenuto. Posizionamento sotto il bottone.
 * Legge POST /api/credits/usage (Bearer). Doc: docs/SISTEMA_CREDITI_AI.md
 */
export default function CreditsBar() {
  const { t, lang } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noSession, setNoSession] = useState(false);
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const [highlight, setHighlight] = useState(false);
  const [lastAccredited, setLastAccredited] = useState(0);
  const [flyBurst, setFlyBurst] = useState([]);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const fetchUsage = useCallback(
    async (signal) => {
      try {
        setError(null);
        setNoSession(false);

        let token = localStorage.getItem("auth_token");

        if (!token && supabase) {
          token = await getValidAccessToken();
        }

        if (signal?.aborted) return;

        if (!token) {
          setNoSession(true);
          setLoading(false);
          return;
        }

        const res = await fetch("/api/credits/usage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
          cache: "no-store",
          ...(signal && { signal }),
        });
        if (signal?.aborted) return;
        const payload = await safeJsonResponse(
          res,
          t("creditsError") || "Error loading usage",
        );
        if (signal?.aborted) return;
        setData(payload);
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error("[CreditsBar] Error:", err);
        if (!signal?.aborted) setError(err.message || t("creditsError"));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ac = new AbortController();
    fetchUsage(ac.signal);
    const interval = setInterval(() => fetchUsage(ac.signal), 45 * 1000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchUsage(ac.signal);
    };
    const onCreditsConsumed = () => fetchUsage(ac.signal);
    const onCreditsAccredited = (event) => {
      const amount = Number(event?.detail?.amount || 0);
      if (Number.isFinite(amount) && amount > 0) {
        setLastAccredited(amount);
      }
      const targetRect = containerRef.current?.getBoundingClientRect();
      const sourceRect = event?.detail?.sourceRect;
      if (targetRect && sourceRect) {
        const startX = sourceRect.left + sourceRect.width / 2;
        const startY = sourceRect.top + sourceRect.height / 2;
        const endX = targetRect.left + targetRect.width / 2;
        const endY = targetRect.top + targetRect.height / 2;
        const burst = Array.from({ length: 9 }, (_, index) => ({
          id: `${Date.now()}-${index}`,
          startX: startX + (index - 4) * 8,
          startY: startY + ((index % 3) - 1) * 10,
          midX: (startX + endX) / 2 + (index - 4) * 14,
          midY: Math.min(startY, endY) - 120 - (index % 3) * 12,
          endX,
          endY,
          delay: index * 0.045,
        }));
        setFlyBurst(burst);
        window.setTimeout(() => setFlyBurst([]), 1600);
      }
      setHighlight(true);
      fetchUsage(ac.signal);
      window.setTimeout(() => setHighlight(false), 2600);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("credits-consumed", onCreditsConsumed);
    window.addEventListener("credits-accredited", onCreditsAccredited);
    let authUnsub = null;
    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          setNoSession(false);
          fetchUsage(ac.signal);
        }
      });
      authUnsub = data?.subscription;
    }
    return () => {
      ac.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("credits-consumed", onCreditsConsumed);
      window.removeEventListener("credits-accredited", onCreditsAccredited);
      authUnsub?.unsubscribe?.();
    };
  }, [fetchUsage]);

  // Posizione popover: sotto il bottone, sempre in viewport; aggiornata su scroll/resize
  const updatePopoverPosition = useCallback(() => {
    if (!containerRef.current || typeof window === "undefined") return;
    const rect = containerRef.current.getBoundingClientRect();
    const gap = 8;
    const maxLeft = Math.max(12, window.innerWidth - POPOVER_WIDTH - 12);
    const left = Math.max(12, Math.min(rect.right - POPOVER_WIDTH, maxLeft));
    const top = rect.bottom + gap;
    setPopoverPosition({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }
    updatePopoverPosition();
    window.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);
    return () => {
      window.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [open, updatePopoverPosition]);

  // Chiudi popover su click fuori (bottone o popover) o Escape
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const inTrigger = containerRef.current?.contains(e.target);
      const inPopover = popoverRef.current?.contains(e.target);
      if (!inTrigger && !inPopover) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const formatPeriod = (periodKey) => {
    if (!periodKey || periodKey.length < 7) return periodKey;
    const [y, m] = periodKey.split("-");
    const monthIndex = parseInt(m, 10) - 1;
    const date = new Date(parseInt(y, 10), monthIndex, 1);
    const locale = lang === "en" ? "en-GB" : "it-IT";
    return date.toLocaleDateString(locale, { month: "long", year: "numeric" });
  };

  const getBarColor = (percentUsed, overage) => {
    if (overage > 0) return "#FF9500";
    if (percentUsed >= 95) return "#FF3B30";
    if (percentUsed >= 75) return "#FF9500";
    return "#34C759";
  };

  if (noSession) return null;

  const used = Number.isFinite(Number(data?.credits_used))
    ? Number(data.credits_used)
    : 0;
  const included = Number.isFinite(Number(data?.credits_included))
    ? Number(data.credits_included)
    : 0;
  const overage = Math.max(0, Number(data?.overage) || 0);
  const tempBalance = Number.isFinite(Number(data?.temp_balance))
    ? Number(data.temp_balance)
    : 0;
  const percentIncluded =
    included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
  const periodLabel = formatPeriod(data?.period_key);
  const barColor = data ? getBarColor(percentIncluded, overage) : "#00d4ff";

  const totalBalance = included + tempBalance;
  const compactLabel = loading
    ? null
    : error
      ? t("creditsError") || "Error"
      : `${totalBalance}`;

  const triggerAriaLabel = open
    ? t("creditsCloseAria")
    : t("creditsViewAria");

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {flyBurst.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              zIndex: 10080,
            }}
            aria-hidden="true"
          >
            {flyBurst.map((piece) => (
              <span
                key={piece.id}
                style={{
                  "--start-x": `${piece.startX}px`,
                  "--start-y": `${piece.startY}px`,
                  "--mid-x": `${piece.midX}px`,
                  "--mid-y": `${piece.midY}px`,
                  "--end-x": `${piece.endX}px`,
                  "--end-y": `${piece.endY}px`,
                  "--delay": `${piece.delay}s`,
                  position: "fixed",
                  left: 0,
                  top: 0,
                  width: "34px",
                  height: "34px",
                  borderRadius: "999px",
                  display: "grid",
                  placeItems: "center",
                  color: "#06101f",
                  fontSize: "11px",
                  fontWeight: 950,
                  background:
                    "linear-gradient(135deg, #fef3c7, #facc15 52%, #22d3ee)",
                  boxShadow:
                    "0 0 18px rgba(250,204,21,0.65), 0 0 30px rgba(0,212,255,0.35)",
                  transform:
                    "translate(var(--start-x), var(--start-y)) scale(0.8)",
                  animation:
                    "hpFlyToBalance 1.25s cubic-bezier(.2,.82,.2,1) var(--delay) forwards",
                }}
              >
                HP
              </span>
            ))}
            <style>{`
            @keyframes hpFlyToBalance {
              0% {
                opacity: 0;
                transform: translate(var(--start-x), var(--start-y)) scale(0.65) rotate(-10deg);
              }
              14% {
                opacity: 1;
              }
              58% {
                transform: translate(var(--mid-x), var(--mid-y)) scale(1.08) rotate(12deg);
              }
              100% {
                opacity: 0;
                transform: translate(var(--end-x), var(--end-y)) scale(0.35) rotate(28deg);
              }
            }
          `}</style>
          </div>,
          document.body,
        )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={triggerAriaLabel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          height: "36px",
          whiteSpace: "nowrap",
          padding: "0 10px",
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text-main)",
          background: "var(--surface-3)",
          border: highlight
            ? "1px solid rgba(201, 150, 48, 0.7)"
            : "1px solid var(--border-soft)",
          borderRadius: "10px",
          cursor: "pointer",
          boxShadow: highlight
            ? "0 0 0 2px rgba(201, 150, 48, 0.22)"
            : "none",
          transition: "box-shadow 0.25s ease, border-color 0.25s ease",
        }}
      >
        {loading ? (
          <RefreshCw
            size={16}
            color="#00A8C8"
            style={{ animation: "spin 1s linear infinite" }}
          />
        ) : error ? (
          <AlertCircle size={16} color="#D99B27" />
        ) : (
          <Zap size={16} color="#C99630" fill="#C99630" />
        )}
        {compactLabel != null && (
          <span style={{ fontWeight: 700, whiteSpace: "nowrap", color: "var(--text-main)" }}>
            {compactLabel}
          </span>
        )}
        <ChevronDown
          size={14}
          color="var(--text-dim)"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease",
          }}
        />
        {highlight && lastAccredited > 0 && (
          <span
            style={{
              marginLeft: "2px",
              fontSize: "11px",
              fontWeight: 800,
              color: "var(--gold-text)",
            }}
          >
            +{lastAccredited}
          </span>
        )}
      </button>

      {open &&
        popoverPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={t("creditsTitle")}
            style={{
              position: "fixed",
              top: popoverPosition.top,
              left: popoverPosition.left,
              zIndex: POPOVER_Z_INDEX,
              width: `${Math.min(POPOVER_WIDTH, window.innerWidth - 24)}px`,
              maxHeight: "min(85vh, 420px)",
              overflowY: "auto",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid var(--info-border)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {loading && !data && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  color: "var(--info-text)",
                }}
              >
                <RefreshCw
                  size={18}
                  color="var(--primary-cyan)"
                  style={{ animation: "spin 1s linear infinite" }}
                />
                <span style={{ fontSize: "14px" }}>{t("creditsLoading")}</span>
              </div>
            )}

            {error && !data && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--primary-orange)",
                }}
              >
                <AlertCircle size={18} />
                <span style={{ fontSize: "14px" }}>{error}</span>
              </div>
            )}

            {data && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "6px",
                      }}
                    >
                      <Zap
                        size={18}
                        color={getBarColor(percentIncluded, overage)}
                      />
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--neon-cyan)",
                        }}
                      >
                        {t("creditsTitle")}
                      </h2>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "13px",
                        color: "var(--info-text)",
                        maxWidth: "320px",
                      }}
                    >
                      {t("creditsSubtitle")}
                    </p>
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--info-text)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("creditsPeriod")}: {periodLabel}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "15px",
                    fontWeight: 600,
                    color: "var(--neon-cyan)",
                  }}
                >
                  <span>
                    {included} {t("creditsPermanent") || "crediti"}
                  </span>
                  {tempBalance > 0 && (
                    <>
                      <span style={{ color: "var(--gold-text)" }}>
                        {tempBalance}{" "}
                        {t("creditsTemporary") || "crediti temporanei"}
                      </span>
                      <em
                        style={{
                          fontSize: "12px",
                          fontWeight: 400,
                          color: "var(--gold-text)",
                          marginTop: "2px",
                        }}
                      >
                        {t("creditsTempExpiry")}
                      </em>
                    </>
                  )}
                </div>

                <div
                  style={{
                    width: "100%",
                    height: "8px",
                    backgroundColor: "rgba(0, 212, 255, 0.05)",
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                    marginTop: "10px",
                  }}
                  role="progressbar"
                  aria-valuenow={used}
                  aria-valuemin={0}
                  aria-valuemax={included}
                  aria-label={`${used} ${t("creditsUsed")} ${included} ${t("creditsIncluded")}`}
                >
                  <div
                    style={{
                      width: `${percentIncluded}%`,
                      height: "100%",
                      backgroundColor: getBarColor(percentIncluded, overage),
                      transition:
                        "width 0.3s ease, background-color 0.15s ease",
                      borderRadius: "4px 0 0 4px",
                    }}
                  />
                </div>

                {overage > 0 && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      background: "rgba(0, 161, 166, 0.05)",
                      border: "1px solid rgba(0, 161, 166, 0.2)",
                      fontSize: "13px",
                      color: "var(--primary-orange)",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <Info
                      size={16}
                      style={{ flexShrink: 0, marginTop: "1px" }}
                    />
                    <span>{t("creditsOverageHint")}</span>
                  </div>
                )}

                {/* Link a gestione crediti */}
                <a
                  href="https://home.fromzerotohero.io/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginTop: "16px",
                    padding: "12px",
                    background: "rgba(0, 212, 255, 0.1)",
                    border: "1px solid rgba(0, 212, 255, 0.3)",
                    borderRadius: "8px",
                    color: "var(--neon-cyan)",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0, 212, 255, 0.2)";
                    e.currentTarget.style.borderColor =
                      "rgba(0, 212, 255, 0.5)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0, 212, 255, 0.1)";
                    e.currentTarget.style.borderColor =
                      "rgba(0, 212, 255, 0.3)";
                  }}
                >
                  <Settings size={16} />
                  {lang === "en" ? "Manage Credits" : "Gestisci Crediti"}
                  <ExternalLink size={14} style={{ opacity: 0.7 }} />
                </a>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
