# components/

## Shell globale (`AppLayoutShell.jsx`)

Montata da `app/layout.jsx`. Contiene:

- `SidebarNew`, `TopBar`, `BottomNavigation`
- `DailySpinWidget`
- `InstallAppPrompt` (condizionale)
- `LiveCoachLauncher`
- `AssistantChat` popup
- `PrelaunchGate`, `MaintenanceGate`

Non smontare questi pezzi “per semplificare” senza BYPASS UX esplicito.

## Navigazione attuale

Sidebar: dashboard, guida, tornei (esterno), profilo, rosa, stats modal, contromisure, carte, partite, grafici, HP.  
Bottom nav: contromisure, dashboard, partite, carte, rosa, stats.

UX V2 riduce gli ingressi primari a Coach · Rosa · Carte; i componenti possono restare dietro nuova IA.

## Coach / memoria

| Componente | Ruolo |
|------------|--------|
| `AssistantChat` | Hero Chat |
| `CoachFeedbackChat` | Motore Palestra |
| `HeroCoachJourney` | Journey (bypass UX previsto) |
| `AIKnowledgeBar` | “Quanto Hero ti conosce” |
| `TaskWidget`, `MissionCenter`, `CoachSuggestions` | Confluiscono in Next Action |
| `GameAnalysisModal` | Stats di gioco |

## Rosa / form

`TacticalSettingsPanel`, `PositionSelectionModal`, `MissingDataModal`, `ManualPlayerModal`, `OnboardingFormation`, `CameraCaptureModal`, …

## Economia / account

`CreditsBar`, `DailySpinWidget`, `LanguageProviderWrapper`, `LanguageSwitch`, `AuthWrapper`
