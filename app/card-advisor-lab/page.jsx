'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { withAuth } from '@/components/AuthWrapper'
import { useTranslation } from '@/lib/i18n'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  X,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'

const copy = {
  it: {
    eyebrow: 'Consiglio carte',
    title: 'Card Advisor',
    subtitle: 'Scopri se una carta merita coins prima di prenderla: leggiamo ruolo, stile, rosa, modulo e coach attivo.',
    dataBadge: 'Analisi carta + fit squadra',
    notPublic: 'Consiglio personalizzato sulla tua rosa.',
    releaseTitle: 'Catalogo carte',
    sourceNote: 'Scegli un pack o cerca una carta: ti mostriamo subito i profili piu rilevanti per decidere con piu sicurezza.',
    cardScore: 'Sinergia',
    cardIdentity: 'Identità',
    role: 'Ruolo',
    style: 'Stile',
    build: 'Cosa aggiunge',
    verdict: 'Lettura',
    strengths: 'Perché conta',
    risks: 'Attenzione d’uso',
    nativeSkills: 'Profilo tecnico',
    teamFit: 'Sinergia con la tua squadra',
    teamSynergyScore: 'Sinergia squadra',
    coachAdvice: 'Consiglio',
    deepAnalysisCta: 'Sblocca analisi premium',
    deepAnalysisCost: '2 HP',
    deepAnalysisLoading: 'Sto preparando l’analisi dettagliata...',
    deepAnalysisError: 'Analisi dettagliata non disponibile. Riprova tra poco.',
    deepAnalysisTitle: 'Analisi premium IA',
    deepKeyReasoning: 'Ragionamenti chiave',
    deepPros: 'Pro',
    deepCons: 'Contro',
    deepSynergies: 'Sinergie',
    deepHowToUse: 'Come usarla',
    deepWhenAvoid: 'Quando evitarla',
    deepFinalDecision: 'Decisione finale',
    deepShowFull: 'Vedi report completo',
    deepHideFull: 'Nascondi report',
    howToUse: 'Lettura sinergie',
    viewDetails: 'Vedi dettagli',
    hideDetails: 'Nascondi dettagli',
    synergyDetails: 'Dettaglio sinergia',
    noRosterTitle: 'Valutazione carta disponibile',
    noRosterText: 'Anche senza rosa leggiamo stile, ruolo e profilo tecnico. Con la rosa aggiungiamo sinergie, movimenti e priorita reali.',
    selectedHint: 'Scegli una carta per aprire la valutazione completa.',
    topPick: 'Sinergia alta',
    goodPick: 'Sinergia buona',
    situationalPick: 'Sinergia parziale',
    skipPick: 'Da contestualizzare',
    compareCta: 'Completa la rosa per il fit',
    currentRelease: 'Pack corrente',
    allCards: 'Tutte le carte',
    activePacks: 'Cerca nel catalogo',
    searchPlaceholder: 'Cerca giocatore, ruolo o pack...',
    cardsAvailable: 'carte disponibili',
    noCardsFound: 'Nessuna carta trovata con questi filtri.',
    needsSourceReview: 'In aggiornamento',
    similarPlayers: 'Profili considerati',
    priorityVerdict: 'Lettura per te',
    synergyHigh: 'Sinergia alta',
    synergyMedium: 'Sinergia media',
    synergyLow: 'Sinergia bassa',
    cardProfileOnly: 'Profilo carta',
    rosterSynergy: 'Sinergia rosa',
    moduleFit: 'Fit modulo',
    systemSynergy: 'Lettura sinergie',
    noFormationTitle: 'Completa la formazione',
    noFormationText: 'Hai gia giocatori in rosa: possiamo valutare ruolo e profilo, ma per leggere titolari, riserve e incastri serve una formazione salvata.',
    noCoachText: 'Aggiungi il coach attivo per includere stile squadra e competenze.',
    saveFormationCta: 'Completa formazione',
    addCoachCta: 'Aggiungi coach',
    analyzeSynergy: 'Valuta carta',
    checkingRoster: 'Controllo rosa...',
    rosterReadyTitle: 'Rosa collegata: consiglio personalizzato attivo',
    rosterReadyText: 'Questa carta viene confrontata con titolari, riserve, modulo e priorita reali della tua squadra.',
    rosterMissingTitle: 'Aggiungi la tua rosa',
    rosterMissingText: 'Puoi gia vedere una valutazione generale. Per sapere se la carta entra davvero nella tua squadra, carica almeno la rosa base.',
    rosterUnavailableTitle: 'Valutazione generale attiva',
    rosterUnavailableText: 'Puoi comunque valutare la carta. Quando completi la rosa, ricevi anche il consiglio personalizzato.',
    rosterPlayers: 'Giocatori',
    rosterStarters: 'Titolari',
    rosterFormation: 'Modulo',
    personalFitPreview: 'Fit squadra',
    replacementLogic: 'catena di gioco',
    duplicateLogic: 'movimenti compatibili',
    priorityLogic: 'scenario utile',
    loadRoster: 'Apri gestione rosa',
    closeDetails: 'Chiudi dettagli',
    mainLever: 'Leva principale',
    coachContext: 'Contesto coach',
    recommendedUse: 'Uso consigliato',
    coinRisk: '',
    purchaseAdvice: 'Consiglio finale',
    cardValue: 'Cosa offre la carta',
    loadingDecision: 'Sto leggendo la carta completa...',
    noNativeSkills: 'Profilo tecnico non ancora disponibile per questa carta',
  },
  en: {
    eyebrow: 'Card advice',
    title: 'Card Advisor',
    subtitle: 'See if a card is worth your coins before signing it: we read role, style, roster, formation, and active coach.',
    dataBadge: 'Card analysis + team fit',
    notPublic: 'Personalized advice for your roster.',
    releaseTitle: 'Card catalog',
    sourceNote: 'Choose a pack or search for a card: we surface the most relevant profiles so you can decide with more confidence.',
    cardScore: 'Synergy',
    cardIdentity: 'Identity',
    role: 'Role',
    style: 'Style',
    build: 'What it adds',
    verdict: 'Read',
    strengths: 'Why it matters',
    risks: 'Usage note',
    nativeSkills: 'Technical profile',
    teamFit: 'Team synergy',
    teamSynergyScore: 'Team synergy',
    coachAdvice: 'Advice',
    deepAnalysisCta: 'Unlock premium analysis',
    deepAnalysisCost: '2 HP',
    deepAnalysisLoading: 'Preparing detailed analysis...',
    deepAnalysisError: 'Detailed analysis unavailable. Please try again shortly.',
    deepAnalysisTitle: 'Premium AI analysis',
    deepKeyReasoning: 'Key reasoning',
    deepPros: 'Pros',
    deepCons: 'Cons',
    deepSynergies: 'Synergies',
    deepHowToUse: 'How to use it',
    deepWhenAvoid: 'When to avoid it',
    deepFinalDecision: 'Final decision',
    deepShowFull: 'Show full report',
    deepHideFull: 'Hide report',
    howToUse: 'Synergy read',
    viewDetails: 'See details',
    hideDetails: 'Hide details',
    synergyDetails: 'Synergy details',
    noRosterTitle: 'Card evaluation available',
    noRosterText: 'Even without a roster we read style, role, and technical profile. With your roster we add synergies, movements, and real priorities.',
    selectedHint: 'Choose a card to open the full evaluation.',
    topPick: 'High synergy',
    goodPick: 'Good synergy',
    situationalPick: 'Partial synergy',
    skipPick: 'Needs context',
    compareCta: 'Complete roster for fit',
    currentRelease: 'Current pack',
    allCards: 'All cards',
    activePacks: 'Search catalog',
    searchPlaceholder: 'Search player, role, or pack...',
    cardsAvailable: 'cards available',
    noCardsFound: 'No cards found with these filters.',
    needsSourceReview: 'Updating',
    similarPlayers: 'Profiles considered',
    priorityVerdict: 'Read for you',
    synergyHigh: 'High synergy',
    synergyMedium: 'Medium synergy',
    synergyLow: 'Low synergy',
    cardProfileOnly: 'Card profile',
    rosterSynergy: 'Roster synergy',
    moduleFit: 'Module fit',
    systemSynergy: 'Synergy read',
    noFormationTitle: 'Complete formation',
    noFormationText: 'You already have players in your roster: we can read role and profile, but a saved formation is needed to evaluate starters, bench, and links.',
    noCoachText: 'Add the active coach to include team style and competences.',
    saveFormationCta: 'Complete formation',
    addCoachCta: 'Add coach',
    analyzeSynergy: 'Evaluate card',
    checkingRoster: 'Checking roster...',
    rosterReadyTitle: 'Roster connected: personalized advice active',
    rosterReadyText: 'This card is compared with starters, bench, formation, and real team priorities.',
    rosterMissingTitle: 'Add your roster',
    rosterMissingText: 'You can already see a general evaluation. To know if the card really fits your team, load at least your base roster.',
    rosterUnavailableTitle: 'General evaluation active',
    rosterUnavailableText: 'You can still evaluate the card. Once you complete the roster, you also receive personalized advice.',
    rosterPlayers: 'Players',
    rosterStarters: 'Starters',
    rosterFormation: 'Formation',
    personalFitPreview: 'Team fit',
    replacementLogic: 'movement chain',
    duplicateLogic: 'compatible movements',
    priorityLogic: 'useful scenario',
    loadRoster: 'Open roster manager',
    closeDetails: 'Close details',
    mainLever: 'Main lever',
    coachContext: 'Coach context',
    recommendedUse: 'Recommended use',
    coinRisk: '',
    purchaseAdvice: 'Final advice',
    cardValue: 'What the card offers',
    loadingDecision: 'Reading the full card...',
    noNativeSkills: 'Technical profile not available for this card yet',
  }
}

