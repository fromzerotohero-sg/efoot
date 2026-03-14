# components/ – Componenti React

## Globali (layout)

| Componente | File | Scopo |
|------------|------|-------|
| AssistantChat | `AssistantChat.jsx` | Widget chat AI (bottom-right) |
| CreditsBar | `CreditsBar.jsx` | Barra crediti mensili |
| GuideTour | `GuideTour.jsx` | Tour guida interattiva |
| LanguageProviderWrapper | `LanguageProviderWrapper.jsx` | Context i18n |
| LanguageSwitch | `LanguageSwitch.jsx` | Toggle IT/EN |

## Per pagina

| Componente | File | Usato in |
|------------|------|----------|
| AIKnowledgeBar | `AIKnowledgeBar.jsx` | Dashboard |
| TaskWidget | `TaskWidget.jsx` | Dashboard |
| ConfirmModal | `ConfirmModal.jsx` | gestione-formazione, match, ecc. |
| MissingDataModal | `MissingDataModal.jsx` | gestione-formazione |
| PositionSelectionModal | `PositionSelectionModal.jsx` | gestione-formazione |
| TacticalSettingsPanel | `TacticalSettingsPanel.jsx` | gestione-formazione |

**Note**: Audit 3 feb 2026 – PositionSelectionModal (lang), AssistantChat (usePathname), AIKnowledgeBar (i18n breakdown), TaskWidget (shadowing fix).

**Doc**: `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md`, `DOCUMENTAZIONE_RIFERIMENTO.md` §4
