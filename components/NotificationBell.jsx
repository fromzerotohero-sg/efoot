"use client";

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslation, pickLang } from "@/lib/i18n";
import { supabase, getValidAccessToken } from "@/lib/supabaseClient";
import { safeJsonResponse } from "@/lib/fetchHelper";
import {
  Bell,
  Zap,
  Target,
  CheckCheck,
  RefreshCw,
} from "lucide-react";

const POPOVER_WIDTH = 360;
const POPOVER_Z_INDEX = 10001;
const MOBILE_BREAKPOINT = 768;
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Colore per tipo notifica: semantico, nessun colore hardcoded
const TYPE_COLORS = {
  credits: "var(--gold-text)",
  weekly_goals: "var(--accent)",
};
const TYPE_ICONS = {
  credits: Zap,
  weekly_goals: Target,
};

function getTypeColor(type) {
  return TYPE_COLORS[type] || "var(--text-dim)";
}

function getTypeIcon(type) {
  return TYPE_ICONS[type] || Bell;
}

// Tempo relativo compatto, italiano prima di tutto
function formatRelativeTime(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return pickLang(lang, { it: "Adesso", en: "Now" });
  if (minutes < 60)
    return pickLang(lang, {
      it: `${minutes} min fa`,
      en: `${minutes} min ago`,
    });
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return pickLang(lang, { it: `${hours} h fa`, en: `${hours} h ago` });
  const days = Math.floor(hours / 24);
  if (days === 1) return pickLang(lang, { it: "Ieri", en: "Yesterday" });
  return pickLang(lang, { it: `${days} g fa`, en: `${days} d ago` });
}

/**
 * Centro notifiche – campanella in TopBar con badge non lette.
 * Desktop: popover sotto il bottone (come CreditsBar); mobile (<768px): bottom-sheet.
 * Legge GET /api/notifications (Bearer), PATCH /api/notifications con { ids } o { all: true }
 * per segnare come lette. Refetch su eventi 'credits-accredited' e 'match-saved',
 * polling leggero ogni 5 minuti. Fallimento silenzioso: la campanella resta visibile.
 */