const imageByName = {
  'Gianluigi Donnarumma': 'https://pesdb.net/assets/img/card/f105692702811895.png',
  'Achraf Hakimi': 'https://pesdb.net/assets/img/card/f105692702817576.png',
  'Federico Valverde': 'https://pesdb.net/assets/img/card/f52895743589623.png',
  'Antoine Griezmann': 'https://pesdb.net/assets/img/card/f52895743518028.png',
  Zico: 'https://pesdb.net/assets/img/card/f88035555413486.png',
  'Lamine Yamal': 'https://pesdb.net/assets/img/card/f89135067068738.png',
  'Robert Lewandowski': 'https://pesdb.net/assets/img/card/f52896011951170.png',
  'Takefusa Kubo': 'https://pesdb.net/assets/img/card/f88039581932552.png',
  Pedri: 'https://pesdb.net/assets/img/card/f89135067039781.png',
  'Bruno Fernandes': 'https://pesdb.net/assets/img/card/f52898696326240.png',
  Jorginho: 'https://pesdb.net/assets/img/card/f106730474235970.png',
  'P. E. Aubameyang': 'https://pesdb.net/assets/img/card/f70375186668931.png',
  Marcelo: 'https://pesdb.net/assets/img/card/f70374649792604.png',
  'Lucas Moura': 'https://pesdb.net/assets/img/card/f70374649800594.png',
  'Gareth Bale': 'https://pesdb.net/assets/img/card/f89133724764840.png',
  'Thiago Silva': 'https://pesdb.net/assets/img/card/f106652896368901.png',
  'Jonas Hofmann': 'https://pesdb.net/assets/img/card/f105563853795563.png',
  'Neymar Jr': 'https://pesdb.net/assets/img/card/f89133993205152.png',
  'Ousmane Dembele': 'https://pesdb.net/assets/img/card/f89135067017250.png',
  'Ousmane Dembélé': 'https://pesdb.net/assets/img/card/f89135067017250.png',
  'Rafael Leao': 'https://pesdb.net/assets/img/card/f89131308929393.png',
  'Rafael Leão': 'https://pesdb.net/assets/img/card/f89131308929393.png',
  'Kylian Mbappe': 'https://pesdb.net/assets/img/card/f89068226588798.png',
  'Kylian Mbappé': 'https://pesdb.net/assets/img/card/f89068226588798.png',
  'Sadio Mane': 'https://pesdb.net/assets/img/card/f89137029898200.png',
  'Sadio Mané': 'https://pesdb.net/assets/img/card/f89137029898200.png'
}

function normalizeKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function roleFamily(position) {
  if (['PT'].includes(position)) return 'gk'
  if (['DC', 'TD', 'TS'].includes(position)) return 'def'
  if (['MED', 'CC', 'TRQ', 'CLS', 'CLD'].includes(position)) return 'mid'
  return 'att'
}

function buildAdvice(position) {
  const family = roleFamily(position)
  if (family === 'gk') {
    return {
      build: ['Stabilità porta', 'Reattività', 'Gestione area'],
      skills: [],
      strengths: ['Porta sicurezza nelle situazioni dentro l’area', 'Riduce il rischio sulle conclusioni ravvicinate'],
      strengthsEn: ['Adds security inside the box', 'Reduces risk on close-range shots'],
      risks: ['Diventa rotazione quando hai già un portiere affidabile e completo'],
      risksEn: ['Becomes rotation when you already have a reliable complete goalkeeper'],
      lever: 'Stabilità porta',
      leverEn: 'Goal stability',
      use: 'Usalo come portiere titolare quando vuoi ridurre errori e rimbalzi in area.',
      useEn: 'Use him as starting goalkeeper when you want fewer errors and rebounds in the box.'
    }
  }
  if (family === 'def') {
    return {
      build: ['Copertura', 'Duelli', 'Recupero palla'],
      skills: [],
      strengths: ['Rinforza copertura e duelli difensivi', 'Aggiunge presenza nelle chiusure e nei recuperi'],
      strengthsEn: ['Improves defensive coverage and duels', 'Adds presence in blocks and recoveries'],
      risks: ['Diventa doppione quando hai già difensori rapidi con Intercettazione e Blocco'],
      risksEn: ['Becomes a duplicate when you already have fast defenders with Interception and Blocker'],
      lever: 'Copertura e recupero',
      leverEn: 'Coverage and recovery',
      use: 'Usalo per proteggere il lato scoperto e recuperare campo dopo perdita palla.',
      useEn: 'Use him to protect the exposed side and recover ground after losing possession.'
    }
  }
  if (family === 'mid') {
    return {
      build: ['Costruzione', 'Continuità', 'Connessione reparti'],
      skills: [],
      strengths: ['Aumenta qualità tra costruzione e rifinitura', 'Dà più continuità al possesso e alle uscite centrali'],
      strengthsEn: ['Improves build-up and chance creation', 'Adds continuity to possession and central exits'],
      risks: ['Diventa rotazione quando il centrocampo è già coperto da passaggio e filtro'],
      risksEn: ['Becomes rotation when midfield already has passing and defensive coverage'],
      lever: 'Connessione tra reparti',
      leverEn: 'Team-line connection',
      use: 'Usalo per collegare difesa e attacco, non come semplice giocatore da inserimento.',
      useEn: 'Use him to connect defence and attack, not just as a runner.'
    }
  }
  return {
    build: ['Profondità', 'Finalizzazione', '1 contro 1'],
    skills: [],
    strengths: ['Aggiunge minaccia offensiva immediata', 'Alza profondità, ritmo e presenza negli ultimi metri'],
    strengthsEn: ['Adds immediate attacking threat', 'Raises depth, tempo and presence in the final third'],
    risks: ['Diventa doppione quando hai già attaccanti rapidi con finalizzazione e movimento simili'],
    risksEn: ['Becomes a duplicate when you already have fast forwards with similar finishing and movement'],
    lever: 'Profondità offensiva',
    leverEn: 'Attacking depth',
    use: 'Usalo per attaccare spazio e chiudere azioni, non per abbassarsi a costruire.',
    useEn: 'Use him to attack space and finish moves, not to drop deep for build-up.'
  }
}

function scoreFor(overall, position) {
  const familyBoost = roleFamily(position) === 'att' ? 2 : roleFamily(position) === 'def' ? 1 : 0
  return Math.min(94, Math.max(68, overall - 4 + familyBoost))
}

function verdictFor(score) {
  if (score >= 88) return 'top'
  if (score >= 81) return 'good'
  if (score >= 74) return 'situational'
  return 'skip'
}

function enrichCard(card) {
  const normalized = {
    style: 'Profilo da analizzare',
    ...card,
    imageUrl: card.imageUrl || imageByName[card.name] || ''
  }
  const score = scoreFor(normalized.overall, normalized.position)
  return {
    ...normalized,
    id: normalized.id || `${normalizeKey(normalized.category)}-${normalizeKey(normalized.name)}-${normalized.position}-${normalized.overall}`,
    score: normalized.score ?? score,
    verdict: normalized.verdict || verdictFor(score),
    ...buildAdvice(normalized.position),
    lever: normalized.lever || buildAdvice(normalized.position).lever,
    leverEn: normalized.leverEn || buildAdvice(normalized.position).leverEn,
    use: normalized.use || buildAdvice(normalized.position).use,
    useEn: normalized.useEn || buildAdvice(normalized.position).useEn,
    missing: normalized.missing || ['Con la rosa completa il verdetto legge movimenti, stile e incastri con i giocatori già in campo.'],
    missingEn: normalized.missingEn || ['With a complete roster, the verdict reads movements, style, and links with the players already on the pitch.']
  }
}

function makeCard(name, overall, position, category, style = 'Profilo da analizzare') {
  const score = scoreFor(overall, position)
  return enrichCard({
    id: `${normalizeKey(category)}-${normalizeKey(name)}-${position}-${overall}`,
    name,
    position,
    overall,
    category,
    style,
    imageUrl: imageByName[name] || '',
    score,
    verdict: verdictFor(score)
  })
}

function makeRelease(id, name, date, category, rows, status = 'active') {
  return {
    id,
    name,
    date,
    status,
    cards: rows.map(([playerName, overall, position, style]) => makeCard(playerName, overall, position, category, style))
  }
}

