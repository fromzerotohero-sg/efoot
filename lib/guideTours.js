/**
 * Configurazione tour contestuali (Mostrami come)
 * Step per route: element = [data-tour-id="..."], popover con title/description da i18n.
 */

const TOUR_IDS = {
  // Dashboard
  DASHBOARD_INTRO: 'tour-dashboard-intro',
  DASHBOARD_AI: 'tour-dashboard-ai',
  DASHBOARD_TASK: 'tour-dashboard-task',
  DASHBOARD_SQUAD: 'tour-dashboard-squad',
  DASHBOARD_NAV: 'tour-dashboard-nav',
  DASHBOARD_ADD_MATCH: 'tour-dashboard-add-match',
  DASHBOARD_MATCHES: 'tour-dashboard-matches',
  DASHBOARD_INSIGHTS: 'tour-dashboard-insights',
  DASHBOARD_CLASSIFICA: 'tour-dashboard-classifica',
  // Gestione Formazione
  FORMATION_INTRO: 'tour-formation-intro',
  FORMATION_HEADER: 'tour-formation-header',
  FORMATION_ACTIVE_COACH: 'tour-formation-active-coach',
  FORMATION_FIELD: 'tour-formation-field',
  FORMATION_RESERVES: 'tour-formation-reserves',
  FORMATION_UPLOAD: 'tour-formation-upload',
  FORMATION_COACHES_LINK: 'tour-formation-coaches-link',
  // Aggiungi Partita
  MATCH_INTRO: 'tour-match-intro',
  MATCH_PROGRESS: 'tour-match-progress',
  MATCH_STEPS: 'tour-match-steps',
  MATCH_CONTENT: 'tour-match-content',
  MATCH_SAVE: 'tour-match-save',
  // Guida
  GUIDA_INTRO: 'tour-guida-intro',
  GUIDA_PROFILE_HERO: 'tour-guida-profile-hero',
  GUIDA_BRAIN_HERO: 'tour-guida-brain-hero',
  GUIDA_PAGES: 'tour-guida-pages',
  GUIDA_FOOTER: 'tour-guida-footer',
  // Impostazioni Profilo
  PROFILE_INTRO: 'tour-profile-intro',
  PROFILE_PROFILING: 'tour-profile-profiling',
  PROFILE_PERSONAL: 'tour-profile-personal',
  PROFILE_GAME: 'tour-profile-game',
  PROFILE_AI: 'tour-profile-ai',
  PROFILE_COMPLETE: 'tour-profile-complete',
  // Contromisure pre-partita
  COUNTER_INTRO: 'tour-counter-intro',
  COUNTER_UPLOAD: 'tour-counter-upload',
  COUNTER_EXTRACTED: 'tour-counter-extracted',
  COUNTER_GENERATE: 'tour-counter-generate',
  COUNTER_RESULT: 'tour-counter-result',
  // Allenatori
  COACHES_INTRO: 'tour-coaches-intro',
  COACHES_UPLOAD: 'tour-coaches-upload',
  COACHES_LIST: 'tour-coaches-list',
  // Classifica
  CLASSIFICA_INTRO: 'tour-classifica-intro',
  CLASSIFICA_YOUR_POSITION: 'tour-classifica-your-position',
  CLASSIFICA_RANKINGS: 'tour-classifica-rankings',
  // Gestione profilo
  GESTIONE_PROFILO_INTRO: 'tour-gestione-profilo-intro',
  GESTIONE_PROFILO_BALANCE: 'tour-gestione-profilo-balance',
  GESTIONE_PROFILO_LEADERBOARD: 'tour-gestione-profilo-leaderboard',
  GESTIONE_PROFILO_TRANSACTIONS: 'tour-gestione-profilo-transactions',
}

/**
 * Ritorna gli step del tour per la route corrente.
 * @param {string} pathname - es. '/', '/gestione-formazione'
 * @param {(k: string) => string} t - useTranslation().t
 * @returns {{ element: string, popover: { title: string, description: string, side?: string, align?: string } }[]}
 */