export default function NotificationBell() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);

  const fetchNotifications = useCallback(
    async (signal) => {
      try {
        let token = localStorage.getItem("auth_token");
        if (!token && supabase) {
          token = await getValidAccessToken();
        }
        if (signal?.aborted) return;
        if (!token) {
          setLoading(false);
          return;
        }
        const res = await fetch("/api/notifications", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          ...(signal && { signal }),
        });
        if (signal?.aborted) return;
        const payload = await safeJsonResponse(res, t("notifications"));
        if (signal?.aborted) return;
        setNotifications(
          Array.isArray(payload?.notifications) ? payload.notifications : [],
        );
        setUnreadCount(
          Number.isFinite(Number(payload?.unreadCount))
            ? Number(payload.unreadCount)
            : 0,
        );
      } catch (err) {
        // Fail silenzioso: niente badge, campanella comunque renderizzata
        if (err?.name !== "AbortError") {
          console.error("[NotificationBell] Error:", err);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ac = new AbortController();
    fetchNotifications(ac.signal);
    const interval = setInterval(
      () => fetchNotifications(ac.signal),
      POLL_INTERVAL_MS,
    );
    const onRefresh = () => fetchNotifications(ac.signal);
    window.addEventListener("credits-accredited", onRefresh);
    window.addEventListener("match-saved", onRefresh);
    return () => {
      ac.abort();
      clearInterval(interval);
      window.removeEventListener("credits-accredited", onRefresh);
      window.removeEventListener("match-saved", onRefresh);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () =>
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Posizione popover: sotto il bottone, sempre in viewport (stesso pattern di CreditsBar)
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
    if (!open || isMobile) {
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
  }, [open, isMobile, updatePopoverPosition]);

  // Chiudi su click fuori (bottone o pannello) o Escape
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

  const markReadRequest = useCallback(async (body) => {
    try {
      let token = localStorage.getItem("auth_token");
      if (!token && supabase) {
        token = await getValidAccessToken();
      }
      if (!token) return;
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      console.error("[NotificationBell] markRead Error:", err);
    }
  }, []);

  const markAllRead = useCallback(() => {
    if (unreadCount <= 0) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
    setUnreadCount(0);
    markReadRequest({ all: true });
  }, [unreadCount, markReadRequest]);

  const onItemClick = useCallback(
    (item) => {
      if (!item?.read_at) {
        const now = new Date().toISOString();
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, read_at: now } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        markReadRequest({ ids: [item.id] });
      }
      setOpen(false);
      if (item?.href) router.push(item.href);
    },
    [markReadRequest, router],
  );

  const triggerAriaLabel = open
    ? t("notificationsCloseAria")
    : t("notificationsViewAria");

  const panelContent = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--text-main)",
          }}
        >
          {t("notifications")}
        </h2>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount <= 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            fontSize: "12px",
            fontWeight: 600,
            color: unreadCount > 0 ? "var(--info)" : "var(--text-dim)",
            background: "var(--surface-2)",
            border: "1px solid var(--border-soft)",
            borderRadius: "8px",
            cursor: unreadCount > 0 ? "pointer" : "default",
            opacity: unreadCount > 0 ? 1 : 0.6,
          }}
        >
          <CheckCheck size={14} />
          {t("notificationsMarkAllRead")}
        </button>
      </div>

      {loading && notifications.length === 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw
            size={18}
            color="var(--info)"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span style={{ fontSize: "14px" }}>{t("notificationsLoading")}</span>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            padding: "24px 0",
            color: "var(--text-dim)",
          }}
        >
          <Bell size={28} />
          <span style={{ fontSize: "14px" }}>{t("notificationsEmpty")}</span>
        </div>
      )}

      {notifications.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {notifications.map((item) => {
            const unread = !item.read_at;
            const color = getTypeColor(item.type);
            const TypeIcon = getTypeIcon(item.type);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onItemClick(item)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    width: "100%",
                    textAlign: "left",
                    padding: "10px",
                    background: unread ? "var(--surface-3)" : "transparent",
                    border: "1px solid transparent",
                    borderRadius: "10px",
                    cursor: "pointer",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      marginTop: "2px",
                      color,
                      display: "inline-flex",
                    }}
                    aria-hidden="true"
                  >
                    <TypeIcon size={16} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: unread ? 700 : 500,
                          color: "var(--text-main)",
                        }}
                      >
                        {item.title}
                      </span>
                      {unread && (
                        <span
                          aria-hidden="true"
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "999px",
                            background: "var(--info)",
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </span>
                    {item.body && (
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          marginTop: "2px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.body}
                      </span>
                    )}
                    <span
                      style={{
                        display: "block",
                        marginTop: "4px",
                        fontSize: "11px",
                        color: "var(--text-dim)",
                      }}
                    >
                      {formatRelativeTime(item.created_at, lang)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={triggerAriaLabel}
        title={t("notifications")}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: "var(--surface-2)",
          border: "1px solid var(--border-soft)",
          color: "var(--text-main)",
          cursor: "pointer",
          transition: "all 0.2s",
          flexShrink: 0,
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-5px",
              right: "-5px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "999px",
              background: "var(--gold-text)",
              color: "var(--bg-elevated)",
              fontSize: "10px",
              fontWeight: 800,
              display: "grid",
              placeItems: "center",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop: popover sotto il bottone */}
      {open &&
        !isMobile &&
        popoverPosition &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={t("notifications")}
            style={{
              position: "fixed",
              top: popoverPosition.top,
              left: popoverPosition.left,
              zIndex: POPOVER_Z_INDEX,
              width: `${Math.min(POPOVER_WIDTH, window.innerWidth - 24)}px`,
              maxHeight: "min(85vh, 480px)",
              overflowY: "auto",
              backgroundColor: "var(--bg-elevated)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {panelContent}
          </div>,
          document.body,
        )}

      {/* Mobile: bottom-sheet con backdrop */}
      {open &&
        isMobile &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("notifications")}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: POPOVER_Z_INDEX,
              backgroundColor: "var(--bg-overlay)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              animation: "notifFadeIn 0.2s ease-out",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <style>{`
              @keyframes notifFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes notifSlideUp {
                from { transform: translateY(24px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
              }
            `}</style>
            <div
              ref={popoverRef}
              style={{
                width: "100%",
                maxHeight: "70vh",
                overflowY: "auto",
                backgroundColor: "var(--bg-elevated)",
                borderRadius: "16px 16px 0 0",
                border: "1px solid var(--border-soft)",
                borderBottom: "none",
                boxShadow: "var(--shadow-lg)",
                padding: "16px",
                paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
                animation: "notifSlideUp 0.3s ease-out",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {panelContent}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