const releases = [
  makeRelease('standout-guardians-season-best', "Standout Guardians 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Gabriel Magalhaes', 86, 'DC'], ['Gianluigi Donnarumma', 86, 'PT'], ['Achraf Hakimi', 86, 'TD'],
    ['Leonardo Spinazzola', 80, 'TS'], ['Ramy Bensebaini', 80, 'DC'], ['Nordi Mukiele', 84, 'TD'],
    ['Boubacar Kamara', 82, 'MED'], ['Clinton Mata', 79, 'DC'], ['Jakub Kiwior', 83, 'DC'],
    ['Robin Risser', 80, 'PT'], ['Sidny Cabral', 77, 'TD']
  ]),
  makeRelease('standout-midfielders-season-best', "Standout Midfielders 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Antoine Semenyo', 86, 'CLS'], ['Federico Valverde', 86, 'CC'], ['Elliot Anderson', 85, 'MED'],
    ['Pierre Hojbjerg', 81, 'CC'], ['Kouadio Kone', 81, 'CC'], ['Vitaly Janelt', 80, 'MED'],
    ['Ismael Saibari', 80, 'TRQ'], ['Martin Baturina', 82, 'CC'], ['Valentin Barco', 81, 'CC'],
    ['Tyler Morton', 80, 'MED'], ['Darko Nejasmic', 78, 'MED']
  ]),
  makeRelease('highlight-9-may-26', "Highlight 9 May '26", '9 May 2026', 'Highlight', [
    ['Antoine Griezmann', 85, 'P'], ['Geoffrey Kondogbia', 81, 'MED'], ['Stefan Savic', 80, 'DC'], ['Lucas Hernandez', 82, 'DC']
  ]),
  makeRelease('j1-league-selection-7-may-26', "J1 LEAGUE Selection 7 May '26", '7 May 2026', 'Selection', [
    ['Hiroki Sakai', 83, 'TD'], ['Zico', 84, 'TRQ'], ['Genta Miura', 77, 'DC'], ['Koya Kitagawa', 76, 'P'],
    ['Motohiko Nakajima', 76, 'SP'], ['Shunya Yoneda', 75, 'TS'], ['Shintaro Nago', 76, 'TRQ'],
    ['Tetsushi Yamakawa', 77, 'DC'], ['Reon Yamahara', 76, 'TS'], ['Akito Suzuki', 78, 'P'],
    ['George Onaiwu', 74, 'CLD'], ['Eiji Miyamoto', 76, 'CC'], ['Soichiro Mori', 74, 'TD'], ['Yoon Sung-Jun', 75, 'CC']
  ]),
  makeRelease('brasileirao-selection-7-may-26', "Brasileirao Betano Selection 7 May '26", '7 May 2026', 'Selection', [
    ['Alvaro Barreal', 80, 'CLS'], ['Vitor Roque', 82, 'P'], ['Damian Bobadilla', 81, 'CC'], ['Lucas Moura', 81, 'SP'],
    ['Jorginho', 81, 'MED'], ['Ze Ivaldo', 79, 'DC'], ['Luan Peres', 79, 'DC'], ['Ademir', 80, 'ESA'],
    ['Bruno Fuchs', 79, 'DC'], ['Raniele', 80, 'MED'], ['Viery', 77, 'DC'], ['Gustavo Henrique', 81, 'DC']
  ]),
  makeRelease('naruto-collab-2026', 'NARUTO SHIPPUDEN Collaboration Campaign 2026', 'May 2026', 'Collaboration', [
    ['Takefusa Kubo', 95, 'CLD', 'Roaming Flank'], ['Robert Lewandowski', 95, 'P', 'Fox in the Box'],
    ['Neymar Jr', 95, 'SP'], ['Martin Odegaard', 95, 'TRQ'], ['Luka Modric', 94, 'CC'],
    ['Christian Pulisic', 95, 'SP'], ['Rafael Leao', 95, 'ESA'], ['Alexis Saelemaekers', 94, 'CLD']
  ]),
  makeRelease('standout-attackers-season-best', "Standout Attackers 25-26 Season's Best", 'May 2026', 'Standout', [
    ['Bruno Fernandes', 87, 'TRQ'], ['Vinicius Junior', 87, 'ESA'], ['Ousmane Dembele', 87, 'P', 'Goal Poacher'],
    ['Gerard Moreno', 82, 'P'], ['Dennis Man', 78, 'EDA'], ['Luis Suarez', 80, 'P'],
    ['Igor Paixao', 81, 'ESA'], ['Charles De Ketelaere', 82, 'SP'], ['Ferran Jutgla', 78, 'P'],
    ['Jonathan Burkardt', 83, 'P'], ['Anis Hadj Moussa', 79, 'EDA']
  ]),
  makeRelease('worldwide-clubs-selection-30-apr-26', "Worldwide Clubs Selection 30 Apr '26", '30 Apr 2026', 'Selection', [
    ['P. E. Aubameyang', 86, 'P'], ['Marcelo', 86, 'TS'], ['Gareth Bale', 88, 'EDA'], ['Thiago Silva', 81, 'DC'],
    ['Isco', 82, 'TRQ'], ['Hamari Traore', 80, 'TD'], ['Jonas Hofmann', 80, 'TRQ'], ['Santi Comesana', 80, 'CC'],
    ['Jorgen Strand Larsen', 81, 'P'], ['Andreas Schjelderup', 81, 'ESA'], ['Lucas Beraldo', 83, 'DC']
  ]),
  makeRelease('encore-new-year-2026', 'Encore New Year 2026', '2026', 'Encore', [], 'needs_review')
]

function normalizeRelease(release) {
  return {
    ...release,
    cards: Array.isArray(release.cards) ? release.cards.map(enrichCard) : []
  }
}

function getVerdictMeta(verdict, labels) {
  const map = {
    top: { label: labels.topPick, color: '#22c55e', bg: 'rgba(34,197,94,0.16)' },
    good: { label: labels.goodPick, color: '#00d4ff', bg: 'rgba(0,212,255,0.14)' },
    situational: { label: labels.situationalPick, color: '#fbbf24', bg: 'rgba(251,191,36,0.14)' },
    skip: { label: labels.skipPick, color: '#fb7185', bg: 'rgba(251,113,133,0.14)' }
  }
  return map[verdict] || map.situational
}

function CardImage({ card, labels, large = false }) {
  const [failed, setFailed] = React.useState(!card.imageUrl)
  return (
    <div className={`card-art ${large ? 'card-art-large' : ''}`}>
      {!failed ? (
        <img
          src={proxiedImageUrl(card.imageUrl)}
          alt={card.name}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="card-art-fallback">
          <div className="player-silhouette" aria-hidden="true">
            <span className="player-head" />
            <span className="player-body" />
            <span className="player-leg player-leg-left" />
            <span className="player-leg player-leg-right" />
            <span className="player-ball" />
          </div>
        </div>
      )}
      <div className="card-art-brand-layer" aria-hidden="true">
        <span className="card-art-brand-logo" />
        <span className="card-art-brand-stamp" />
      </div>
      <div className="card-art-top">
        <span>{card.overall}</span>
        <small>{card.position}</small>
      </div>
      <div className="card-art-name">{card.name}</div>
    </div>
  )
}

function StatPill({ children }) {
  return <span className="stat-pill">{children}</span>
}

function listFor(card, key, lang) {
  if (lang === 'en' && Array.isArray(card[`${key}En`])) return card[`${key}En`]
  return card[key] || []
}

function proxiedImageUrl(src) {
  if (!src) return ''
  return `/api/card-advisor-lab/image?src=${encodeURIComponent(src)}`
}

function buildRosterSummary(data) {
  const players = Array.isArray(data?.players) ? data.players : []
  const starters = players.filter(player => player?.slot_index != null && Number(player.slot_index) >= 0 && Number(player.slot_index) <= 10)
  const hasRoster = players.length > 0
  const hasFormation = Boolean(data?.layout?.formation) && starters.length > 0
  const hasActiveCoach = Boolean(data?.activeCoach || data?.hasActiveCoach)
  const hasTacticalSettings = Boolean(data?.tacticalSettings?.team_playing_style)
  const roleCounts = players.reduce((acc, player) => {
    const position = player?.position || '?'
    acc[position] = (acc[position] || 0) + 1
    return acc
  }, {})
  return {
    status: hasRoster ? 'ready' : 'missing',
    depth: !hasRoster ? 'card_only' : !hasFormation ? 'roster_only' : hasActiveCoach ? 'system' : 'formation',
    totalPlayers: players.length,
    starters: starters.length,
    formation: data?.layout?.formation || '-',
    players,
    startersList: starters,
    roleCounts,
    profile: data?.profile || {},
    activeCoach: data?.activeCoach || null,
    tacticalSettings: data?.tacticalSettings || null,
    hasRoster,
    hasFormation,
    hasActiveCoach,
    hasTacticalSettings,
    hasGameAnalysis: !!data?.gameAnalysis?.stats
  }
}

function getSameRolePlayers(rosterSummary, position) {
  const players = Array.isArray(rosterSummary?.players) ? rosterSummary.players : []
  return players
    .filter(player => player?.position === position)
    .sort((a, b) => {
      const slotA = Number(a.slot_index)
      const slotB = Number(b.slot_index)
      const starterA = Number.isFinite(slotA) && slotA >= 0 && slotA <= 10 ? 1 : 0
      const starterB = Number.isFinite(slotB) && slotB >= 0 && slotB <= 10 ? 1 : 0
      return starterB - starterA
    })
    .slice(0, 3)
}

function getCoachConnectionLabel(activeCoach) {
  const connection = activeCoach?.connection
  if (!connection || typeof connection !== 'object') return ''
  return connection.name || connection.connection || connection.title || connection.label || ''
}