export function getTourSteps(pathname, t) {
  const base = (pathname || '/').replace(/\/$/, '') || '/'
  if (base === '/') return getDashboardSteps(t)
  if (base === '/gestione-formazione') return getFormationSteps(t)
  if (base === '/match/new') return getMatchSteps(t)
  if (base === '/guida') return getGuidaSteps(t)
  if (base === '/impostazioni-profilo') return getProfileSteps(t)
  if (base === '/contromisure-pre-partita') return getCountermeasuresSteps(t)
  if (base === '/allenatori') return getCoachesSteps(t)
  if (base === '/classifica') return getClassificaSteps(t)
  if (base === '/gestione-profilo') return getGestioneProfiloSteps(t)
  return []
}

function getDashboardSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_INTRO}"]`, popover: { title: t('tourDashboardIntroTitle'), description: t('tourDashboardIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_AI}"]`, popover: { title: t('tourDashboardAiTitle'), description: t('tourDashboardAiDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_TASK}"]`, popover: { title: t('tourDashboardTaskTitle'), description: t('tourDashboardTaskDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_CLASSIFICA}"]`, popover: { title: t('tourDashboardClassificaTitle'), description: t('tourDashboardClassificaDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_SQUAD}"]`, popover: { title: t('tourDashboardSquadTitle'), description: t('tourDashboardSquadDesc'), side: 'left', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_NAV}"]`, popover: { title: t('tourDashboardNavTitle'), description: t('tourDashboardNavDesc'), side: 'left', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_ADD_MATCH}"]`, popover: { title: t('tourDashboardAddMatchTitle'), description: t('tourDashboardAddMatchDesc'), side: 'left', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_MATCHES}"]`, popover: { title: t('tourDashboardMatchesTitle'), description: t('tourDashboardMatchesDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.DASHBOARD_INSIGHTS}"]`, popover: { title: t('tourDashboardInsightsTitle'), description: t('tourDashboardInsightsDesc'), side: 'right', align: 'center' } },
  ]
}

function getFormationSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_INTRO}"]`, popover: { title: t('tourFormationIntroTitle'), description: t('tourFormationIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_HEADER}"]`, popover: { title: t('tourFormationHeaderTitle'), description: t('tourFormationHeaderDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_ACTIVE_COACH}"]`, popover: { title: t('tourFormationActiveCoachTitle'), description: t('tourFormationActiveCoachDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_FIELD}"]`, popover: { title: t('tourFormationFieldTitle'), description: t('tourFormationFieldDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_RESERVES}"]`, popover: { title: t('tourFormationReservesTitle'), description: t('tourFormationReservesDesc'), side: 'left', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_UPLOAD}"]`, popover: { title: t('tourFormationUploadTitle'), description: t('tourFormationUploadDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.FORMATION_COACHES_LINK}"]`, popover: { title: t('tourFormationCoachesLinkTitle'), description: t('tourFormationCoachesLinkDesc'), side: 'left', align: 'center' } },
  ]
}

function getMatchSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.MATCH_INTRO}"]`, popover: { title: t('tourMatchIntroTitle'), description: t('tourMatchIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.MATCH_PROGRESS}"]`, popover: { title: t('tourMatchProgressTitle'), description: t('tourMatchProgressDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.MATCH_STEPS}"]`, popover: { title: t('tourMatchStepsTitle'), description: t('tourMatchStepsDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.MATCH_CONTENT}"]`, popover: { title: t('tourMatchContentTitle'), description: t('tourMatchContentDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.MATCH_SAVE}"]`, popover: { title: t('tourMatchSaveTitle'), description: t('tourMatchSaveDesc'), side: 'top', align: 'center' } },
  ]
}

function getGuidaSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.GUIDA_INTRO}"]`, popover: { title: t('tourGuidaIntroTitle'), description: t('tourGuidaIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GUIDA_PROFILE_HERO}"]`, popover: { title: t('tourGuidaProfileHeroTitle'), description: t('tourGuidaProfileHeroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GUIDA_BRAIN_HERO}"]`, popover: { title: t('tourGuidaBrainHeroTitle'), description: t('tourGuidaBrainHeroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GUIDA_PAGES}"]`, popover: { title: t('tourGuidaPagesTitle'), description: t('tourGuidaPagesDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GUIDA_FOOTER}"]`, popover: { title: t('tourGuidaFooterTitle'), description: t('tourGuidaFooterDesc'), side: 'top', align: 'center' } },
  ]
}

function getProfileSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_INTRO}"]`, popover: { title: t('tourProfileIntroTitle'), description: t('tourProfileIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_PROFILING}"]`, popover: { title: t('tourProfileProfilingTitle'), description: t('tourProfileProfilingDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_PERSONAL}"]`, popover: { title: t('tourProfilePersonalTitle'), description: t('tourProfilePersonalDesc'), side: 'right', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_GAME}"]`, popover: { title: t('tourProfileGameTitle'), description: t('tourProfileGameDesc'), side: 'right', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_AI}"]`, popover: { title: t('tourProfileAITitle'), description: t('tourProfileAIDesc'), side: 'right', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.PROFILE_COMPLETE}"]`, popover: { title: t('tourProfileCompleteTitle'), description: t('tourProfileCompleteDesc'), side: 'top', align: 'center' } },
  ]
}

function getCountermeasuresSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.COUNTER_INTRO}"]`, popover: { title: t('tourCounterIntroTitle'), description: t('tourCounterIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COUNTER_UPLOAD}"]`, popover: { title: t('tourCounterUploadTitle'), description: t('tourCounterUploadDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COUNTER_EXTRACTED}"]`, popover: { title: t('tourCounterExtractedTitle'), description: t('tourCounterExtractedDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COUNTER_GENERATE}"]`, popover: { title: t('tourCounterGenerateTitle'), description: t('tourCounterGenerateDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COUNTER_RESULT}"]`, popover: { title: t('tourCounterResultTitle'), description: t('tourCounterResultDesc'), side: 'top', align: 'center' } },
  ]
}

function getCoachesSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.COACHES_INTRO}"]`, popover: { title: t('tourCoachesIntroTitle'), description: t('tourCoachesIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COACHES_UPLOAD}"]`, popover: { title: t('tourCoachesUploadTitle'), description: t('tourCoachesUploadDesc'), side: 'left', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.COACHES_LIST}"]`, popover: { title: t('tourCoachesListTitle'), description: t('tourCoachesListDesc'), side: 'top', align: 'center' } },
  ]
}

function getClassificaSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.CLASSIFICA_INTRO}"]`, popover: { title: t('tourClassificaIntroTitle'), description: t('tourClassificaIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.CLASSIFICA_YOUR_POSITION}"]`, popover: { title: t('tourClassificaYourPositionTitle'), description: t('tourClassificaYourPositionDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.CLASSIFICA_RANKINGS}"]`, popover: { title: t('tourClassificaRankingsTitle'), description: t('tourClassificaRankingsDesc'), side: 'top', align: 'center' } },
  ]
}

function getGestioneProfiloSteps(t) {
  return [
    { element: `[data-tour-id="${TOUR_IDS.GESTIONE_PROFILO_INTRO}"]`, popover: { title: t('tourGestioneProfiloIntroTitle'), description: t('tourGestioneProfiloIntroDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GESTIONE_PROFILO_BALANCE}"]`, popover: { title: t('tourGestioneProfiloBalanceTitle'), description: t('tourGestioneProfiloBalanceDesc'), side: 'bottom', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GESTIONE_PROFILO_LEADERBOARD}"]`, popover: { title: t('tourGestioneProfiloLeaderboardTitle'), description: t('tourGestioneProfiloLeaderboardDesc'), side: 'top', align: 'center' } },
    { element: `[data-tour-id="${TOUR_IDS.GESTIONE_PROFILO_TRANSACTIONS}"]`, popover: { title: t('tourGestioneProfiloTransactionsTitle'), description: t('tourGestioneProfiloTransactionsDesc'), side: 'top', align: 'center' } },
  ]
}

export { TOUR_IDS }
