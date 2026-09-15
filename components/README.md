# components/

## Shell globale (`AppLayoutShell.jsx`)

Montata da `app/layout.jsx`. Contiene:

- `SidebarNew`, `TopBar`, `BottomNavigation`
- `NotificationBell` (campanella notifiche in TopBar)
- `InstallAppPrompt` (condizionale)
- `PrelaunchGate`, `MaintenanceGate`

Non smontare questi pezzi “per semplificare” senza BYPASS UX esplicito.

## Navigazione attuale

Sidebar e bottom nav espongono i tre pilastri Coach · Rosa · Carte. Statistiche, partite, feedback e contromisure si aprono dentro Hero.

## Coach / memoria

| Componente | Ruolo |
|------------|--------|
| `hero-chat/HeroChat` | Hero Chat e workflow Partite, Stats, Palestra e Contromisure |
| `coach-v2/homeState` | Stato e prontezza dati della Home |

## Rosa / form

`TacticalSettingsPanel`, `PositionSelectionModal`, `MissingDataModal`, `OnboardingFormation`, `CameraCaptureModal`, …

## Economia / account

`CreditsBar`, `LanguageProviderWrapper`, `LanguageSwitch`, `AuthWrapper`
