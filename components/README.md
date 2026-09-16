# components/

## Shell (`AppLayoutShell.jsx`)

Montata da `app/layout.jsx`:

- `SidebarNew`, `TopBar`, `BottomNavigation`
- `NotificationBell`
- `InstallAppPrompt` (soft CTA)
- `PrelaunchGate`, `MaintenanceGate`

## Navigazione

Coach · Rosa · Carte. Partite / stats / feedback / contromisure aprono dentro Hero.

## Coach

| Componente | Ruolo |
|------------|--------|
| `hero-chat/HeroChat` | Chat + workflow Partite, Stats, Palestra, Contromisure |
| `coach-v2/*` | Home Coach, `homeState`, readiness nudge |

## Rosa / form

`TacticalSettingsPanel`, modal posizione/dati mancanti, capture, …

## Carte

`card-advisor/StylePitch.jsx` — pitch movimento stile (solo UI)

## Economia / account

`CreditsBar`, `LanguageProviderWrapper`, `LanguageSwitch`, `AuthWrapper`