function getFitSummary(card, rosterSummary, labels, lang) {
  const sameRole = getSameRolePlayers(rosterSummary, card.position)
  const depth = rosterSummary?.depth || 'card_only'
  if (depth === 'card_only') {
    return {
      title: labels.rosterMissingTitle,
      text: lang === 'en'
        ? `${card.name} is read as a technical profile: role, style and native skills. Add your roster to unlock the team synergy read.`
        : `${card.name} ha una lettura tecnica chiara: ruolo, stile e abilita native. Aggiungi la rosa per sbloccare la sinergia squadra.`,
      priority: labels.cardProfileOnly,
      alternatives: [],
      cta: labels.loadRoster,
      ctaTarget: 'roster'
    }
  }

  const best = sameRole[0]
  const roleCount = rosterSummary.roleCounts?.[card.position] || 0
  let priority = labels.synergyMedium
  if (roleCount === 0) priority = labels.synergyHigh
  if (roleCount >= 2) priority = labels.synergyLow

  if (depth === 'roster_only') {
    const text = lang === 'en'
      ? best
        ? `${card.name} adds a different profile in the ${card.position} zone, but a saved formation is needed to read movements around your starters.`
        : `${card.name} covers a zone where your roster has less direct coverage. Save a formation to read the real movement fit.`
      : best
        ? `${card.name} aggiunge un profilo diverso nella zona ${card.position}, ma serve una formazione salvata per leggere i movimenti attorno ai titolari.`
        : `${card.name} copre una zona dove la tua rosa ha meno copertura diretta. Salva una formazione per leggere il vero fit di movimento.`

    return {
      title: labels.noFormationTitle,
      text,
      priority: labels.rosterSynergy,
      alternatives: sameRole,
      cta: labels.saveFormationCta,
      ctaTarget: 'formation'
    }
  }

  const baseText = lang === 'en'
    ? best
      ? `${card.name} is read against the movements already present in your players, especially the spaces occupied around ${card.position}.`
      : `${card.name} covers a lane that is not clearly occupied in your saved formation.`
    : best
      ? `${card.name} si lega ai movimenti già presenti nei tuoi giocatori, soprattutto agli spazi occupati attorno a ${card.position}.`
      : `${card.name} copre una corsia non occupata in modo chiaro nella formazione salvata.`

  if (depth === 'formation') {
    return {
      title: labels.moduleFit,
      text: `${baseText} ${labels.noCoachText}`,
      priority: labels.moduleFit,
      alternatives: sameRole,
      cta: labels.addCoachCta,
      ctaTarget: 'coach'
    }
  }

  return {
    title: labels.howToUse,
    text: lang === 'en'
      ? `${baseText} The read includes style, movement chains and how the card changes your current spacing.`
      : `${baseText} La lettura include stile, catene di movimento e come la carta cambia gli spazi attuali.`,
    priority,
    alternatives: sameRole,
    cta: null,
    ctaTarget: null
  }
}

function ReleaseCard({ card, selected, labels, onSelect }) {
  const readableStyle = card.style && card.style !== 'Profilo da analizzare'
    ? card.style
    : labels.analyzeSynergy
  return (
    <button
      type="button"
      className={`release-card ${selected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <CardImage card={card} labels={labels} />
      <div className="release-card-body">
        <div className="release-card-heading">
          <div>
            <h3>{card.name}</h3>
            <p>{card.category} · {card.position} · {readableStyle}</p>
          </div>
          <ChevronRight size={18} />
        </div>
        <div className="score-row">
          <span>{card.category}</span>
          <strong>{labels.analyzeSynergy}</strong>
        </div>
      </div>
    </button>
  )
}

function RosterStatusPanel({ labels, rosterSummary, onLoadRoster, onOpenCoach }) {
  const isLoading = rosterSummary.status === 'loading'
  const isReady = rosterSummary.status === 'ready'
  const isUnavailable = rosterSummary.status === 'unavailable'
  const isRosterOnly = rosterSummary.depth === 'roster_only'
  const isFormationOnly = rosterSummary.depth === 'formation'
  const title = isLoading
    ? labels.checkingRoster
    : isReady
      ? isRosterOnly
        ? labels.noFormationTitle
        : labels.rosterReadyTitle
      : isUnavailable
        ? labels.rosterUnavailableTitle
        : labels.rosterMissingTitle
  const text = isReady
    ? isRosterOnly
      ? labels.noFormationText
      : isFormationOnly
        ? `${labels.rosterReadyText} ${labels.noCoachText}`
        : labels.rosterReadyText
    : isUnavailable
      ? labels.rosterUnavailableText
      : labels.rosterMissingText

  return (
    <section className={`roster-status-panel ${isReady ? 'ready' : ''}`}>
      <div className="roster-status-main">
        <span className="mini-kicker">{labels.teamFit}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <div className="roster-status-side">
        <div className="roster-metrics">
          <div>
            <span>{labels.rosterPlayers}</span>
            <strong>{isLoading ? '...' : rosterSummary.totalPlayers ?? 0}</strong>
          </div>
          <div>
            <span>{labels.rosterStarters}</span>
            <strong>{isLoading ? '...' : rosterSummary.starters ?? 0}</strong>
          </div>
          <div>
            <span>{labels.rosterFormation}</span>
            <strong>{isLoading ? '...' : rosterSummary.formation || '-'}</strong>
          </div>
        </div>
        {(!isReady || isRosterOnly || isFormationOnly) && (
          <button type="button" onClick={isFormationOnly ? onOpenCoach : onLoadRoster}>
            {isRosterOnly ? labels.saveFormationCta : isFormationOnly ? labels.addCoachCta : labels.loadRoster}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </section>
  )
}

function DetailPanel({
  card,
  labels,
  lang,
  rosterSummary,
  evaluation,
  evaluating,
  deepAnalysis,
  deepAnalysisLoading,
  deepAnalysisError,
  onRequestDeepAnalysis,
  onOpenFormation,
  onOpenCoach,
  onClose
}) {
  const [showSynergyDetails, setShowSynergyDetails] = React.useState(false)
  const [showDeepFullReport, setShowDeepFullReport] = React.useState(false)
  const verdict = getVerdictMeta(card.verdict, labels)
  const fitSummary = getFitSummary(card, rosterSummary, labels, lang)
  const serverEval = evaluation || null
  const lever = serverEval?.mainLever || (lang === 'en' ? (card.leverEn || card.lever) : card.lever)
  const effectiveTitle = evaluating ? labels.loadingDecision : (serverEval?.title || fitSummary.title)
  const effectivePriority = evaluating ? '...' : (serverEval?.teamSynergy?.label || serverEval?.decision?.label || serverEval?.synergyLevel || fitSummary.priority)
  const effectiveFitText = serverEval?.whyItMatters?.length ? serverEval.whyItMatters.join(' ') : fitSummary.text
  const effectiveCoachText = serverEval?.context?.activeCoachName
    ? (lang === 'en'
        ? `Coach active: ${serverEval.context.activeCoachName}. The verdict uses team style and coach competences.`
        : `Coach attivo: ${serverEval.context.activeCoachName}. Il verdetto usa stile squadra e competenze coach.`)
    : ''
  const fitReadLines = serverEval?.rosterRead?.length
    ? serverEval.rosterRead
    : effectiveFitText
      ? [effectiveFitText]
      : []
  const effectiveCta = serverEval?.nextCta || (fitSummary.cta ? { label: fitSummary.cta, target: fitSummary.ctaTarget } : null)
  const teamSynergy = serverEval?.teamSynergy || null
  const teamSynergyScore = evaluating
    ? 0
    : Math.max(0, Math.min(100, Number(teamSynergy?.score || serverEval?.score || card.score || 0)))
  const teamSynergyLabel = evaluating ? '...' : (teamSynergy?.label || effectivePriority)
  const teamSynergySummary = evaluating
    ? (lang === 'en' ? 'Reading your team context...' : 'Sto leggendo il contesto della tua squadra...')
    : (teamSynergy?.summary || fitReadLines[0] || effectiveFitText)
  const teamSynergyDetails = Array.isArray(teamSynergy?.details) ? teamSynergy.details : []
  const coachAdvice = teamSynergy?.coachAdvice || null
  const recommendedUseLine = teamSynergy?.useLine || serverEval?.recommendedUse || fitReadLines[1] || effectiveFitText
  const heroProfile = serverEval?.technicalProfile?.find(item => item.toLowerCase().startsWith(lang === 'en' ? 'style:' : 'stile:'))
  const readableStyle = heroProfile
    ? heroProfile.replace(/^Style:\s*/i, '').replace(/^Stile:\s*/i, '')
    : card.style && card.style !== 'Profilo da analizzare'
      ? card.style
      : labels.analyzeSynergy
  return (
    <section className="detail-panel">
      {onClose && (
        <button
          type="button"
          className="detail-close-button"
          onClick={onClose}
          aria-label={labels.closeDetails}
        >
          <X size={18} />
        </button>
      )}
      <div className="detail-hero">
        <CardImage card={card} labels={labels} large />
        <div className="detail-copy">
          <span className="mini-kicker">{labels.currentRelease}</span>
          <h2>{card.name}</h2>
          <p>{card.category} · {card.position} · {readableStyle}</p>
          <div className="detail-metrics">
            <div>
              <span>{labels.cardScore}</span>
              <strong>{teamSynergyLabel}</strong>
            </div>
            <div>
              <span>{labels.cardIdentity}</span>
              <strong>{readableStyle}</strong>
            </div>
            <div>
              <span>{labels.role}</span>
              <strong>{card.position}</strong>
            </div>
          </div>
          <div className="verdict-banner" style={{ borderColor: verdict.color }}>
            <CheckCircle2 size={18} style={{ color: verdict.color }} />
            <span>{labels.verdict}: <strong style={{ color: verdict.color }}>{effectiveTitle}</strong></span>
          </div>
          <div className="team-synergy-card">
            <div className="team-synergy-head">
              <span>{labels.teamSynergyScore}</span>
              <strong>{teamSynergyScore}%</strong>
            </div>
            <div className="team-synergy-bar" aria-label={`${labels.teamSynergyScore}: ${teamSynergyScore}%`}>
              <span style={{ width: `${teamSynergyScore}%` }} />
            </div>
            <div className="team-synergy-caption">
              <strong>{teamSynergyLabel}</strong>
              <p>{teamSynergySummary}</p>
            </div>
            {teamSynergyDetails.length > 0 && (
              <>
                <button
                  type="button"
                  className="team-synergy-details-toggle"
                  onClick={() => setShowSynergyDetails(value => !value)}
                  aria-expanded={showSynergyDetails}
                >
                  {showSynergyDetails ? labels.hideDetails : labels.viewDetails}
                  <ChevronRight size={15} />
                </button>
                {showSynergyDetails && (
                  <div className="team-synergy-details" aria-label={labels.synergyDetails}>
                    {teamSynergyDetails.map(detail => (
                      <div key={detail.key} className="team-synergy-detail-item">
                        <div>
                          <span>{detail.label}</span>
                        </div>
                        <p>{detail.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {coachAdvice && (
        <div className="coach-advice-card">
          <span>{labels.coachAdvice}</span>
          <h3>{coachAdvice.title}</h3>
          <p>{coachAdvice.text}</p>
          {coachAdvice.action && <strong>{coachAdvice.action}</strong>}
        </div>
      )}

      <div className="deep-analysis-entry">
        <div>
          <span>{labels.deepAnalysisTitle}</span>
          <p>{deepAnalysis ? deepAnalysis.headline : `${labels.deepAnalysisCta} · ${labels.deepAnalysisCost}`}</p>
        </div>
        {!deepAnalysis && (
          <button type="button" onClick={onRequestDeepAnalysis} disabled={deepAnalysisLoading}>
            {deepAnalysisLoading ? labels.deepAnalysisLoading : `${labels.deepAnalysisCta} · ${labels.deepAnalysisCost}`}
          </button>
        )}
      </div>
      {deepAnalysisError && <p className="deep-analysis-error">{deepAnalysisError}</p>}
      {deepAnalysis && (
        <div className="deep-analysis-report">
          <div className="deep-analysis-summary">
            <span>{labels.deepAnalysisTitle}</span>
            <h3>{deepAnalysis.headline}</h3>
            <p>{deepAnalysis.summary}</p>
          </div>
          {deepAnalysis.key_reasoning?.length > 0 && (
            <div className="deep-reasoning-list">
              <h4>{labels.deepKeyReasoning}</h4>
              {deepAnalysis.key_reasoning.map(item => (
                <article key={`${item.label}-${item.text}`}>
                  {item.label && <span>{item.label}</span>}
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          )}
          <button
            type="button"
            className="deep-report-toggle"
            onClick={() => setShowDeepFullReport(value => !value)}
            aria-expanded={showDeepFullReport}
          >
            {showDeepFullReport ? labels.deepHideFull : labels.deepShowFull}
            <ChevronRight size={15} />
          </button>
          {showDeepFullReport && (
            <>
              <div className="deep-analysis-grid">
                <article>
                  <h4>{labels.deepPros}</h4>
                  <ul>{(deepAnalysis.pros || []).map(item => <li key={item}>{item}</li>)}</ul>
                </article>
                <article>
                  <h4>{labels.deepCons}</h4>
                  <ul>{(deepAnalysis.cons || []).map(item => <li key={item}>{item}</li>)}</ul>
                </article>
                <article>
                  <h4>{labels.deepSynergies}</h4>
                  <ul>{(deepAnalysis.synergies || []).map(item => <li key={item}>{item}</li>)}</ul>
                </article>
                <article>
                  <h4>{labels.deepHowToUse}</h4>
                  <ul>{(deepAnalysis.how_to_use || []).map(item => <li key={item}>{item}</li>)}</ul>
                </article>
              </div>
              {(deepAnalysis.when_to_avoid?.length > 0 || deepAnalysis.final_decision) && (
                <div className="deep-analysis-final">
                  {deepAnalysis.when_to_avoid?.length > 0 && (
                    <div>
                      <h4>{labels.deepWhenAvoid}</h4>
                      <ul>{deepAnalysis.when_to_avoid.map(item => <li key={item}>{item}</li>)}</ul>
                    </div>
                  )}
                  {deepAnalysis.final_decision && (
                    <div>
                      <h4>{labels.deepFinalDecision}</h4>
                      <p>{deepAnalysis.final_decision}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="detail-grid">
        <article>
          <h3><TrendingUp size={18} /> {labels.mainLever}</h3>
          <div className="pill-row">
            <StatPill>{lever}</StatPill>
          </div>
        </article>

        <article>
          <h3><Sparkles size={18} /> {labels.nativeSkills}</h3>
          <div className="pill-row">
            {(serverEval?.technicalProfile || card.skills).length > 0
              ? (serverEval?.technicalProfile || card.skills).map(item => <StatPill key={item}>{item}</StatPill>)
              : <StatPill>{labels.noNativeSkills}</StatPill>}
          </div>
        </article>

      </div>

      <div className="fit-panel">
        <div>
          <h3><Users size={18} /> {labels.howToUse}</h3>
          <p>{recommendedUseLine}</p>
          <div className="fit-summary-grid">
            <div>
              <span>{labels.priorityVerdict}</span>
              <strong>{teamSynergyLabel}</strong>
            </div>
          </div>
          {serverEval?.context?.hasCoach && effectiveCoachText && (
            <div className="fit-logic-list">
              <span>{labels.coachContext}: {effectiveCoachText}</span>
            </div>
          )}
        </div>
        {effectiveCta && (
          <button
            type="button"
            onClick={effectiveCta.target === 'coach' ? onOpenCoach : onOpenFormation}
          >
            {effectiveCta.label}
            <ArrowRight size={16} />
          </button>
        )}
      </div>

    </section>
  )
}

function CardDetailsModal({
  card,
  labels,
  lang,
  rosterSummary,
  evaluation,
  evaluating,
  deepAnalysis,
  deepAnalysisLoading,
  deepAnalysisError,
  onRequestDeepAnalysis,
  onOpenFormation,
  onOpenCoach,
  onClose
}) {
  React.useEffect(() => {
    if (!card) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [card, onClose])

  if (!card) return null

  return (
    <div
      className="card-details-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${card.name} ${labels.verdict}`}
      onClick={onClose}
    >
      <div className="card-details-modal-inner" onClick={(event) => event.stopPropagation()}>
        <DetailPanel
          card={card}
          labels={labels}
          lang={lang}
          rosterSummary={rosterSummary}
          evaluation={evaluation}
          evaluating={evaluating}
          deepAnalysis={deepAnalysis}
          deepAnalysisLoading={deepAnalysisLoading}
          deepAnalysisError={deepAnalysisError}
          onRequestDeepAnalysis={onRequestDeepAnalysis}
          onOpenFormation={onOpenFormation}
          onOpenCoach={onOpenCoach}
          onClose={onClose}
        />
      </div>
    </div>
  )
}

export default withAuth(function CardAdvisorLabPage() {
  const router = useRouter()
  const { lang } = useTranslation()
  const labels = copy[lang === 'en' ? 'en' : 'it']
  const [liveReleases, setLiveReleases] = React.useState(null)
  const activeReleases = React.useMemo(() => (
    Array.isArray(liveReleases) && liveReleases.length > 0 ? liveReleases : releases
  ), [liveReleases])
  const [releaseId, setReleaseId] = React.useState(releases[0].id)
  const [rosterSummary, setRosterSummary] = React.useState({ status: 'loading', totalPlayers: 0, starters: 0, formation: '-' })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [evaluationsByCard, setEvaluationsByCard] = React.useState({})
  const [evaluatingCardId, setEvaluatingCardId] = React.useState(null)
  const [deepAnalysesByCard, setDeepAnalysesByCard] = React.useState({})
  const [deepAnalysisLoadingId, setDeepAnalysisLoadingId] = React.useState(null)
  const [deepAnalysisErrors, setDeepAnalysisErrors] = React.useState({})
  const cards = React.useMemo(() => {
    const baseCards = releaseId === 'all'
      ? activeReleases.flatMap(release => release.cards.map(card => ({ ...card, releaseName: release.name, releaseStatus: release.status })))
      : (activeReleases.find(release => release.id === releaseId)?.cards || []).map(card => ({
          ...card,
          releaseName: activeReleases.find(release => release.id === releaseId)?.name,
          releaseStatus: activeReleases.find(release => release.id === releaseId)?.status
        }))
    const query = searchQuery.trim().toLowerCase()
    if (!query) return baseCards
    return baseCards.filter(card => (
      card.name.toLowerCase().includes(query) ||
      card.position.toLowerCase().includes(query) ||
      card.category.toLowerCase().includes(query) ||
      String(card.releaseName || '').toLowerCase().includes(query)
    ))
  }, [activeReleases, releaseId, searchQuery])
  const [selectedId, setSelectedId] = React.useState(cards[0]?.id)
  const [detailsCardId, setDetailsCardId] = React.useState(null)

  React.useEffect(() => {
    setSelectedId(cards[0]?.id)
  }, [cards])

  React.useEffect(() => {
    let active = true

    async function loadReleases() {
      try {
        const response = await fetch('/api/card-advisor-lab/releases', { cache: 'no-store' })
        if (!response.ok) throw new Error('Unable to load card releases')
        const data = await response.json()
        const normalized = Array.isArray(data?.releases)
          ? data.releases.map(normalizeRelease).filter(release => release.cards.length > 0)
          : []

        if (!active) return
        if (normalized.length > 0) {
          setLiveReleases(normalized)
          setReleaseId(normalized[0].id)
        }
      } catch (error) {
        console.warn('[card-advisor-lab] live releases unavailable:', error)
      }
    }

    loadReleases()
    return () => {
      active = false
    }
  }, [])

  const selectedCard = cards.find(card => card.id === selectedId) || cards[0]
  const detailsCard = cards.find(card => card.id === detailsCardId) || null
  const detailsEvaluation = detailsCard ? evaluationsByCard[detailsCard.id] : null
  const detailsDeepAnalysis = detailsCard ? deepAnalysesByCard[detailsCard.id] : null
  const detailsDeepAnalysisError = detailsCard ? deepAnalysisErrors[detailsCard.id] : ''

  const requestDeepAnalysis = React.useCallback(async () => {
    if (!detailsCard?.id || deepAnalysesByCard[detailsCard.id] || deepAnalysisLoadingId) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return

    setDeepAnalysisLoadingId(detailsCard.id)
    setDeepAnalysisErrors(prev => ({ ...prev, [detailsCard.id]: '' }))
    try {
      const response = await fetch('/api/card-advisor-lab/deep-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ card: detailsCard, lang: lang === 'en' ? 'en' : 'it' })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.analysis) {
        throw new Error(data?.error || labels.deepAnalysisError)
      }
      setDeepAnalysesByCard(prev => ({ ...prev, [detailsCard.id]: data.analysis }))
    } catch (error) {
      setDeepAnalysisErrors(prev => ({
        ...prev,
        [detailsCard.id]: error?.message || labels.deepAnalysisError
      }))
    } finally {
      setDeepAnalysisLoadingId(null)
    }
  }, [deepAnalysesByCard, deepAnalysisLoadingId, detailsCard, labels.deepAnalysisError, lang])

  React.useEffect(() => {
    let active = true

    async function loadRosterSummary() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          if (active) setRosterSummary({ status: 'missing', totalPlayers: 0, starters: 0, formation: '-' })
          return
        }

        const [formationResponse, dashboardResponse] = await Promise.all([
          fetch(`/api/formation?t=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store'
            },
            cache: 'no-store'
          }),
          fetch(`/api/dashboard?t=${Date.now()}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store'
            },
            cache: 'no-store'
          })
        ])

        if (!formationResponse.ok) throw new Error('Unable to load formation status')
        const formationData = await formationResponse.json()
        const dashboardData = dashboardResponse.ok ? await dashboardResponse.json() : {}
        const data = {
          ...dashboardData,
          ...formationData,
          profile: dashboardData.profile,
          gameAnalysis: dashboardData.gameAnalysis
        }

        if (active) setRosterSummary(buildRosterSummary(data))
      } catch (error) {
        console.warn('[card-advisor-lab] roster status unavailable:', error)
        if (active) setRosterSummary({ status: 'unavailable', totalPlayers: 0, starters: 0, formation: '-' })
      }
    }

    loadRosterSummary()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    let active = true

    async function loadEvaluation() {
      if (!detailsCard?.id) return
      if (evaluationsByCard[detailsCard.id]) return
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      if (!token) return

      setEvaluatingCardId(detailsCard.id)
      try {
        const response = await fetch('/api/card-advisor-lab/evaluate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ card: detailsCard, lang: lang === 'en' ? 'en' : 'it' })
        })
        if (!response.ok) throw new Error('Evaluation failed')
        const data = await response.json()
        if (active && data?.evaluation) {
          setEvaluationsByCard(prev => ({ ...prev, [detailsCard.id]: data.evaluation }))
        }
      } catch (error) {
        console.warn('[card-advisor-lab] evaluation unavailable:', error)
      } finally {
        if (active) setEvaluatingCardId(null)
      }
    }

    loadEvaluation()
    return () => {
      active = false
    }
  }, [detailsCard, evaluationsByCard, lang])

  const selectedRelease = releaseId === 'all'
    ? { name: labels.allCards, cards: activeReleases.flatMap(release => release.cards), status: 'active' }
    : activeReleases.find(release => release.id === releaseId) || activeReleases[0]

  return (
    <main className="card-advisor-page">
      <section className="lab-hero">
        <div className="hero-copy">
          <span className="lab-eyebrow"><Zap size={14} /> {labels.eyebrow}</span>
          <h1>{labels.title}</h1>
          <p>{labels.subtitle}</p>
          <div className="hero-badges">
            <span><ShieldCheck size={15} /> {labels.notPublic}</span>
            <span><BarChart3 size={15} /> {labels.dataBadge}</span>
          </div>
        </div>
      </section>

      <section className="release-shell">
        <div className="release-header">
          <div>
            <span className="mini-kicker">{labels.releaseTitle}</span>
            <h2>{selectedRelease.name}</h2>
            <p>{labels.sourceNote}</p>
          </div>
          <div className="release-toolbar">
            <label className="release-search">
              <span>{labels.activePacks}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={labels.searchPlaceholder}
              />
            </label>
            <div className="release-count">
              <strong>{cards.length}</strong>
              <span>{labels.cardsAvailable}</span>
            </div>
          </div>
        </div>

        <div className="release-tabs" role="tablist" aria-label={labels.releaseTitle}>
          <button
            type="button"
            className={releaseId === 'all' ? 'active' : ''}
            onClick={() => setReleaseId('all')}
          >
            <strong>{labels.allCards}</strong>
            <span>{activeReleases.reduce((sum, release) => sum + release.cards.length, 0)}</span>
          </button>
          {activeReleases.map(release => (
            <button
              key={release.id}
              type="button"
              className={releaseId === release.id ? 'active' : ''}
              onClick={() => setReleaseId(release.id)}
            >
              <strong>{release.name}</strong>
              <span>{release.status === 'needs_review' ? labels.needsSourceReview : `${release.cards.length} ${labels.cardsAvailable}`}</span>
            </button>
          ))}
        </div>

        <RosterStatusPanel
          labels={labels}
          rosterSummary={rosterSummary}
          onLoadRoster={() => router.push('/gestione-formazione')}
          onOpenCoach={() => router.push('/allenatori')}
        />

        <div className="lab-grid">
          <aside className="cards-column">
            <p className="selected-hint">{labels.selectedHint}</p>
            <div className="cards-grid">
              {cards.length > 0 ? cards.map(card => (
                <ReleaseCard
                  key={card.id}
                  card={card}
                  labels={labels}
                  selected={selectedCard?.id === card.id}
                  onSelect={() => {
                    setSelectedId(card.id)
                    setDetailsCardId(card.id)
                  }}
                />
              )) : (
                <div className="empty-card-state">
                  <AlertTriangle size={20} />
                  <span>{selectedRelease.status === 'needs_review' ? labels.needsSourceReview : labels.noCardsFound}</span>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <CardDetailsModal
        card={detailsCard}
        labels={labels}
        lang={lang === 'en' ? 'en' : 'it'}
        rosterSummary={rosterSummary}
        evaluation={detailsEvaluation}
        evaluating={detailsCard?.id === evaluatingCardId}
        deepAnalysis={detailsDeepAnalysis}
        deepAnalysisLoading={detailsCard?.id === deepAnalysisLoadingId}
        deepAnalysisError={detailsDeepAnalysisError}
        onRequestDeepAnalysis={requestDeepAnalysis}
        onOpenFormation={() => router.push('/gestione-formazione')}
        onOpenCoach={() => router.push('/allenatori')}
        onClose={() => setDetailsCardId(null)}
      />

      <style jsx global>{`
        .card-advisor-page {
          width: min(1420px, 100%);
          margin: 0 auto;
          padding: clamp(18px, 3vw, 32px);
        }

        .lab-hero,
        .release-shell,
        .detail-panel {
          border: 1px solid rgba(0, 212, 255, 0.22);
          background:
            radial-gradient(circle at top right, rgba(138, 43, 226, 0.18), transparent 36%),
            linear-gradient(145deg, rgba(5, 12, 28, 0.94), rgba(2, 4, 12, 0.96));
          box-shadow: 0 0 28px rgba(0, 212, 255, 0.10), inset 0 1px 0 rgba(255,255,255,0.06);
          border-radius: 24px;
        }

        .lab-hero {
          display: block;
          padding: clamp(22px, 4vw, 36px);
          margin-bottom: 22px;
          overflow: hidden;
        }

        .lab-eyebrow,
        .mini-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #00d4ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          margin: 12px 0 10px;
          font-size: clamp(34px, 7vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.06em;
          color: #fff;
          text-shadow: 0 0 24px rgba(0,212,255,0.24);
        }

        .hero-copy p,
        .release-header p,
        .fit-panel p {
          color: rgba(255,255,255,0.72);
          line-height: 1.65;
        }

        .hero-copy p {
          max-width: 760px;
          font-size: clamp(15px, 2vw, 18px);
        }

        .hero-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 22px;
        }

        .hero-badges span,
        .release-tabs button,
        .stat-pill,
        .score-row span {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(0,212,255,0.18);
          background: rgba(0,212,255,0.08);
          color: rgba(255,255,255,0.86);
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
        }

        .release-shell {
          padding: clamp(18px, 3vw, 26px);
        }

        .release-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 20px;
        }

        .release-header h2 {
          margin: 6px 0;
          font-size: clamp(24px, 4vw, 36px);
          color: #fff;
        }

        .release-toolbar {
          display: flex;
          align-items: flex-end;
          justify-content: flex-end;
          gap: 12px;
          min-width: min(520px, 100%);
        }

        .release-search {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: min(360px, 100%);
        }

        .release-search span {
          color: rgba(255,255,255,0.58);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .release-search input {
          width: 100%;
          min-height: 44px;
          border: 1px solid rgba(0,212,255,0.24);
          border-radius: 14px;
          background: rgba(2,4,12,0.42);
          color: #fff;
          padding: 0 14px;
          outline: none;
        }

        .release-search input:focus {
          border-color: rgba(0,212,255,0.58);
          box-shadow: 0 0 18px rgba(0,212,255,0.12);
        }

        .release-count {
          min-width: 112px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          background: rgba(255,255,255,0.05);
          padding: 9px 12px;
        }

        .release-count strong {
          display: block;
          color: #fff;
          font-size: 22px;
          line-height: 1;
        }

        .release-count span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.58);
          font-size: 11px;
        }

        .release-tabs {
          display: flex;
          overflow-x: auto;
          gap: 10px;
          margin: 0 0 18px;
          padding: 2px 2px 10px;
          scrollbar-width: thin;
        }

        .release-tabs button {
          cursor: pointer;
          color: rgba(255,255,255,0.74);
          flex: 0 0 min(260px, 78vw);
          justify-content: space-between;
          text-align: left;
          white-space: normal;
          min-height: 54px;
        }

        .release-tabs button.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.22), rgba(138,43,226,0.22));
          border-color: rgba(0,212,255,0.48);
          color: #fff;
          box-shadow: 0 0 18px rgba(0,212,255,0.16);
        }

        .release-tabs button strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .release-tabs button span {
          color: rgba(255,255,255,0.60);
          font-size: 11px;
          flex-shrink: 0;
        }

        .lab-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }

        .roster-status-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
          gap: 16px;
          align-items: stretch;
          margin: 0 0 20px;
          padding: 16px;
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 20px;
          background:
            radial-gradient(circle at top left, rgba(251,191,36,0.14), transparent 28%),
            rgba(255,255,255,0.045);
        }

        .roster-status-panel.ready {
          border-color: rgba(34,197,94,0.35);
          background:
            radial-gradient(circle at top left, rgba(34,197,94,0.16), transparent 28%),
            rgba(255,255,255,0.045);
        }

        .roster-status-main h3 {
          margin: 8px 0;
          color: #fff;
          font-size: clamp(18px, 2.4vw, 24px);
        }

        .roster-status-main p {
          margin: 0;
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
        }

        .roster-status-side {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 12px;
        }

        .roster-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .roster-metrics div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 10px;
          background: rgba(2,4,12,0.34);
          min-width: 0;
        }

        .roster-metrics span {
          display: block;
          color: rgba(255,255,255,0.52);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .roster-metrics strong {
          display: block;
          margin-top: 3px;
          color: #fff;
          font-size: clamp(18px, 3vw, 24px);
          line-height: 1.1;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .roster-status-side button {
          border: 1px solid rgba(0,212,255,0.42);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(138,43,226,0.20));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          width: 100%;
        }

        .selected-hint {
          margin: 0 0 12px;
          color: rgba(255,255,255,0.58);
          font-size: 13px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
        }

        .fit-summary-grid {
          display: grid;
          grid-template-columns: minmax(110px, 0.35fr) minmax(0, 1fr);
          gap: 10px;
          margin-top: 12px;
        }

        .fit-summary-grid div {
          border: 1px solid rgba(34,197,94,0.18);
          background: rgba(34,197,94,0.07);
          border-radius: 14px;
          padding: 10px;
          min-width: 0;
        }

        .fit-summary-grid span {
          display: block;
          color: rgba(255,255,255,0.56);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .fit-summary-grid strong {
          display: block;
          margin-top: 4px;
          color: #fff;
          font-size: 13px;
          line-height: 1.4;
        }

        .empty-card-state {
          border: 1px solid rgba(251,191,36,0.24);
          border-radius: 18px;
          background: rgba(251,191,36,0.08);
          color: rgba(255,255,255,0.82);
          min-height: 130px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 18px;
          text-align: center;
          grid-column: 1 / -1;
        }

        .card-details-modal {
          position: fixed;
          inset: 0;
          z-index: 1300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(12px, 3vw, 28px);
          background: rgba(2, 4, 12, 0.82);
          backdrop-filter: blur(10px);
        }

        .card-details-modal-inner {
          width: min(1040px, 100%);
          max-height: min(880px, calc(100vh - 32px));
          overflow-y: auto;
          border-radius: 24px;
          box-shadow: 0 0 50px rgba(0, 212, 255, 0.22);
        }

        .card-details-modal .detail-panel {
          position: relative;
          top: auto;
        }

        .detail-close-button {
          position: sticky;
          top: 0;
          margin-left: auto;
          margin-bottom: 10px;
          z-index: 3;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(2,4,12,0.76);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(0,0,0,0.35);
        }

        .release-card {
          width: 100%;
          text-align: left;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.045);
          border-radius: 18px;
          padding: 10px;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .release-card:hover,
        .release-card.selected {
          transform: translateY(-2px);
          border-color: rgba(0,212,255,0.45);
          box-shadow: 0 0 22px rgba(0,212,255,0.14);
        }

        .release-card-body {
          padding: 10px 2px 2px;
        }

        .release-card-heading {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }

        .release-card h3 {
          margin: 0;
          font-size: 15px;
          line-height: 1.2;
        }

        .release-card p {
          margin: 5px 0 0;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          line-height: 1.35;
        }

        .score-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-top: 10px;
        }

        .score-row strong {
          color: #fbbf24;
          font-size: 14px;
        }

        .card-art {
          --card-image-scale: 1.035;
          --card-image-x: 2.4%;
          --card-image-y: -0.4%;
          aspect-ratio: 3 / 4.12;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          background:
            radial-gradient(circle at 50% 35%, rgba(0,212,255,0.35), transparent 26%),
            linear-gradient(155deg, #17122f 0%, #09101f 42%, #2b1142 100%);
          border: 1px solid rgba(251,191,36,0.46);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,0.08), 0 0 20px rgba(138,43,226,0.18);
        }

        .card-art-large {
          width: min(235px, 34vw);
          flex: 0 0 auto;
        }

        .card-art img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          transform: translate(var(--card-image-x), var(--card-image-y)) scale(var(--card-image-scale));
          transform-origin: center top;
          display: block;
        }

        .card-art-brand-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(3,6,16,0.06) 0%, rgba(3,6,16,0.18) 100%);
        }

        .card-art-brand-logo {
          position: absolute;
          inset: 18% 11% 22%;
          background-image: url('/logo.png');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0.18;
          mix-blend-mode: screen;
          filter: drop-shadow(0 0 12px rgba(0,212,255,0.35));
        }

        .card-art-brand-stamp {
          position: absolute;
          top: 7px;
          right: 5px;
          z-index: 2;
          display: block;
          width: clamp(48px, 24%, 68px);
          aspect-ratio: 2.05;
        }

        .card-art-brand-stamp::before {
          content: '';
          position: absolute;
          inset: -3px -7px -3px -2px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(1,6,18,0.99), rgba(18,26,52,0.97));
          border: 1px solid rgba(255,255,255,0.38);
          box-shadow:
            0 2px 8px rgba(0,0,0,0.45),
            inset 0 0 0 1px rgba(0,212,255,0.18);
        }

        .card-art-brand-stamp::after {
          content: '';
          position: absolute;
          inset: 3px 5px;
          background: url('/logo.png') center / contain no-repeat;
        }

        .card-art::after {
          content: '';
          position: absolute;
          inset: 8px;
          border: 1px solid rgba(255,255,255,0.26);
          border-radius: 12px;
          pointer-events: none;
        }

        .card-art-fallback {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 30%, rgba(0,212,255,0.22), transparent 22%),
            linear-gradient(155deg, rgba(24,18,54,0.95), rgba(6,10,26,0.98));
        }

        .player-silhouette {
          position: relative;
          width: 58%;
          height: 62%;
          filter: drop-shadow(0 0 20px rgba(0,212,255,0.28));
        }

        .player-head,
        .player-body,
        .player-leg,
        .player-ball {
          position: absolute;
          display: block;
          background: linear-gradient(180deg, rgba(255,255,255,0.90), rgba(0,212,255,0.50));
        }

        .player-head {
          top: 2%;
          left: 42%;
          width: 18%;
          aspect-ratio: 1;
          border-radius: 50%;
        }

        .player-body {
          top: 20%;
          left: 34%;
          width: 31%;
          height: 38%;
          border-radius: 45% 45% 35% 35%;
          transform: rotate(-8deg);
        }

        .player-leg {
          top: 54%;
          width: 13%;
          height: 36%;
          border-radius: 999px;
          transform-origin: top center;
        }

        .player-leg-left {
          left: 36%;
          transform: rotate(18deg);
        }

        .player-leg-right {
          left: 53%;
          transform: rotate(-24deg);
        }

        .player-ball {
          right: 4%;
          bottom: 7%;
          width: 18%;
          aspect-ratio: 1;
          border-radius: 50%;
          background:
            radial-gradient(circle at 35% 35%, #fff, rgba(255,255,255,0.7) 34%, rgba(0,212,255,0.55) 35%, rgba(0,212,255,0.55));
          border: 1px solid rgba(255,255,255,0.55);
        }

        .card-art-top {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 3;
          display: flex;
          flex-direction: column;
          line-height: 1;
          text-shadow: 0 2px 12px rgba(0,0,0,0.7);
        }

        .card-art-top span {
          font-size: clamp(26px, 5vw, 42px);
          font-weight: 950;
        }

        .card-art-top small {
          margin-top: 4px;
          font-weight: 900;
          color: rgba(255,255,255,0.76);
        }

        .card-art-name {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          z-index: 3;
          border-radius: 10px;
          padding: 9px 8px;
          background: rgba(2,4,12,0.82);
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .detail-panel {
          padding: clamp(16px, 3vw, 22px);
          position: sticky;
          top: 18px;
        }

        .detail-hero {
          display: flex;
          gap: 20px;
          align-items: stretch;
        }

        .detail-copy {
          min-width: 0;
          flex: 1;
        }

        .detail-copy h2 {
          margin: 8px 0 6px;
          font-size: clamp(28px, 4vw, 44px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .detail-copy > p {
          color: rgba(255,255,255,0.66);
          margin-bottom: 16px;
        }

        .detail-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin: 16px 0;
        }

        .detail-metrics div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
        }

        .detail-metrics span {
          display: block;
          color: rgba(255,255,255,0.54);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .detail-metrics strong {
          display: block;
          margin-top: 4px;
          font-size: 24px;
          color: #fff;
        }

        .verdict-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid;
          border-radius: 14px;
          padding: 12px;
          background: rgba(255,255,255,0.05);
        }

        .team-synergy-card {
          margin-top: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 18px;
          padding: 14px;
          background:
            radial-gradient(circle at 85% 10%, rgba(34,197,94,0.14), transparent 34%),
            linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035));
          box-shadow: 0 16px 34px rgba(0,0,0,0.18);
        }

        .team-synergy-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 10px;
        }

        .team-synergy-head span {
          color: rgba(255,255,255,0.62);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.10em;
          font-weight: 900;
        }

        .team-synergy-head strong {
          color: #fff;
          font-size: clamp(24px, 4vw, 38px);
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .team-synergy-bar {
          position: relative;
          height: 14px;
          overflow: hidden;
          border-radius: 999px;
          background: linear-gradient(90deg, #ef4444 0%, #f97316 32%, #facc15 58%, #22c55e 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 22px rgba(34,197,94,0.18);
        }

        .team-synergy-bar::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.36), transparent 56%);
          pointer-events: none;
        }

        .team-synergy-bar span {
          position: absolute;
          inset: 0 auto 0 0;
          min-width: 8px;
          border-radius: inherit;
          background: rgba(255,255,255,0.18);
          border-right: 2px solid rgba(255,255,255,0.88);
          box-shadow: 0 0 22px rgba(255,255,255,0.28);
        }

        .team-synergy-caption {
          margin-top: 12px;
        }

        .team-synergy-caption strong {
          display: block;
          color: #fff;
          font-size: 15px;
          margin-bottom: 5px;
        }

        .team-synergy-caption p {
          margin: 0;
          color: rgba(255,255,255,0.76);
          font-size: 13px;
          line-height: 1.55;
        }

        .coach-advice-card {
          margin-top: 16px;
          border: 1px solid rgba(0,212,255,0.18);
          border-radius: 18px;
          padding: 16px;
          background:
            radial-gradient(circle at 8% 0%, rgba(0,212,255,0.12), transparent 32%),
            rgba(255,255,255,0.045);
        }

        .coach-advice-card span {
          display: inline-flex;
          color: var(--primary-cyan);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .coach-advice-card h3 {
          margin: 0 0 8px;
          color: #fff;
          font-size: clamp(18px, 3vw, 24px);
          letter-spacing: -0.02em;
        }

        .coach-advice-card p {
          margin: 0;
          color: rgba(255,255,255,0.80);
          line-height: 1.62;
          font-size: 14px;
        }

        .coach-advice-card strong {
          display: block;
          margin-top: 10px;
          color: #facc15;
          font-size: 13px;
          line-height: 1.5;
        }

        .deep-analysis-entry {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 1px solid rgba(251,191,36,0.22);
          border-radius: 18px;
          padding: 14px;
          background:
            radial-gradient(circle at 0% 0%, rgba(251,191,36,0.12), transparent 36%),
            rgba(255,255,255,0.04);
        }

        .deep-analysis-entry span,
        .deep-analysis-summary span {
          display: block;
          color: #facc15;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }

        .deep-analysis-entry p {
          margin: 0;
          color: rgba(255,255,255,0.78);
          font-size: 13px;
          line-height: 1.45;
        }

        .deep-analysis-entry button {
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #facc15, #f97316);
          color: #050814;
          min-height: 40px;
          padding: 9px 14px;
          font-weight: 950;
          cursor: pointer;
          white-space: nowrap;
        }

        .deep-analysis-entry button:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .deep-analysis-error {
          margin: 10px 0 0;
          color: #ff9d9d;
          font-size: 13px;
        }

        .deep-analysis-report {
          margin-top: 14px;
          border: 1px solid rgba(251,191,36,0.18);
          border-radius: 20px;
          padding: 16px;
          background:
            radial-gradient(circle at 90% 0%, rgba(251,191,36,0.10), transparent 34%),
            rgba(5,8,20,0.72);
        }

        .deep-analysis-summary h3 {
          margin: 0 0 8px;
          color: #fff;
          font-size: clamp(20px, 3vw, 28px);
          letter-spacing: -0.03em;
        }

        .deep-analysis-summary p,
        .deep-analysis-final p {
          margin: 0;
          color: rgba(255,255,255,0.80);
          line-height: 1.65;
          font-size: 14px;
        }

        .deep-reasoning-list {
          margin-top: 14px;
          display: grid;
          gap: 10px;
        }

        .deep-reasoning-list h4 {
          margin: 0;
          color: #fff;
          font-size: 15px;
        }

        .deep-reasoning-list article {
          border: 1px solid rgba(0,212,255,0.14);
          border-radius: 15px;
          padding: 12px;
          background: rgba(0,212,255,0.045);
        }

        .deep-reasoning-list article span {
          display: block;
          color: var(--primary-cyan);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .deep-reasoning-list article p {
          margin: 0;
          color: rgba(255,255,255,0.80);
          line-height: 1.58;
          font-size: 13px;
        }

        .deep-report-toggle {
          margin-top: 14px;
          border: 1px solid rgba(251,191,36,0.32);
          border-radius: 999px;
          background: rgba(251,191,36,0.08);
          color: #fff;
          min-height: 36px;
          padding: 8px 12px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .deep-report-toggle[aria-expanded="true"] svg {
          transform: rotate(90deg);
        }

        .deep-analysis-grid,
        .deep-analysis-final {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 14px;
        }

        .deep-analysis-grid article,
        .deep-analysis-final > div {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 13px;
          background: rgba(255,255,255,0.045);
        }

        .deep-analysis-grid h4,
        .deep-analysis-final h4 {
          margin: 0 0 9px;
          color: #fff;
          font-size: 14px;
        }

        .team-synergy-details-toggle {
          margin-top: 12px;
          border: 1px solid rgba(0,212,255,0.34);
          border-radius: 999px;
          background: rgba(0,212,255,0.09);
          color: #fff;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .team-synergy-details-toggle[aria-expanded="true"] svg {
          transform: rotate(90deg);
        }

        .team-synergy-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        .team-synergy-detail-item {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 14px;
          padding: 10px;
          background: rgba(3,6,16,0.34);
        }

        .team-synergy-detail-item div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 6px;
        }

        .team-synergy-detail-item span {
          color: rgba(255,255,255,0.62);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 900;
        }

        .team-synergy-detail-item p {
          margin: 0;
          color: rgba(255,255,255,0.72);
          font-size: 12px;
          line-height: 1.45;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .detail-grid-secondary {
          margin-top: 12px;
        }

        .detail-grid article,
        .fit-panel {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          padding: 14px;
          background: rgba(255,255,255,0.045);
        }

        .detail-grid h3,
        .fit-panel h3 {
          margin: 0 0 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          color: #fff;
        }

        .detail-grid article p {
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
          margin: 0;
          font-size: 13px;
        }

        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .stat-pill {
          border-color: rgba(251,191,36,0.20);
          background: rgba(251,191,36,0.08);
        }

        .card-advisor-page ul {
          margin: 0;
          padding-left: 18px;
          color: rgba(255,255,255,0.72);
          line-height: 1.55;
          font-size: 13px;
        }

        .fit-panel {
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .fit-logic-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .fit-logic-list span {
          display: inline-flex;
          border: 1px solid rgba(34,197,94,0.20);
          background: rgba(34,197,94,0.08);
          color: rgba(255,255,255,0.82);
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
        }

        .fit-panel button {
          border: 1px solid rgba(0,212,255,0.42);
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(0,212,255,0.18), rgba(138,43,226,0.20));
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 10px 14px;
          font-weight: 800;
          cursor: pointer;
          flex-shrink: 0;
        }

        @media (max-width: 1180px) {
          .lab-grid {
            grid-template-columns: 1fr;
          }

          .cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .lab-hero,
          .release-header,
          .detail-hero,
          .fit-panel,
          .roster-status-panel {
            grid-template-columns: 1fr;
            flex-direction: column;
          }

          .release-toolbar {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .release-search {
            min-width: 0;
            width: 100%;
          }

          .release-count {
            width: 100%;
          }

          .release-tabs {
            justify-content: flex-start;
            min-width: 0;
          }

          .card-art-large {
            width: min(240px, 82vw);
            align-self: center;
          }
        }

        @media (max-width: 720px) {
          .card-advisor-page {
            padding: 10px;
          }

          .lab-hero,
          .release-shell {
            border-radius: 18px;
            padding: 16px;
          }

          .hero-copy h1 {
            font-size: clamp(34px, 13vw, 48px);
            letter-spacing: -0.05em;
          }

          .hero-badges span {
            width: 100%;
            justify-content: center;
          }

          .cards-grid,
          .detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .team-synergy-details {
            grid-template-columns: 1fr;
          }

          .card-details-modal {
            align-items: flex-end;
            padding: 8px;
          }

          .card-details-modal-inner {
            width: 100%;
            max-height: calc(100vh - 16px);
            border-radius: 22px 22px 12px 12px;
          }

          .card-details-modal .detail-panel {
            padding: 14px;
          }

          .release-card {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .release-card-body {
            padding: 10px 2px 2px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .release-card h3 {
            font-size: 13px;
          }

          .release-card p {
            font-size: 11px;
          }

          .card-art-name {
            font-size: 11px;
            padding: 7px 6px;
          }

          .card-art-top {
            top: 8px;
            left: 8px;
            width: 36%;
            align-items: flex-start;
          }

          .card-art-top span {
            font-size: clamp(24px, 11vw, 34px);
            line-height: 0.9;
            max-width: 100%;
          }

          .card-art-top small {
            font-size: clamp(10px, 3.4vw, 13px);
            margin-top: 2px;
          }

          .card-art-large {
            width: min(220px, 76vw);
          }

          .detail-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .detail-metrics strong {
            font-size: 20px;
          }

          .fit-panel button {
            width: 100%;
          }

          .deep-analysis-entry,
          .deep-analysis-grid,
          .deep-analysis-final {
            grid-template-columns: 1fr;
          }

          .deep-analysis-entry {
            flex-direction: column;
            align-items: stretch;
          }

          .fit-summary-grid {
            grid-template-columns: 1fr;
          }

          .roster-metrics {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 420px) {
          .detail-metrics,
          .roster-metrics {
            grid-template-columns: 1fr;
          }

          .release-card {
            display: flex;
          }
        }
      `}</style>
    </main>
  )
})
