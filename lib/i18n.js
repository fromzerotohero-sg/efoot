"use client";

// Simple i18n system - Italian/English
export const translations = {
  it: {
    // Sidebar
    guide: "Guida",
    dashboard: "Dashboard",
    coachAI: "Coach AI",
    profile: "Profilo",
    yourSquad: "La tua squadra",
    matchHistory: "Cronologia Partite",
    charts: "Grafici",
    countermeasures: "Contromisure",
    videoTutorials: "Video tutorial",
    videoTutorialsSubtitle: "Guide rapide su YouTube",
    videoTutorialRoster: "Tutorial rosa",
    videoTutorialCoachGym: "Tutorial palestra coach",
    watchOnYoutube: "Guarda su YouTube",
    logout: "Logout",
    toggleMenu: "Apri/chiudi menu",
    appName: "From Zero to Hero",
    prelaunchAccessBadge: "Accesso privato prima del lancio pubblico",
    prelaunchThanksTitle: "Grazie per esserti registrato.",
    prelaunchAccountCreated:
      "Il tuo account è stato creato correttamente. L’accesso pubblico alla piattaforma non è ancora aperto.",
    prelaunchReservedAccessText:
      "In questa fase, l’accesso completo è riservato a partnership selezionate e accordi commerciali tramite codici dedicati.",
    prelaunchFeatureMatchesTitle: "Analisi delle partite",
    prelaunchFeatureMatchesText:
      "Una lettura più chiara delle partite, del contesto e di ciò che conta davvero per migliorare.",
    prelaunchFeatureSquadTitle: "Gestione rosa e formazione",
    prelaunchFeatureSquadText:
      "Uno spazio strutturato per lavorare su giocatori, ruoli, posizione e organizzazione della squadra.",
    prelaunchFeatureCoachTitle: "Coach AI",
    prelaunchFeatureCoachText:
      "Un supporto costruito per affiancarti con logica, continuità e personalizzazione.",
    prelaunchFeatureCounterTitle: "Contromisure e lettura tattica",
    prelaunchFeatureCounterText:
      "Indicazioni più utili per preparare le partite e ragionare meglio sulle scelte di gioco.",
    prelaunchCodeBadge: "Codice di accesso dedicato",
    prelaunchCodeTitle: "Hai già ricevuto un codice di accesso?",
    prelaunchCodeText:
      "Se hai ricevuto un codice riservato, inseriscilo qui sotto per sbloccare la piattaforma completa per questa sessione.",
    prelaunchCodePlaceholder: "Inserisci il codice di accesso",
    prelaunchCodeButton: "Sblocca accesso",
    prelaunchCodeButtonLoading: "Sto sbloccando l’accesso...",
    prelaunchCodeHint:
      "Questi codici di accesso anticipato sono riservati a partner commerciali selezionati e collaborazioni dedicate.",
    prelaunchInsideTitle: "Cosa troverai all’interno?",
    prelaunchInsideText:
      "Una piattaforma pensata per unire lettura delle partite, struttura della rosa, contesto tattico e supporto AI in un unico ambiente di lavoro serio.",
    prelaunchVisionAlt: "Visione della piattaforma",
    prelaunchNoCodeTitle: "Non hai ancora un codice?",
    prelaunchNoCodeText:
      "La tua registrazione è già valida. L’accesso pubblico verrà abilitato all’apertura ufficiale della piattaforma, mentre i codici riservati restano dedicati agli accessi commerciali anticipati selezionati.",
    prelaunchControlPanelButton: "Vai al pannello di controllo",
    prelaunchCodeEnterError: "Inserisci il codice di accesso che hai ricevuto.",
    prelaunchCodeUnlockError: "Impossibile sbloccare l’accesso.",
    prelaunchCodeUnlocked:
      "Accesso sbloccato. Ti sto portando nella piattaforma...",
    prelaunchCodeInvalid: "Codice di accesso non valido.",
    prelaunchGateCheckingTitle: "Verifica accesso...",
    prelaunchGateCheckingText: "Sto preparando la tua sessione.",
    loginSuccessKicker: "Zero to Hero",
    loginSuccessCompletingTitle: "Sto sbloccando il tuo Coach AI",
    loginSuccessCompletingStatus:
      "Verifico l'accesso e preparo rosa, analisi e consigli su misura per te.",
    loginSuccessDoneTitle: "Sei ufficialmente dentro",
    loginSuccessDoneStatus:
      "Tra un attimo sei in dashboard: partite, rosa e il tuo vantaggio competitivo ti aspettano.",
    loginSuccessTipLabel: "Mentre entri",
    loginSuccessTips: [
      "Carica la rosa: il Coach ti dà consigli reali, non teoria generica.",
      "Dopo ogni partita salva risultato e voti per sbloccare contromisure pre-partita.",
      "Card Advisor ti dice se una carta vale i crediti — prima di spenderli.",
      "Chat Coach (2 HP): domande precise su modulo, stile e i giocatori che usi davvero.",
    ],
    loginSuccessErrorKicker: "Accesso",
    loginSuccessFailedTitle: "Non siamo riusciti ad entrare",
    loginSuccessFailed: "Accesso non riuscito. Riprova tra poco.",
    loginSuccessFailedStatus:
      "Ti riporto al login: controlla email e link, poi riprova.",
    loginSuccessGenericError: "Si è verificato un problema. Riprova.",
    loginSuccessBackToLogin: "Ti sto riportando alla pagina di login...",
    magiclinkCompleting: "Completamento accesso",
    magiclinkPreparing: "Sto configurando la tua sessione...",
    magiclinkDone: "Accesso completato",
    magiclinkRedirecting: "Ti sto reindirizzando...",
    magiclinkFailed: "Accesso non riuscito",
    magiclinkBackToLogin: "Torna al login",
    loadingSimple: "Caricamento...",

    // Dashboard
    roster: "Roster",
    yourPlayers: "I tuoi giocatori",
    viewPlayers: "Visualizza Giocatori",
    manageCollection: "Gestisci la tua collezione",
    squadOverview: "Panoramica Squadra",
    yourSquad: "La tua rosa",
    squadSlots: "Rosa (21 slot)",
    startersAndBench: "Titolari e panchina",
    tacticalGoals: "Obiettivi Tattici Aperti",
    goals: "Obiettivi",
    comingSoon: "Prossimamente...",
    userProfile: "Profilo Utente",
    anonymousUser: "Utente Anonimo",
    masterLevel: "Livello Master",
    aiKnowledge: "Conoscenza AI",
    high: "Alta",
    matchInsights: "Insight Partita",
    analysis: "Analisi",
    quickLinks: "Collegamenti Rapidi",
    navigation: "Navigazione",
    total: "Totale",
    topPlayers: "Top Giocatori",
    aiInsights: "Insight AI",
    aiInsightsPlaceholder: "Insights e suggerimenti AI verranno mostrati qui",
    aiInsightsNoData:
      "Carica le tue partite per avere informazioni sui tuoi pattern tattici e ricevere consigli personalizzati.",
    formationUsage: "Formazioni più usate",
    playingStyleUsage: "Stili di gioco più usati",
    recurringIssues: "Problemi ricorrenti",
    matches: "match",
    winRate: "vittorie",
    frequency: "Frequenza",
    severity: "Severità",
    manageFormation: "Gestisci Formazione",
    home: "Casa",
    away: "Fuori Casa",
    homeAwayLabel: "Hai giocato in casa o fuori casa?",
    homeAwayHint:
      "Seleziona se hai giocato in casa o fuori casa per identificare correttamente la tua squadra",
    required: "Obbligatorio",
    players: "Giocatori",
    squadBuilder: "Costruttore Squadra",
    dataAnalytics: "Dati e Analisi",
    memoryHub: "Hub Memoria",
    coaching: "Allenamento",
    memoryInsights: "Insight Memoria",
    aiLearning: "Apprendimento AI",
    startSession: "Avvia Sessione",
    opponentFormation: "Formazione Avversaria",
    analyzeOpponent: "Analizza formazione avversaria per contromisure",
    strugglesCoachingPress: "Difficoltà nel pressing",
    reluctantChangeFormation: "Riluttante a cambiare formazione",
    prefersQuickTips: "Preferisce consigli rapidi e pratici",
    strugglesHighPress: "Difficoltà contro il pressing alto",

    // Palestra Coach (chat feedback dedicata — sostituisce AiInfoModal)
    palestraCoachTitle: "Palestra Coach",
    palestraCoachDesc: "Parlami della tua esperienza di gioco",
    saveAndClose: "Salva e chiudi",
    coachFeedbackSaved: "Feedback salvato!",
    coachFeedbackSaving: "Salvataggio in corso...",

    // Informazioni IA (form domande per riassunto — legacy, mantenuto per compatibilità)
    aiInfoTitle: "Informazioni IA",
    aiInfoDescription:
      "Completa queste domande per aiutare l'IA a darti consigli più mirati. Tutto opzionale.",
    aiInfoSectionConnection: "Gioco e connessione",
    aiInfoSectionContext: "Contesto e preferenze",
    aiInfoSectionNames: "Come ti chiami / come chiamare l'IA",
    aiInfoSectionNotes: "Note per l'IA",
    aiInfoConnectionQuality: "Connessione: buona o spesso lag/ritardi?",
    aiInfoConnectionGood: "Buona",
    aiInfoConnectionUnstable: "A volte instabile",
    aiInfoConnectionLag: "Spesso lag",
    aiInfoSlowOpponent: "Difficoltà contro avversari con connessione lenta?",
    aiInfoInputDelay: "Hai spesso ritardo input (comandi in ritardo)?",
    aiInfoYes: "Sì",
    aiInfoNo: "No",
    aiInfoSometimes: "A volte",
    aiInfoPassLevel: "Livello passaggi (PA)",
    aiInfoPA1: "PA1",
    aiInfoPA2: "PA2",
    aiInfoPA3: "PA3",
    aiInfoSmartAssist: "Usi lo smart assist?",
    aiInfoPlatform: "Su che piattaforma giochi?",
    aiInfoPlatformConsole: "Console",
    aiInfoPlatformPC: "PC",
    aiInfoPlatformMobile: "Mobile",
    aiInfoPlatformOther: "Altro",
    aiInfoDivision: "In che divisione giochi?",
    aiInfoHoursPerWeek: "Ore di gioco a settimana",
    aiInfoFavouritePlayer: "Giocatore preferito (in rosa)",
    aiInfoWeakPoint: "Cosa ti fa perdere più spesso?",
    aiInfoWeakPointDefence: "Difesa",
    aiInfoWeakPointAttack: "Attacco",
    aiInfoWeakPointSetPieces: "Piazzati",
    aiInfoWeakPointTransitions: "Transizioni",
    aiInfoWeakPointFinalMinutes: "Finale partita",
    aiInfoLearnGoals: "Cosa vorresti imparare da noi?",
    aiInfoFirstName: "Come vuoi essere chiamato?",
    aiInfoAiName: "Come vuoi chiamare l'IA?",
    aiInfoNotes: "Note per l'IA (opzionale)",
    aiInfoSave: "Salva informazioni",
    aiInfoSaved: "Informazioni salvate",
    aiInfoError: "Errore nel salvataggio",
    aiInfoHintInProfile:
      'Per ore di gioco, connessione e contesto per l\'IA usa il bottone "Informazioni IA" in dashboard.',

    // Statistiche di gioco (Analisi eFootball)
    gameAnalysisTitle: "Statistiche di gioco",
    gameAnalysisDescription:
      "Carica gli screenshot della schermata Analisi (ultime 10 partite) per consigli e task personalizzati.",
    gameAnalysisUpload: "Carica analisi",
    gameAnalysisUploadHint:
      "Carica le 2 schermate Analisi: ogni slot corrisponde a una schermata. Se ne carichi una sola, va bene: i dati vengono comunque salvati.",
    gameAnalysisSlot1: "Tipo di gol, Tiro, Comandi speciali",
    gameAnalysisSlot1Desc: "Prima schermata Analisi (grafico a torta + barre)",
    gameAnalysisSlot2: "Passaggio, Dribbling, Difesa",
    gameAnalysisSlot2Desc:
      "Seconda schermata Analisi (barre passaggio/dribbling/difesa)",
    gameAnalysisSlotMissing: "Non caricata",
    gameAnalysisLastCapture: "Ultima analisi",
    gameAnalysisAnalyzing: "Analisi in corso…",
    gameAnalysisSuccess: "Analisi salvata.",
    gameAnalysisError: "Errore durante il salvataggio.",
    gameAnalysisRetryOne: "Se hai caricato 2 immagini, riprova con una sola.",
    gameAnalysisChooseFile: "Carica",
    gameAnalysisNoImage: "Nessuna immagine selezionata",
    gameAnalysisScreensLabel: "schermate",
    chartsAndComparisonTitle: "Grafici e comparazione",
    chartsAndComparisonSubtitle: "Il tuo profilo rispetto al riferimento top",
    chartsAndComparisonOverview: "Panoramica",
    chartsAndComparisonDetail: "Dettaglio per categoria",
    chartsAndComparisonEmpty:
      "Per vedere il tuo profilo e il confronto con i top, completa le Statistiche di gioco.",
    chartsAndComparisonCta: "Completa Statistiche di gioco",
    chartsAndComparisonAskCoach: "Chiedi al coach",
    chartsAndComparisonAskCoachContext:
      "Vorrei un consiglio sui miei grafici e la comparazione con il riferimento top.",
    chartsAndComparisonYou: "Tu",
    chartsAndComparisonTop: "Riferimento top",
    chartsAndComparisonDesc:
      "Visualizza l'andamento della tua squadra, le formazioni più efficaci, e compara le statistiche chiave delle tue ultime partite.",
    chartsAndComparisonCtaButton: "Vai ai Grafici e Analisi Dati",
    chartsCategoryShot: "Tiro",
    chartsCategoryPassing: "Passaggio",
    chartsCategoryDribbling: "Dribbling",
    chartsCategoryDefense: "Difesa",
    chartsCategorySpecialCommands: "Comandi speciali",

    // Rosa
    squad: "Rosa",
    uploadScreenshots: "Carica Screenshot",
    dragDropHint:
      "Trascina qui oppure clicca. Puoi caricare 2 o 3 foto per giocatore, anche miste.",
    imagesLoaded: "Immagini caricate",
    analyzeBatch: "Analizza batch",
    analyzing: "Analisi…",
    reset: "Reset",
    slot: "Slot",
    starters: "Titolari",
    bench: "Panchina",
    insertPlayer: "Inserisci questo giocatore",
    saveToSupabase: "Salva in Supabase",
    slotSelected: "slot selezionato",
    name: "Nome",
    role: "Ruolo",
    card: "Carta",
    team: "Squadra",
    boosters: "Boosters",
    missing: "Manca",
    missingData: "Dati Mancanti",
    missing_detailed_stats_table: "Statistiche Dettagliate",
    missing_skills_screen: "Schermata Abilità",
    missing_additional_positions_screen: "Posizioni Aggiuntive",
    missing_stats_screen: "Schermata Statistiche",
    missing_boosters_screen: "Schermata Boosters",
    missing_profile_screen: "Schermata Profilo",
    myPlayers: "I Miei Giocatori",
    playersSaved: "giocatori salvati",
    loading: "Caricamento...",
    notFoundTitle: "404",
    notFoundMessage: "Pagina non trovata.",
    noPlayersSaved: "Nessun giocatore salvato",
    uploadScreenshotsToSee:
      "Carica screenshot e salva giocatori per vederli qui",
    listaGiocatori: "Lista Giocatori",
    takePhoto: "Scatta Foto",
    cameraCaptureTitle: "Scatta foto",
    cameraCaptureButton: "Cattura",
    cameraClose: "Annulla",
    cameraNotAvailable: "Fotocamera non disponibile o permesso negato.",
    cameraCaptureFailed: "Cattura non riuscita. Riprova.",
    cameraStarting: "Avvio fotocamera…",
    extractData: "Estrai Dati",
    extracting: "Estrazione...",
    savePlayer: "Salva Giocatore",
    removePhotos: "Rimuovi Foto",
    details: "Dettagli",
    hide: "Nascondi",
    edit: "Modifica",
    complete: "Completo",
    incomplete: "Incompleto",
    missingFields: "Manca",
    nationality: "Nazionalità",
    physical: "Fisico",
    age: "Età",
    form: "Forma",
    skills: "Skills",
    // Caratteristiche giocatore
    weakFoot: "Piede Debole",
    weakFootFrequency: "Frequenza Piede Debole",
    weakFootAccuracy: "Precisione Piede Debole",
    formDetailed: "Forma Dettagliata",
    injuryResistance: "Resistenza Infortuni",
    aiPlaystyles: "Stili di Gioco IA",
    additionalPositions: "Posizioni Aggiuntive",
    // Valori caratteristiche
    rarely: "Raramente",
    sometimes: "A Volte",
    often: "Spesso",
    high: "Alta",
    medium: "Media",
    low: "Bassa",
    unbreakable: "Incrollabile",
    stable: "Stabile",
    inconsistent: "Instabile",
    // Valori form
    b: "B",
    a: "A",
    c: "C",
    d: "D",
    e: "E",
    resetMyData: "Reset miei dati Supabase",
    // Edit Player Data
    completeData: "Completa Dati",
    missingDataSection: "Dati Mancanti",
    addMissingData: "Aggiungi Dati Mancanti",
    editPlayerData: "Modifica Dati Giocatore",
    close: "Chiudi",
    save: "Salva",
    saving: "Salvataggio...",
    saved: "Dati salvati",
    statsDetails: "Statistiche Dettagliate",
    attacking: "Attacco",
    defending: "Difesa",
    athleticism: "Forza",
    physicalData: "Dati Fisici",
    height: "Altezza",
    weight: "Peso",
    teamName: "Nome Squadra",
    nationalityCountry: "Nazionalità",
    playingStyle: "Stile di Gioco",
    playerSkills: "Abilità Giocatore",
    addSkill: "Aggiungi Skill",
    removeSkill: "Rimuovi",
    additionalSkills: "Abilità Aggiuntive",
    addAdditionalSkill: "Aggiungi Abilità",
    aiPlaystylesList: "Stili di Gioco IA",
    addPlaystyle: "Aggiungi Stile",
    additionalPositionsList: "Posizioni Aggiuntive",
    addPosition: "Aggiungi Posizione",
    boostersList: "Boosters",
    addBooster: "Aggiungi Booster",
    boosterName: "Nome Booster",
    boosterEffect: "Effetto",
    boosterCondition: "Condizione di Attivazione",
    characteristics: "Caratteristiche",
    weakFootFrequencyLabel: "Frequenza Piede Debole",
    weakFootAccuracyLabel: "Precisione Piede Debole",
    formDetailedLabel: "Forma Dettagliata",
    injuryResistanceLabel: "Resistenza Infortuni",
    cm: "cm",
    kg: "kg",
    years: "anni",
    saved: "Salvato in Supabase",
    resetSuccess: "Dati Supabase resettati per questo utente anonimo",
    error: "Errore",
    errorServer: "Errore server",
    thisCoach: "questo allenatore",
    manualEntryInstead: "Inserimento manuale",
    playerNameRequired: "Nome giocatore obbligatorio",
    positionRequired: "Posizione obbligatoria",
    editPlayer: "Modifica Giocatore",
    newPlayer: "Nuovo Giocatore",
    completeOrEditData: "Completa o modifica dati",
    manualEntry: "Inserimento manuale",
    playerNameLabel: "Nome giocatore *",
    positionLabel: "Posizione *",
    placeholderPlayerNameExample: "es. Kylian Mbappé",
    placeholderYourName: "Il tuo nome",
    placeholderTeamExample: "Es: Naturalborngamers.it, AC Milan...",
    appTitle: "From Zero to Hero - eFootball AI Coach",
    appDescription:
      "Coach AI per eFootball: rosa, partite, analisi e consigli tattici personalizzati.",
    saveFailed: "Salvataggio fallito",
    errorSaveFormation: "Errore salvataggio formazione",
    loadingShort: "Caricamento...",
    matchNotFoundOrDenied: "Partita non trovata o accesso negato",
    unknownPlayer: "Sconosciuto",
    yourCoachAI: "Il tuo Coach AI",
    creditsAndGuideAria: "Crediti e guida",
    backToDashboard: "Dashboard Principale",
    backToSquad: "Rosa",

    // Authentication
    login: "Accedi",
    signup: "Registrati",
    logout: "Esci",
    email: "Email",
    password: "Password",
    emailPlaceholder: "tua@email.com",
    passwordPlaceholder: "Minimo 6 caratteri",
    loginDescription: "Accedi per salvare i tuoi dati permanentemente",
    signupDescription: "Crea un account per salvare la tua rosa e profilazione",
    emailPasswordRequired: "Email e password sono obbligatorie",
    loginError: "Errore durante il login",
    signupError: "Errore durante la registrazione",
    loginSuccess: "Login effettuato con successo!",
    signupSuccess: "Registrazione completata!",
    forgotPassword: "Password dimenticata?",
    forgotPasswordTitle: "Recupera password",
    forgotPasswordDescription:
      "Inserisci l'email dell'account. Ti invieremo un link per reimpostare la password.",
    sendResetLink: "Invia link",
    resetLinkSent:
      "Se l'email è registrata, riceverai a breve un link per reimpostare la password. Controlla anche lo spam.",
    resetPasswordTitle: "Nuova password",
    resetPasswordDescription: "Scegli una nuova password (minimo 6 caratteri).",
    newPasswordPlaceholder: "Nuova password",
    setNewPassword: "Imposta password",
    passwordUpdated: "Password aggiornata. Reindirizzamento al login...",
    resetPasswordError: "Errore durante il recupero password.",
    resetLinkExpired:
      "Link non valido o scaduto. Richiedi un nuovo link dalla pagina Recupera password.",
    confirmPassword: "Conferma password",
    passwordsDoNotMatch: "Le password non coincidono.",
    backToLogin: "Torna al login",
    loggingIn: "Accesso in corso...",
    signingUp: "Registrazione in corso...",
    retryInSeconds: "Riprova tra {{n}} s",
    noAccountSignup: "Non hai un account? Registrati",
    hasAccountLogin: "Hai già un account? Accedi",
    continueAsGuest: "Continua come ospite",
    supabaseNotAvailable: "Supabase non disponibile",
    unexpectedError: "Errore imprevisto",
    loggedInAs: "Accesso come",

    // Statistics translations
    offensive_awareness: "Comportamento Offensivo",
    ball_control: "Controllo Palla",
    dribbling: "Dribbling",
    tight_possession: "Possesso Stretto",
    low_pass: "Passaggio Rasoterra",
    lofted_pass: "Passaggio Alto",
    finishing: "Finalizzazione",
    heading: "Colpo di testa",
    place_kicking: "Calci da Fermo",
    curl: "Tiro a Giro",
    defensive_awareness: "Comportamento Difensivo",
    defensive_engagement: "Coinvolgimento Difensivo",
    tackling: "Contrasto",
    aggression: "Aggressività",
    goalkeeping: "Comportamento PT",
    gk_catching: "Presa PT",
    gk_parrying: "Parata PT",
    gk_reflexes: "Riflessi PT",
    gk_reach: "Estensione PT",
    speed: "Velocità",
    acceleration: "Accelerazione",
    kicking_power: "Potenza di Tiro",
    jump: "Salto",
    physical_contact: "Contatto Fisico",
    balance: "Controllo Corpo",
    stamina: "Resistenza",

    // Opponent Formation
    opponentFormationTitle: "Formazione Avversaria",
    opponentFormationSubtitle:
      "Carica screenshot della formazione avversaria per analisi e contromisure",
    backToDashboardBtn: "Torna alla Dashboard",
    dragScreenshotHere: "Trascina screenshot qui",
    orClickToSelect: "o clicca per selezionare",
    uploadedScreenshot: "Screenshot Caricato",
    extracting: "Estrazione...",
    extractFormation: "Estrai Formazione",
    formationExtractedSuccess: "Formazione estratta correttamente",
    playersDetected: "giocatori rilevati",
    formation: "Formazione",
    overallStrength: "Forza Complessiva",
    tacticalStyle: "Stile Tattico",
    team: "Squadra",
    formationNameOptional: "Nome formazione (opzionale)",
    saveFormation: "Salva Formazione",
    formationSaved: "Formazione avversaria salvata",
    saveError: "Errore salvataggio",
    playersDetectedFromScreenshot: "Giocatori Rilevati dalla Foto",
    verifyPlayersRead:
      "Verifica che tutti i giocatori siano stati letti correttamente",
    goalkeeper: "Portiere",
    defense: "Difesa",
    midfield: "Centrocampo",
    attack: "Attacco",
    role: "Ruolo",
    substitutes: "Sostituti",
    reserves: "Riserve",
    loadAnotherFormation: "Carica Altra Formazione",
    extractionError: "Errore estrazione",
    invalidAuthToken:
      "Token di autenticazione non valido. Ricarica la pagina e riprova.",
    saveError: "Errore salvataggio",
    // Completeness
    completeness: "Completezza",
    identity: "Identity",
    stats: "Stats",
    skills: "Skills",
    boosters: "Boosters",
    complete: "Completo",
    incomplete: "Incompleto",
    processingImage: "Processando immagine",
    of: "di",
    multiPlayerDetected: "Rilevati giocatori diversi",
    loadSamePlayer:
      "Carica 1-3 screenshot dello stesso giocatore per avere dati completi",
    missingStatsPhoto: "Carica screenshot con statistiche dettagliate",
    missingSkillsPhoto: "Carica screenshot con abilità e stili di gioco",
    missingBoostersPhoto: "Carica screenshot con boosters",
    incompleteDataWarning:
      "Dati incompleti: carica le foto mancanti per completare il profilo",
    // Formation
    uploadFormation: "Carica Formazione",
    uploadFormationPhoto: "Carica Foto Formazione Completa",
    formationInstructions:
      'Carica i giocatori uno a uno dalla sezione "Giocatori" del gioco (NON da "Schema di gioco"). Per ogni giocatore carica 3 foto: Statistiche, Abilità e Booster.',
    uploadPlayerCard: "Carica Card Giocatore",
    playerCardInstructions:
      "Carica 1-3 screenshot di card giocatori singoli (statistiche, abilità, booster). Questi saranno salvati come riserve.",
    selectUploadType: "Seleziona Tipo Caricamento",
    extractFormation: "Estrai Formazione",
    extractingFormation: "Estrazione formazione in corso...",
    formationExtracted: "Formazione estratta con successo",
    playersExtracted: "giocatori estratti",
    savingFormation: "Salvataggio formazione...",
    formationSaved: "Formazione salvata con successo",
    formationLayoutSaved:
      'Layout formazione salvato! Vai a "Gestisci Formazione" per assegnare i giocatori.',
    titolari: "Titolari",
    riserve: "Riserve",
    maxReservesReached: "Massimo 12 riserve raggiunto.",
    swapFormation: "Gestisci Formazione",
    instructions: "Istruzioni",
    // Tactical Settings - Team Playing Style
    teamPlayingStyle: "Stile di Gioco di Squadra",
    teamPlayingStyleDescription:
      "Seleziona l'approccio tattico per la tua squadra",
    possesso_palla: "Possesso palla",
    contropiede_veloce: "Contropiede veloce",
    contrattacco: "Contrattacco",
    vie_laterali: "Vie laterali",
    passaggio_lungo: "Passaggio lungo",
    pressing_totale: "Overload",
    // Individual Instructions
    individualInstructions: "Istruzioni Individuali",
    individualInstructionsDescription:
      "Assegna istruzioni specifiche ai giocatori",
    attack1: "Attacco 1",
    attack1Description: "Istruzioni per giocatori d'attacco (lato sinistro)",
    attack2: "Attacco 2",
    attack2Description: "Istruzioni per giocatori d'attacco (lato destro)",
    defense1: "Difesa 1",
    defense1Description: "Istruzioni per giocatori difensivi (lato sinistro)",
    defense2: "Difesa 2",
    defense2Description: "Istruzioni per giocatori difensivi (lato destro)",
    selectInstruction: "Seleziona Istruzione",
    selectPlayer: "Seleziona Giocatore",
    instruction: "Istruzione",
    player: "Giocatore",
    noPlayerSelected: "Nessun giocatore selezionato",
    noInstructionSelected: "Nessuna istruzione selezionata",
    noCompatiblePlayers: "Nessun giocatore compatibile disponibile",
    // Individual Instructions - Attack
    anchoring: "Ancoraggio",
    anchoringDescription:
      "Impedisce al giocatore indicato di allontanarsi orizzontalmente dalla propria posizione. Per esempio, la prima punta rimarrà in posizione centrale, e le ali non si accentreranno.",
    attackSpace: "Attacco Spazio",
    attackSpaceDescription:
      "Il giocatore cerca spazi in profondità per creare occasioni da gol",
    counterTarget: "Contropiede",
    counterTargetDescription:
      "Il giocatore è il bersaglio per i contropiedi, resta alto pronto per transizioni rapide",
    offensive: "Offensivo",
    offensiveDescription:
      "Il giocatore partecipa attivamente agli attacchi, si spinge in avanti",
    // Individual Instructions - Defense
    tightMarking: "Marcatura Stretta",
    tightMarkingDescription:
      "I difensori marcano un determinato giocatore in modo abbastanza stretto. Non sempre come nella MARCATURA A UOMO, ma abbastanza stretti da poter intercettare facilmente le loro occasioni.",
    manMarking: "Marcatura a Uomo",
    manMarkingDescription:
      "Questa istruzione fa sì che un difensore segni un determinato giocatore della squadra avversaria in ogni momento. CF, SS, AMF, CMF, chiunque.",
    counterTarget: "Obiettivo Contropiede",
    counterTargetDescription:
      "Questo giocatore si posizionerà molto più in alto sul campo, quindi quando rientri in possesso palla, puoi essere un po' furbo e semplicemente lanciare la palla verso di lui, o semplicemente fare un passaggio basso Stupendo per passargli la palla. Penso che questo possa essere applicato solo a centrocampisti e attaccanti.",
    deepLine: "Linea Bassa",
    deepLineDescription:
      "Questa istruzione permette a un giocatore di posizionarsi sul campo in modo tale da potersi unire più facilmente alla difesa. Contribuiscono al gioco, sì, ma contribuiscono anche alla difesa. Impossibile indicare un difensore. Quando si utilizza uno schema con 5 difensori, è anche impossibile assegnare un centrocampista.",
    // Tactical Settings - Save
    tacticalSettings: "Impostazioni Tattiche",
    saveTacticalSettings: "Salva Impostazioni Tattiche",
    tacticalSettingsSaved: "Impostazioni tattiche salvate con successo",
    tacticalSettingsError: "Errore nel salvataggio delle impostazioni tattiche",
    loadingTacticalSettings: "Caricamento impostazioni tattiche...",

    // Matches / Partite
    addMatch: "Aggiungi Partita",
    recentMatches: "Ultime Partite",
    noMatchesSaved:
      'Nessuna partita salvata. Clicca su "Aggiungi Partita" per iniziare.',
    result: "Risultato",
    matchComplete: "✓ Completa",
    missingPhotos: "{count} mancanti",
    dateNotAvailable: "Data non disponibile",
    unknownOpponent: "Avversario sconosciuto",
    showMoreMatches: "Mostra altre {count} partite...",
    match: "Partita",
    dateAndTime: "Data e Ora",
    opponent: "Avversario",
    notSpecified: "Non specificato",
    completion: "Completamento",
    completeWithMissingPhotos: "Completa con Foto Mancanti",
    missing: "Mancante",
    uploadPhoto: "Carica Foto",
    extracting: "Estrazione...",
    extractAndSave: "Estrai e Salva",
    backToDashboard: "Torna alla Dashboard",
    // Match Wizard Steps
    stepHomeAway: "Casa/Fuori",
    stepHomeAwayInstruction:
      "Indica se hai giocato in casa o fuori casa. Serve per associare correttamente i dati alla tua squadra.",
    stepPlayerRatings: "Pagelle Giocatori",
    stepPlayerRatingsPhoto1: "Prima schermata (foto 1)",
    stepPlayerRatingsPhoto2: "Seconda schermata (foto 2, opzionale)",
    stepTeamStats: "Statistiche Squadra",
    stepAttackAreas: "Aree di Attacco",
    stepBallRecoveryZones: "Aree di Recupero Palla",
    stepFormationStyle: "Formazione Avversaria",
    // Match Wizard Actions
    selectValidImage: "Seleziona un file immagine valido",
    imageTooLarge: "L'immagine è troppo grande (max 10MB)",
    loadImageFirst: "Carica prima un'immagine",
    sessionExpiredRedirect: "Sessione scaduta. Reindirizzamento al login...",
    extractDataError: "Errore estrazione dati",
    loadAtLeastOneSection: "Carica almeno una sezione prima di salvare",
    loadAtLeastThreePhotos: "Carica almeno 3 screenshot prima di salvare",
    summaryRequiresThreePhotosAndHomeAway:
      "Carica almeno 3 screenshot e seleziona Casa o Fuori per generare il riassunto",
    sessionExpired: "Sessione scaduta",
    playerNotFound: "Giocatore non trovato",
    errorLoadingPlayer: "Errore caricamento giocatore",
    selectAtLeastOneImage: "Seleziona almeno un'immagine",
    errorExtractingData: "Errore estrazione dati",
    unableToExtractData: "Impossibile estrarre dati dall'immagine",
    errorUpdatingPlayer: "Errore aggiornamento giocatore",
    saveMatchError: "Errore salvataggio partita",
    matchSavedSuccess: "Partita salvata con successo! Reindirizzamento...",
    changeImage: "Cambia Immagine",
    loadImage: "Carica Immagine",
    extractData: "Estrai Dati",
    skip: "Salta",
    saving: "Salvataggio...",
    saveMatch: "Salva Partita",
    matchNotFound: "Partita non trovata",
    loadMatchError: "Errore caricamento partita",
    loadPhotoError: "Errore caricamento foto",
    updateMatchError: "Errore aggiornamento partita",
    tokenNotAvailable: "Token non disponibile",
    // Match Wizard Instructions
    step0Instruction:
      "Carica uno o due screenshot delle pagelle (prima e, se serve, seconda schermata).",
    step1Instruction:
      "Carica uno screenshot delle statistiche di squadra (possesso, tiri, passaggi, ecc.).",
    step2Instruction:
      "Carica uno screenshot delle aree di attacco (percentuali per zona).",
    step3Instruction:
      "Carica uno screenshot delle aree di recupero palla (punti verdi sul campo).",
    step4Instruction:
      "Carica uno screenshot della formazione e stile di gioco (schema, stile, forza squadra).",
    dataExtractedSuccess: "✓ Dati estratti con successo",
    // Match Summary & AI Analysis
    resultExtracted: "Risultato estratto",
    matchSummary: "Riepilogo Partita",
    sectionsComplete: "Sezioni Complete",
    sectionsMissing: "Sezioni Mancanti",
    photosUploadedCount: "foto caricate",
    opponentNameLabel: "Nome Avversario",
    optional: "(opzionale)",
    opponentNamePlaceholder:
      "Es: GONDİKLENDİNİZZZ, AC Milan, Amichevole vs Mario...",
    opponentNameHint:
      "Aiuta a identificare la partita. Se lasciato vuoto, verrà estratto automaticamente dalle immagini o usato un identificatore.",
    clickToEditOpponentName: "Clicca per modificare il nome avversario",
    generateAnalysis: "Genera Analisi AI",
    generatingAnalysis: "Generazione analisi in corso...",
    aiAnalysis: "Analisi AI",
    regenerateSummary: "Rigenera Riassunto",
    noSummaryAvailable:
      "Nessun riassunto disponibile. Genera un riassunto per vedere l'analisi della partita.",
    aiSummaryLabel: "Riassunto AI:",
    readMore: "Leggi tutto →",
    generateAiSummary: "Genera Riassunto AI",
    errorGeneratingSummary: "Errore generazione riassunto",
    noSummaryGenerated: "Nessun riassunto generato",
    errorSavingSummary: "Errore salvataggio riassunto",
    analysisBasedOnPartialData: "Analisi basata su dati parziali",
    completeness: "completezza",
    missingData: "Dati mancanti",
    loadMorePhotos: "Carica più foto per suggerimenti più precisi",
    confirmSave: "Conferma e Salva",
    confirm: "Conferma",
    cancel: "Annulla",
    deleteMatch: "Elimina Partita",
    confirmDeleteMatch: "Sei sicuro di voler eliminare questa partita?",
    confirmDeleteCoachTitle: "Conferma Eliminazione",
    confirmDeleteCoachMessage: "Sei sicuro di voler eliminare",
    confirmDeleteCoach: "Sei sicuro di voler eliminare questo allenatore?",
    confirmDeleteCoachDetails: "Questa azione non può essere annullata.",
    // Allenatori (card chiusa + card aperta in IT quando lingua IT)
    coachesTitle: "Allenatori",
    uploadCoach: "Carica Allenatore",
    noCoachesLoaded: "Nessun allenatore caricato",
    uploadCoachDescription:
      "Carica un allenatore caricando uno screenshot dal gioco",
    uploadFirstCoach: "Carica il primo allenatore",
    activeCoach: "Allenatore attivo",
    activeCoachInfo:
      "Questo allenatore è attualmente attivo e influenza la competenza di stile di gioco della squadra.",
    viewCoachDetails: "Dettagli Allenatore",
    setAsTitular: "Imposta come titolare",
    uploadCoachInstructions:
      "Carica 2 screenshot: primo con dati principali e competenze, secondo con collegamento (opzionale).",
    informations: "Informazioni",
    age: "Età",
    nationality: "Nazionalità",
    team: "Squadra",
    category: "Categoria",
    type: "Tipo",
    playingStyleCompetence: "Competenza stile di gioco",
    trainingAffinity: "Affinità di allenamento",
    statBoosters: "Bonus statistiche",
    connection: "Collegamento",
    focalPoint: "Punto focale",
    keyMan: "Uomo chiave",
    // Stili di gioco (card allenatore)
    counter_attack: "Contropiede",
    wide: "Largo",
    ball_possession: "Possesso palla",
    long_ball: "Palla lunga",
    quick_counter: "Contropiede rapido",
    finishing: "Finalizzazione",
    defensive_behavior: "Comportamento difensivo",
    confirmAction: "Conferma Azione",
    confirmDeletePlayer:
      "Sei sicuro di voler eliminare definitivamente questo giocatore? Questa azione non può essere annullata.",
    confirmPositionChangeTitle: "Conferma Cambio Posizione",
    continue: "Continua",
    delete: "Elimina",
    deleteAndProceed: "Elimina e Procedi",
    duplicateReserveTitle: "Riserva Duplicata",
    coach: "Allenatore",
    historicalInsights: "Insight Storico",
    noPhotosSelected: "Nessuna foto selezionata",
    photoSelected: "foto selezionata",
    photosSelected: "foto selezionate",
    playerName: "Nome giocatore",
    replace: "Sostituisci",
    selectFormation: "Seleziona formazione",
    strengths: "Punti di Forza",
    weaknesses: "Punti Deboli",
    matchDeleted: "Partita eliminata con successo",
    deleteMatchError: "Errore eliminazione partita",
    // Error Messages Improved
    errorQuotaExhausted: "Quota OpenAI esaurita. Riprova tra qualche minuto.",
    openAQuotaError:
      "Quota OpenAI esaurita. Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing",
    errorTimeout: "Timeout durante la generazione. Riprova.",
    errorImageTooLarge:
      "L'immagine è troppo grande (max 10MB). Prova a comprimerla o usa un formato più leggero.",
    imageOptimizeHighQualityHint:
      "La foto è ancora troppo pesante dopo la compressione (alta risoluzione o formato pesante). Riduci la qualità nelle impostazioni della fotocamera, ritaglia solo la schermata utile oppure usa uno screenshot del gioco invece della foto al monitor.",
    imageOptimizeFailedLoad:
      "Impossibile aprire l'immagine. Prova con un altro file o formato (JPEG/PNG).",
    imageOptimizeFailedCanvas:
      "Il browser non è riuscito a elaborare l'immagine. Prova a chiudere altre schede o a ridurre la risoluzione.",
    imageOptimizeFailedGeneric:
      "Impossibile preparare l'immagine per l'invio. Prova un file più leggero o una risoluzione più bassa.",
    errorInvalidImage: "File non è un'immagine valida",
    errorExtractingFormation: "Errore estrazione formazione",
    errorInvalidScreenshot:
      "Screenshot non valido per questa sezione. Assicurati di caricare lo screenshot corretto.",
    extractionErrorFriendly:
      "Impossibile leggere i dati dall'immagine. Prova con uno screenshot più nitido.",
    errorAnalysisGeneration: "Errore generazione analisi",
    tryAgainInMoment: "Riprova tra un attimo!",
    errorChatGeneric: "Mi dispiace, c'è stato un errore.",
    chatCreditsPaused:
      "**Niente panico, Coach in pausa!**\n\nHai finito gli **Hero Points** per questa chat — non è un errore: il contatore è semplicemente a zero.\n\n**Ricarica** e ripartiamo subito con consigli su rosa, partite, moduli e carte.",
    chatCreditsRechargeCta: "Ricarica Hero Points",
    // Contromisure pre-partita (ex Contromisure Live)
    countermeasuresLive: "Contromisure pre-partita",
    uploadOpponentFormation: "Carica Formazione Avversaria",
    extractFormation: "Estrai Formazione",
    generateCountermeasures: "Genera Contromisure",
    opponentFormationAnalysis: "Analisi Formazione Avversaria",
    tacticalCountermeasures: "Contromisure Tattiche",
    playerSuggestions: "Suggerimenti Giocatori",
    individualInstructions: "Istruzioni Individuali",
    howToPlayIt: "Come giocarla",
    playSummaryMatchKey: "Chiave della partita",
    playSummaryBasePlan: "Piano base",
    playSummaryAttacking: "Quando attacchi",
    playSummaryDefending: "Quando difendi",
    playSummaryAvoid: "Errore da evitare",
    applySelected: "Applica Selezionati",
    metaFormation: "Formazione Meta",
    formationStrengths: "Punti di Forza",
    formationWeaknesses: "Punti Deboli",
    defensiveLine: "Linea Difensiva",
    pressing: "Pressing",
    possessionStrategy: "Strategia Possesso",
    reason: "Motivazione",
    addToStartingXI: "Aggiungi ai Titolari",
    replaceInStartingXI:
      "Metti ${playerName} (${playerRole}) al posto di ${replacePlayerName} (${replacePlayerRole})",
    replaceInStartingXIHint: "${replacePlayerName} va in panchina",
    replaceInStartingXIRoleNote:
      "Entra nello slot ${replacePlayerRole}; il ruolo salvato della riserva è ${playerRole}",
    substitutionIncomplete: "Sostituisci un titolare con ${playerName}",
    substitutionIncompleteHint:
      "Indica chi esce dalla formazione (dati contromisura incompleti)",
    removeFromStartingXI: "Rimuovi dai Titolari",
    changePlayingStyle: "Cambia Stile di Gioco",
    adjustDefensiveLine: "Adeguamento Linea Difensiva",
    adjustPressing: "Adeguamento Pressing",
    adjustPossession: "Adeguamento Possesso",
    warnings: "Avvertimenti",
    confidence: "Affidabilità",
    dataQuality: "Qualità Dati",
    generatingCountermeasures: "Generazione contromisure in corso...",
    errorGeneratingCountermeasures: "Errore generazione contromisure",
    noFormationUploaded: "Carica prima una formazione avversaria",
    selectSuggestionsToApply: "Seleziona i suggerimenti da applicare",
    suggestionsApplied: "Suggerimenti applicati con successo",
    errorApplyingSuggestions: "Errore applicazione suggerimenti",
    applying: "Applicazione...",
    formationExtracted: "Formazione Estratta",
    overallStrength: "Forza Complessiva",
    playingStyle: "Stile di Gioco",
    uploadPhotoDescription: "Carica uno screenshot della formazione avversaria",
    countermeasuresAutoStart:
      "Estrazione e contromisure partono automaticamente",
    countermeasuresPreMatchContext:
      "Consigli pre-partita basati sulla formazione avversaria caricata.",
    countermeasuresPostMatchTitle: "Dopo la partita",
    countermeasuresPostMatchPhotosIntro:
      "Hai giocato? Aggiungi la partita e carica gli screenshot: dati più precisi per analisi e consigli futuri.",
    countermeasuresPostMatchAddMatchCta: "Aggiungi partita e foto",
    countermeasuresPostMatchPalestraIntro:
      "Raccontami come è andata: più so, più ti posso aiutare.",
    // Progress
    photosCount: "foto caricate",
    of: "di",
    // Assistant Chat
    howToAddMatch: "Come carico una partita?",
    howToManageFormation: "Come gestisco la formazione?",
    whereAmI: "Dove sono?",
    whatCanYouDo: "Cosa puoi fare?",
    typeMessage: "Scrivi un messaggio...",
    openAssistant: "Apri assistente",
    closeAssistant: "Chiudi assistente",
    sendMessage: "Invia messaggio",
    voiceInput: "Input vocale",
    voiceListening: "Sto ascoltando...",
    voiceNotSupported: "Il tuo browser non supporta il riconoscimento vocale.",
    voiceError: "Errore durante il riconoscimento vocale. Riprova.",
    yourCoach: "Il tuo Coach AI",
    assistantGreetingShort: "Ciao {{name}}! 👋",
    liveCoachOpen: "Apri Coach Live premium",
    liveCoachClose: "Chiudi Coach Live",
    liveCoachPremiumBadge: "Coach Live Premium",
    liveCoachTitle: "Coach Live",
    liveCoachSubtitle:
      "Carica la foto dell'avversario e poi parla con {{coachName}} per ricevere consigli live durante la partita.",
    liveCoachCommercialIntro:
      "Piu contesto dai al coach, piu i consigli diventano precisi.",
    liveCoachPhotoTitle: "Foto avversario",
    liveCoachPhotoSubtitle:
      "Carica uno screenshot della formazione avversaria prima di iniziare o durante la preparazione.",
    liveCoachPhotoHelper:
      "Prima la foto, poi il coach. Con la foto i suggerimenti sono piu precisi.",
    liveCoachPhotoButton: "Carica foto formazione",
    liveCoachPhotoUploading: "Analisi foto in corso...",
    liveCoachPhotoReady: "Foto analizzata",
    liveCoachPhotoDetected: "Modulo rilevato",
    liveCoachPhotoError:
      "Impossibile leggere la foto per Coach Live. Riprova con uno screenshot piu nitido.",
    liveCoachVoiceTitle: "Parla con {{coachName}}",
    liveCoachVoiceSubtitle:
      "Ricevi correzioni rapide e consigli pratici mentre giochi.",
    liveCoachVoiceHelper:
      "Quando sei pronto, avvia la sessione e parla con {{coachName}} come faresti con un coach vero.",
    liveCoachVoiceMarin: "Marin - Premium calda",
    liveCoachVoiceCedar: "Cedar - Premium pulita",
    liveCoachVoiceCoral: "Coral - Brillante e diretta",
    liveCoachVoiceVerse: "Verse - Fluida e naturale",
    liveCoachVoiceSage: "Sage - Sicura e autorevole",
    liveCoachVoiceBallad: "Ballad - Calma e avvolgente",
    liveCoachConnecting: "Connessione live in corso...",
    liveCoachStartTalking: "Avvia Coach Live",
    liveCoachMute: "Silenzia microfono",
    liveCoachUnmute: "Riattiva microfono",
    liveCoachStop: "Chiudi sessione",
    liveCoachStatusReady: "Pronto al kickoff",
    liveCoachStatusLive: "Live attivo",
    liveCoachStatusIdle: "Tocca per iniziare",
    liveCoachStatusConnecting: "Connessione in corso...",
    liveCoachHpHint: "Supporto live durante la partita",
    liveCoachLiveFeed: "Feed live",
    liveCoachFeedHelper:
      "Qui compariranno la tua richiesta e la risposta live di {{coachName}}.",
    liveCoachYou: "Tu",
    liveCoachCoach: "Coach",
    liveCoachStatHp: "HP",
    liveCoachStatTime: "Tempo",
    liveCoachStatSpent: "Sessione",
    liveCoachReadyShort: "Pronto",
    liveCoachLiveShort: "Live",
    liveCoachLauncherSubtitle: "Coach vocale premium sempre pronto.",
    liveCoachLauncherSubtitleDash:
      "Coach vocale premium in evidenza per la dashboard.",
    liveCoachLauncherSubtitleActive: "Il tuo coach e con te in tempo reale.",
    liveCoachDashboardTitle: "Coach Live premium in partita",
    liveCoachDashboardSubtitle:
      "Parla con il tuo coach durante la partita e ricevi correzioni rapide quando ti servono.",
    liveCoachDashboardCta: "Apri Coach Live",
    liveCoachOpponentReady: "Avversario pronto",
    liveCoachOpponentMissing: "Nessuna foto",
    liveCoachWaitingYou:
      "Appena parli, qui vedrai il focus della tua richiesta.",
    liveCoachWaitingCoach: "...",
    liveCoachStartError: "Impossibile avviare Coach Live adesso.",
    liveCoachRealtimeError: "Errore nella connessione voce realtime.",
    liveCoachBillingError: "Errore controllo Hero Points per Coach Live.",
    liveCoachEndedNoCredits:
      "Coach Live fermato per Hero Points insufficienti.",
    // Formation Variations
    baseFormations: "Moduli Base",
    variations: "Variazioni",
    formationWide: "Largo",
    formationCompact: "Compatto",
    formationOffensive: "Offensivo",
    formationDefensive: "Difensivo",
    searchFormation: "Cerca formazione...",
    selectFormationTactical: "Seleziona Formazione Tattica",
    formationDescription:
      "Scegli una formazione tattica ufficiale eFootball. I giocatori già assegnati verranno mantenuti nelle loro posizioni, cambieranno solo le coordinate visuali sul campo.",
    variationsCount: "variazioni",
    expandVariations: "Espandi variazioni",
    collapseVariations: "Comprimi variazioni",
    expandSection: "Mostra altro",
    collapseSection: "Mostra meno",
    expandSectionGoals: "Mostra obiettivi settimanali",
    collapseSectionGoals: "Nascondi obiettivi",
    expandSectionMatches: "Mostra ultime partite",
    collapseSectionMatches: "Nascondi partite",
    expandGuideCard: "Espandi guida e vai alla pagina",
    collapseGuideCard: "Comprimi guida",
    confirmFormation: "Conferma Formazione",
    // Position Selection Modal
    selectOriginalPositions: "Seleziona Posizioni Originali",
    positionSelectionTitle:
      "Seleziona le posizioni in cui questo giocatore può giocare",
    positionSelectionDescription:
      "Quali posizioni può giocare questo giocatore? (Seleziona tutte quelle evidenziate nella card)",
    competenceLevel: "Livello Competenza",
    competenceHigh: "Alta",
    competenceMedium: "Intermedia",
    competenceLow: "Bassa",
    editCompetences: "Modifica competenze",
    editBoosters: "Modifica booster",
    manualBoosters: "Inserimento manuale booster",
    competencesUpdated: "Competenze aggiornate",
    boostersUpdated: "Booster aggiornati",
    errorUpdatingPlayer: "Errore aggiornamento giocatore",
    mainPosition: "Posizione Principale",
    selectPositions: "Seleziona Posizioni",
    mustSelectAtLeastOne: "Devi selezionare almeno una posizione",
    positionGroupGoalkeeper: "Portieri",
    positionGroupPortiere: "Portiere",
    positionGroupDefense: "Difesa",
    positionGroupMidfield: "Centrocampo",
    positionGroupAttack: "Attacco",
    // Codici ruolo (PositionSelectionModal — etichette da t(), non hardcoded nel componente)
    positionRolePT: "Portiere",
    positionRoleDC: "Difensore centrale",
    positionRoleTS: "Terzino sinistro",
    positionRoleTD: "Terzino destro",
    positionRoleCC: "Centrocampista",
    positionRoleMED: "Mediano",
    positionRoleCLS: "Esterno sinistro",
    positionRoleCLD: "Esterno destro",
    positionRoleTRQ: "Trequartista",
    positionRoleESA: "Esterno sinistro",
    positionRoleEDA: "Esterno destro",
    positionRoleSP: "Seconda punta",
    positionRoleP: "Punta",
    positionRoleUnknown: "Ruolo",
    // Position Confirmation
    confirmPositionChange:
      "${playerName} è ${originalPositions} originale, ma lo stai spostando in slot ${slotPosition}.\n\n${slotPosition} NON è una posizione originale.\nCompetenza in ${slotPosition}: ${competence}\n${statsWarning}Vuoi comunque usarlo come ${slotPosition}? (Performance ridotta)\n\nSe confermi, ti prendi la responsabilità e il sistema accetta la scelta.",
    positionNotOriginal: "${slotPosition} NON è una posizione originale",
    positionOriginal: "Posizione originale",
    // Duplicate Player Alert
    duplicatePlayerAlert:
      'Il giocatore "${playerName}"${playerAge} è già presente:',
    duplicateInField: "In campo nello slot ${slotIndex}",
    duplicateInReserves: "Nelle riserve (${count} duplicato/i)",
    deleteDuplicatesAndProceed: "Vuoi eliminare i duplicati e procedere?",
    // Out of Role Alert (Drag & Drop)
    playersOutOfRoleAlert: "⚠️ Alcuni giocatori sono fuori ruolo:\n\n",
    playerOutOfRoleLine:
      "- ${playerName}: ${originalPositions} originale → ${newRole} (NON originale)",
    cannotPlayTheseRoles: "Non mi risulta possano fare questi ruoli.",
    addCompetenceAndSave: "Vuoi aggiungere competenza e salvare comunque?",
    // Duplicate Reserve Alert
    duplicateReserveAlert:
      'Il giocatore "${playerName}"${playerAge} è già presente nelle riserve. Vuoi eliminare il duplicato nelle riserve?',
    // Duplicate in Formation Alert
    duplicateInFormationAlert:
      'Il giocatore "${playerName}"${playerAge} è già presente in formazione nello slot ${slotIndex}. Vuoi sostituirlo?',
    // Duplicate Reserve Replace Alert
    duplicateReserveReplaceAlert:
      'Il giocatore "${playerName}"${playerAge} è già presente nelle riserve. Vuoi sostituirlo con i nuovi dati?',
    thisPlayer: "questo giocatore",
    duplicatePlayerTitle: "Giocatore Duplicato",
    duplicateInFormationMessage:
      'Il giocatore "${playerName}"${playerAge} è già in formazione nello slot ${slotIndex}.',
    duplicateInFormationDetails: "Vuoi sostituirlo con i nuovi dati?",
    // Confirm Update / Data Mismatch (pagina giocatore)
    confirmUpdate: "Conferma aggiornamento",
    dataMismatch: "ATTENZIONE: Dati non corrispondono!",
    nameDifferent: "Il nome è diverso",
    teamDifferent: "La squadra è diversa",
    positionDifferent: "La posizione è diversa",
    ageDifferent: "L'età è diversa",
    ensureSamePlayer:
      "Assicurati che la foto sia dello stesso giocatore prima di procedere.",
    confirmAnyway: "Conferma comunque",
    formationValidationTitle: "Validazione Formazione",
    proceedAnyway: "Procedi Comunque",
    playersOutOfRoleTitle: "Giocatori Fuori Ruolo",
    // Missing Data Modal
    missingDataTitle: "Dati Mancanti",
    missingDataDescription:
      "Alcuni dati obbligatori non sono stati estratti dalle foto. Inseriscili manualmente o ricarica le foto.",
    missingDataCompleteLater:
      "Se salvi comunque o inserisci solo i campi obbligatori, potrai completare il resto dopo: clicca sul giocatore (sul campo o in riserve) e nella scheda dettaglio carica le foto mancanti (Statistiche, Abilità, Booster). Il completamento avviene sempre caricando le foto, non compilando campi a mano.",
    requiredFields: "Campi Obbligatori",
    optionalFields: "Campi Opzionali",
    enterValue: "Inserisci valore...",
    enterValueOptional: "Opzionale...",
    retryUpload: "Ricarica Foto",
    saveAnyway: "Salva Comunque",
    saveWithManualData: "Salva con Dati Manuali",
    missingOptionalData: "Alcuni dati opzionali non sono stati estratti",
    continueWithoutOptionalData:
      "Vuoi continuare comunque? Puoi aggiungerli dopo.",

    // Guide dettagliate
    guideFormationTitle: "Come caricare una formazione",
    guideFormationStep1: '1. Seleziona "Carica Formazione"',
    guideFormationStep2:
      '2. Carica i giocatori uno a uno dalla sezione "Giocatori" (NON "Schema di gioco")',
    guideFormationStep3: '3. Clicca "Estrai Formazione" per analizzare',
    guideFormationStep4:
      "4. I 11 giocatori verranno salvati automaticamente come TITOLARI",
    guideFormationNote:
      '💡 Le foto devono essere prese dalla sezione "Giocatori" dove si vedono le statistiche dettagliate',
    guideCardTitle: "Come caricare riserve",
    guideCardStep1: '1. Seleziona "Carica Card Giocatore"',
    guideCardStep2:
      "2. Carica 1-3 screenshot di card giocatori singoli (statistiche, abilità, booster)",
    guideCardStep3: '3. Clicca "Estrai Dati" per analizzare ogni card',
    guideCardStep4:
      "4. I giocatori verranno salvati automaticamente come RISERVE",
    guideCardNote: "💡 Puoi caricare fino a 3 card alla volta",
    guideSwapTitle: "Come scambiare giocatori",
    guideSwapStep1: "1. Clicca su un giocatore (titolare o riserva)",
    guideSwapStep2:
      "2. Clicca su un altro giocatore per scambiare le loro posizioni",
    guideSwapStep3: "3. Il giocatore titolare diventerà riserva e viceversa",
    guideSwapNote: "💡 Puoi scambiare solo giocatori della tua rosa",
    guideEmptyFormation:
      'Nessuna formazione caricata. Carica i giocatori uno a uno dalla sezione "Giocatori".',
    guideEmptyReserves:
      "Nessuna riserva. Carica card giocatori singoli per aggiungere riserve.",
    redirectToFormation: "Reindirizzamento a Gestione Formazione...",
    noReservesUploadPlayers:
      "Nessuna riserva. Carica giocatori per aggiungerli alle riserve.",
    errorLoadingLayout: "Errore caricamento layout",
    errorLoadingPlayers: "Errore caricamento giocatori",
    errorLoadingData: "Errore caricamento dati",
    playerNotFoundInReserves: "Giocatore non trovato nelle riserve",
    errorDeletingDuplicateReserve:
      "Errore eliminazione giocatore duplicato riserva",
    operationCancelledDuplicateReserve:
      "Operazione annullata: giocatore già presente nelle riserve",
    errorRemoving: "Errore rimozione",
    imagesDifferentPlayers:
      "Le immagini appartengono a giocatori diversi. Verifica le immagini.",
    errorExtractionDataList: "Errore estrazione dati",
    errorPlayerDataNotExtracted:
      "Errore: dati giocatore non estratti. Verifica le immagini e riprova.",
    errorDeletingDuplicateReserveReplace:
      "Errore eliminazione giocatore duplicato",
    errorSavingPlayerGeneric: "Errore salvataggio giocatore",
    errorAssignment: "Errore assegnazione",
    errorRemovalAfterDuplicate: "Errore rimozione dopo eliminazione duplicato",
    errorDeletion: "Errore eliminazione",
    errorUnknown: "Errore sconosciuto",
    errorSavingLayout: "Errore salvataggio layout",
    errorSavingFormation: "Errore salvataggio formazione",
    errorSavingPlayerAfterReplace:
      "Errore salvataggio giocatore dopo sostituzione",
    errorLoadingReserve: "Errore caricamento riserva",
    errorProfileLoad: "Errore caricamento profilo",
    errorProfileSave: "Errore salvataggio profilo",
    selectOneImage: "Seleziona un'immagine",
    invalidJsonStructure: "Struttura JSON non valida",

    // Guida Completa
    guideTitle: "Guida Completa",
    guideSubtitle: "Scopri come usare al meglio la piattaforma",
    guideCompleteProfileTitle: "Completa il Tuo Profilo",
    guideCompleteProfileDesc:
      "Più completi il profilo, più l'AI può aiutarti in modo personalizzato!",
    guideProfileProgress: "Completamento Profilo",
    guideProfileComplete: "Profilo Completo! ✅",
    guideCompleteProfileButton: "Completa il Profilo",
    guideUseBrainTitle: "Usa il Cervello AI",
    guideUseBrainDesc:
      "Consigli tattici sempre disponibili! Clicca sul pulsante con il cervello in basso a destra per formazione, rosa, modulo, sostituzioni, stile. Per come usare l'app (caricare foto, wizard) usa la Guida o il tour Mostrami come.",
    guideBrainFeature1: "Guida Personale",
    guideBrainFeature1Desc: "Ti accompagna in ogni passo",
    guideBrainFeature2: "Motivante",
    guideBrainFeature2Desc: "Celebra i tuoi successi",
    guideBrainFeature3: "Sempre Disponibile",
    guideBrainFeature3Desc: "24/7 al tuo servizio",
    guidePagesTitle: "Guide per Pagina",
    guideSteps: "Come fare:",
    guideGoToPage: "Vai alla Pagina",
    guideFooterTitle: "Hai Domande?",
    guideFooterDesc:
      "Chiedi al cervello AI per consigli tattici (formazione, rosa, modulo, sostituzioni). Per uso app usa la Guida o il tour Mostrami come. 💪",
    guideFooterDescTourOnly:
      'Usa il tour "Mostrami come" (bussola in alto a destra) su ogni pagina per una guida passo-passo. Qui sopra trovi le guide per sezione.',
    guideDashboardTitle: "Dashboard",
    guideDashboardDesc: "Panoramica completa della tua squadra",
    guideDashboardStep1:
      "Visualizza statistiche squadra (titolari, riserve, totale)",
    guideDashboardStep2: "Consulta i top 3 giocatori per rating",
    guideDashboardStep3: "Accedi alle ultime partite con un click",
    guideDashboardStep4: "Naviga rapidamente alle altre sezioni",
    guideFormationTitle: "Gestione Formazione",
    guideFormationDesc: "Campo 2D interattivo per gestire la tua rosa",
    guideFormationStep1: "Scegli tra 14 formazioni ufficiali eFootball",
    guideFormationStep2: "Clicca sugli slot per assegnare giocatori",
    guideFormationStep3: "Carica giocatori con screenshot (fino a 3 immagini)",
    guideFormationStep4: "Gestisci riserve nella sezione dedicata",
    guideFormationStep5: "Visualizza dettagli giocatori cliccando sulle card",
    guideAddMatchTitle: "Aggiungi Partita",
    guideAddMatchDesc:
      "Wizard 6 step (Casa/Fuori + 5 sezioni foto) per caricare dati partita",
    guideAddMatchStep1: "Step 1: Carica screenshot pagelle giocatori",
    guideAddMatchStep2: "Step 2: Carica screenshot statistiche squadra",
    guideAddMatchStep3: "Step 3: Carica screenshot aree di attacco",
    guideAddMatchStep4: "Step 4: Carica screenshot recuperi palla",
    guideAddMatchStep5: "Step 5: Carica screenshot formazione avversaria",
    guideAddMatchStep6: "Salva partita quando tutti gli step sono completati",
    guideMatchDetailTitle: "Dettaglio Partita",
    guideMatchDetailDesc:
      "Dalla dashboard clicca su una partita per analisi completa, riassunto AI e suggerimenti.",
    guideMatchDetailStep1:
      "Dalla dashboard clicca su una partita per aprire il dettaglio",
    guideMatchDetailStep2:
      "Visualizza tutti i dati della partita e genera riassunto AI bilingue (IT/EN)",
    guideMatchDetailStep3: "Analizza performance giocatori",
    guideMatchDetailStep4: "Consulta suggerimenti tattici",
    guidePlayerDetailTitle: "Dettaglio Giocatore",
    guidePlayerDetailDesc:
      "Dalla formazione clicca su un giocatore per statistiche, abilità e upload screenshot.",
    guidePlayerDetailStep1:
      "Dalla gestione formazione clicca su un giocatore per aprire il dettaglio",
    guidePlayerDetailStep2: "Completa profilo con foto aggiuntive",
    guidePlayerDetailStep3: "Carica screenshot stats, skills, booster",
    guideProfileTitle: "Impostazioni Profilo",
    guideProfileDesc: "Personalizza il tuo profilo e preferenze",
    guideProfileStep1: "Inserisci dati personali (nome, cognome)",
    guideProfileStep2: "Configura dati gioco (divisione, squadra preferita)",
    guideProfileStep3: "Personalizza preferenze IA (nome AI, come ricordarti)",
    guideProfileStep4: "Indica problemi comuni per suggerimenti mirati",
    guidePalestraCoachTitle: "Palestra Coach",
    guidePalestraCoachDesc:
      "Solo profilo di gioco e feedback post-partita. Dalla dashboard apri la modal; per consigli tattici usa la chat principale.",
    guidePalestraCoachStep1: 'Dalla dashboard clicca su "Palestra Coach"',
    guidePalestraCoachStep2:
      "Compila il profilo di gioco (piattaforma, connessione, PA, ecc.) o racconta il feedback sulla partita",
    guidePalestraCoachStep3:
      "Salva e chiudi: i dati alimentano la Conoscenza AI e i consigli personalizzati",
    guideCountermeasuresTitle: "Contromisure pre-partita",
    guideCountermeasuresDesc:
      "Carica formazione avversaria, estrai dati e genera contromisure tattiche con l'IA (pre-partita).",
    guideCountermeasuresStep1:
      "Carica uno screenshot della formazione avversaria",
    guideCountermeasuresStep2:
      "Estrazione e contromisure partono automaticamente",
    guideCountermeasuresStep3: "Leggi analisi e suggerimenti generati",
    guideCountermeasuresStep4:
      "Leggi analisi, aggiustamenti tattici e istruzioni individuali",
    guideCoachesTitle: "Allenatori",
    guideCoachesDesc:
      "Carica foto allenatori, imposta attivo e consulta competenze per stile di gioco.",
    guideCoachesStep1:
      "Carica 1 o 2 screenshot (foto principale e connessione)",
    guideCoachesStep2: "L'IA estrae nome, squadra e competenze",
    guideCoachesStep3:
      "Imposta un allenatore come attivo; vedi dettagli o elimina",
    guideClassificaTitle: "Classifica mensile",
    guideClassificaDesc:
      "Classifica From Zero to Hero: punti da partite, utilizzo IA e profilo. Eleggibilità: almeno 1 partita completa nel mese e profilo ≥50%.",
    guideClassificaStep1: "Consulta la tua posizione e i punti del mese",
    guideClassificaStep2:
      'Espandi "Dettaglio punti" per vedere come vengono calcolati',
    guideClassificaStep3:
      "Partecipa con almeno 1 partita completa nel mese e profilo completato al 50%",
    guideGestioneProfiloTitle: "Gestione profilo (Hero Points)",
    guideGestioneProfiloDesc:
      "Crediti residui, analisi totali, rank e transazioni. Acquista crediti e consulta la tua attivita recente.",
    guideGestioneProfiloStep1:
      "Visualizza crediti residui (Hero Points) e rank (Bronze/Silver/Gold/Platinum)",
    guideGestioneProfiloStep2:
      "Controlla analisi, crediti e attivita recente del tuo account",
    guideGestioneProfiloStep3:
      "Controlla le transazioni (utilizzo crediti per analisi, chat, estrazioni)",
    guideDashboardStep3:
      "Accedi alle ultime partite con un click (espandi la card per vedere l'elenco)",
    guideDashboardStepBanner:
      'Barra Conoscenza: indica quanto l\'IA ti conosce. "Informazioni IA" e "Aggiorna analisi" per aggiornare.',
    guideDashboardStepObiettivi:
      "Obiettivi settimanali: espandi la card per vedere i task; completali per aumentare lo score.",
    guideDashboardStepClassifica:
      "Dashboard: controlla stato setup, missioni e scorciatoie principali.",
    guideDashboardStepStatistiche:
      "Statistiche di gioco: carica le 2 schermate Analisi eFootball per consigli su tiro, passaggio e difesa.",
    guideShowMeHowTitle: "Mostrami come",
    guideShowMeHowDesc:
      "Tour interattivo su ogni pagina! Clicca il pulsante con la bussola in alto a destra per una guida passo-passo. Disponibile su Dashboard, Formazione, Aggiungi Partita, Contromisure, Allenatori, Guida, Profilo e Gestione profilo.",
    guideShowMeHowFeature1: "Tour contestuali",
    guideShowMeHowFeature1Desc: "Un tour diverso per ogni pagina",
    guideShowMeHowFeature2: "Sempre disponibile",
    guideShowMeHowFeature2Desc: "Riavvia quando vuoi",
    guideLink: "Guida Completa",
    // Tour interattivo (Mostrami come)
    tourShowMeHow: "Mostrami come",
    tourNext: "Avanti",
    tourPrev: "Indietro",
    tourFinish: "Fine",
    tourClose: "Chiudi",
    tourStart: "Inizia",
    tourSkip: "Salta tour",
    tourProgress: "{{current}} / {{total}}",
    tourNoTour: "Nessuna guida per questa pagina.",
    tourDashboardIntroTitle: "Ciao! 👋",
    tourDashboardIntroDesc:
      "Ecco cosa trovi qui: squadra, obiettivi e navigazione. Pronto?",
    tourDashboardAiTitle: "Quanto mi conosci? 📊",
    tourDashboardAiDesc:
      "Più dati inserisci (profilo, rosa, partite) → consigli più precisi per te.",
    tourDashboardTaskTitle: "I tuoi obiettivi 🎯",
    tourDashboardTaskDesc:
      "Task personalizzati per migliorare. Ti aiutano a completare il setup e usare meglio l'app.",
    tourDashboardSquadTitle: "La tua squadra 👥",
    tourDashboardSquadDesc: "Titolari e riserve sempre a portata di mano.",
    tourDashboardNavTitle: "Dove vuoi andare? 🧭",
    tourDashboardNavDesc:
      "Tutte le sezioni a un click: formazione, partite, allenatori...",
    tourDashboardAddMatchTitle: "Aggiungi una partita ➕",
    tourDashboardAddMatchDesc:
      "Carica screenshot e lascia che l'IA analizzi per te.",
    tourDashboardMatchesTitle: "Le tue partite 🎮",
    tourDashboardMatchesDesc:
      "Clicca per vedere analisi e consigli personalizzati.",
    tourDashboardInsightsTitle: "Cosa emerge? 💡",
    tourDashboardInsightsDesc:
      "Pattern del tuo gioco e consigli su cosa migliorare.",
    tourDashboardClassificaTitle: "Classifica mensile",
    tourDashboardClassificaDesc:
      "Punti From Zero to Hero: partite, utilizzo IA e profilo. Clicca per vedere la classifica completa e la tua posizione.",
    tourClassificaIntroTitle: "Classifica mensile",
    tourClassificaIntroDesc:
      "Qui vedi la classifica del mese, i giorni alla fine del mese e come salire di posizione.",
    tourClassificaYourPositionTitle: "La tua posizione",
    tourClassificaYourPositionDesc:
      'Punti e posizione. Usa "Dettaglio punti" per vedere come vengono calcolati (partite, utilizzo IA, profilo).',
    tourClassificaRankingsTitle: "Classifica",
    tourClassificaRankingsDesc:
      "Podio e lista completa. Per apparire servono almeno 1 partita completa nel mese e profilo al 50% o oltre.",
    tourGestioneProfiloIntroTitle: "Gestione profilo",
    tourGestioneProfiloIntroDesc:
      "Hero Points (crediti), analisi totali, rank e link a classifica e transazioni.",
    tourGestioneProfiloBalanceTitle: "Crediti residui",
    tourGestioneProfiloBalanceDesc:
      "Crediti disponibili per analisi, chat e estrazioni. Acquista per ricaricare.",
    tourGestioneProfiloLeaderboardTitle: "Classifica e premi",
    tourGestioneProfiloLeaderboardDesc:
      "La tua posizione in classifica mensile e storico. Premi per i primi classificati.",
    tourGestioneProfiloTransactionsTitle: "Attività recente",
    tourGestioneProfiloTransactionsDesc:
      "Transazioni: utilizzo crediti per analisi partite, chat, estrazioni giocatori e formazioni.",
    tourFormationIntroTitle: "Gestione Formazione",
    tourFormationIntroDesc:
      "Qui gestisci la rosa: campo 2D, titolari, riserve, caricamento formazione e card giocatori.",
    tourFormationHeaderTitle: "Header e Formazione",
    tourFormationHeaderDesc:
      "Torna in Dashboard, cambia formazione o personalizza posizioni. Il nome della formazione attuale è mostrato qui.",
    tourFormationActiveCoachTitle: "Allenatore Attivo",
    tourFormationActiveCoachDesc:
      "L'allenatore attivo influenza stile e competenze. Puoi cambiarlo dalla sezione Allenatori.",
    tourFormationFieldTitle: "Campo 2D",
    tourFormationFieldDesc:
      "Clicca sugli slot per assegnare giocatori da riserve o caricare da screenshot. Personalizza posizioni in modalità modifica.",
    tourFormationReservesTitle: "Riserve",
    tourFormationReservesDesc:
      "Giocatori non in campo. Carica card singole o assegna alle posizioni cliccando sugli slot.",
    tourFormationUploadTitle: "Carica Formazione / Riserve",
    tourFormationUploadDesc:
      'Carica i giocatori uno a uno dalla sezione "Giocatori" o aggiungi riserve singole.',
    tourFormationCoachesLinkTitle: "Allenatori",
    tourFormationCoachesLinkDesc:
      "Vai alla gestione allenatori: carica foto, imposta attivo, consulta competenze.",
    tutorialRosaTitle: "Tutorial: caricamento rosa",
    tutorialRosaIntro:
      "Come caricare titolari e riserve, quali foto servono, cosa significano gli alert e cosa fare se le foto non vengono riconosciute.",
    tutorialRosaSectionSteps: "Come caricare la rosa",
    tutorialRosaSectionPhotos: "Le 3 foto da caricare",
    tutorialRosaSectionAlerts: "Cosa sono gli alert",
    tutorialRosaSectionCompleteMove: "Completare dopo e spostare i giocatori",
    tutorialRosaSectionTroubleshoot: "La foto non viene riconosciuta?",
    tutorialRosaCompleteLaterIntro:
      "Se alcune cose non sono state estratte o vuoi aggiungere foto dopo:",
    tutorialRosaCompleteLater1:
      "Clicca sul giocatore (sul campo o in riserve) per aprire la scheda dettaglio.",
    tutorialRosaCompleteLater2:
      "Nella scheda puoi completare il profilo caricando le foto mancanti (Statistiche, Abilità, Booster), non compilando campi a mano.",
    tutorialRosaMoveIntro: "Come spostare i giocatori sul campo:",
    tutorialRosaMove1:
      'Assegnare uno slot: clicca sullo slot vuoto sul campo → scegli un giocatore dalle riserve o "Carica foto" per aggiungerne uno nuovo.',
    tutorialRosaMove2:
      'Sostituire un titolare: clicca sullo slot con il giocatore → nella finestra puoi "Rimuovi da formazione" (va in riserve) o assegnare un altro dalla lista riserve.',
    tutorialRosaMove3:
      'Personalizzare le posizioni sul campo: clicca "Personalizza posizioni" (icona matita) nell\'header → trascina i giocatori sul campo per spostarli, poi "Salva posizioni".',
    tutorialRosaStep1:
      'Se non hai ancora una formazione: clicca "Carica Formazione" e carica i giocatori uno a uno dalla sezione "Giocatori" del gioco (NON da "Schema di gioco"). Per ogni giocatore servono 3 foto: Statistiche, Abilità e Booster.',
    tutorialRosaStep2:
      'Per aggiungere o sostituire un giocatore in uno slot: clicca sullo slot sul campo, poi "Carica foto" (o l\'icona upload).',
    tutorialRosaStep3:
      "Carica almeno 2 foto del giocatore: Statistiche (obbligatoria) e Abilità (obbligatoria). La terza (Booster) è opzionale.",
    tutorialRosaStep4:
      'Clicca "Salva Giocatore". L\'app estrae nome, rating, posizione e abilità dalle immagini.',
    tutorialRosaStep5:
      'Per le riserve: nella sezione Riserve clicca "Carica giocatori" e carica le stesse 3 tipologie di foto per ogni riserva.',
    tutorialRosaPhotosIntro:
      "Ogni giocatore può avere fino a 3 screenshot dal gioco eFootball:",
    tutorialRosaPhoto1Title: "Foto Statistiche",
    tutorialRosaPhoto1Desc:
      "La card del giocatore con statistiche numeriche (tiro, passaggio, difesa, ecc.). In eFootball: apri la scheda del giocatore, sezione Statistiche.",
    tutorialRosaPhoto2Title: "Foto Abilità",
    tutorialRosaPhoto2Desc:
      "La schermata con le Player Skills (Passaggio filtrante, Tiro a giro, ecc.). In eFootball: scheda giocatore, sezione Abilità.",
    tutorialRosaPhoto3Title: "Foto Booster",
    tutorialRosaPhoto3Desc:
      "Opzionale: schermata con booster e bonus speciali. Se non ce l'hai, puoi saltarla.",
    tutorialRosaPhotoRulesTitle: "Regole importanti:",
    tutorialRosaPhotoFullScreen:
      "Ogni foto deve mostrare tutta la schermata del gioco (nome, rating, statistiche, grafici), non solo un ritaglio con i numeri. Alcuni utenti inviano solo le statistiche: non basta.",
    tutorialRosaPhotoBoosterActive:
      "Per la foto Booster: attiva il toggle «Vedi effetto Booster max» (verde, in alto a destra) prima di fare lo screenshot, così l'app legge l’effetto correttamente.",
    tutorialRosaAlertsIntro:
      "Durante il caricamento possono apparire messaggi (alert). Ecco cosa significano:",
    tutorialRosaAlertDuplicate: "Giocatore già presente",
    tutorialRosaAlertDuplicateDesc:
      "Stai aggiungendo un giocatore che è già in rosa (stesso nome). Puoi sostituirlo nello slot o nelle riserve, oppure annullare.",
    tutorialRosaAlertOutOfRole: "Giocatore fuori ruolo",
    tutorialRosaAlertOutOfRoleDesc:
      "Uno o più giocatori sono in una posizione per cui non hanno competenza sufficiente. Controlla le posizioni originali e sposta o sostituisci i giocatori.",
    tutorialRosaAlertReplace: "Sostituire riserva/slot",
    tutorialRosaAlertReplaceDesc:
      "Il giocatore è già in formazione o in panchina. Scegli se sostituire con i nuovi dati (es. dopo aver caricato foto migliori) o tenere i dati esistenti.",
    tutorialRosaTroubleshootIntro:
      "Se l'estrazione fallisce o i dati sono sbagliati:",
    tutorialRosaTroubleshoot1:
      "Verifica di aver caricato la schermata giusta: Statistiche = numeri e grafici; Abilità = lista Player Skills; Booster = bonus (opzionale).",
    tutorialRosaTroubleshoot2:
      "Usa screenshot nitidi, senza riflessi. Evita foto troppo scure o ritagliate male.",
    tutorialRosaTroubleshoot3:
      'Se appare "Dati mancanti": puoi "Ricarica Foto" e riprovare con un\'immagine migliore. Oppure inserisci solo i campi obbligatori e "Salva con dati manuali": il resto del profilo lo completerai dopo caricando le foto mancanti dalla scheda giocatore.',
    tutorialRosaTroubleshoot4:
      "Se l'app non riconosce nulla: controlla che l'immagine sia proprio dalla scheda giocatore di eFootball (non menu o altra schermata).",
    tutorialRosaTroubleshoot5:
      "Foto solo delle statistiche? Non basta: invia la schermata intera (nome giocatore, rating, grafici, tutto il contesto).",
    tutorialRosaTroubleshoot6:
      "Per la foto Booster: nello screenshot il toggle «Vedi effetto Booster max» deve essere attivo (verde), altrimenti l’estrazione può fallire.",
    tutorialRosaGotIt: "Ho capito",
    tutorialRosaButton: "Tutorial rosa",
    goToFormation: "Vai alla formazione",
    openPalestraCoach: "Apri Palestra Coach",
    tourMatchIntroTitle: "Aggiungi Partita",
    tourMatchIntroDesc:
      "Wizard in 6 step: prima Casa/Fuori, poi carica screenshot pagelle, statistiche, aree attacco, recuperi palla e formazione avversaria.",
    tourMatchProgressTitle: "Progresso",
    tourMatchProgressDesc:
      "Barra e conteggio foto caricate. Il risultato estratto (se presente) viene mostrato qui.",
    tourMatchStepsTitle: "Step del Wizard",
    tourMatchStepsDesc:
      "Clicca su uno step per passare. Verde = completato, grigio = saltato. Carica, estrai o salta ogni sezione.",
    tourMatchContentTitle: "Contenuto Step",
    tourMatchContentDesc:
      "Carica l'immagine, clicca Estrai per analizzare. Puoi saltare uno step se non hai lo screenshot.",
    tourMatchSaveTitle: "Salva Partita",
    tourMatchSaveDesc:
      "Quando almeno uno step è completato, clicca qui per riepilogo, Casa/Fuori e salvataggio.",
    tourGuidaIntroTitle: "Guida Completa",
    tourGuidaIntroDesc:
      'Scopri la piattaforma: profilo, Cervello AI, tour "Mostrami come" e guide per ogni pagina.',
    tourGuidaProfileHeroTitle: "Completa il Profilo",
    tourGuidaProfileHeroDesc:
      "Più completi il profilo, più l'IA ti conosce. Vai su Impostazioni Profilo per compilarlo.",
    tourGuidaBrainHeroTitle: "Cervello AI",
    tourGuidaBrainHeroDesc:
      "Assistente sempre disponibile in basso a destra. Chiedi qualsiasi cosa: guida, motivazione, passi operativi.",
    tourGuidaPagesTitle: "Guide per Pagina",
    tourGuidaPagesDesc:
      "Guide rapide per Dashboard, Formazione, Aggiungi Partita, Contromisure, Allenatori, Profilo. Espandi e vai alla pagina.",
    tourGuidaFooterTitle: "Hai Domande?",
    tourGuidaFooterDesc:
      'Usa il Cervello AI o il tour "Mostrami come" (bottone bussola in alto a destra) su ogni pagina.',
    tourProfileIntroTitle: "Impostazioni Profilo",
    tourProfileIntroDesc:
      "Personalizza dati personali, gioco, preferenze IA ed esperienza. Salva sezione per sezione.",
    tourProfileProfilingTitle: "Profilazione",
    tourProfileProfilingDesc:
      "Indica quanto l'IA ti conosce. Completa tutte le sezioni per avvicinarti al 100%.",
    tourProfilePersonalTitle: "Dati Personali",
    tourProfilePersonalDesc:
      'Nome, cognome. Salva con il pulsante "Salva" nella sezione.',
    tourProfileGameTitle: "Dati Gioco",
    tourProfileGameDesc:
      "Divisione, squadra preferita, nome squadra in gioco. Usati per consigli e statistiche.",
    tourProfileAITitle: "Preferenze IA",
    tourProfileAIDesc:
      "Nome dell'IA, come ricordarti. Personalizza l'assistente.",
    tourProfileExpTitle: "Esperienza Gioco",
    tourProfileExpDesc:
      "Ore a settimana, problemi comuni. Aiutano l'IA a dare suggerimenti mirati.",
    tourProfileCompleteTitle: "Completa Profilo",
    tourProfileCompleteDesc:
      'Salva tutto il profilo in un colpo solo. Usa anche i pulsanti "Salva" nelle singole sezioni.',
    tourCounterIntroTitle: "Contromisure pre-partita",
    tourCounterIntroDesc:
      "Carica la formazione avversaria, estrai i dati, genera contromisure tattiche e istruzioni con l'IA.",
    tourCounterUploadTitle: "Carica Formazione Avversaria",
    tourCounterUploadDesc:
      "Carica uno screenshot. Estrazione e contromisure partono automaticamente.",
    tourCounterExtractedTitle: "Formazione Estratta",
    tourCounterExtractedDesc:
      "Formazione estratta. Le contromisure vengono generate automaticamente.",
    tourCounterGenerateTitle: "Genera Contromisure",
    tourCounterGenerateDesc:
      "L'IA produce analisi, aggiustamenti tattici, istruzioni e suggerimenti giocatori.",
    tourCounterResultTitle: "Contromisure Generate",
    tourCounterResultDesc:
      "Analisi, contromisure tattiche, istruzioni e giocatori chiave. Applica i suggerimenti che preferisci.",
    tourCoachesIntroTitle: "Allenatori",
    tourCoachesIntroDesc:
      "Gestisci gli allenatori: carica fino a 2 foto (principale + connessione), imposta attivo, consulta dettagli.",
    tourCoachesUploadTitle: "Carica Allenatore",
    tourCoachesUploadDesc:
      "Carica 1 o 2 screenshot (foto principale e connessione). L'IA estrae nome, squadra e competenze.",
    tourCoachesListTitle: "Lista Allenatori",
    tourCoachesListDesc:
      "Card per ogni allenatore. Stella = attivo. Dettagli, imposta come titolare o elimina.",

    // NUOVI TOUR STEP - Dashboard migliorata
    tourDashboardSetupBannerTitle: "Completamento Setup",
    tourDashboardSetupBannerDesc:
      "Banner che mostra cosa manca per configurare completamente la tua squadra: allenatore, statistiche di gioco, o formazione completa. Clicca i link per completare.",
    tourDashboardMissionCenterTitle: "Centro Missioni",
    tourDashboardMissionCenterDesc:
      "Il tuo hub personale: obiettivi giornalieri, sfide speciali e tracciamento progressi. Usalo per capire il prossimo passo utile.",
    tourDashboardGameAnalysisTitle: "Analisi Partita Rapida",
    tourDashboardGameAnalysisDesc:
      "Carica gli screenshot delle statistiche di gioco (ultime 10 partite) per ricevere consigli personalizzati e task specifici sul tuo stile di gioco.",

    // NUOVI TOUR STEP - Formazione
    tourFormationTacticalTitle: "Impostazioni Tattiche",
    tourFormationTacticalDesc:
      "Personalizza istruzioni individuali per ogni giocatore: stile di difesa, posizionamento, supporto e molto altro. Salva le tue preferenze tattiche.",

    // NUOVI TOUR STEP - Partita
    tourMatchHomeAwayTitle: "Casa o Fuori",
    tourMatchHomeAwayDesc:
      "Seleziona se hai giocato in casa o fuori. Questo aiuta l'IA a identificare correttamente la tua squadra nelle statistiche della partita.",

    // NUOVI TOUR STEP - Allenatori
    tourCoachesActiveTitle: "Allenatore Attivo",
    tourCoachesActiveDesc:
      "L'allenatore con la stella è quello attualmente impostato per la tua squadra. Il suo stile di gioco influenza i consigli tattici che ricevi.",

    back: "Indietro",
    whatIsFormation: "Cos'è una formazione?",
    whatIsFormationDesc:
      "Una formazione è uno screenshot che mostra tutti gli 11 giocatori sul campo. Caricando una formazione, i giocatori vengono automaticamente identificati come TITOLARI.",
    whatIsCard: "Cos'è una card giocatore?",
    whatIsCardDesc:
      "Una card è uno screenshot di un singolo giocatore che mostra le sue statistiche, abilità e booster. Le card vengono salvate come RISERVE.",
    whatIsSwap: "Come funziona lo scambio?",
    whatIsSwapDesc:
      "Clicca su un giocatore per selezionarlo, poi clicca su un altro per scambiare le loro posizioni. Un titolare diventa riserva e viceversa.",
    // Campo 2D
    noFormationLoaded: "Nessuna formazione caricata",
    loadFormationFirst:
      'Carica i giocatori uno a uno dalla sezione "Giocatori" per vedere il campo 2D',
    clickToAssign: "Clicca per assegnare",
    assignPlayer: "Assegna Giocatore",
    modifySlot: "Modifica Slot",
    currentPlayer: "Giocatore attuale",
    removeFromSlot: "Rimuovi da Slot",
    deletePermanently: "Elimina Definitivamente",
    moveToReserves: "Sposta in Riserve",
    photoUploadedSuccessfully: "Foto caricata con successo!",
    uploadedPhotoLabel: "Foto caricata",
    playerAssignedSuccessfully: "Giocatore assegnato con successo!",
    playerDeletedSuccessfully: "Giocatore eliminato con successo!",
    playerMovedToReserves: "Giocatore spostato in riserve!",
    tacticalSettingsSaved: "Impostazioni tattiche salvate con successo!",
    errorUploadingPhoto: "Errore nel caricamento della foto",
    errorAssigningPlayer: "Errore nell'assegnazione del giocatore",
    errorDeletingPlayer: "Errore nell'eliminazione del giocatore",
    errorMovingPlayer: "Errore nello spostamento del giocatore",
    errorSavingTacticalSettings:
      "Errore nel salvataggio delle impostazioni tattiche",
    uploadPlayerPhoto: "Carica Foto Giocatore",
    changePlayer: "Cambia Giocatore (Carica Foto)",
    orSelectFromReserves: "Oppure seleziona da riserve",
    noFormationMessage:
      'Nessuna formazione caricata. Carica i giocatori uno a uno dalla sezione "Giocatori" per vedere il campo 2D',
    changeFormation: "Cambia Formazione",
    priority: "Priorità",
    priorityHigh: "ALTA",
    priorityMedium: "MEDIA",
    priorityLow: "BASSA",
    importFromScreenshot: "Importa da Screenshot (Avanzato)",
    removeFromSlot: "Rimuovi da Slot",
    deletePermanently: "Elimina Definitivamente",
    remove: "Rimuovi",
    loadReserve: "Carica Riserva",
    completeProfile: "Completa Profilo",
    goToPlayerProfile: "Vai al profilo",
    partialProfile: "Profilo parziale",
    clickToComplete: 'Clicca "Completa Profilo" per aggiungere dati mancanti',
    profileSettings: "Impostazioni Profilo",
    personalData: "Dati Personali",
    gameData: "Dati Gioco",
    aiPreferences: "Preferenze IA",
    gameExperience: "Esperienza Gioco",
    teamNameInGame: "Nome squadra nel gioco",
    important: "Importante",
    teamNameDescription:
      "💡 Questo nome verrà usato per identificare la tua squadra nelle partite e nelle statistiche",
    profiling: "Profilazione",
    completeFor100: "Completa per 100%",
    moreYouAnswer: "💡 Più rispondi, più l'IA ti conosce e ti aiuta meglio!",
    saving: "Salvataggio...",
    firstName: "Nome",
    lastName: "Cognome",
    yourFirstName: "Il tuo nome",
    yourLastName: "Il tuo cognome",
    currentDivision: "Divisione attuale",
    selectDivision: "Seleziona divisione",
    favoriteTeam: "Squadra del cuore",
    favoriteTeamPlaceholder: "Es: Juventus, Real Madrid...",
    aiName: "Nome IA (opzionale)",
    aiNamePlaceholder: 'Es: "Coach Mario", "Alex"',
    howToRemember: "Come vuoi che ti ricordi?",
    howToRememberPlaceholder:
      'Es: "Sono un giocatore competitivo...", "Gioco per divertimento..."',
    hoursPerWeek: "Quante ore giochi a settimana?",
    hoursPerWeekPlaceholder: "0-168 ore",
    whichProblems: "Quali problemi riscontri?",
    problemPassaggi: "Passaggi",
    problemDifesa: "Difesa",
    problemCentrocampo: "Centrocampo",
    problemAttacco: "Attacco",
    problemFormazione: "Formazione",
    problemIstruzioniTattiche: "Istruzioni tattiche",
    loadingProfile: "Caricamento profilo...",
    profileSectionSaved: "salvato con successo!",
    profileLevelComplete: "Completo",
    profileLevelIntermediate: "Intermedio",
    profileLevelBeginner: "Principiante",
    savedSuccessfully: "salvato con successo!",
    skipped: "Skipped",
    sectionsCompleted: "sezioni completate",
    deleteReserve: "Elimina Riserva",
    confirmDeleteReserve:
      "Sei sicuro di voler eliminare definitivamente questo giocatore dalle riserve?",
    formationCustom: "Personalizzato",
    customizePositions: "Personalizza Posizioni",
    saveChanges: "Salva Modifiche",
    cancel: "Annulla",
    editModeActive:
      "Modalità personalizzazione attiva: trascina i giocatori per spostarli",
    positionsSavedSuccessfully: "Posizioni salvate con successo",
    errorSavingPositions: "Errore salvataggio posizioni",
    changesCancelled: "Modifiche annullate",
    formationInvalidTitle: "Controlla la formazione",
    formationInvalidConfirm: "Vuoi salvare comunque?",
    formationValidationSimple:
      "Verifica che ogni giocatore sia nel ruolo che usi davvero in partita. L’app e la coach AI usano questa disposizione e queste posizioni, insieme ad altri dati della rosa, per personalizzare consigli e analisi.",
    formationSavedWithWarnings:
      "Formazione salvata. Controlla che ruoli e posizioni riflettano come scendi in campo: la coach AI si basa anche su questa schermata.",
    saveCancelled: "Salvataggio annullato",
    deleteReserveError: "Errore eliminazione giocatore",
    back: "Indietro",
    details: "Dettagli Giocatore",
    assignPlayer: "Assegna Giocatore",
    slot: "Slot",
    playerInfo: "Info Giocatore",
    age: "Età",
    club: "Club",
    nationality: "Nazionalità",
    playingStyle: "Stile di Gioco",
    years: "anni",
    overallRating: "Overall",
    uploadOneImageOnly: "Carica una sola immagine alla volta",
    saveAndUpdate: "Salva e Aggiorna",
    createFormation: "Crea la tua formazione",
    selectFormationDesc:
      "Seleziona una formazione tattica predefinita per iniziare. Poi potrai caricare le carte dei giocatori per ogni slot.",
    createFormationBtn: "Crea Formazione",
    updatePhoto: "Aggiorna Foto",
    uploadModifyPhoto: "Carica/Modifica Foto",
    uploadPlayerInstructions:
      "Carica le immagini per estrarre automaticamente i dati del giocatore",
    photoStats: "Foto Statistiche",
    photoStatsDesc: "Carta con statistiche numeriche",
    photoSkills: "Foto Abilità",
    photoSkillsDesc: "Abilità giocatore (Player Skills)",
    photoBooster: "Foto Booster",
    photoBoosterDesc: "Booster e bonus speciali (opzionale)",
    slotInfo: "Slot",
    currentPlayerInfo: "Giocatore attuale",
    extractedDataFromPhoto: "Dati Estratti da Foto",
    statsSection: "Statistiche",
    skillsSection: "Abilità",
    boostersSection: "Booster",
    notAvailable: "Non disponibili",
    extractedFromCard: "(estratti da card)",
    profileComplete: "Profilo Completo",
    sectionsCompleted: "sezioni completate",
    statsNotAvailable: "Statistiche non disponibili",
    skillsNotAvailable: "Nessuna abilità disponibile",
    boostersNotAvailable: "Booster non disponibili",
    updateStats: "Aggiorna Statistiche",
    uploadStats: "Carica Statistiche",
    updateSkills: "Aggiorna Abilità",
    uploadSkills: "Carica Abilità",
    updateBoosters: "Aggiorna Booster",
    uploadBoosters: "Carica Booster",
    skillsLabel: "SKILLS",
    comSkillsLabel: "COM SKILLS",
    activeBoosters: "BOOSTER ATTIVI",
    effect: "Effetto",
    condition: "Condizione",
    statsLabel: "Statistiche",
    statistics: "Statistiche",
    comSkills: "Abilità aggiuntive",
    skillsBoosterLabel: "Abilità/Booster",
    name: "Nome",
    team: "Squadra",
    role: "Ruolo",
    nA: "N/A",
    // AI Knowledge Bar
    aiKnowledge: "Conoscenza AI",
    aiKnowledgeLevel: "Livello",
    aiKnowledgeBeginner: "Principiante",
    aiKnowledgeIntermediate: "Intermedio",
    aiKnowledgeAdvanced: "Avanzato",
    aiKnowledgeExpert: "Esperto",
    aiKnowledgeDescription: "Stiamo imparando a conoscerti",
    aiKnowledgeDescriptionBeginner:
      "Stiamo imparando a conoscerti: aggiungi profilo, rosa e partite per consigli davvero tuoi.",
    aiKnowledgeDescriptionIntermediate:
      "Ti conosciamo abbastanza bene: i consigli sono già personalizzati. Aggiungi partite e obiettivi per andare oltre.",
    aiKnowledgeDescriptionAdvanced:
      "Ti conosciamo bene: i consigli riflettono il tuo modo di giocare.",
    aiKnowledgeDescriptionExpert:
      "Livello esperto: i consigli sono molto su misura. Più partite e utilizzo aiutano a raggiungere il 100%.",
    aiKnowledgeProfile: "Profilo",
    aiKnowledgeRoster: "Rosa",
    aiKnowledgeMatches: "Partite",
    aiKnowledgePatterns: "Pattern",
    aiKnowledgeCoach: "Allenatore",
    aiKnowledgeUsage: "Utilizzo",
    aiKnowledgeSuccess: "Successi",
    aiKnowledgeBadge: "AI COACH INSIGHT",
    poweredByCoachAI: "Powered by Coach AI Engine",
    aiKnowledgeBeginnerShort: "Inizia il tuo percorso",
    aiKnowledgeIntermediateShort: "Stai migliorando",
    aiKnowledgeAdvancedShort: "Competenza elevata",
    aiKnowledgeExpertShort: "Maestro del gioco",
    viewDetails: "Vedi dettagli",
    completeProfileToIncreaseKnowledge:
      "Un passo in più: completa nome, squadra e divisione. Così i consigli saranno davvero tuoi.",
    ctaNextStepProfile:
      "Manca ancora un po' di profilo (nome, squadra, divisione). Compilalo per consigli su misura.",
    ctaNextStepProfileDetails:
      "Aggiungi altri dettagli in Impostazioni profilo (squadra preferita, ore di gioco, come ricordarti) per consigli ancora più su misura.",
    ctaNextStepRoster:
      "Inserisci la tua rosa e la formazione (11 titolari): così possiamo parlare dei tuoi giocatori.",
    ctaNextStepMatches:
      "Aggiungi le partite che giochi: più ne inserisci, più i consigli riflettono come giochi davvero.",
    ctaNextStepPattern:
      "Aggiungi altre partite: da lì ricaviamo formazioni e stili che usi e i punti su cui lavorare.",
    ctaNextStepCoach:
      "Scegli un allenatore attivo nella sezione Allenatori: i consigli terranno conto del suo stile.",
    ctaNextStepUsage:
      "Usa la chat e le funzioni IA: più le usi, più capiamo come aiutarti.",
    ctaNextStepSuccess:
      "Completa gli obiettivi settimanali: oltre ad alzare la barra, ci dicono come stai migliorando.",
    ctaNextStepCoachTraining:
      "Usa la Palestra Coach: le sessioni con feedback tattico aumentano la conoscenza che l'IA ha di te.",
    aiKnowledgePatternsHint:
      "Formazioni e stili che usi in partita e problemi ricorrenti: li ricaviamo dalle partite che inserisci. Servono per consigli più mirati.",
    aiKnowledgeSuccessHint:
      "Obiettivi settimanali completati, miglioramento di divisione e difesa (confrontando le ultime partite con le precedenti). Mostrano i tuoi progressi.",
    setupReminderIntro:
      "Più compili la barra, più i consigli sono su misura per te.",
    setupReminderMissingCoach: "Allenatore",
    setupReminderMissingStats: "Statistiche di gioco",
    setupReminderMissingRoster: "Rosa (11 titolari)",
    setupReminderMissingRosterEmpty: "Carica la tua rosa",
    setupReminderMissingRosterPartial: "Completa la tua rosa",
    setupTipStatsRefresh:
      "Aggiorna le statistiche (2 foto) per consigli più precisi",
    setupTipCoachGymCheckin:
      "Fai un check in Palestra Coach per tenere la IA allineata",
    setupTipCoachReview:
      "Rivedi coach e stile per migliorare la coerenza dei consigli",
    setupTipRosterReview:
      "Rivedi la rosa e i ruoli per mantenere il piano tattico stabile",
    setupReminderComplete: "Setup completo",
    setupReminderDismiss: "Nascondi",
    pwaInstallTitle: "Aggiungi Zero to Hero alla Home",
    pwaInstallSubtitle:
      "Apri l’app come un’icona sul telefono, senza passare dal browser.",
    pwaInstallBenefit:
      "Accesso rapido, schermo intero e stessa esperienza della dashboard.",
    pwaInstallStepIos1: "Tocca Condividi in basso (icona con la freccia)",
    pwaInstallStepIos2: "Scorri e scegli «Aggiungi a Home»",
    pwaInstallStepIos3: "Conferma: l’icona «Zero to Hero» apparirà sulla Home",
    pwaInstallStepAndroid1: "Tocca il menu ⋮ in alto a destra (o Condividi)",
    pwaInstallStepAndroid2: "Scegli «Aggiungi a Home» o «Installa app»",
    pwaInstallStepAndroid3: "Conferma: l’icona apparirà sulla schermata Home",
    pwaInstallIosHint:
      "Su iPhone usa Safari: Chrome non supporta l’aggiunta alla Home.",
    pwaInstallCtaGotIt: "Ho capito, procedo",
    pwaInstallCtaInstall: "Installa app",
    pwaInstallInstalling: "Installazione…",
    pwaInstallRemindLater: "Ricordamelo tra qualche giorno",
    pwaInstallDismiss: "Non mostrare più",
    pwaInstallOpenManual: "Aggiungi alla schermata Home",
    setupStatusRosterMissing:
      "Carica la tua rosa per iniziare ad avere consigli davvero su misura.",
    setupStatusRosterPartial:
      "La rosa c e gia: completala per avere consigli ancora piu coerenti.",
    setupStatusCritical:
      "Ci sono ancora alcuni passaggi da completare per avere consigli piu coerenti.",
    setupStatusPartial:
      "Ti manca solo qualche dettaglio per rendere i consigli piu precisi.",
    setupStatusComplete:
      "Setup completo. I consigli sono basati sui dati che hai inserito.",
    refreshAnalysis: "Aggiorna analisi",
    refreshAnalysisSuccess: "Analisi aggiornata",
    refreshAnalysisRateLimit:
      "Puoi aggiornare l'analisi al massimo 2 volte al minuto. Riprova tra {seconds} secondi.",
    // Credits bar (utilizzo AI / abbonamento)
    creditsTitle: "Crediti AI",
    creditsSubtitle:
      "Usati per chat, analisi partite, estrazione dati e contromisure.",
    creditsUsed: "Usati",
    creditsIncluded: "Inclusi",
    creditsOverage: "Oltre il piano",
    creditsPeriod: "Periodo",
    creditsLoading: "Caricamento utilizzo…",
    creditsError: "Impossibile caricare l'utilizzo crediti.",
    creditsOverageHint:
      "Crediti oltre quelli inclusi nel piano. Verranno addebitati a consumo.",
    creditsViewAria: "Vedi crediti AI",
    creditsCloseAria: "Chiudi crediti",
    creditsTempBalance: "Bonus temporanei",
    creditsTempExpiry: "Scadono entro 7 giorni dall'assegnazione",
    creditsPermanent: "crediti",
    creditsTemporary: "crediti temporanei",
    heroPoints: "Hero Points",
    creditiResidui: "Crediti residui",
    acquista: "Acquista",
    gestioneProfilo: "Gestione profilo",
    goToHeroPoints: "Vai a Hero Points",
    editProfileData: "Modifica dati profilo",
    attivitaRecente: "Attività recente",
    analisiTotali: "Analisi totali",
    rankAttuale: "Rank attuale",
    membroDal: "Membro dal",
    vediTutteTransazioni: "Vedi tutte le transazioni",
    acquistaCreditiCard: "Acquista crediti",
    acquistaCreditiSubtitle: "Ottieni Hero Points per le analisi",
    personalizzaAvatar: "Personalizza avatar",
    personalizzaAvatarSubtitle: "Sblocca avatar esclusivi",
    acquistoCrediti: "Acquisto crediti",
    transactionUsage: "Utilizzo",
    transactionAnalysis: "Analisi",
    noTransactionsYet: "Nessuna transazione ancora.",
    retry: "Riprova",
    errorLoadingUsage: "Errore caricamento crediti.",
    rankPlatinum: "PLATINUM",
    rankGold: "GOLD",
    rankSilver: "SILVER",
    rankBronze: "BRONZE",
    transactionTypeAssistantChat: "Chat assistente",
    transactionTypeExtractPlayer: "Estrazione giocatore",
    transactionTypeExtractCoach: "Estrazione allenatore",
    transactionTypeExtractMatchData: "Estrazione dati partita",
    transactionTypeGenerateCountermeasures: "Contromisure",
    transactionTypeExtractFormation: "Estrazione formazione",
    transactionTypeExtractGameAnalysis: "Statistiche di gioco",
    transactionTypeAnalyzeMatch: "Analisi partita",
    // Weekly Goals
    weeklyGoals: "Obiettivi Settimanali",
    noGoalsThisWeek: "Nessun obiettivo questa settimana",
    goalsWillBeGenerated:
      "Gli obiettivi verranno generati automaticamente ogni domenica",
    goalCompleted: "Obiettivo completato",
    goalCompletedFeedback:
      "Obiettivo completato! Contribuisce alla barra Conoscenza IA.",
    goalFailed: "Obiettivo fallito",
    goalsIncreaseKnowledge:
      "Completare gli obiettivi aumenta la conoscenza che l'IA ha di te.",
    goalsContributeToBar:
      "Completando gli obiettivi settimanali ci aiuti a conoscerti meglio: i consigli saranno più mirati.",
    goalDifficultyEasy: "Facile",
    goalDifficultyMedium: "Medio",
    goalDifficultyHard: "Difficile",
    viewAllGoals: "Vedi tutti gli obiettivi",
    currentWeek: "Settimana corrente",
    active: "attivi",
    notAuthenticated: "Non autenticato",
    failedToFetchTasks: "Errore nel recupero dei task",
    errorLoadingTasks: "Errore nel caricamento dei task",
    // Goal Descriptions
    goalCompleteMatches: "Completa almeno {count} partite questa settimana",
    goalCleanSheets:
      "Mantieni la porta inviolata in almeno {count} partite (clean sheet)",
    goalUseRecommendedFormation:
      "Usa la formazione consigliata in almeno {count} partita",
    goalUseAIRecommendations:
      "Usa almeno {count} volte chat, analisi partita o contromisure questa settimana",
    goalReduceGoalsConceded:
      "Riduci gol subiti del 20% (da {from} a {to} per partita)",
    goalImprovePossession:
      "Migliora possesso palla del 10% (da {from}% a {to}%)",
    goalIncreaseWins: "Vinci almeno {count} partite questa settimana",
    goalImproveDefense:
      "Usa formazione più difensiva in almeno {count} partite",
    // Classifica From Zero to Hero
    errorLoadingLeaderboard: "Errore caricamento classifica.",
    classifica: "Classifica",
    classificaMensile: "Classifica mensile",
    fromZeroToHero: "From Zero to Hero",
    puntiCoach: "Punti Coach",
    laTuaPosizione: "La tua posizione",
    vediClassifica: "Vedi classifica",
    giorniAllaFineMese: "Giorni alla fine del mese",
    comeSalire: "Come salire",
    comeSalireHint:
      'I punti vengono da: partite complete, utilizzo degli strumenti AI e profilo completo. I task settimanali servono alla barra "quanto l\'AI ti conosce", non alla classifica.',
    posizione: "Posizione",
    nickname: "Nickname",
    leaderboardConsent: "Includimi nella classifica mensile",
    leaderboardConsentHint:
      "Se attivo, la tua posizione e il nickname saranno visibili nella classifica From Zero to Hero.",
    nicknamePlaceholder: "Es: IlTuoNick",
    nicknameHint:
      "Nome visibile in classifica (opzionale). Se vuoto verrà mostrato un trattino.",
    leaderboardParticipant: "iscritto",
    leaderboardParticipants: "iscritti",
    punti: "Punti",
    nonInClassifica: "Non in classifica",
    entraInClassifica:
      "Entra in classifica: completa almeno 1 partita questo mese e profilo al 50% o oltre.",
    risultatiOttenuti: "Risultati ottenuti",
    storicoClassifica: "Storico classifica",
    iMieiPremi: "I miei premi",
    daRiscattare: "Da riscattare",
    riscattato: "Riscattato",
    riscatta: "Riscatta",
    nessunPremio: "Nessun premio da riscattare.",
    breakdownPunti: "Dettaglio punti",
    daPartite: "Da partite",
    daObiettivi: "Da obiettivi",
    daUtilizzoIA: "Da utilizzo IA",
    daProfilo: "Da profilo",
    daMiglioramento: "Da miglioramento",
    prizeCoachFree: "Coach gratuito",
    prizeCredits: "Crediti omaggio",
    prizeMatchTicket: "Biglietto partita",
    prizeStampa3d: "Stampa 3D giocatore",

    // Palestra Coach Banner
    coachDataSettingsTitle: "Dati tecnici di gioco",
    coachDataSettingsDesc:
      "Per modificare piattaforma, connessione, livello passaggio e punto debole, usa la Palestra Coach.",
    openCoachGym: "Apri Palestra Coach",

    // Mission Center
    missionRosterTitle: "Completa la Rosa",
    missionRosterMsg:
      "Hai {{current}}/11 titolari. Mancano {{missing}} alla squadra completa!",
    missionRosterAction: "Aggiungi giocatori",
    missionRosterChat:
      "Ho solo {{current}} giocatori nella rosa. Perché dovrei completarla prima di giocare?",
    missionFirstMatchTitle: "Pronto per il Debutto?",
    missionFirstMatchMsg:
      "La tua rosa è pronta. Carica la tua prima partita per sbloccare l'AI!",
    missionFirstMatchAction: "Carica partita",
    missionFirstMatchChat:
      "Ho appena completato la rosa. Cosa mi consigli per la prima partita?",
    missionProfileTitle: "Ultimo Step: Profilo",
    missionProfileMsg:
      "Aggiungi il tuo punto debole per ricevere consigli mirati.",
    missionProfileAction: "Completa profilo",
    missionProfileChat:
      "Non so cosa mettere come punto debole nel profilo. Puoi aiutarmi a capire qual è il mio problema principale?",
    missionAnalysisTitle: "Analisi eFootball",
    missionAnalysisMsg:
      "Carica lo screenshot delle statistiche per analisi avanzate.",
    missionAnalysisAction: "Carica analisi",
    missionAnalysisChat:
      "A cosa serve l'analisi delle statistiche eFootball? Come faccio a trovarla nel gioco?",
    missionCompleteTitle: "Missione Completata!",
    missionCompleteMsg:
      "Hai completato tutto! Ora puoi studiare contromisure e affinare il tuo gioco.",
    missionCompleteAction: "Contromisure",
    missionCompleteChat:
      "Ho completato tutte le missioni iniziali. Cosa mi consigli per migliorare ulteriormente il mio gioco?",
    missionProgressLabel: "Progresso",
    viewDetails: "Vedi dettagli",
    askCoach: "Chiedi al Coach",
    completed: "completati",
    taskHelpMessage: "Aiutami con questo obiettivo: {{task}}",

    // Roadmap
    roadmapTitle: "Il tuo percorso da Zero a Hero",
    roadmapSubtitle: "Ogni dato conta. Più dati hai, più i consigli sono tuoi.",
    roadmapRosterTitle: "Costruisci la tua Rosa",
    roadmapRosterShort: "11 titolari + 5 riserve",
    roadmapRosterDesc:
      "Senza i tuoi giocatori, l'AI non sa chi sei. Carica foto, statistiche e posizioni per ricevere consigli basati sui TUOI giocatori, non generici.",
    roadmapRosterWhy:
      'Più dati hai sulla rosa, più l\'AI può dirti "Con Ronaldo in attacco, prova questo stile" invece di "Prova un attaccante veloce".',
    roadmapFirstMatchTitle: "Gioca e Carica",
    roadmapFirstMatchShort: "La tua prima partita",
    roadmapFirstMatchDesc:
      "Una partita caricata vale più di 1000 parole. L'AI vede la tua formazione, il risultato, le statistiche.",
    roadmapFirstMatchWhy:
      "La prima partita attiva l'analisi base. L'AI inizia a capire se preferisci giocare in casa o fuori, se attacchi di più o difendi.",
    roadmapProfileTitle: "Racconta chi sei",
    roadmapProfileShort: "Piattaforma, connessione, punto debole",
    roadmapProfileDesc:
      "Sei su console o PC? Hai lag? Il tuo punto debole è la difesa? Questi dati filtrano i consigli.",
    roadmapProfileWhy:
      'Se giochi con PA1 e dici "difesa", l\'AI suggerisce tattiche diverse che se giochi PA3 e dici "attacco". Personalizzazione reale.',
    roadmapMatchesTitle: "Costruisci la Storia",
    roadmapMatchesShort: "3-5 partite per pattern",
    roadmapMatchesDesc:
      'Con 3 partite l\'AI vede pattern: "Usi sempre il 4-3-3 e perdi contro il 5-3-2". Con 5, i consigli diventano precisi.',
    roadmapMatchesWhy:
      "3 partite = pattern base (formation usage). 5 partite = pattern avanzati (cosa funziona contro cosa). 10+ = consigli da pro.",
    roadmapAnalysisTitle: "Analisi eFootball",
    roadmapAnalysisShort: "Statistiche di gioco",
    roadmapAnalysisDesc:
      "Carica lo screenshot delle statistiche eFootball. Possesso palla, passaggi riusciti, tiri in porta.",
    roadmapAnalysisWhy:
      'Le statistiche oggettive confermano o smentiscono le tue percezioni. "Penso di passare bene" vs "Hai 65% passaggi riusciti".',
    roadmapPalestraTitle: "Palestra Coach",
    roadmapPalestraShort: "Feedback e conversazione",
    roadmapPalestraDesc:
      'Racconta all\'AI come è andata. "Ho seguito il tuo consiglio ma ho perso". Questo adatta i consigli futuri.',
    roadmapPalestraWhy:
      "Ogni sessione Palestra aumenta del 10% la conoscenza AI. Dopo 4 sessioni, l'AI ti conosce come un coach reale.",
    roadmapMasteryTitle: "Maestro",
    roadmapMasteryShort: "Da Zero a Hero",
    roadmapMasteryDesc:
      "Hai 10+ partite, profilo completo, usi la Palestra. L'AI conosce i tuoi pattern, i tuoi punti deboli, i tuoi punti di forza.",
    roadmapMasteryWhy:
      'A questo livello, i consigli sono specifici al 90%. "Nel tuo 4-3-3 con quella connessione, contro il 5-3-2 usa questo approccio".',
    current: "Attuale",
    whyImportant: "Perché è importante:",
    continue: "Continua",
    completed: "Completato",
    inProgress: "In corso",
    locked: "Bloccato",
    viewFullRoadmap: "Vedi Roadmap completa",
    roadmapMiniTitle: "Il tuo percorso",

    // Onboarding Flow
    onboardingTitle: "Come funziona",
    onboardingSubtitle: "Scopri come migliorare con il tuo Coach AI",
    onboardingKeyMessage: "Più mi usi seriamente, più ti aiuto",
    onboardingStep1Title: "Pre-partita",
    onboardingStep1Desc:
      "Crea contromisure tattiche analizzando la formazione avversaria prima del match",
    onboardingStep2Title: "Dopo la partita",
    onboardingStep2Desc:
      "Aggiungi la partita e carica gli screenshot per l'analisi dettagliata",
    onboardingStep3Title: "Analisi",
    onboardingStep3Desc:
      "Racconta la tua esperienza nella Palestra Coach per feedback personalizzati",
    onboardingStep4Title: "Migliora",
    onboardingStep4Desc:
      "Chiedi consigli alla Chat AI per migliorare il tuo gioco",
    onboardingStep5Title: "Live Coach",
    onboardingStep5Desc:
      "Parla direttamente con il tuo Coach AI in tempo reale per consigli immediati prima delle partite",
    onboardingStart: "Inizia ora!",
    onboardingNext: "Avanti",
    onboardingClose: "Chiudi",

    // Onboarding Formation
    formationOnboardingTitle: "Come funziona",
    formationOnboardingKeyTitle: "La tua formazione è fondamentale",
    formationOnboardingKeySubtitle:
      "Scopri come caricare e gestire la rosa in pochi passi",
    formationStep1Title: "Carica la tua formazione",
    formationStep1Desc:
      "Per ogni giocatore carica 3 foto: statistiche, abilità e booster. L'AI estrarrà automaticamente i dati.",
    formationStep2Title: "Inserimento manuale",
    formationStep2Desc:
      "Se l'AI non riconosce qualche giocatore, puoi inserirlo manualmente. Controlla sempre i dati estratti prima di salvare.",
    formationStep3Title: "Possibili errori",
    formationStep3Desc:
      "Screenshot sfocati, tagliati o con grafiche diverse possono causare errori. Assicurati che il nome del giocatore e le statistiche siano leggibili.",
    formationStep4Title: "Salva le posizioni",
    formationStep4Desc:
      "Controlla che ogni giocatore sia nella posizione corretta. Una volta salvato, il sistema userà questi dati per tutte le analisi future.",
    formationStep5Title: "Personalizza posizioni",
    formationStep5Desc:
      "Attiva la modalità 'Personalizza' per trascinare i giocatori sul campo. Utile se vuoi simulare diverse disposizioni tattiche.",
    formationOnboardingStart: "Inizia ora!",
    formationOnboardingTutorialLink:
      "Vuoi istruzioni e consigli specifici? Clicca qui",
    starterPackImportCta: "Importa una formazione di test",
    starterPackImportLoading: "Importazione in corso...",
    starterPackEmptyMessage:
      "Ora puoi provare subito l’app e testare tutte le funzioni, compreso il coach. Ricorda però che questa non è la tua vera formazione. Per ricevere consigli davvero personalizzati, carica la tua rosa.",
    starterPackPartialMessage:
      "Manteniamo i giocatori che hai già inserito e completiamo automaticamente solo quello che manca.",
    starterPackDismiss: "Nascondi suggerimento formazione di test",
    starterPackImportSuccess: "Formazione di test importata con successo.",
    starterPackFillSuccess:
      "Abbiamo completato automaticamente ciò che mancava.",
    starterPackImportError:
      "Impossibile importare la formazione di test. Riprova tra poco.",
    nuovaRosaPrivateLab: "Lab privato",
    nuovaRosaTitle: "Nuova Rosa",
    nuovaRosaOpenCurrent: "Apri la rosa attuale",
    nuovaRosaStatusLabel: "La tua rosa in costruzione",
    nuovaRosaPlayers: "Giocatori",
    nuovaRosaStarters: "Titolari",
    nuovaRosaFormation: "Modulo",
    nuovaRosaWorkspace: "Workspace formazione",
    nuovaRosaReserves: "Riserve",
    nuovaRosaNoReserves: "Nessuna riserva ancora.",
    nuovaRosaLoading: "Caricamento rosa...",
    nuovaRosaStageEmptyTitle: "Inizia la rosa con carte reali",
    nuovaRosaStageEmptyText:
      "Clicca uno slot per aprire il catalogo ufficiale. Completa la rosa con meno attrito e mantieni i dati modificabili.",
    nuovaRosaStageEmptyCta: "Importa starter pack",
    nuovaRosaStageSeededTitle: "Hai gia una base",
    nuovaRosaStageSeededText:
      "Completa gli slot mancanti con il catalogo, poi rifinisci ruoli, riserve e dettagli giocatore.",
    nuovaRosaStageSeededCta: "Completa i mancanti",
    nuovaRosaStagePartialTitle: "Rosa in costruzione",
    nuovaRosaStagePartialText:
      "Aggiungi i titolari dal campo e poi rifinisci riserve, tattiche e schede giocatore.",
    nuovaRosaStageFormationReadyTitle: "Formazione pronta",
    nuovaRosaStageFormationReadyText:
      "Hai gli undici titolari. Aggiungi coach e tattiche per una lettura piu completa.",
    nuovaRosaStageSystemReadyTitle: "Sistema pronto",
    nuovaRosaStageSystemReadyText:
      "Rosa, formazione e contesto tattico sono allineati.",
    nuovaRosaSelectOfficialSkill: "Seleziona abilita ufficiale",
    nuovaRosaChooseOfficialSkill: "Scegli dalle abilita eFootball",

    // Coach Suggestions
    coachSuggestionLabel: "Il tuo coach ti segue",
    coachSuggestionCriticalTitle: "Teniamoci aggiornati",
    coachSuggestionCriticalMessage:
      "Più mi aggiorni su come giochi, più posso aiutarti davvero. Se vuoi, partiamo dalle tue statistiche.",
    coachSuggestionCriticalMessageWithMatches:
      "Hai già fatto un ottimo lavoro con le partite salvate. Se aggiungi anche le statistiche, i miei consigli diventano ancora più su misura.",
    coachSuggestionPostMatchTitle: "Facciamo un check veloce",
    coachSuggestionPostMatchMessage:
      "Dimmi com è andata: anche un breve debrief mi aiuta a capire cosa rinforzare e cosa sistemare subito.",
    coachSuggestionFirstTimeTitle: "Partiamo insieme bene",
    coachSuggestionFirstTimeMessage:
      "Se mi condividi qualche statistica, ti conosco meglio e posso guidarti con indicazioni più utili fin da subito.",
    coachSuggestionCoachMissingTitle: "Aggiungi il coach quando vuoi",
    coachSuggestionCoachMissingMessage:
      "Con un coach attivo i consigli seguono meglio il tuo stile squadra. Puoi aggiungerlo adesso oppure farlo più tardi.",
    coachSuggestionPalestraTitle: "Ti va un aggiornamento rapido?",
    coachSuggestionPalestraMessage:
      "Un passaggio in Palestra Coach mi aiuta a restare allineato con te e a darti consigli sempre più precisi.",
    coachSuggestionActionSetup: "Apri il riepilogo",
    coachSuggestionActionStats: "Aggiornami con le statistiche",
    coachSuggestionActionCoaches: "Vai ad Allenatori",
    coachSuggestionActionPalestra: "Apri Palestra Coach",
    coachSuggestionLater: "Più tardi",
    selectImageFile: "Seleziona un file immagine",
    notVisible: "Non visibile",
    fluidFormation: "Formazione fluida",
    fluidFormationHelp: "Stessi 11 titolari, disposizione diversa in attacco e in difesa. La formazione principale non cambia.",
    fluidFormationToggle: "La usi in eFootball?",
    fluidFormationToggleHint: "Se no, Hero continua a usare la formazione normale.",
    fluidAttack: "Attacco",
    fluidDefense: "Difesa",
    fluidCopyBase: "Copia base",
    fluidCopyOther: "Copia l'altra fase",
    fluidNeedStarters: "Servono una formazione salvata e 11 titolari. La Formazione fluida non crea una seconda rosa.",
    fluidSaved: "Formazione fluida salvata. Hero ora conosce Attacco e Difesa.",
    fluidDisabled: "Formazione fluida disattivata. La configurazione resta conservata.",
    fluidSave: "Salva formazione fluida",
    fluidSaveError: "Salvataggio formazione fluida non riuscito.",
    fluidLoadError: "Impossibile caricare la Formazione fluida.",
    fluidPitchHelp: "Trascina i titolari nella posizione del Game Plan e imposta il ruolo di quella fase. Non cambia chi è titolare.",
    coachLinkUps: "Collegamenti allenatore",
    coachLinkUpsHelp: "Alcuni allenatori v6 hanno fino a due Link-up Play. Salva solo quelli visibili sulla card.",
    coachLinkUpsNoCoach: "Imposta prima un allenatore attivo.",
    coachLinkUpsNeedScreenshot: "Carica almeno uno screenshot del Collegamento.",
    coachLinkUpsRead: "Leggi Collegamenti (2 HP)",
    coachLinkUpsReading: "Hero sta leggendo...",
    coachLinkUpsReadError: "Lettura Collegamenti non riuscita.",
    coachLinkUpsReadDone: "Lettura completata: {{count}} Collegamento/i. Controlla e salva.",
    coachLinkUpsSaved: "Collegamenti salvati. Hero li valuta uno per uno sui tuoi 11 titolari.",
    coachLinkUpsSave: "Salva Collegamenti",
    coachLinkUpsSaveError: "Salvataggio Collegamenti non riuscito.",
    coachLinkUpsLoadError: "Impossibile caricare i Collegamenti.",
    coachLinkUpsSlot1: "Primo Collegamento",
    coachLinkUpsSlot2: "Secondo Collegamento, se presente",
    coachLinkUpsCost: "1 o 2 schermate in una sola analisi: 2 HP.",
    coachLinkUpsEmpty: "Nessun Collegamento da salvare. Se l'allenatore non ne ha, non aggiungere nulla.",
    opponentFluidToggle: "Formazione fluida avversaria",
    opponentFluidToggleHint: "No: una sola foto, come sempre. Hero parte da solo.",
    opponentFluidNeedBoth: "Servono entrambe le foto. Hero parte da solo quando Attacco e Difesa sono pronte.",
    opponentFluidMissingSecond: "Manca una foto. Aggiungila, oppure torna a Formazione fluida = NO.",
    opponentAttackPhase: "Attacco",
    opponentDefensePhase: "Difesa",
    v6PhaseAnalysis: "Incrocio attacco e difesa",
    v6FluidDecision: "Decisione Formazione fluida",
    v6LinkUpPlan: "Collegamenti per questa partita",
    v6Use: "USA",
    v6DoNotUse: "NON USARE",
    v6NotActivatable: "NON ATTIVABILE",
    v6InsufficientData: "DATI INSUFFICIENTI",
    maxThreeCoachPhotos: "Massimo 3 foto: carta allenatore e fino a 2 Collegamenti",
    maxThreeCoachPhotosFormat: "Carta + fino a 2 Collegamenti • JPG, PNG",
    coachCardRequired: "Carica la carta allenatore per continuare.",
  },
  en: {
    // Sidebar
    guide: "Guide",
    dashboard: "Dashboard",
    coachAI: "Coach AI",
    profile: "Profile",
    yourSquad: "Your Squad",
    matchHistory: "Match History",
    charts: "Charts",
    countermeasures: "Countermeasures",
    videoTutorials: "Video tutorials",
    videoTutorialsSubtitle: "Quick guides on YouTube",
    videoTutorialRoster: "Roster tutorial",
    videoTutorialCoachGym: "Coach Gym tutorial",
    watchOnYoutube: "Watch on YouTube",
    logout: "Logout",
    toggleMenu: "Toggle menu",
    appName: "From Zero to Hero",
    prelaunchAccessBadge: "Private access before public launch",
    prelaunchThanksTitle: "Thanks for registering.",
    prelaunchAccountCreated:
      "Your account has been created successfully. Public access to the platform is not open yet.",
    prelaunchReservedAccessText:
      "At this stage, full access is reserved for selected partnerships and commercial agreements through dedicated access codes.",
    prelaunchFeatureMatchesTitle: "Match analysis",
    prelaunchFeatureMatchesText:
      "A clearer reading of matches, context and the details that really matter for improvement.",
    prelaunchFeatureSquadTitle: "Squad and formation management",
    prelaunchFeatureSquadText:
      "A structured space to work on players, roles, positioning and squad organisation.",
    prelaunchFeatureCoachTitle: "AI Coach",
    prelaunchFeatureCoachText:
      "A support layer designed to guide the player with logic, continuity and personalisation.",
    prelaunchFeatureCounterTitle: "Countermeasures and tactical reading",
    prelaunchFeatureCounterText:
      "More useful direction to prepare matches and reason better about in-game choices.",
    prelaunchCodeBadge: "Dedicated access code",
    prelaunchCodeTitle: "Do you already have an access code?",
    prelaunchCodeText:
      "If you received a reserved code, enter it below to unlock the full platform for this session.",
    prelaunchCodePlaceholder: "Enter access code",
    prelaunchCodeButton: "Unlock access",
    prelaunchCodeButtonLoading: "Unlocking access...",
    prelaunchCodeHint:
      "These early access codes are reserved for selected commercial partners and dedicated collaborations.",
    prelaunchInsideTitle: "What will you find inside?",
    prelaunchInsideText:
      "A platform designed to bring together match reading, squad structure, tactical context and AI support in one serious working environment.",
    prelaunchVisionAlt: "Platform vision",
    prelaunchNoCodeTitle: "No code yet?",
    prelaunchNoCodeText:
      "Your registration is already valid. Public access will be enabled when the platform officially opens, while reserved codes remain dedicated to selected early commercial access.",
    prelaunchControlPanelButton: "Go to dashboard",
    prelaunchCodeEnterError: "Enter the access code you received.",
    prelaunchCodeUnlockError: "Unable to unlock access.",
    prelaunchCodeUnlocked: "Access unlocked. Entering platform...",
    prelaunchCodeInvalid: "Invalid access code.",
    prelaunchGateCheckingTitle: "Verifying access...",
    prelaunchGateCheckingText: "Preparing your session.",
    loginSuccessKicker: "Zero to Hero",
    loginSuccessCompletingTitle: "Unlocking your AI Coach",
    loginSuccessCompletingStatus:
      "Verifying your access and preparing squad tools, match analysis and tailored advice.",
    loginSuccessDoneTitle: "You're in",
    loginSuccessDoneStatus:
      "Heading to your dashboard: matches, squad and your competitive edge are ready.",
    loginSuccessTipLabel: "While you wait",
    loginSuccessTips: [
      "Upload your squad: the Coach gives real advice, not generic theory.",
      "After each match, save score and ratings to unlock pre-match countermeasures.",
      "Card Advisor tells you if a card is worth the credits — before you spend them.",
      "Coach Chat (2 HP): ask specific questions about formation, style and your real lineup.",
    ],
    loginSuccessErrorKicker: "Access",
    loginSuccessFailedTitle: "We couldn't sign you in",
    loginSuccessFailed: "Login failed. Please try again shortly.",
    loginSuccessFailedStatus:
      "Taking you back to login — check your email and link, then try again.",
    loginSuccessGenericError: "Something went wrong. Please try again.",
    loginSuccessBackToLogin: "Redirecting to login page...",
    magiclinkCompleting: "Completing login",
    magiclinkPreparing: "Setting up your session...",
    magiclinkDone: "Login complete",
    magiclinkRedirecting: "Redirecting you...",
    magiclinkFailed: "Login failed",
    magiclinkBackToLogin: "Back to login",
    loadingSimple: "Loading...",

    // Dashboard
    roster: "Roster",
    yourPlayers: "Your Players",
    viewPlayers: "View Players",
    manageCollection: "Manage your collection",
    squadOverview: "Squad Overview",
    yourSquad: "Your Squad",
    squadSlots: "Squad (21 slots)",
    startersAndBench: "Starters and bench",
    tacticalGoals: "Open Tactical Goals",
    goals: "Goals",
    comingSoon: "Coming soon...",
    userProfile: "User Profile",
    anonymousUser: "Anonymous User",
    masterLevel: "Master Level",
    aiKnowledge: "AI Knowledge",
    high: "High",
    matchInsights: "Match Insights",
    analysis: "Analysis",
    quickLinks: "Quick Links",
    navigation: "Navigation",
    total: "Total",
    aiInsights: "AI Insights",
    aiInsightsPlaceholder: "AI insights and suggestions will be shown here",
    aiInsightsNoData:
      "Load your matches to get information about your tactical patterns and receive personalized advice.",
    formationUsage: "Most used formations",
    playingStyleUsage: "Most used playing styles",
    recurringIssues: "Recurring issues",
    matches: "matches",
    winRate: "win rate",
    frequency: "Frequency",
    severity: "Severity",
    home: "Home",
    players: "Players",
    squadBuilder: "Squad Builder",
    dataAnalytics: "Data & Analytics",
    memoryHub: "Memory Hub",
    coaching: "Coaching",
    memoryInsights: "Memory Insights",
    aiLearning: "AI Learning",
    startSession: "Start Session",
    opponentFormation: "Opponent Formation",
    analyzeOpponent: "Analyze opponent formation for countermeasures",
    strugglesCoachingPress: "Struggles coaching press",
    reluctantChangeFormation: "Reluctant to change formation",
    prefersQuickTips: "Prefers quick, actionable tips",
    strugglesHighPress: "Struggles against high press",

    // Coach Gym (dedicated feedback chat — replaces AiInfoModal)
    palestraCoachTitle: "Coach Gym",
    palestraCoachDesc: "Tell me about your gaming experience",
    saveAndClose: "Save & Close",
    coachFeedbackSaved: "Feedback saved!",
    coachFeedbackSaving: "Saving...",

    // AI Info (legacy form, kept for compatibility)
    aiInfoTitle: "AI Info",
    aiInfoDescription:
      "Complete these questions to help the AI give you more targeted advice. All optional.",
    aiInfoSectionConnection: "Game & connection",
    aiInfoSectionContext: "Context & preferences",
    aiInfoSectionNames: "What to call you / what to call the AI",
    aiInfoSectionNotes: "Notes for the AI",
    aiInfoConnectionQuality: "Connection: good or often lag/delays?",
    aiInfoConnectionGood: "Good",
    aiInfoConnectionUnstable: "Sometimes unstable",
    aiInfoConnectionLag: "Often lag",
    aiInfoSlowOpponent: "Struggles vs opponents with slow connection?",
    aiInfoInputDelay: "Do you often have input delay (delayed commands)?",
    aiInfoYes: "Yes",
    aiInfoNo: "No",
    aiInfoSometimes: "Sometimes",
    aiInfoPassLevel: "Pass level (PA)",
    aiInfoPA1: "PA1",
    aiInfoPA2: "PA2",
    aiInfoPA3: "PA3",
    aiInfoSmartAssist: "Do you use smart assist?",
    aiInfoPlatform: "What platform do you play on?",
    aiInfoPlatformConsole: "Console",
    aiInfoPlatformPC: "PC",
    aiInfoPlatformMobile: "Mobile",
    aiInfoPlatformOther: "Other",
    aiInfoDivision: "What division do you play in?",
    aiInfoHoursPerWeek: "Hours of play per week",
    aiInfoFavouritePlayer: "Favourite player (in squad)",
    aiInfoWeakPoint: "What makes you lose most often?",
    aiInfoWeakPointDefence: "Defence",
    aiInfoWeakPointAttack: "Attack",
    aiInfoWeakPointSetPieces: "Set pieces",
    aiInfoWeakPointTransitions: "Transitions",
    aiInfoWeakPointFinalMinutes: "Final minutes",
    aiInfoLearnGoals: "What would you like to learn from us?",
    aiInfoFirstName: "What should we call you?",
    aiInfoAiName: "What should we call the AI?",
    aiInfoNotes: "Notes for the AI (optional)",
    aiInfoSave: "Save info",
    aiInfoSaved: "Info saved",
    aiInfoError: "Error saving",
    aiInfoHintInProfile:
      'For play hours, connection and context for the AI use the "AI Info" button on the dashboard.',

    // Game stats (eFootball Analisi)
    gameAnalysisTitle: "Game statistics",
    gameAnalysisDescription:
      "Upload Analisi screen screenshots (last 10 matches) for personalized advice and tasks.",
    gameAnalysisUpload: "Upload analysis",
    gameAnalysisUploadHint:
      "Upload the 2 Analisi screens: each slot is one screen. One is enough; data will still be saved.",
    gameAnalysisSlot1: "Goal type, Shot, Special commands",
    gameAnalysisSlot1Desc: "First Analisi screen (pie chart + bars)",
    gameAnalysisSlot2: "Passing, Dribbling, Defense",
    gameAnalysisSlot2Desc: "Second Analisi screen (pass/dribble/defense bars)",
    gameAnalysisSlotMissing: "Not uploaded",
    gameAnalysisLastCapture: "Last analysis",
    gameAnalysisAnalyzing: "Analyzing…",
    gameAnalysisSuccess: "Analysis saved.",
    gameAnalysisError: "Error saving.",
    gameAnalysisRetryOne: "If you uploaded 2 images, try again with just one.",
    gameAnalysisChooseFile: "Choose file",
    gameAnalysisNoImage: "No image selected",
    gameAnalysisScreensLabel: "screens",
    chartsAndComparisonTitle: "Charts and comparison",
    chartsAndComparisonSubtitle: "Your profile vs top reference",
    chartsAndComparisonOverview: "Overview",
    chartsAndComparisonDetail: "Detail by category",
    chartsAndComparisonEmpty:
      "To see your profile and comparison with the top, complete Game statistics.",
    chartsAndComparisonCta: "Complete Game statistics",
    chartsAndComparisonAskCoach: "Ask the coach",
    chartsAndComparisonAskCoachContext:
      "I'd like advice on my charts and comparison with the top reference.",
    chartsAndComparisonYou: "You",
    chartsAndComparisonTop: "Top reference",
    chartsAndComparisonDesc:
      "View your team's progress, most effective formations, and compare key stats from your recent matches.",
    chartsAndComparisonCtaButton: "Go to Charts & Data Analysis",
    chartsCategoryShot: "Shot",
    chartsCategoryPassing: "Passing",
    chartsCategoryDribbling: "Dribbling",
    chartsCategoryDefense: "Defense",
    chartsCategorySpecialCommands: "Special commands",

    // Rosa
    squad: "Squad",
    uploadScreenshots: "Upload Screenshots",
    dragDropHint:
      "Drag here or click. You can upload 2 or 3 photos per player, even mixed.",
    imagesLoaded: "Images loaded",
    analyzeBatch: "Analyze batch",
    analyzing: "Analyzing…",
    reset: "Reset",
    slot: "Slot",
    starters: "Starters",
    bench: "Bench",
    insertPlayer: "Insert this player",
    saveToSupabase: "Save to Supabase",
    slotSelected: "selected slot",
    name: "Name",
    role: "Role",
    card: "Card",
    team: "Team",
    boosters: "Boosters",
    missing: "Missing",
    missingData: "Missing Data",
    missing_detailed_stats_table: "Detailed Statistics",
    missing_skills_screen: "Skills Screen",
    missing_additional_positions_screen: "Additional Positions",
    missing_stats_screen: "Statistics Screen",
    missing_boosters_screen: "Boosters Screen",
    missing_profile_screen: "Profile Screen",
    myPlayers: "My Players",
    playersSaved: "players saved",
    loading: "Loading...",
    notFoundTitle: "404",
    notFoundMessage: "Page not found.",
    noPlayersSaved: "No players saved",
    uploadScreenshotsToSee:
      "Upload screenshots and save players to see them here",
    listaGiocatori: "Players List",
    details: "Details",
    hide: "Hide",
    edit: "Edit",
    complete: "Complete",
    incomplete: "Incomplete",
    missingFields: "Missing",
    nationality: "Nationality",
    physical: "Physical",
    age: "Age",
    form: "Form",
    skills: "Skills",
    // Player characteristics
    weakFoot: "Weak Foot",
    weakFootFrequency: "Weak Foot Frequency",
    weakFootAccuracy: "Weak Foot Accuracy",
    formDetailed: "Detailed Form",
    injuryResistance: "Injury Resistance",
    aiPlaystyles: "AI Playstyles",
    additionalPositions: "Additional Positions",
    // Characteristic values
    rarely: "Rarely",
    sometimes: "Sometimes",
    often: "Often",
    high: "High",
    medium: "Medium",
    low: "Low",
    unbreakable: "Unbreakable",
    stable: "Stable",
    inconsistent: "Inconsistent",
    // Form values
    b: "B",
    a: "A",
    c: "C",
    d: "D",
    e: "E",
    resetMyData: "Reset my Supabase data",
    // Edit Player Data
    completeData: "Complete Data",
    missingDataSection: "Missing Data",
    addMissingData: "Add Missing Data",
    editPlayerData: "Edit Player Data",
    close: "Close",
    save: "Save",
    saving: "Saving...",
    saved: "Data saved",
    statsDetails: "Detailed Statistics",
    attacking: "Attack",
    defending: "Defense",
    athleticism: "Strength",
    physicalData: "Physical Data",
    height: "Height",
    weight: "Weight",
    teamName: "Team Name",
    nationalityCountry: "Nationality",
    playingStyle: "Playing Style",
    playerSkills: "Player Skills",
    addSkill: "Add Skill",
    removeSkill: "Remove",
    additionalSkills: "Additional Skills",
    addAdditionalSkill: "Add Skill",
    aiPlaystylesList: "AI Playstyles",
    addPlaystyle: "Add Playstyle",
    additionalPositionsList: "Additional Positions",
    addPosition: "Add Position",
    boostersList: "Boosters",
    addBooster: "Add Booster",
    boosterName: "Booster Name",
    boosterEffect: "Effect",
    boosterCondition: "Activation Condition",
    characteristics: "Characteristics",
    weakFootFrequencyLabel: "Weak Foot Frequency",
    weakFootAccuracyLabel: "Weak Foot Accuracy",
    formDetailedLabel: "Detailed Form",
    injuryResistanceLabel: "Injury Resistance",
    cm: "cm",
    kg: "kg",
    years: "years",
    saved: "Saved to Supabase",
    resetSuccess: "Supabase data reset for this anonymous user",
    error: "Error",
    errorServer: "Server error",
    thisCoach: "this coach",
    manualEntryInstead: "Manual entry instead",
    playerNameRequired: "Player name is required",
    positionRequired: "Position is required",
    editPlayer: "Edit Player",
    newPlayer: "New Player",
    completeOrEditData: "Complete or edit data",
    manualEntry: "Manual entry",
    playerNameLabel: "Player name *",
    positionLabel: "Position *",
    placeholderPlayerNameExample: "e.g. Kylian Mbappé",
    placeholderYourName: "Your name",
    placeholderTeamExample: "E.g. Naturalborngamers.it, AC Milan...",
    appTitle: "From Zero to Hero - eFootball AI Coach",
    appDescription:
      "AI Coach for eFootball: squad, matches, analysis and personalised tactical advice.",
    saveFailed: "Save failed",
    errorSaveFormation: "Error saving formation",
    loadingShort: "Loading...",
    matchNotFoundOrDenied: "Match not found or access denied",
    unknownPlayer: "Unknown",
    yourCoachAI: "Your AI Coach",
    creditsAndGuideAria: "Credits and guide",
    backToDashboard: "Main Dashboard",
    backToSquad: "Squad",

    // Authentication
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    email: "Email",
    password: "Password",
    emailPlaceholder: "your@email.com",
    passwordPlaceholder: "Minimum 6 characters",
    loginDescription: "Login to save your data permanently",
    signupDescription: "Create an account to save your roster and profiling",
    emailPasswordRequired: "Email and password are required",
    loginError: "Error during login",
    signupError: "Error during signup",
    loginSuccess: "Login successful!",
    signupSuccess: "Signup completed!",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Recover password",
    forgotPasswordDescription:
      "Enter your account email. We will send you a link to reset your password.",
    sendResetLink: "Send link",
    resetLinkSent:
      "If the email is registered, you will receive a link to reset your password shortly. Check spam too.",
    resetPasswordTitle: "New password",
    resetPasswordDescription: "Choose a new password (minimum 6 characters).",
    newPasswordPlaceholder: "New password",
    setNewPassword: "Set password",
    passwordUpdated: "Password updated. Redirecting to login...",
    resetPasswordError: "Error during password recovery.",
    resetLinkExpired:
      "Invalid or expired link. Request a new link from the Recover password page.",
    confirmPassword: "Confirm password",
    passwordsDoNotMatch: "Passwords do not match.",
    backToLogin: "Back to login",
    loggingIn: "Logging in...",
    signingUp: "Signing up...",
    retryInSeconds: "Retry in {{n}} s",
    noAccountSignup: "Don't have an account? Sign up",
    hasAccountLogin: "Already have an account? Login",
    continueAsGuest: "Continue as guest",
    supabaseNotAvailable: "Supabase not available",
    unexpectedError: "Unexpected error",
    loggedInAs: "Logged in as",

    // Statistics translations
    offensive_awareness: "Offensive Awareness",
    ball_control: "Ball Control",
    dribbling: "Dribbling",
    tight_possession: "Tight Possession",
    low_pass: "Low Pass",
    lofted_pass: "Lofted Pass",
    finishing: "Finishing",
    heading: "Heading",
    place_kicking: "Set Piece Taking",
    curl: "Curl",
    defensive_awareness: "Defensive Awareness",
    defensive_engagement: "Defensive Engagement",
    tackling: "Tackling",
    aggression: "Aggression",
    goalkeeping: "Goalkeeping",
    gk_catching: "GK Catching",
    gk_parrying: "GK Parrying",
    gk_reflexes: "GK Reflexes",
    gk_reach: "GK Reach",
    speed: "Speed",
    acceleration: "Acceleration",
    kicking_power: "Kicking Power",
    jump: "Jump",
    physical_contact: "Physical Contact",
    balance: "Body Control",
    stamina: "Stamina",

    // Opponent Formation
    opponentFormationTitle: "Opponent Formation",
    opponentFormationSubtitle:
      "Upload opponent formation screenshot for analysis and countermeasures",
    countermeasuresAutoStart:
      "Extraction and countermeasures start automatically",
    countermeasuresPreMatchContext:
      "Pre-match advice based on the uploaded opponent formation.",
    countermeasuresPostMatchTitle: "After the match",
    countermeasuresPostMatchPhotosIntro:
      "Already played? Add the match and upload screenshots — more accurate data for analysis and future advice.",
    countermeasuresPostMatchAddMatchCta: "Add match & photos",
    countermeasuresPostMatchPalestraIntro:
      "Tell me how it went — the more I know, the more I can help you.",
    backToDashboardBtn: "Back to Dashboard",
    dragScreenshotHere: "Drag screenshot here",
    orClickToSelect: "or click to select",
    uploadedScreenshot: "Uploaded Screenshot",
    extracting: "Extracting...",
    extractFormation: "Extract Formation",
    formationExtractedSuccess: "Formation extracted successfully",
    playersDetected: "players detected",
    formation: "Formation",
    overallStrength: "Overall Strength",
    tacticalStyle: "Tactical Style",
    team: "Team",
    formationNameOptional: "Formation name (optional)",
    saveFormation: "Save Formation",
    formationSaved: "Opponent formation saved",
    saveError: "Save error",
    playersDetectedFromScreenshot: "Players Detected from Screenshot",
    verifyPlayersRead: "Verify that all players were read correctly",
    goalkeeper: "Goalkeeper",
    defense: "Defense",
    midfield: "Midfield",
    attack: "Attack",
    role: "Role",
    substitutes: "Substitutes",
    reserves: "Reserves",
    loadAnotherFormation: "Load Another Formation",
    extractionError: "Extraction error",
    invalidAuthToken:
      "Invalid authentication token. Reload the page and try again.",
    saveError: "Save error",
    // Completeness
    completeness: "Completeness",
    identity: "Identity",
    stats: "Stats",
    skills: "Skills",
    boosters: "Boosters",
    complete: "Complete",
    incomplete: "Incomplete",
    processingImage: "Processing image",
    of: "of",
    multiPlayerDetected: "Different players detected",
    loadSamePlayer: "Load 1-3 screenshots of the same player for complete data",
    missingStatsPhoto: "Load screenshot with detailed statistics",
    missingSkillsPhoto: "Load screenshot with skills and playstyles",
    missingBoostersPhoto: "Load screenshot with boosters",
    incompleteDataWarning:
      "Incomplete data: load missing photos to complete profile",
    // Formation
    uploadFormation: "Upload Formation",
    uploadFormationPhoto: "Upload Complete Formation Photo",
    formationInstructions:
      'Upload players one by one from the "Players" section of the game (NOT from "Game Plan"). For each player upload 3 photos: Stats, Skills and Booster.',
    uploadPlayerCard: "Upload Player Card",
    playerCardInstructions:
      "Upload 1-3 screenshots of single player cards (stats, skills, booster). These will be saved as reserves.",
    selectUploadType: "Select Upload Type",
    extractFormation: "Extract Formation",
    extractingFormation: "Extracting formation...",
    formationExtracted: "Formation extracted successfully",
    playersExtracted: "players extracted",
    savingFormation: "Saving formation...",
    formationSaved: "Formation saved successfully",
    titolari: "Starters",
    riserve: "Reserves",
    maxReservesReached: "Maximum 12 reserves reached.",
    swapFormation: "Manage Formation",
    manageFormation: "Manage Formation",
    instructions: "Instructions",
    // Detailed guides
    guideFormationTitle: "How to upload a formation",
    guideFormationStep1: '1. Select "Upload Formation"',
    guideFormationStep2:
      '2. Upload players one by one from the "Players" section (NOT "Game Plan")',
    guideFormationStep3: '3. Click "Extract Formation" to analyze',
    guideFormationStep4:
      "4. The 11 players will be automatically saved as STARTERS",
    guideFormationNote:
      '💡 Photos must be taken from the "Players" section where detailed stats are shown',
    guideCardTitle: "How to upload reserves",
    guideCardStep1: '1. Select "Upload Player Card"',
    guideCardStep2:
      "2. Upload 1-3 screenshots of single player cards (stats, skills, booster)",
    guideCardStep3: '3. Click "Extract Data" to analyze each card',
    guideCardStep4: "4. Players will be automatically saved as RESERVES",
    guideCardNote: "💡 You can upload up to 3 cards at once",
    guideSwapTitle: "How to swap players",
    guideSwapStep1: "1. Click on a player (starter or reserve)",
    guideSwapStep2: "2. Click on another player to swap their positions",
    guideSwapStep3: "3. The starter will become a reserve and vice versa",
    guideSwapNote: "💡 You can only swap players from your roster",
    guideEmptyFormation:
      'No formation uploaded. Upload players one by one from the "Players" section.',
    guideEmptyReserves:
      "No reserves. Upload single player cards to add reserves.",
    redirectToFormation: "Redirecting to Formation Management...",
    noReservesUploadPlayers:
      "No reserves. Upload players to add them to reserves.",
    errorLoadingLayout: "Error loading layout",
    errorLoadingPlayers: "Error loading players",
    errorLoadingData: "Error loading data",
    playerNotFoundInReserves: "Player not found in reserves",
    errorDeletingDuplicateReserve: "Error deleting duplicate reserve",
    operationCancelledDuplicateReserve:
      "Operation cancelled: player already in reserves",
    errorRemoving: "Error removing",
    imagesDifferentPlayers:
      "Images belong to different players. Check the images.",
    errorExtractionDataList: "Error extracting data",
    errorPlayerDataNotExtracted:
      "Error: player data not extracted. Check images and try again.",
    errorDeletingDuplicateReserveReplace: "Error deleting duplicate reserve",
    errorSavingPlayerGeneric: "Error saving player",
    errorAssignment: "Assignment error",
    errorRemovalAfterDuplicate: "Error removing after duplicate deletion",
    errorDeletion: "Deletion error",
    errorUnknown: "Unknown error",
    errorSavingLayout: "Error saving layout",
    errorSavingFormation: "Error saving formation",
    errorSavingPlayerAfterReplace: "Error saving player after replacement",
    errorLoadingReserve: "Error loading reserve",
    errorProfileLoad: "Error loading profile",
    errorProfileSave: "Error saving profile",
    profileSectionSaved: "saved successfully!",
    profileLevelComplete: "Complete",
    profileLevelIntermediate: "Intermediate",
    profileLevelBeginner: "Beginner",
    selectOneImage: "Select an image",
    invalidJsonStructure: "Invalid JSON structure",

    // Complete Guide
    guideTitle: "Complete Guide",
    guideSubtitle: "Discover how to make the most of the platform",
    guideCompleteProfileTitle: "Complete Your Profile",
    guideCompleteProfileDesc:
      "The more you complete your profile, the more AI can help you in a personalized way!",
    guideProfileProgress: "Profile Completion",
    guideProfileComplete: "Profile Complete! ✅",
    guideCompleteProfileButton: "Complete Profile",
    guideUseBrainTitle: "Use the AI Brain",
    guideUseBrainDesc:
      "Tactical advice always available! Click the brain button at the bottom right for formation, roster, module, substitutions, style. For how to use the app (upload photos, wizard) use the Guide or the Show me how tour.",
    guideBrainFeature1: "Personal Guide",
    guideBrainFeature1Desc: "Accompanies you every step",
    guideBrainFeature2: "Motivating",
    guideBrainFeature2Desc: "Celebrates your successes",
    guideBrainFeature3: "Always Available",
    guideBrainFeature3Desc: "24/7 at your service",
    guidePagesTitle: "Page Guides",
    guideSteps: "How to do it:",
    guideGoToPage: "Go to Page",
    guideFooterTitle: "Have Questions?",
    guideFooterDesc:
      "Ask the AI brain for tactical advice (formation, roster, module, substitutions). For app usage use the Guide or the Show me how tour. 💪",
    guideFooterDescTourOnly:
      'Use the "Show me how" tour (compass button top right) on each page for step-by-step guidance. Above you find the guides per section.',
    guideDashboardTitle: "Dashboard",
    guideDashboardDesc: "Complete overview of your team",
    guideDashboardStep1: "View team statistics (starters, reserves, total)",
    guideDashboardStep2: "Check top 3 players by rating",
    guideDashboardStep3: "Access recent matches with one click",
    guideDashboardStep4: "Navigate quickly to other sections",
    guideFormationTitle: "Formation Management",
    guideFormationDesc: "Interactive 2D field to manage your roster",
    guideFormationStep1: "Choose from 14 official eFootball formations",
    guideFormationStep2: "Click on slots to assign players",
    guideFormationStep3: "Upload players with screenshots (up to 3 images)",
    guideFormationStep4: "Manage reserves in dedicated section",
    guideFormationStep5: "View player details by clicking on cards",
    guideAddMatchTitle: "Add Match",
    guideAddMatchDesc:
      "6-step wizard (Home/Away + 5 photo sections) to upload match data",
    guideAddMatchStep1: "Step 1: Upload player ratings screenshot",
    guideAddMatchStep2: "Step 2: Upload team statistics screenshot",
    guideAddMatchStep3: "Step 3: Upload attack areas screenshot",
    guideAddMatchStep4: "Step 4: Upload ball recovery screenshot",
    guideAddMatchStep5: "Step 5: Upload opponent formation screenshot",
    guideAddMatchStep6: "Save match when all steps are completed",
    guideMatchDetailTitle: "Match Detail",
    guideMatchDetailDesc:
      "From the dashboard click on a match for full analysis, AI summary and suggestions.",
    guideMatchDetailStep1:
      "From the dashboard click on a match to open the detail",
    guideMatchDetailStep2:
      "View all match data and generate bilingual AI summary (IT/EN)",
    guideMatchDetailStep3: "Analyze player performance",
    guideMatchDetailStep4: "Consult tactical suggestions",
    guidePlayerDetailTitle: "Player Detail",
    guidePlayerDetailDesc:
      "From formation click on a player for stats, skills and screenshot upload.",
    guidePlayerDetailStep1:
      "From formation management click on a player to open the detail",
    guidePlayerDetailStep2: "Complete profile with additional photos",
    guidePlayerDetailStep3: "Upload stats, skills, booster screenshots",
    guideProfileTitle: "Profile Settings",
    guideProfileDesc: "Customize your profile and preferences",
    guideProfileStep1: "Enter personal data (first name, last name)",
    guideProfileStep2: "Configure game data (division, favorite team)",
    guideProfileStep3: "Customize AI preferences (AI name, how to remember)",
    guideProfileStep4: "Indicate common problems for targeted suggestions",
    guidePalestraCoachTitle: "Coach Gym",
    guidePalestraCoachDesc:
      "Gaming profile and post-match feedback only. Open the modal from the dashboard; for tactical advice use the main chat.",
    guidePalestraCoachStep1: 'From the dashboard click "Coach Gym"',
    guidePalestraCoachStep2:
      "Fill in your gaming profile (platform, connection, PA, etc.) or share feedback on the match",
    guidePalestraCoachStep3:
      "Save & close: data feeds AI Knowledge and personalized advice",
    guideCountermeasuresTitle: "Pre-match countermeasures",
    guideCountermeasuresDesc:
      "Upload opponent formation, extract data and generate tactical countermeasures with AI (pre-match).",
    guideCountermeasuresStep1: "Upload a screenshot of the opponent formation",
    guideCountermeasuresStep2:
      "Extraction and countermeasures start automatically",
    guideCountermeasuresStep3: "Read the generated analysis and suggestions",
    guideCountermeasuresStep4:
      "Read analysis, tactical adjustments and individual instructions",
    guideCoachesTitle: "Coaches",
    guideCoachesDesc:
      "Upload coach photos, set active and view competences for playing style.",
    guideCoachesStep1: "Upload 1 or 2 screenshots (main and connection photo)",
    guideCoachesStep2: "AI extracts name, team and competences",
    guideCoachesStep3: "Set a coach as active; view details or delete",
    guideClassificaTitle: "Monthly leaderboard",
    guideClassificaDesc:
      "From Zero to Hero leaderboard: points from matches, AI usage and profile. Eligibility: at least 1 complete match in the month and profile ≥50%.",
    guideClassificaStep1: "View your position and monthly points",
    guideClassificaStep2:
      'Expand "Points breakdown" to see how they are calculated',
    guideClassificaStep3:
      "Take part with at least 1 complete match in the month and profile 50% complete",
    guideGestioneProfiloTitle: "Profile management (Hero Points)",
    guideGestioneProfiloDesc:
      "Remaining credits, total analyses, rank and transactions. Purchase credits and review recent activity.",
    guideGestioneProfiloStep1:
      "View remaining credits (Hero Points) and rank (Bronze/Silver/Gold/Platinum)",
    guideGestioneProfiloStep2:
      "Check analyses, credits and recent account activity",
    guideGestioneProfiloStep3:
      "Review transactions (credit usage for analyses, chat, extractions)",
    guideDashboardStep3:
      "Access recent matches with one click (expand the card to see the list)",
    guideDashboardStepBanner:
      'AI Knowledge bar: shows how well AI knows you. Use "AI Info" and "Refresh analysis" to update.',
    guideDashboardStepObiettivi:
      "Weekly goals: expand the card to see tasks; complete them to boost your score.",
    guideDashboardStepClassifica:
      "Dashboard: check setup status, missions and main shortcuts.",
    guideDashboardStepStatistiche:
      "Game statistics: upload the 2 eFootball Analysis screens for advice on shooting, passing and defence.",
    guideShowMeHowTitle: "Show me how",
    guideShowMeHowDesc:
      "Interactive tour on every page! Click the compass button top-right for a step-by-step guide. Available on Dashboard, Formation, Add Match, Countermeasures, Coaches, Guide, Profile and Profile management.",
    guideShowMeHowFeature1: "Contextual tours",
    guideShowMeHowFeature1Desc: "A different tour per page",
    guideShowMeHowFeature2: "Always available",
    guideShowMeHowFeature2Desc: "Restart whenever you want",
    guideLink: "Complete Guide",
    // Interactive tour (Show me how)
    tourShowMeHow: "Show me how",
    tourNext: "Next",
    tourPrev: "Back",
    tourFinish: "Finish",
    tourClose: "Close",
    tourStart: "Start",
    tourSkip: "Skip tour",
    tourProgress: "{{current}} / {{total}}",
    tourNoTour: "No guide for this page.",
    tourDashboardIntroTitle: "Hi there! 👋",
    tourDashboardIntroDesc:
      "Here's what you'll find: team, goals and navigation. Ready?",
    tourDashboardAiTitle: "How well do I know you? 📊",
    tourDashboardAiDesc:
      "More data you add (profile, squad, matches) → better advice for you.",
    tourDashboardTaskTitle: "Your goals 🎯",
    tourDashboardTaskDesc:
      "Personalized tasks to improve. They help you complete setup and use the app better.",
    tourDashboardSquadTitle: "Your squad 👥",
    tourDashboardSquadDesc: "Starters and reserves always at hand.",
    tourDashboardNavTitle: "Where to? 🧭",
    tourDashboardNavDesc:
      "All sections one click away: formation, matches, coaches...",
    tourDashboardAddMatchTitle: "Add a match ➕",
    tourDashboardAddMatchDesc: "Upload screenshots and let AI analyze for you.",
    tourDashboardMatchesTitle: "Your matches 🎮",
    tourDashboardMatchesDesc: "Click to see analysis and personalized advice.",
    tourDashboardInsightsTitle: "What emerges? 💡",
    tourDashboardInsightsDesc:
      "Your game patterns and tips on what to improve.",
    tourDashboardClassificaTitle: "Monthly leaderboard",
    tourDashboardClassificaDesc:
      "From Zero to Hero points: matches, AI usage and profile. Click to see full leaderboard and your position.",
    tourClassificaIntroTitle: "Monthly leaderboard",
    tourClassificaIntroDesc:
      "Here you see the monthly leaderboard, days left in the month and how to climb the ranks.",
    tourClassificaYourPositionTitle: "Your position",
    tourClassificaYourPositionDesc:
      'Points and rank. Use "Points breakdown" to see how they are calculated (matches, AI usage, profile).',
    tourClassificaRankingsTitle: "Leaderboard",
    tourClassificaRankingsDesc:
      "Podium and full list. To appear you need at least 1 complete match in the month and profile at 50% or above.",
    tourGestioneProfiloIntroTitle: "Profile management",
    tourGestioneProfiloIntroDesc:
      "Hero Points (credits), total analyses, rank and links to leaderboard and transactions.",
    tourGestioneProfiloBalanceTitle: "Remaining credits",
    tourGestioneProfiloBalanceDesc:
      "Credits available for analyses, chat and extractions. Purchase to top up.",
    tourGestioneProfiloLeaderboardTitle: "Leaderboard and prizes",
    tourGestioneProfiloLeaderboardDesc:
      "Your position in the monthly leaderboard and history. Prizes for top finishers.",
    tourGestioneProfiloTransactionsTitle: "Recent activity",
    tourGestioneProfiloTransactionsDesc:
      "Transactions: credit usage for match analyses, chat, player and formation extractions.",
    tourFormationIntroTitle: "Formation Management",
    tourFormationIntroDesc:
      "Manage your roster: 2D pitch, starters, reserves, formation upload and player cards.",
    tourFormationHeaderTitle: "Header and Formation",
    tourFormationHeaderDesc:
      "Back to Dashboard, change formation or customize positions. Current formation name is shown here.",
    tourFormationActiveCoachTitle: "Active Coach",
    tourFormationActiveCoachDesc:
      "The active coach affects style and competences. Change it from the Coaches section.",
    tourFormationFieldTitle: "2D Pitch",
    tourFormationFieldDesc:
      "Click slots to assign players from reserves or upload from screenshot. Customize positions in edit mode.",
    tourFormationReservesTitle: "Reserves",
    tourFormationReservesDesc:
      "Players not on the pitch. Upload single cards or assign to slots by clicking on the pitch.",
    tourFormationUploadTitle: "Upload Formation / Reserves",
    tourFormationUploadDesc:
      'Upload players one by one from the "Players" section or add single reserves.',
    tourFormationCoachesLinkTitle: "Coaches",
    tourFormationCoachesLinkDesc:
      "Go to coaches: upload photos, set active, view competences.",
    tutorialRosaTitle: "Tutorial: loading your roster",
    tutorialRosaIntro:
      "How to load starters and reserves, which photos you need, what alerts mean, and what to do when photos are not recognized.",
    tutorialRosaSectionSteps: "How to load the roster",
    tutorialRosaSectionPhotos: "The 3 photos to upload",
    tutorialRosaSectionAlerts: "What are the alerts",
    tutorialRosaSectionCompleteMove: "Complete later and move players",
    tutorialRosaSectionTroubleshoot: "Photo not recognized?",
    tutorialRosaCompleteLaterIntro:
      "If some data was not extracted or you want to add photos later:",
    tutorialRosaCompleteLater1:
      "Click on the player (on the pitch or in reserves) to open the detail screen.",
    tutorialRosaCompleteLater2:
      "On that screen you complete the profile by uploading the missing photos (Stats, Skills, Booster), not by filling in fields manually.",
    tutorialRosaMoveIntro: "How to move players on the pitch:",
    tutorialRosaMove1:
      'Assign a slot: click an empty slot on the pitch → choose a player from reserves or "Upload photo" to add a new one.',
    tutorialRosaMove2:
      'Replace a starter: click the slot with the player → in the popup you can "Remove from formation" (moves to reserves) or assign someone else from the reserves list.',
    tutorialRosaMove3:
      'Customize positions on the pitch: click "Personalize positions" (pencil icon) in the header → drag players on the field to move them, then "Save positions".',
    tutorialRosaStep1:
      'If you don\'t have a formation yet: click "Upload Formation" and upload players one by one from the "Players" section of the game (NOT from "Game Plan"). For each player you need 3 photos: Stats, Skills and Booster.',
    tutorialRosaStep2:
      'To add or replace a player in a slot: click the slot on the pitch, then "Upload photo" (or the upload icon).',
    tutorialRosaStep3:
      "Upload at least 2 photos of the player: Stats (required) and Skills (required). The third (Booster) is optional.",
    tutorialRosaStep4:
      'Click "Save Player". The app extracts name, rating, position and skills from the images.',
    tutorialRosaStep5:
      'For reserves: in the Reserves section click "Upload players" and upload the same 3 photo types for each reserve.',
    tutorialRosaPhotosIntro:
      "Each player can have up to 3 screenshots from eFootball:",
    tutorialRosaPhoto1Title: "Stats photo",
    tutorialRosaPhoto1Desc:
      "The player card with numeric stats (shooting, passing, defending, etc.). In eFootball: open the player screen, Stats section.",
    tutorialRosaPhoto2Title: "Skills photo",
    tutorialRosaPhoto2Desc:
      "The screen with Player Skills (Through Passing, Dipping Shot, etc.). In eFootball: player screen, Skills section.",
    tutorialRosaPhoto3Title: "Booster photo",
    tutorialRosaPhoto3Desc:
      "Optional: screen with boosters and special bonuses. You can skip it if you don't have it.",
    tutorialRosaPhotoRulesTitle: "Important rules:",
    tutorialRosaPhotoFullScreen:
      "Each photo must show the full game screen (name, rating, stats, charts), not just a crop of the numbers. Some users send only the stats: that is not enough.",
    tutorialRosaPhotoBoosterActive:
      "For the Booster photo: turn on the «See max Booster effect» toggle (green, top right) before taking the screenshot, so the app can read the effect correctly.",
    tutorialRosaAlertsIntro:
      "While uploading you may see alerts. Here is what they mean:",
    tutorialRosaAlertDuplicate: "Player already in roster",
    tutorialRosaAlertDuplicateDesc:
      "You are adding a player that is already in the roster (same name). You can replace them in the slot or in reserves, or cancel.",
    tutorialRosaAlertOutOfRole: "Player out of role",
    tutorialRosaAlertOutOfRoleDesc:
      "One or more players are in a position they are not competent for. Check original positions and move or replace players.",
    tutorialRosaAlertReplace: "Replace reserve/slot",
    tutorialRosaAlertReplaceDesc:
      "The player is already in the lineup or on the bench. Choose whether to replace with new data (e.g. after better photos) or keep existing data.",
    tutorialRosaTroubleshootIntro: "If extraction fails or data is wrong:",
    tutorialRosaTroubleshoot1:
      "Make sure you uploaded the right screen: Stats = numbers and charts; Skills = Player Skills list; Booster = bonuses (optional).",
    tutorialRosaTroubleshoot2:
      "Use clear screenshots, no glare. Avoid very dark or badly cropped images.",
    tutorialRosaTroubleshoot3:
      'If "Missing data" appears: you can "Retry Upload" with a better image. Or fill only the required fields and "Save with manual data": complete the rest later by uploading the missing photos from the player screen.',
    tutorialRosaTroubleshoot4:
      "If the app doesn't recognize anything: ensure the image is from the eFootball player screen (not a menu or other screen).",
    tutorialRosaTroubleshoot5:
      "Only a photo of the stats? That is not enough: send the full screen (player name, rating, charts, full context).",
    tutorialRosaTroubleshoot6:
      "For the Booster photo: in the screenshot the «See max Booster effect» toggle must be on (green), or extraction may fail.",
    tutorialRosaGotIt: "Got it",
    tutorialRosaButton: "Roster tutorial",
    goToFormation: "Go to Formation",
    openPalestraCoach: "Open Coach Gym",
    tourMatchIntroTitle: "Add Match",
    tourMatchIntroDesc:
      "6-step wizard: first Home/Away, then upload player ratings, team stats, attack areas, ball recoveries and opponent formation screenshots.",
    tourMatchProgressTitle: "Progress",
    tourMatchProgressDesc:
      "Upload count and progress bar. Extracted result (if any) is shown here.",
    tourMatchStepsTitle: "Wizard Steps",
    tourMatchStepsDesc:
      "Click a step to switch. Green = done, grey = skipped. Upload, extract or skip each section.",
    tourMatchContentTitle: "Step Content",
    tourMatchContentDesc:
      "Upload the image, click Extract to analyze. You can skip a step if you don't have the screenshot.",
    tourMatchSaveTitle: "Save Match",
    tourMatchSaveDesc:
      "When at least one step is done, click here for summary, Home/Away and save.",
    tourGuidaIntroTitle: "Complete Guide",
    tourGuidaIntroDesc:
      'Discover the platform: profile, AI Brain, "Show me how" tours and page-by-page guides.',
    tourGuidaProfileHeroTitle: "Complete Your Profile",
    tourGuidaProfileHeroDesc:
      "The more you complete your profile, the better the AI knows you. Go to Profile Settings to fill it.",
    tourGuidaBrainHeroTitle: "AI Brain",
    tourGuidaBrainHeroDesc:
      "Assistant always available bottom-right. Ask anything: guidance, motivation, step-by-step help.",
    tourGuidaPagesTitle: "Page Guides",
    tourGuidaPagesDesc:
      "Quick guides for Dashboard, Formation, Add Match, Countermeasures, Coaches, Profile. Expand and go to page.",
    tourGuidaFooterTitle: "Have Questions?",
    tourGuidaFooterDesc:
      'Use the AI Brain or "Show me how" tour (compass button top-right) on every page.',
    tourProfileIntroTitle: "Profile Settings",
    tourProfileIntroDesc:
      "Customize personal data, game, AI preferences and experience. Save section by section.",
    tourProfileProfilingTitle: "Profiling",
    tourProfileProfilingDesc:
      "How well the AI knows you. Complete all sections to get closer to 100%.",
    tourProfilePersonalTitle: "Personal Data",
    tourProfilePersonalDesc:
      'First name, last name. Save with the "Save" button in the section.',
    tourProfileGameTitle: "Game Data",
    tourProfileGameDesc:
      "Division, favorite team, in-game team name. Used for advice and stats.",
    tourProfileAITitle: "AI Preferences",
    tourProfileAIDesc: "AI name, how to remember you. Customize the assistant.",
    tourProfileExpTitle: "Game Experience",
    tourProfileExpDesc:
      "Hours per week, common issues. Help the AI give targeted suggestions.",
    tourProfileCompleteTitle: "Complete Profile",
    tourProfileCompleteDesc:
      'Save the whole profile at once. You can also use "Save" in each section.',
    tourCounterIntroTitle: "Pre-match countermeasures",
    tourCounterIntroDesc:
      "Upload opponent formation, extract data, generate tactical countermeasures and instructions with AI.",
    tourCounterUploadTitle: "Upload Opponent Formation",
    tourCounterUploadDesc:
      "Upload a screenshot. Extraction and countermeasures start automatically.",
    tourCounterExtractedTitle: "Formation Extracted",
    tourCounterExtractedDesc:
      "Formation extracted. Countermeasures are generated automatically.",
    tourCounterGenerateTitle: "Generate Countermeasures",
    tourCounterGenerateDesc:
      "AI produces analysis, tactical adjustments, instructions and key player suggestions.",
    tourCounterResultTitle: "Countermeasures Generated",
    tourCounterResultDesc:
      "Analysis, tactical countermeasures, instructions and key players. Apply the suggestions you prefer.",
    tourCoachesIntroTitle: "Coaches",
    tourCoachesIntroDesc:
      "Manage coaches: upload up to 2 photos (main + connection), set active, view details.",
    tourCoachesUploadTitle: "Upload Coach",
    tourCoachesUploadDesc:
      "Upload 1 or 2 screenshots (main and connection). AI extracts name, team and competences.",
    tourCoachesListTitle: "Coach List",
    tourCoachesListDesc:
      "Card per coach. Star = active. View details, set as titular or delete.",

    // NEW TOUR STEPS - Improved Dashboard
    tourDashboardSetupBannerTitle: "Setup Completion",
    tourDashboardSetupBannerDesc:
      "Banner showing what's missing to fully configure your team: coach, game stats, or complete formation. Click the links to complete.",
    tourDashboardMissionCenterTitle: "Mission Center",
    tourDashboardMissionCenterDesc:
      "Your personal hub: daily objectives, special challenges and progress tracking. Use it to understand the next useful step.",
    tourDashboardGameAnalysisTitle: "Quick Game Analysis",
    tourDashboardGameAnalysisDesc:
      "Upload screenshots of your game stats (last 10 matches) to receive personalized advice and specific tasks about your play style.",

    // NEW TOUR STEPS - Formation
    tourFormationTacticalTitle: "Tactical Settings",
    tourFormationTacticalDesc:
      "Customize individual instructions for each player: defensive style, positioning, support and more. Save your tactical preferences.",

    // NEW TOUR STEPS - Match
    tourMatchHomeAwayTitle: "Home or Away",
    tourMatchHomeAwayDesc:
      "Select whether you played home or away. This helps the AI correctly identify your team in match statistics.",

    // NEW TOUR STEPS - Coaches
    tourCoachesActiveTitle: "Active Coach",
    tourCoachesActiveDesc:
      "The coach with the star is currently set for your team. Their playing style influences the tactical advice you receive.",

    back: "Back",
    whatIsFormation: "What is a formation?",
    whatIsFormationDesc:
      "A formation is a screenshot showing all 11 players on the field. By uploading a formation, players are automatically identified as STARTERS.",
    whatIsCard: "What is a player card?",
    whatIsCardDesc:
      "A card is a screenshot of a single player showing their stats, skills and booster. Cards are saved as RESERVES.",
    whatIsSwap: "How does swapping work?",
    whatIsSwapDesc:
      "Click on a player to select it, then click on another to swap their positions. A starter becomes a reserve and vice versa.",
    // 2D Field
    noFormationLoaded: "No formation loaded",
    loadFormationFirst:
      'Upload players one by one from the "Players" section to see the 2D field',
    clickToAssign: "Click to assign",
    assignPlayer: "Assign Player",
    modifySlot: "Modify Slot",
    currentPlayer: "Current player",
    removeFromSlot: "Remove from Slot",
    deletePermanently: "Delete Permanently",
    moveToReserves: "Move to Reserves",
    photoUploadedSuccessfully: "Photo uploaded successfully!",
    uploadedPhotoLabel: "Photo uploaded",
    playerAssignedSuccessfully: "Player assigned successfully!",
    playerDeletedSuccessfully: "Player deleted successfully!",
    playerMovedToReserves: "Player moved to reserves!",
    tacticalSettingsSaved: "Tactical settings saved successfully!",
    errorUploadingPhoto: "Error uploading photo",
    errorAssigningPlayer: "Error assigning player",
    errorDeletingPlayer: "Error deleting player",
    errorMovingPlayer: "Error moving player",
    errorSavingTacticalSettings: "Error saving tactical settings",
    uploadPlayerPhoto: "Upload Player Photo",
    changePlayer: "Change Player (Upload Photo)",
    orSelectFromReserves: "Or select from reserves",
    noFormationMessage:
      'No formation loaded. Upload players one by one from the "Players" section to see the 2D field',
    changeFormation: "Change Formation",
    importFromScreenshot: "Import from Screenshot (Advanced)",
    removeFromSlot: "Remove from Slot",
    deletePermanently: "Delete Permanently",
    remove: "Remove",
    loadReserve: "Load Reserve",
    completeProfile: "Complete Profile",
    goToPlayerProfile: "Go to profile",
    profileSettings: "Profile Settings",
    personalData: "Personal Data",
    gameData: "Game Data",
    aiPreferences: "AI Preferences",
    gameExperience: "Game Experience",
    teamNameInGame: "Team name in game",
    important: "Important",
    teamNameDescription:
      "💡 This name will be used to identify your team in matches and statistics",
    profiling: "Profiling",
    completeFor100: "Complete for 100%",
    moreYouAnswer:
      "💡 The more you answer, the more the AI knows you and helps you better!",
    saving: "Saving...",
    firstName: "First Name",
    lastName: "Last Name",
    yourFirstName: "Your first name",
    yourLastName: "Your last name",
    currentDivision: "Current division",
    selectDivision: "Select division",
    favoriteTeam: "Favorite team",
    favoriteTeamPlaceholder: "E.g.: Juventus, Real Madrid...",
    aiName: "AI Name (optional)",
    aiNamePlaceholder: 'E.g.: "Coach Mario", "Alex"',
    howToRemember: "How do you want to be remembered?",
    howToRememberPlaceholder:
      'E.g.: "I am a competitive player...", "I play for fun..."',
    hoursPerWeek: "How many hours do you play per week?",
    hoursPerWeekPlaceholder: "0-168 hours",
    whichProblems: "What problems do you encounter?",
    problemPassaggi: "Passes",
    problemDifesa: "Defense",
    problemCentrocampo: "Midfield",
    problemAttacco: "Attack",
    problemFormazione: "Formation",
    problemIstruzioniTattiche: "Tactical instructions",
    loadingProfile: "Loading profile...",
    savedSuccessfully: "saved successfully!",
    skipped: "Skipped",
    partialProfile: "Partial Profile",
    clickToComplete: 'Click "Complete Profile" to add missing data',
    sectionsCompleted: "sections completed",
    deleteReserve: "Delete Reserve",
    confirmDeleteReserve:
      "Are you sure you want to permanently delete this player from reserves?",
    deleteReserveError: "Error deleting player",
    formationCustom: "Custom",
    customizePositions: "Customize Positions",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    editModeActive: "Edit mode active: drag players to move them",
    positionsSavedSuccessfully: "Positions saved successfully",
    errorSavingPositions: "Error saving positions",
    changesCancelled: "Changes cancelled",
    formationInvalidTitle: "Check your formation",
    formationInvalidConfirm: "Do you want to save anyway?",
    formationSavedWithWarnings:
      "Formation saved. Double-check that roles and positions match how you play—the AI coach also uses this screen (along with other squad data).",
    saveCancelled: "Save cancelled",
    formationValidationSimple:
      "Make sure each player is in the role you actually use in match. The app and AI coach use this layout and these positions, together with other roster data, to personalize tips and analysis.",
    back: "Back",
    details: "Player Details",
    assignPlayer: "Assign Player",
    slot: "Slot",
    playerInfo: "Player Info",
    age: "Age",
    club: "Club",
    nationality: "Nationality",
    playingStyle: "Playing Style",
    years: "years",
    overallRating: "Overall",
    topPlayers: "Top Players",
    createFormation: "Create Your Formation",
    selectFormationDesc:
      "Select a predefined tactical formation to start. Then you can upload player cards for each slot.",
    createFormationBtn: "Create Formation",
    updatePhoto: "Update Photo",
    uploadModifyPhoto: "Upload/Modify Photo",
    uploadPlayerInstructions:
      "Upload images to automatically extract player data",
    photoStats: "Photo Statistics",
    photoStatsDesc: "Card with numerical statistics",
    photoSkills: "Photo Skills",
    photoSkillsDesc: "Player skills",
    photoBooster: "Photo Booster",
    photoBoosterDesc: "Boosters and special bonuses (optional)",
    slotInfo: "Slot",
    currentPlayerInfo: "Current player",
    extractedDataFromPhoto: "Data Extracted from Photo",
    statsSection: "Statistics",
    skillsSection: "Skills",
    boostersSection: "Boosters",
    skillsNotAvailable: "No skills available",
    notAvailable: "Not available",
    extractedFromCard: "(extracted from card)",
    profileComplete: "Profile Complete",
    statsNotAvailable: "Statistics not available",
    boostersNotAvailable: "Boosters not available",
    skillsLabel: "SKILLS",
    comSkillsLabel: "COM SKILLS",
    activeBoosters: "ACTIVE BOOSTERS",
    effect: "Effect",
    condition: "Condition",
    statsLabel: "Statistics",
    statistics: "Statistics",
    comSkills: "Additional skills",
    skillsBoosterLabel: "Skills/Boosters",
    position: "Position",
    overall: "Overall",
    name: "Name",
    team: "Team",
    role: "Role",
    nA: "N/A",
    upload: "Upload",
    uploadPlayer: "Upload Player",
    uploadOneImageOnly: "Upload one image at a time",
    saveAndUpdate: "Save and Update",
    updateStats: "Update Statistics",
    uploadStats: "Upload Statistics",
    updateSkills: "Update Skills",
    uploadSkills: "Upload Skills",
    updateBoosters: "Update Boosters",
    uploadBoosters: "Upload Boosters",
    confirmUpdate: "Confirm Update",
    loadFormation: "Load Formation",
    loadFirstReserve: "Load First Reserve",
    extractedData: "Data Extracted from Photo",
    // Coaches
    coaches: "Coaches",
    coachesTitle: "Coaches",
    uploadCoach: "Upload Coach",
    noCoachesLoaded: "No coaches loaded",
    uploadCoachDescription:
      "Upload a coach by loading a screenshot from the game",
    uploadFirstCoach: "Upload First Coach",
    activeCoach: "Active Coach",
    activeCoachInfo:
      "This coach is currently active and influences the team's playing style competence.",
    coachDetails: "Coach Details",
    viewCoachDetails: "Coach Details",
    setAsTitular: "Set as Titular",
    deleteCoach: "Delete Coach",
    confirmDeleteCoachTitle: "Confirm Deletion",
    confirmDeleteCoachMessage: "Are you sure you want to delete",
    confirmDeleteCoach: "Are you sure you want to delete this coach?",
    confirmDeleteCoachDetails: "This action cannot be undone.",
    confirmAction: "Confirm Action",
    confirmDeletePlayer:
      "Are you sure you want to permanently delete this player? This action cannot be undone.",
    confirmPositionChangeTitle: "Confirm Position Change",
    continue: "Continue",
    delete: "Delete",
    deleteAndProceed: "Delete and Proceed",
    duplicateReserveTitle: "Duplicate Reserve",
    coach: "Coach",
    historicalInsights: "Historical Insights",
    noPhotosSelected: "No photos selected",
    photoSelected: "photo selected",
    photosSelected: "photos selected",
    playerName: "Player name",
    replace: "Replace",
    selectFormation: "Select formation",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    selectCoachScreenshot: "Select coach screenshot:",
    coachUploaded: "Coach uploaded",
    coachDeleted: "Coach deleted",
    coachSetActive: "Coach set as titular",
    informations: "Information",
    playingStyleCompetence: "Playing Style Competence",
    counter_attack: "Counter Attack",
    wide: "Wide",
    ball_possession: "Ball Possession",
    long_ball: "Long Ball",
    quick_counter: "Quick Counter",
    finishing: "Finishing",
    defensive_behavior: "Defensive Behavior",
    trainingAffinity: "Training Affinity",
    statBoosters: "Stat Boosters",
    connection: "Connection",
    focalPoint: "Focal Point",
    keyMan: "Key Man",
    coachesLink: "Coaches",
    coachActiveTitle: "Active Coach",
    // Errors
    sessionExpired: "Session expired",
    unknownError: "Unknown error",
    coachLoadError: "Error loading coaches",
    coachDataLoadError: "Error loading data",
    coachSaveError: "Error saving coach",
    coachUploadError: "Error uploading coach",
    coachSetActiveError: "Error setting active coach",
    coachDeleteError: "Error deleting coach",
    coachExtractError:
      "Error: coach data not extracted. Check images and try again.",
    openAQuotaError:
      "OpenAI quota exhausted. Check your plan and billing details at https://platform.openai.com/account/billing",
    // Upload
    selectImageFile: "Select image file",
    maxTwoPhotos: "Maximum 2 photos allowed",
    uploadCoachInstructions:
      "Upload 2 screenshots: first with main data and competences, second with connection (optional).",
    dragDropPhotos: "Drag photos here or click to select",
    maxTwoPhotosFormat: "Maximum 2 photos • Formats: JPG, PNG",
    mainPhoto: "Main photo",
    connectionPhoto: "Connection",
    addPhoto: "Add photo",
    // Playing style names
    possesso_palla: "Ball Possession",
    contropiede_veloce: "Quick Counter",
    contrattacco: "Counter Attack",
    vie_laterali: "Wide",
    passaggio_lungo: "Long Ball",
    pressing_totale: "Overload",
    dataMismatch: "WARNING: Data mismatch!",
    nameDifferent: "Name is different",
    teamDifferent: "Team is different",
    positionDifferent: "Position is different",
    ageDifferent: "Age is different",
    ensureSamePlayer:
      "Make sure the photo is of the same player before proceeding.",
    confirmAnyway: "Confirm anyway",
    confirm: "Confirm",
    selectedPlayer: "Selected player",
    clickAnotherPlayer: "Click another player to swap",
    selected: "Selected",
    noStarters: "No starters",
    uploadFormationFirst: "Upload formation first",
    noReserves: "No reserves",
    uploadPlayerCards: "Upload player cards to add reserves",
    // Error messages
    formationOneImageOnly: "For formation you can upload only 1 image",
    formationAlreadyUploaded:
      "You have already uploaded a formation photo. Remove it before uploading another.",
    formationOneImageRequired: "For formation you must upload exactly 1 image",
    maxThreeImages: "Maximum 3 images allowed",
    maxThreeImagesAlready: "You can upload maximum 3 images. You already have",
    images: "images",
    warning: "Warning",
    playerSavedAsReserve: "player saved as reserve",
    playersSavedAsReserves: "players saved as reserves",
    formationExtractionFailed: "Unable to extract players from formation",
    playerExtractionFailed: "Unable to extract player data",
    formationExtractionError: "Error during formation extraction",
    uploadError: "Error during analysis and saving",
    savingPlayer: "Saving player",
    savingTitolari: "Saving {count} starters...",
    uploadInstructions:
      'Upload 1-3 eFootball player screenshots. Click "Validate upload" to analyze and save automatically.',
    playersSavedAsReservesCount: "{count} player(s) saved as reserves!",
    player: "Player",
    image: "Image",
    clickOrDragImage: "Click or drag image here",
    formationImageFormat:
      "Supported formats: JPG, PNG | 1 image (complete formation)",
    cardImageFormat:
      "Supported formats: JPG, PNG | Maximum 3 images (reserves)",
    invalidSession: "Invalid session. Please login again.",
    formationUpdated: "Formation updated successfully!",
    swapFormationError: "Formation swap error",
    loadPlayersError: "Error loading players",
    // Coaches
    coaches: "Coaches",
    coachesTitle: "Coaches",
    uploadCoach: "Upload Coach",
    noCoachesLoaded: "No coaches loaded",
    uploadCoachDescription:
      "Upload a coach by loading a screenshot from the game",
    uploadFirstCoach: "Upload First Coach",
    activeCoach: "Active Coach",
    activeCoachInfo:
      "This coach is currently active and influences the team's playing style competence.",
    coachDetails: "Coach Details",
    viewCoachDetails: "Coach Details",
    setAsTitular: "Set as Titular",
    deleteCoach: "Delete Coach",
    confirmDeleteCoachTitle: "Confirm Deletion",
    confirmDeleteCoachMessage: "Are you sure you want to delete",
    confirmDeleteCoach: "Are you sure you want to delete this coach?",
    confirmDeleteCoachDetails: "This action cannot be undone.",
    confirmAction: "Confirm Action",
    confirmDeletePlayer:
      "Are you sure you want to permanently delete this player? This action cannot be undone.",
    confirmPositionChangeTitle: "Confirm Position Change",
    continue: "Continue",
    delete: "Delete",
    deleteAndProceed: "Delete and Proceed",
    duplicateReserveTitle: "Duplicate Reserve",
    coach: "Coach",
    historicalInsights: "Historical Insights",
    noPhotosSelected: "No photos selected",
    photoSelected: "photo selected",
    photosSelected: "photos selected",
    playerName: "Player name",
    replace: "Replace",
    selectFormation: "Select formation",
    strengths: "Strengths",
    weaknesses: "Weaknesses",
    selectCoachScreenshot: "Select coach screenshot:",
    coachUploaded: "Coach uploaded",
    coachDeleted: "Coach deleted",
    coachSetActive: "Coach set as titular",
    informations: "Information",
    playingStyleCompetence: "Playing Style Competence",
    counter_attack: "Counter Attack",
    wide: "Wide",
    ball_possession: "Ball Possession",
    long_ball: "Long Ball",
    quick_counter: "Quick Counter",
    finishing: "Finishing",
    defensive_behavior: "Defensive Behavior",
    trainingAffinity: "Training Affinity",
    statBoosters: "Stat Boosters",
    connection: "Connection",
    focalPoint: "Focal Point",
    keyMan: "Key Man",
    loading: "Loading...",
    cancel: "Cancel",
    upload: "Upload",
    uploadCoachBtn: "Upload Coach",
    category: "Category",
    type: "Type",
    coachesLink: "Coaches",
    coachActiveTitle: "Active Coach",
    // Errors
    sessionExpired: "Session expired",
    unknownError: "Unknown error",
    coachLoadError: "Error loading coaches",
    coachDataLoadError: "Error loading data",
    coachSaveError: "Error saving coach",
    coachUploadError: "Error uploading coach",
    coachSetActiveError: "Error setting active coach",
    coachDeleteError: "Error deleting coach",
    coachExtractError:
      "Error: coach data not extracted. Check images and try again.",
    openAQuotaError:
      "OpenAI quota exhausted. Check your plan and billing details at https://platform.openai.com/account/billing",
    // Upload
    selectImageFile: "Select image file",
    maxTwoPhotos: "Maximum 2 photos allowed",
    uploadCoachInstructions:
      "Upload 2 screenshots: first with main data and competences, second with connection (optional).",
    dragDropPhotos: "Drag photos here or click to select",
    maxTwoPhotosFormat: "Maximum 2 photos • Formats: JPG, PNG",
    mainPhoto: "Main photo",
    connectionPhoto: "Connection",
    addPhoto: "Add photo",
    // Playing style names
    possesso_palla: "Ball Possession",
    contropiede_veloce: "Quick Counter",
    contrattacco: "Counter Attack",
    vie_laterali: "Wide",
    passaggio_lungo: "Long Ball",
    // Tactical Settings - Team Playing Style
    teamPlayingStyle: "Team Playing Style",
    teamPlayingStyleDescription: "Select the tactical approach for your team",
    // Individual Instructions
    individualInstructions: "Individual Instructions",
    individualInstructionsDescription:
      "Assign specific instructions to players",
    attack1: "Attack 1",
    attack1Description: "Instructions for attacking players (left side)",
    attack2: "Attack 2",
    attack2Description: "Instructions for attacking players (right side)",
    defense1: "Defense 1",
    defense1Description: "Instructions for defensive players (left side)",
    defense2: "Defense 2",
    defense2Description: "Instructions for defensive players (right side)",
    selectInstruction: "Select Instruction",
    selectPlayer: "Select Player",
    instruction: "Instruction",
    player: "Player",
    noPlayerSelected: "No player selected",
    noInstructionSelected: "No instruction selected",
    noCompatiblePlayers: "No compatible players available",
    // Individual Instructions - Attack
    anchoring: "Anchoring",
    anchoringDescription:
      "Prevents the indicated player from moving horizontally away from their own position. For example, the center forward will remain in a central position, and the wingers will not cut inside.",
    attackSpace: "Attack Space",
    attackSpaceDescription:
      "Player seeks spaces in depth to create scoring opportunities",
    counterTarget: "Counter Target",
    counterTargetDescription:
      "Player is the target for counter-attacks, stays high ready for quick transitions",
    offensive: "Offensive",
    offensiveDescription:
      "Player actively participates in attacks, pushes forward",
    // Individual Instructions - Defense
    tightMarking: "Tight Marking",
    tightMarkingDescription:
      "Defenders mark a specific player quite tightly. Not always like in MAN MARKING, but tight enough to easily intercept their opportunities.",
    manMarking: "Man Marking",
    manMarkingDescription:
      "This instruction makes a defender mark a specific player of the opposing team at all times. CF, SS, AMF, CMF, anyone.",
    counterTarget: "Counter Target",
    counterTargetDescription:
      "This player will position themselves much higher on the field, so when you regain possession, you can be a bit clever and simply launch the ball towards them, or simply make a low Stunning pass to pass the ball to them. I think this can only be applied to midfielders and attackers.",
    deepLine: "Deep Line",
    deepLineDescription:
      "This instruction allows a player to position themselves on the field in such a way as to be able to join the defense more easily. They contribute to the game, yes, but they also contribute to defense. It is impossible to indicate a defender. When a 5-defender formation is used, it is also impossible to assign a midfielder.",
    // Tactical Settings - Save
    tacticalSettings: "Tactical Settings",
    saveTacticalSettings: "Save Tactical Settings",
    tacticalSettingsSaved: "Tactical settings saved successfully",
    tacticalSettingsError: "Error saving tactical settings",
    loadingTacticalSettings: "Loading tactical settings...",

    // Matches
    addMatch: "Add Match",
    recentMatches: "Recent Matches",
    noMatchesSaved: 'No matches saved. Click on "Add Match" to start.',
    result: "Result",
    matchComplete: "✓ Complete",
    missingPhotos: "{count} missing",
    dateNotAvailable: "Date not available",
    unknownOpponent: "Unknown opponent",
    showMoreMatches: "Show {count} more matches...",
    match: "Match",
    dateAndTime: "Date and Time",
    opponent: "Opponent",
    notSpecified: "Not specified",
    completion: "Completion",
    completeWithMissingPhotos: "Complete with Missing Photos",
    missing: "Missing",
    uploadPhoto: "Upload Photo",
    extracting: "Extracting...",
    extractAndSave: "Extract and Save",
    backToDashboard: "Back to Dashboard",
    // Match Wizard Steps
    stepHomeAway: "Home/Away",
    stepHomeAwayInstruction:
      "Select whether you played at home or away. This is used to correctly associate data with your team.",
    stepPlayerRatings: "Player Ratings",
    stepPlayerRatingsPhoto1: "First screen (photo 1)",
    stepPlayerRatingsPhoto2: "Second screen (photo 2, optional)",
    stepTeamStats: "Team Statistics",
    stepAttackAreas: "Attack Areas",
    stepBallRecoveryZones: "Ball Recovery Zones",
    stepFormationStyle: "Opponent Formation",
    // Match Wizard Actions
    selectValidImage: "Select a valid image file",
    imageTooLarge: "Image is too large (max 10MB)",
    loadImageFirst: "Load an image first",
    sessionExpiredRedirect: "Session expired. Redirecting to login...",
    extractDataError: "Data extraction error",
    loadAtLeastOneSection: "Load at least one section before saving",
    loadAtLeastThreePhotos: "Load at least 3 screenshots before saving",
    summaryRequiresThreePhotosAndHomeAway:
      "Load at least 3 screenshots and select Home or Away to generate the summary",
    sessionExpired: "Session expired",
    saveMatchError: "Error saving match",
    matchSavedSuccess: "Match saved successfully! Redirecting...",
    changeImage: "Change Image",
    loadImage: "Load Image",
    extractData: "Extract Data",
    takePhoto: "Take Photo",
    cameraCaptureTitle: "Take photo",
    cameraCaptureButton: "Capture",
    cameraClose: "Cancel",
    cameraNotAvailable: "Camera not available or permission denied.",
    cameraCaptureFailed: "Capture failed. Try again.",
    cameraStarting: "Starting camera…",
    skip: "Skip",
    saving: "Saving...",
    saveMatch: "Save Match",
    matchNotFound: "Match not found",
    loadMatchError: "Error loading match",
    loadPhotoError: "Error loading photo",
    updateMatchError: "Error updating match",
    tokenNotAvailable: "Token not available",
    playerNotFound: "Player not found",
    errorLoadingPlayer: "Error loading player",
    selectAtLeastOneImage: "Select at least one image",
    errorExtractingData: "Error extracting data",
    unableToExtractData: "Unable to extract data from image",
    errorUpdatingPlayer: "Error updating player",
    // Match Wizard Instructions
    step0Instruction:
      "Upload one or two screenshots of player ratings (first and, if needed, second screen).",
    step1Instruction:
      "Upload a screenshot of team statistics (possession, shots, passes, etc.).",
    step2Instruction:
      "Upload a screenshot of attack areas (percentages by zone).",
    step3Instruction:
      "Upload a screenshot of ball recovery zones (green dots on the field).",
    step4Instruction:
      "Upload a screenshot of formation and playing style (formation, style, team strength).",
    dataExtractedSuccess: "✓ Data extracted successfully",
    // Match Summary & AI Analysis
    resultExtracted: "Result extracted",
    matchSummary: "Match Summary",
    matchOverview: "Match Overview",
    keyHighlights: "Key Highlights",
    playerPerformance: "Player Performance",
    topPerformers: "Top Performers",
    underperformers: "Underperformers",
    tacticalAnalysis: "Tactical Analysis",
    whatWorked: "What Worked",
    whatDidntWork: "What Didn't Work",
    recommendations: "Recommendations",
    suggestedReplacement: "Suggestion",
    tacticalSuggestions: "Tactical Suggestions",
    rating: "Rating",
    suggestions: "Suggestions",
    sectionsComplete: "Complete Sections",
    sectionsMissing: "Missing Sections",
    photosUploadedCount: "photos uploaded",
    opponentNameLabel: "Opponent Name",
    optional: "(optional)",
    opponentNamePlaceholder:
      "E.g.: GONDİKLENDİNİZZZ, AC Milan, Friendly vs Mario...",
    opponentNameHint:
      "Helps identify the match. If left empty, will be extracted automatically from images or use an identifier.",
    clickToEditOpponentName: "Click to edit opponent name",
    generateAnalysis: "Generate AI Analysis",
    generatingAnalysis: "Generating analysis...",
    aiAnalysis: "AI Analysis",
    regenerateSummary: "Regenerate Summary",
    noSummaryAvailable:
      "No summary available. Generate a summary to see the match analysis.",
    aiSummaryLabel: "AI Summary:",
    readMore: "Read more →",
    generateAiSummary: "Generate AI Summary",
    errorGeneratingSummary: "Error generating summary",
    noSummaryGenerated: "No summary generated",
    errorSavingSummary: "Error saving summary",
    analysisBasedOnPartialData: "Analysis based on partial data",
    // Pre-match countermeasures (ex Contromisure Live)
    countermeasuresLive: "Pre-match countermeasures",
    uploadOpponentFormation: "Upload Opponent Formation",
    extractFormation: "Extract Formation",
    generateCountermeasures: "Generate Countermeasures",
    opponentFormationAnalysis: "Opponent Formation Analysis",
    tacticalCountermeasures: "Tactical Countermeasures",
    playerSuggestions: "Player Suggestions",
    individualInstructions: "Individual Instructions",
    howToPlayIt: "How to play it",
    playSummaryMatchKey: "Match key",
    playSummaryBasePlan: "Base plan",
    playSummaryAttacking: "When attacking",
    playSummaryDefending: "When defending",
    playSummaryAvoid: "Mistake to avoid",
    applySelected: "Apply Selected",
    metaFormation: "Meta Formation",
    formationStrengths: "Strengths",
    formationWeaknesses: "Weaknesses",
    defensiveLine: "Defensive Line",
    pressing: "Pressing",
    possessionStrategy: "Possession Strategy",
    priority: "Priority",
    priorityHigh: "HIGH",
    priorityMedium: "MEDIUM",
    priorityLow: "LOW",
    reason: "Reason",
    addToStartingXI: "Add to Starting XI",
    replaceInStartingXI:
      "Start ${playerName} (${playerRole}) instead of ${replacePlayerName} (${replacePlayerRole})",
    replaceInStartingXIHint: "${replacePlayerName} moves to the bench",
    replaceInStartingXIRoleNote:
      "Takes the ${replacePlayerRole} slot; the saved reserve role is ${playerRole}",
    substitutionIncomplete: "Replace a starter with ${playerName}",
    substitutionIncompleteHint:
      "Specify who leaves the lineup (incomplete countermeasure data)",
    removeFromStartingXI: "Remove from Starting XI",
    changeFormation: "Change Formation",
    changePlayingStyle: "Change Playing Style",
    adjustDefensiveLine: "Adjust Defensive Line",
    adjustPressing: "Adjust Pressing",
    adjustPossession: "Adjust Possession",
    warnings: "Warnings",
    confidence: "Confidence",
    dataQuality: "Data Quality",
    generatingCountermeasures: "Generating countermeasures...",
    errorGeneratingCountermeasures: "Error generating countermeasures",
    noFormationUploaded: "Upload an opponent formation first",
    selectSuggestionsToApply: "Select suggestions to apply",
    suggestionsApplied: "Suggestions applied successfully",
    errorApplyingSuggestions: "Error applying suggestions",
    applying: "Applying...",
    completeness: "completeness",
    missingData: "Missing data",
    loadMorePhotos: "Load more photos for more precise suggestions",
    confirmSave: "Confirm and Save",
    cancel: "Cancel",
    deleteMatch: "Delete Match",
    confirmDeleteMatch: "Are you sure you want to delete this match?",
    matchDeleted: "Match deleted successfully",
    deleteMatchError: "Error deleting match",
    // Error Messages Improved
    errorQuotaExhausted: "OpenAI quota exhausted. Try again in a few minutes.",
    errorTimeout: "Timeout during generation. Try again.",
    errorImageTooLarge:
      "Image is too large (max 10MB). Try compressing it or use a lighter format.",
    imageOptimizeHighQualityHint:
      "The photo is still too heavy after compression (high resolution or heavy format). Lower camera quality, crop to only the useful screen area, or use an in-game screenshot instead of a monitor photo.",
    imageOptimizeFailedLoad:
      "Could not open the image. Try another file or format (JPEG/PNG).",
    imageOptimizeFailedCanvas:
      "The browser could not process the image. Try closing other tabs or reducing resolution.",
    imageOptimizeFailedGeneric:
      "Could not prepare the image for upload. Try a smaller file or lower resolution.",
    errorInvalidImage: "File is not a valid image",
    errorExtractingFormation: "Error extracting formation",
    errorInvalidScreenshot:
      "Invalid screenshot for this section. Make sure you upload the correct screenshot.",
    extractionErrorFriendly:
      "Could not read data from image. Try a clearer screenshot.",
    errorAnalysisGeneration: "Error generating analysis",
    tryAgainInMoment: "Please try again in a moment!",
    errorChatGeneric: "Sorry, something went wrong.",
    chatCreditsPaused:
      "**Coach is on the bench for a moment!**\n\nYou've run out of **Hero Points** for this chat — nothing broke, your balance is just empty.\n\n**Top up** and we're back with squad, match, tactics and card advice.",
    chatCreditsRechargeCta: "Top up Hero Points",
    // Progress
    photosCount: "photos uploaded",
    of: "of",
    // Assistant Chat
    howToAddMatch: "How do I add a match?",
    howToManageFormation: "How do I manage the formation?",
    whereAmI: "Where am I?",
    whatCanYouDo: "What can you do?",
    typeMessage: "Type a message...",
    openAssistant: "Open assistant",
    closeAssistant: "Close assistant",
    sendMessage: "Send message",
    voiceInput: "Voice input",
    voiceListening: "Listening...",
    voiceNotSupported: "Your browser does not support speech recognition.",
    voiceError: "Speech recognition error. Please try again.",
    yourCoach: "Your Coach AI",
    assistantGreetingShort: "Hi {{name}}! 👋",
    liveCoachOpen: "Open premium Live Coach",
    liveCoachClose: "Close Live Coach",
    liveCoachPremiumBadge: "Live Coach Premium",
    liveCoachTitle: "Live Coach",
    liveCoachSubtitle:
      "Upload the opponent photo and then talk to {{coachName}} for live guidance during the match.",
    liveCoachCommercialIntro:
      "The more context you give the coach, the more precise the guidance becomes.",
    liveCoachPhotoTitle: "Opponent photo",
    liveCoachPhotoSubtitle:
      "Upload the opponent formation screenshot before starting or during preparation.",
    liveCoachPhotoHelper:
      "Photo first, then coach. With the photo, the guidance becomes more precise.",
    liveCoachPhotoButton: "Upload formation photo",
    liveCoachPhotoUploading: "Analyzing photo...",
    liveCoachPhotoReady: "Photo analyzed",
    liveCoachPhotoDetected: "Detected shape",
    liveCoachPhotoError:
      "Could not read the photo for Live Coach. Try a clearer screenshot.",
    liveCoachVoiceTitle: "Talk to {{coachName}}",
    liveCoachVoiceSubtitle:
      "Get quick corrections and practical guidance while you play.",
    liveCoachVoiceHelper:
      "When you are ready, start the session and speak to {{coachName}} like you would to a real coach.",
    liveCoachVoiceMarin: "Marin - Warm premium",
    liveCoachVoiceCedar: "Cedar - Clean premium",
    liveCoachVoiceCoral: "Coral - Bright and direct",
    liveCoachVoiceVerse: "Verse - Smooth and natural",
    liveCoachVoiceSage: "Sage - Confident and authoritative",
    liveCoachVoiceBallad: "Ballad - Calm and enveloping",
    liveCoachConnecting: "Connecting live session...",
    liveCoachStartTalking: "Start Live Coach",
    liveCoachMute: "Mute mic",
    liveCoachUnmute: "Unmute mic",
    liveCoachStop: "End session",
    liveCoachStatusReady: "Ready for kickoff",
    liveCoachStatusLive: "Live active",
    liveCoachStatusIdle: "Tap to start",
    liveCoachStatusConnecting: "Connecting...",
    liveCoachHpHint: "Live support during the match",
    liveCoachLiveFeed: "Live feed",
    liveCoachFeedHelper:
      "Your request and {{coachName}}'s live answer will appear here.",
    liveCoachYou: "You",
    liveCoachCoach: "Coach",
    liveCoachStatHp: "HP",
    liveCoachStatTime: "Time",
    liveCoachStatSpent: "Session",
    liveCoachReadyShort: "Ready",
    liveCoachLiveShort: "Live",
    liveCoachLauncherSubtitle: "Premium voice coach always ready.",
    liveCoachLauncherSubtitleDash:
      "Premium voice coach highlighted for the dashboard.",
    liveCoachLauncherSubtitleActive: "Your coach is with you in real time.",
    liveCoachDashboardTitle: "Premium Live Coach for matches",
    liveCoachDashboardSubtitle:
      "Talk to your coach during the match and get quick corrections when you need them.",
    liveCoachDashboardCta: "Open Live Coach",
    liveCoachOpponentReady: "Opponent ready",
    liveCoachOpponentMissing: "No photo yet",
    liveCoachWaitingYou:
      "As soon as you speak, your live request summary will appear here.",
    liveCoachWaitingCoach: "...",
    liveCoachStartError: "Could not start Live Coach right now.",
    liveCoachRealtimeError: "Realtime voice connection error.",
    liveCoachBillingError: "Live Coach Hero Points check failed.",
    liveCoachEndedNoCredits: "Live Coach stopped because Hero Points ran out.",
    // Formation Variations
    baseFormations: "Base Formations",
    variations: "Variations",
    formationWide: "Wide",
    formationCompact: "Compact",
    formationOffensive: "Offensive",
    formationDefensive: "Defensive",
    searchFormation: "Search formation...",
    selectFormationTactical: "Select Tactical Formation",
    formationDescription:
      "Choose an official eFootball tactical formation. Already assigned players will be maintained in their positions, only the visual coordinates on the field will change.",
    variationsCount: "variations",
    expandVariations: "Expand variations",
    collapseVariations: "Collapse variations",
    expandSection: "Show more",
    collapseSection: "Show less",
    expandSectionGoals: "Show weekly goals",
    collapseSectionGoals: "Hide goals",
    expandSectionMatches: "Show recent matches",
    collapseSectionMatches: "Hide matches",
    expandGuideCard: "Expand guide and go to page",
    collapseGuideCard: "Collapse guide",
    confirmFormation: "Confirm Formation",
    // Position Selection Modal
    selectOriginalPositions: "Select Original Positions",
    positionSelectionTitle: "Select the positions this player can play",
    positionSelectionDescription:
      "Which positions can this player play? (Select all those highlighted on the card)",
    competenceLevel: "Competence Level",
    competenceHigh: "High",
    competenceMedium: "Medium",
    competenceLow: "Low",
    editCompetences: "Edit competences",
    editBoosters: "Edit boosters",
    manualBoosters: "Manual boosters entry",
    competencesUpdated: "Competences updated",
    boostersUpdated: "Boosters updated",
    errorUpdatingPlayer: "Error updating player",
    mainPosition: "Main Position",
    selectPositions: "Select Positions",
    mustSelectAtLeastOne: "You must select at least one position",
    positionGroupGoalkeeper: "Goalkeepers",
    positionGroupPortiere: "Goalkeeper",
    positionGroupDefense: "Defense",
    positionGroupMidfield: "Midfield",
    positionGroupAttack: "Attack",
    positionRolePT: "Goalkeeper",
    positionRoleDC: "Center back",
    positionRoleTS: "Left back",
    positionRoleTD: "Right back",
    positionRoleCC: "Central midfielder",
    positionRoleMED: "Defensive midfielder",
    positionRoleCLS: "Left midfielder",
    positionRoleCLD: "Right midfielder",
    positionRoleTRQ: "Attacking midfielder",
    positionRoleESA: "Left winger",
    positionRoleEDA: "Right winger",
    positionRoleSP: "Second striker",
    positionRoleP: "Striker",
    positionRoleUnknown: "Position",
    // Position Confirmation
    confirmPositionChange:
      "${playerName} is ${originalPositions} original, but you are moving them to slot ${slotPosition}.\n\n${slotPosition} is NOT an original position.\nCompetence in ${slotPosition}: ${competence}\n${statsWarning}Do you still want to use them as ${slotPosition}? (Reduced performance)\n\nIf you confirm, you take responsibility and the system accepts the choice.",
    positionNotOriginal: "${slotPosition} is NOT an original position",
    positionOriginal: "Original position",
    // Duplicate Player Alert
    duplicatePlayerAlert:
      'Player "${playerName}"${playerAge} is already present:',
    duplicateInField: "In field at slot ${slotIndex}",
    duplicateInReserves: "In reserves (${count} duplicate/s)",
    deleteDuplicatesAndProceed: "Do you want to delete duplicates and proceed?",
    // Out of Role Alert (Drag & Drop)
    playersOutOfRoleAlert: "⚠️ Some players are out of role:\n\n",
    playerOutOfRoleLine:
      "- ${playerName}: ${originalPositions} original → ${newRole} (NOT original)",
    cannotPlayTheseRoles: "I don't think they can play these roles.",
    addCompetenceAndSave: "Do you want to add competence and save anyway?",
    // Duplicate Reserve Alert
    duplicateReserveAlert:
      'Player "${playerName}"${playerAge} is already present in reserves. Do you want to delete the duplicate in reserves?',
    // Duplicate in Formation Alert
    duplicateInFormationAlert:
      'Player "${playerName}"${playerAge} is already present in formation at slot ${slotIndex}. Do you want to replace them?',
    // Duplicate Reserve Replace Alert
    duplicateReserveReplaceAlert:
      'Player "${playerName}"${playerAge} is already present in reserves. Do you want to replace them with new data?',
    thisPlayer: "this player",
    duplicatePlayerTitle: "Duplicate Player",
    duplicateInFormationMessage:
      'Player "${playerName}"${playerAge} is already in formation at slot ${slotIndex}.',
    duplicateInFormationDetails:
      "Do you want to replace them with the new data?",
    formationValidationTitle: "Formation Validation",
    proceedAnyway: "Proceed Anyway",
    playersOutOfRoleTitle: "Players Out of Role",
    required: "Required",
    home: "Home",
    away: "Away",
    homeAwayLabel: "Did you play at home or away?",
    homeAwayHint:
      "Select if you played at home or away to correctly identify your team",
    // Missing Data Modal
    missingDataTitle: "Missing Data",
    missingDataDescription:
      "Some required data was not extracted from the photos. Enter it manually or reload the photos.",
    missingDataCompleteLater:
      "If you save anyway or only fill the required fields, you can complete the rest later: click on the player (on the pitch or in reserves) and in the detail screen upload the missing photos (Stats, Skills, Booster). Completion is always by uploading photos, not by filling in fields manually.",
    requiredFields: "Required Fields",
    optionalFields: "Optional Fields",
    enterValue: "Enter value...",
    enterValueOptional: "Optional...",
    retryUpload: "Retry Upload",
    saveAnyway: "Save Anyway",
    saveWithManualData: "Save with Manual Data",
    missingOptionalData: "Some optional data was not extracted",
    continueWithoutOptionalData:
      "Do you want to continue anyway? You can add them later.",
    // AI Knowledge Bar
    aiKnowledge: "AI Knowledge",
    aiKnowledgeLevel: "Level",
    aiKnowledgeBeginner: "Beginner",
    aiKnowledgeIntermediate: "Intermediate",
    aiKnowledgeAdvanced: "Advanced",
    aiKnowledgeExpert: "Expert",
    aiKnowledgeDescription: "We're learning to know you",
    aiKnowledgeDescriptionBeginner:
      "We're learning to know you: add your profile, roster and matches for advice that's really yours.",
    aiKnowledgeDescriptionIntermediate:
      "We know you fairly well: advice is already personalised. Add matches and goals to go further.",
    aiKnowledgeDescriptionAdvanced:
      "We know you well: advice reflects how you actually play.",
    aiKnowledgeDescriptionExpert:
      "Expert level: advice is highly tailored. More matches and usage help reach 100%.",
    aiKnowledgeProfile: "Profile",
    aiKnowledgeRoster: "Roster",
    aiKnowledgeMatches: "Matches",
    aiKnowledgePatterns: "Patterns",
    aiKnowledgeCoach: "Coach",
    aiKnowledgeUsage: "Usage",
    aiKnowledgeSuccess: "Successes",
    aiKnowledgeBadge: "AI COACH INSIGHT",
    poweredByCoachAI: "Powered by Coach AI Engine",
    aiKnowledgeBeginnerShort: "Start your journey",
    aiKnowledgeIntermediateShort: "Improving steadily",
    aiKnowledgeAdvancedShort: "High competence",
    aiKnowledgeExpertShort: "Master of the game",
    viewDetails: "View details",
    completeProfileToIncreaseKnowledge:
      "One more step: complete name, team and division. That way advice will be truly yours.",
    ctaNextStepProfile:
      "Your profile could use a bit more (name, team, division). Fill it in for tailored advice.",
    ctaNextStepProfileDetails:
      "Add more details in Profile settings (favourite team, hours per week, how to remember you) for even more tailored advice.",
    ctaNextStepRoster:
      "Add your roster and formation (11 starters): then we can talk about your actual players.",
    ctaNextStepMatches:
      "Add the matches you play: the more you add, the more advice reflects how you really play.",
    ctaNextStepPattern:
      "Add more matches: from those we derive formations and styles you use and what to work on.",
    ctaNextStepCoach:
      "Pick an active coach in the Coaches section: advice will take his style into account.",
    ctaNextStepUsage:
      "Use chat and AI features: the more you use them, the better we can help.",
    ctaNextStepSuccess:
      "Complete weekly goals: they raise the bar and show us how you're improving.",
    ctaNextStepCoachTraining:
      "Use the Coach Gym: tactical feedback sessions increase the knowledge the AI has about you.",
    aiKnowledgePatternsHint:
      "Formations and styles you use in matches and recurring issues: we derive them from the matches you add. They help us give more targeted advice.",
    aiKnowledgeSuccessHint:
      "Weekly goals completed, division and defence improvement (comparing your latest matches with earlier ones). They show your progress.",
    setupReminderIntro:
      "The more you complete the bar, the more advice is tailored to you.",
    setupReminderMissingCoach: "Coach",
    setupReminderMissingStats: "Game statistics",
    setupReminderMissingRoster: "Roster (11 starters)",
    setupReminderMissingRosterEmpty: "Upload your roster",
    setupReminderMissingRosterPartial: "Complete your roster",
    setupTipStatsRefresh:
      "Refresh game stats (2 photos) for more precise advice",
    setupTipCoachGymCheckin:
      "Do a Coach Gym check-in to keep AI guidance aligned",
    setupTipCoachReview: "Review coach and style to keep guidance consistent",
    setupTipRosterReview:
      "Review roster and roles to keep your tactical plan stable",
    setupReminderComplete: "Setup complete",
    setupReminderDismiss: "Dismiss",
    pwaInstallTitle: "Add Zero to Hero to Home screen",
    pwaInstallSubtitle:
      "Open the app from an icon on your phone, without the browser bar.",
    pwaInstallBenefit: "Quick access, full screen, same dashboard experience.",
    pwaInstallStepIos1: "Tap Share at the bottom (arrow icon)",
    pwaInstallStepIos2: "Scroll and choose “Add to Home Screen”",
    pwaInstallStepIos3: "Confirm — the “Zero to Hero” icon will appear on Home",
    pwaInstallStepAndroid1: "Tap the ⋮ menu (top right) or Share",
    pwaInstallStepAndroid2: "Choose “Add to Home screen” or “Install app”",
    pwaInstallStepAndroid3:
      "Confirm — the icon will appear on your Home screen",
    pwaInstallIosHint:
      "On iPhone use Safari: Chrome does not support Add to Home Screen.",
    pwaInstallCtaGotIt: "Got it",
    pwaInstallCtaInstall: "Install app",
    pwaInstallInstalling: "Installing…",
    pwaInstallRemindLater: "Remind me in a few days",
    pwaInstallDismiss: "Don’t show again",
    pwaInstallOpenManual: "Add to Home screen",
    setupStatusRosterMissing:
      "Upload your roster to start getting advice that is truly tailored to you.",
    setupStatusRosterPartial:
      "Your roster is there: complete it to make the advice more consistent.",
    setupStatusCritical:
      "A few setup steps are still missing before the advice becomes fully consistent.",
    setupStatusPartial:
      "Only a few details are missing to make the advice more precise.",
    setupStatusComplete:
      "Setup complete. Advice is based on the data you provided.",
    refreshAnalysis: "Refresh analysis",
    refreshAnalysisSuccess: "Analysis updated",
    refreshAnalysisRateLimit:
      "You can refresh the analysis at most 2 times per minute. Try again in {seconds} seconds.",
    // Credits bar (AI usage / subscription)
    creditsTitle: "AI Credits",
    creditsSubtitle:
      "Used for chat, match analysis, data extraction and countermeasures.",
    creditsUsed: "Used",
    creditsIncluded: "Included",
    creditsOverage: "Overage",
    creditsPeriod: "Period",
    creditsLoading: "Loading usage…",
    creditsError: "Unable to load credit usage.",
    creditsOverageHint:
      "Credits beyond your plan. They will be charged on a pay-as-you-go basis.",
    creditsViewAria: "View AI credits",
    creditsCloseAria: "Close credits",
    creditsTempBalance: "Temporary bonus",
    creditsTempExpiry: "Expire within 7 days of assignment",
    creditsPermanent: "credits",
    creditsTemporary: "temporary credits",
    heroPoints: "Hero Points",
    creditiResidui: "Remaining credits",
    acquista: "Purchase",
    gestioneProfilo: "Profile management",
    goToHeroPoints: "Go to Hero Points",
    editProfileData: "Edit profile data",
    attivitaRecente: "Recent activity",
    analisiTotali: "Total analyses",
    rankAttuale: "Current rank",
    membroDal: "Member since",
    vediTutteTransazioni: "See all transactions",
    acquistaCreditiCard: "Purchase credits",
    acquistaCreditiSubtitle: "Get Hero Points for analyses",
    personalizzaAvatar: "Customize avatar",
    personalizzaAvatarSubtitle: "Unlock exclusive avatars",
    acquistoCrediti: "Credit purchase",
    transactionUsage: "Usage",
    transactionAnalysis: "Analysis",
    noTransactionsYet: "No transactions yet.",
    retry: "Retry",
    errorLoadingUsage: "Error loading credits.",
    rankPlatinum: "PLATINUM",
    rankGold: "GOLD",
    rankSilver: "SILVER",
    rankBronze: "BRONZE",
    transactionTypeAssistantChat: "Assistant chat",
    transactionTypeExtractPlayer: "Player extraction",
    transactionTypeExtractCoach: "Coach extraction",
    transactionTypeExtractMatchData: "Match data extraction",
    transactionTypeGenerateCountermeasures: "Countermeasures",
    transactionTypeExtractFormation: "Formation extraction",
    transactionTypeExtractGameAnalysis: "Game statistics",
    transactionTypeAnalyzeMatch: "Match analysis",
    // Weekly Goals
    weeklyGoals: "Weekly Goals",
    noGoalsThisWeek: "No goals this week",
    goalsWillBeGenerated: "Goals will be automatically generated every Sunday",
    goalCompleted: "Goal completed",
    goalCompletedFeedback:
      "Goal completed! It contributes to the AI Knowledge bar.",
    goalFailed: "Goal failed",
    goalsIncreaseKnowledge:
      "Completing goals increases how well the AI knows you.",
    goalsContributeToBar:
      "Completing weekly goals helps us know you better: advice will be more targeted.",
    goalDifficultyEasy: "Easy",
    goalDifficultyMedium: "Medium",
    goalDifficultyHard: "Hard",
    viewAllGoals: "View all goals",
    currentWeek: "Current week",
    active: "active",
    notAuthenticated: "Not authenticated",
    failedToFetchTasks: "Failed to fetch tasks",
    errorLoadingTasks: "Error loading tasks",
    // Goal Descriptions
    goalCompleteMatches: "Complete at least {count} matches this week",
    goalCleanSheets: "Keep a clean sheet in at least {count} matches",
    goalUseRecommendedFormation:
      "Use the recommended formation in at least {count} match",
    goalUseAIRecommendations:
      "Use chat, match analysis or countermeasures at least {count} times this week",
    goalReduceGoalsConceded:
      "Reduce goals conceded by 20% (from {from} to {to} per match)",
    goalImprovePossession:
      "Improve ball possession by 10% (from {from}% to {to}%)",
    goalIncreaseWins: "Win at least {count} matches this week",
    goalImproveDefense:
      "Use a more defensive formation in at least {count} matches",
    // Leaderboard From Zero to Hero
    errorLoadingLeaderboard: "Error loading leaderboard.",
    classifica: "Leaderboard",
    classificaMensile: "Monthly leaderboard",
    fromZeroToHero: "From Zero to Hero",
    puntiCoach: "Coach Points",
    laTuaPosizione: "Your position",
    vediClassifica: "View leaderboard",
    giorniAllaFineMese: "Days left in month",
    comeSalire: "How to climb",
    comeSalireHint:
      'Points come from: complete matches, use of AI tools and full profile. Weekly tasks count for the "how much the AI knows you" bar, not for the leaderboard.',
    posizione: "Position",
    nickname: "Nickname",
    leaderboardConsent: "Include me in the monthly leaderboard",
    leaderboardConsentHint:
      "If enabled, your position and nickname will be visible in the From Zero to Hero leaderboard.",
    nicknamePlaceholder: "e.g. YourNick",
    nicknameHint:
      "Name shown on the leaderboard (optional). If empty, a dash will be shown.",
    leaderboardParticipant: "participant",
    leaderboardParticipants: "participants",
    punti: "Points",
    nonInClassifica: "Not on leaderboard",
    entraInClassifica:
      "Get on the leaderboard: complete at least 1 match this month and profile at 50% or above.",
    risultatiOttenuti: "Results",
    storicoClassifica: "Leaderboard history",
    iMieiPremi: "My prizes",
    daRiscattare: "To redeem",
    riscattato: "Redeemed",
    riscatta: "Redeem",
    nessunPremio: "No prizes to redeem.",
    breakdownPunti: "Points breakdown",
    daPartite: "From matches",
    daObiettivi: "From goals",
    daUtilizzoIA: "From AI usage",
    daProfilo: "From profile",
    daMiglioramento: "From improvement",
    prizeCoachFree: "Free coach",
    prizeCredits: "Free credits",
    prizeMatchTicket: "Match ticket",
    prizeStampa3d: "3D player print",

    // Palestra Coach Banner
    coachDataSettingsTitle: "Gaming Technical Data",
    coachDataSettingsDesc:
      "To edit platform, connection, passing level and weak point, use the Coach Gym.",
    openCoachGym: "Open Coach Gym",

    // Mission Center
    missionRosterTitle: "Complete Your Squad",
    missionRosterMsg:
      "You have {{current}}/11 starters. {{missing}} more needed!",
    missionRosterAction: "Add players",
    missionRosterChat:
      "I only have {{current}} players in my roster. Why should I complete it before playing?",
    missionFirstMatchTitle: "Ready for Debut?",
    missionFirstMatchMsg:
      "Your squad is ready. Upload your first match to unlock AI insights!",
    missionFirstMatchAction: "Upload match",
    missionFirstMatchChat:
      "I just completed my roster. What do you recommend for my first match?",
    missionProfileTitle: "Final Step: Profile",
    missionProfileMsg: "Add your weak point to get targeted advice.",
    missionProfileAction: "Complete profile",
    missionProfileChat:
      "I don't know what to put as weak point in my profile. Can you help me figure out my main problem?",
    missionAnalysisTitle: "eFootball Analysis",
    missionAnalysisMsg:
      "Upload the statistics screenshot for advanced analysis.",
    missionAnalysisAction: "Upload analysis",
    missionAnalysisChat:
      "What is the eFootball statistics analysis for? How do I find it in the game?",
    missionCompleteTitle: "All Missions Complete!",
    missionCompleteMsg:
      "You've completed everything! Now study countermeasures and refine your play.",
    missionCompleteAction: "Countermeasures",
    missionCompleteChat:
      "I've completed all initial missions. What do you recommend to improve my play further?",
    missionProgressLabel: "Progress",
    viewDetails: "View details",
    askCoach: "Ask Coach",
    completed: "completed",
    taskHelpMessage: "Help me with this goal: {{task}}",

    // Roadmap
    roadmapTitle: "Your Journey from Zero to Hero",
    roadmapSubtitle:
      "Every data point counts. The more you have, the more personalized the advice.",
    roadmapRosterTitle: "Build Your Squad",
    roadmapRosterShort: "11 starters + 5 subs",
    roadmapRosterDesc:
      "Without your players, AI doesn't know who you are. Upload photos, stats and positions to receive advice based on YOUR players, not generic ones.",
    roadmapRosterWhy:
      'The more squad data you have, the more AI can say "With Ronaldo up front, try this style" instead of "Try a fast striker".',
    roadmapFirstMatchTitle: "Play and Upload",
    roadmapFirstMatchShort: "Your first match",
    roadmapFirstMatchDesc:
      "One uploaded match is worth more than 1000 words. AI sees your formation, result, and stats.",
    roadmapFirstMatchWhy:
      "The first match activates basic analysis. AI starts understanding if you prefer home or away, if you attack more or defend.",
    roadmapProfileTitle: "Tell Us Who You Are",
    roadmapProfileShort: "Platform, connection, weak point",
    roadmapProfileDesc:
      "Console or PC? Got lag? Is defense your weak point? This data filters advice.",
    roadmapProfileWhy:
      'If you play PA1 and say "defense", AI suggests different tactics than if you play PA3 and say "attack". Real personalization.',
    roadmapMatchesTitle: "Build Your Story",
    roadmapMatchesShort: "3-5 matches for patterns",
    roadmapMatchesDesc:
      'With 3 matches AI sees patterns: "You always use 4-3-3 and lose to 5-3-2". With 5, advice becomes precise.',
    roadmapMatchesWhy:
      "3 matches = basic patterns (formation usage). 5 matches = advanced patterns (what works against what). 10+ = pro-level advice.",
    roadmapAnalysisTitle: "eFootball Analysis",
    roadmapAnalysisShort: "Game statistics",
    roadmapAnalysisDesc:
      "Upload the eFootball stats screenshot. Ball possession, successful passes, shots on goal.",
    roadmapAnalysisWhy:
      'Objective stats confirm or contradict your perceptions. "I think I pass well" vs "You have 65% successful passes".',
    roadmapPalestraTitle: "Coach Training",
    roadmapPalestraShort: "Feedback and conversation",
    roadmapPalestraDesc:
      'Tell AI how it went. "I followed your advice but lost". This adapts future advice.',
    roadmapPalestraWhy:
      "Each Coach Training session increases AI knowledge by 10%. After 4 sessions, AI knows you like a real coach.",
    roadmapMasteryTitle: "Master",
    roadmapMasteryShort: "Zero to Hero",
    roadmapMasteryDesc:
      "You have 10+ matches, complete profile, use Coach Training. AI knows your patterns, weaknesses, strengths.",
    roadmapMasteryWhy:
      'At this level, advice is 90% specific. "In your 4-3-3 with that connection, against 5-3-2 use this approach".',
    current: "Current",
    whyImportant: "Why it matters:",
    continue: "Continue",
    completed: "Completed",
    inProgress: "In Progress",
    locked: "Locked",
    viewFullRoadmap: "View Full Roadmap",
    roadmapMiniTitle: "Your Journey",

    // Onboarding Flow
    onboardingTitle: "How it works",
    onboardingSubtitle: "Discover how to improve with your AI Coach",
    onboardingKeyMessage: "The more you use me seriously, the more I help you",
    onboardingStep1Title: "Pre-match",
    onboardingStep1Desc:
      "Create tactical countermeasures by analyzing the opponent formation before the match",
    onboardingStep2Title: "After the match",
    onboardingStep2Desc:
      "Add the match and upload screenshots for detailed analysis",
    onboardingStep3Title: "Analysis",
    onboardingStep3Desc:
      "Tell us about your experience in the Coach Gym for personalized feedback",
    onboardingStep4Title: "Improve",
    onboardingStep4Desc: "Ask the AI Chat for advice to improve your game",
    onboardingStep5Title: "Live Coach",
    onboardingStep5Desc:
      "Talk directly to your AI Coach in real-time for immediate advice before matches",
    onboardingStart: "Start now!",
    onboardingNext: "Next",
    onboardingClose: "Close",

    // Onboarding Formation
    formationOnboardingTitle: "How it works",
    formationOnboardingKeyTitle: "Your formation is fundamental",
    formationOnboardingKeySubtitle:
      "Discover how to upload and manage your squad in a few steps",
    formationStep1Title: "Upload your formation",
    formationStep1Desc:
      "For each player upload 3 photos: stats, skills and boosters. AI will automatically extract the data.",
    formationStep2Title: "Manual entry",
    formationStep2Desc:
      "If AI doesn't recognize a player, you can enter it manually. Always check extracted data before saving.",
    formationStep3Title: "Possible errors",
    formationStep3Desc:
      "Blurry, cropped or different graphic screenshots can cause errors. Make sure player names and stats are readable.",
    formationStep4Title: "Save positions",
    formationStep4Desc:
      "Check that each player is in the correct position. Once saved, the system will use this data for all future analysis.",
    formationStep5Title: "Customize positions",
    formationStep5Desc:
      "Activate 'Customize' mode to drag players on the field. Useful if you want to simulate different tactical layouts.",
    formationOnboardingStart: "Start now!",
    formationOnboardingTutorialLink:
      "Want specific instructions and tips? Click here",
    starterPackImportCta: "Import a test formation",
    starterPackImportLoading: "Importing...",
    starterPackEmptyMessage:
      "You can now try the app right away and test all its features, including the coach. But remember: this is not your real formation. To receive truly personalized advice, upload your squad.",
    starterPackPartialMessage:
      "We will keep the players you already added and automatically complete only what is missing.",
    starterPackDismiss: "Hide test formation prompt",
    starterPackImportSuccess: "Test formation imported successfully.",
    starterPackFillSuccess: "We automatically completed what was missing.",
    starterPackImportError:
      "Unable to import the test formation. Please try again shortly.",
    nuovaRosaPrivateLab: "Private lab",
    nuovaRosaTitle: "New Roster",
    nuovaRosaOpenCurrent: "Open current roster page",
    nuovaRosaStatusLabel: "Your roster in progress",
    nuovaRosaPlayers: "Players",
    nuovaRosaStarters: "Starters",
    nuovaRosaFormation: "Formation",
    nuovaRosaWorkspace: "Formation workspace",
    nuovaRosaReserves: "Reserves",
    nuovaRosaNoReserves: "No reserves yet.",
    nuovaRosaLoading: "Loading roster...",
    nuovaRosaStageEmptyTitle: "Start your roster with real cards",
    nuovaRosaStageEmptyText:
      "Click a slot to open the official catalog. Complete your roster with less friction while keeping every player editable.",
    nuovaRosaStageEmptyCta: "Import starter pack",
    nuovaRosaStageSeededTitle: "You already have a base",
    nuovaRosaStageSeededText:
      "Complete missing slots from the catalog, then refine roles, reserves, and player details.",
    nuovaRosaStageSeededCta: "Complete missing players",
    nuovaRosaStagePartialTitle: "Roster in progress",
    nuovaRosaStagePartialText:
      "Add starters from the field, then refine reserves, tactics, and player cards.",
    nuovaRosaStageFormationReadyTitle: "Formation ready",
    nuovaRosaStageFormationReadyText:
      "You have the starting eleven. Add coach and tactics for a more complete system read.",
    nuovaRosaStageSystemReadyTitle: "System ready",
    nuovaRosaStageSystemReadyText:
      "Your roster, formation, and tactical context are aligned.",
    nuovaRosaSelectOfficialSkill: "Select official skill",
    nuovaRosaChooseOfficialSkill: "Choose from eFootball skills",

    // Coach Suggestions
    coachSuggestionLabel: "Your coach is with you",
    coachSuggestionCriticalTitle: "Let's stay in sync",
    coachSuggestionCriticalMessage:
      "The more you keep me updated on your game, the better I can help you. If you want, we can start from your stats.",
    coachSuggestionCriticalMessageWithMatches:
      "You already did a great job saving matches. If you add your stats too, my guidance becomes even more tailored to you.",
    coachSuggestionPostMatchTitle: "Quick post-match check",
    coachSuggestionPostMatchMessage:
      "Tell me how it went. Even a short debrief helps me understand what to reinforce and what to fix right away.",
    coachSuggestionFirstTimeTitle: "Let's start strong together",
    coachSuggestionFirstTimeMessage:
      "If you share a bit of your stats, I can understand you faster and guide you with more useful suggestions from the start.",
    coachSuggestionCoachMissingTitle: "Add your coach when you are ready",
    coachSuggestionCoachMissingMessage:
      "With an active coach, guidance follows your team style better. You can add it now or do it later.",
    coachSuggestionPalestraTitle: "Ready for a quick update?",
    coachSuggestionPalestraMessage:
      "A short stop in Coach Gym helps me stay aligned with you and give more precise guidance over time.",
    coachSuggestionActionSetup: "Open overview",
    coachSuggestionActionStats: "Update my stats",
    coachSuggestionActionCoaches: "Open Coaches",
    coachSuggestionActionPalestra: "Open Coach Gym",
    coachSuggestionLater: "Later",
    notVisible: "Not visible",
    fluidFormation: "Fluid Formation",
    fluidFormationHelp: "Same 11 starters, different shape in attack and defence. Your main formation stays unchanged.",
    fluidFormationToggle: "Do you use it in eFootball?",
    fluidFormationToggleHint: "If not, Hero keeps using your normal formation.",
    fluidAttack: "Attack",
    fluidDefense: "Defence",
    fluidCopyBase: "Copy base",
    fluidCopyOther: "Copy other phase",
    fluidNeedStarters: "You need a saved formation and 11 starters. Fluid Formation does not create a second squad.",
    fluidSaved: "Fluid Formation saved. Hero now knows Attack and Defence.",
    fluidDisabled: "Fluid Formation turned off. The setup is kept.",
    fluidSave: "Save Fluid Formation",
    fluidSaveError: "Could not save Fluid Formation.",
    fluidLoadError: "Unable to load Fluid Formation.",
    fluidPitchHelp: "Drag the starters into the Game Plan positions and set the role for that phase. Starters do not change.",
    coachLinkUps: "Manager Link-up Plays",
    coachLinkUpsHelp: "Some v6 managers have up to two Link-up Plays. Save only what is visible on the card.",
    coachLinkUpsNoCoach: "Set an active manager first.",
    coachLinkUpsNeedScreenshot: "Upload at least one Link-up screenshot.",
    coachLinkUpsRead: "Read Link-ups (2 HP)",
    coachLinkUpsReading: "Hero is reading...",
    coachLinkUpsReadError: "Could not read Link-ups.",
    coachLinkUpsReadDone: "Read complete: {{count}} Link-up(s). Check and save.",
    coachLinkUpsSaved: "Link-ups saved. Hero evaluates each one against your starting XI.",
    coachLinkUpsSave: "Save Link-ups",
    coachLinkUpsSaveError: "Could not save Link-ups.",
    coachLinkUpsLoadError: "Unable to load Link-ups.",
    coachLinkUpsSlot1: "First Link-up",
    coachLinkUpsSlot2: "Second Link-up, if present",
    coachLinkUpsCost: "1 or 2 screens in a single analysis: 2 HP.",
    coachLinkUpsEmpty: "No Link-up to save. If the manager has none, leave this empty.",
    opponentFluidToggle: "Opponent Fluid Formation",
    opponentFluidToggleHint: "No: one photo, same as always. Hero starts automatically.",
    opponentFluidNeedBoth: "Both photos are required. Hero starts automatically when Attack and Defence are ready.",
    opponentFluidMissingSecond: "A photo is missing. Add it, or switch Fluid Formation back to NO.",
    opponentAttackPhase: "Attack",
    opponentDefensePhase: "Defence",
    v6PhaseAnalysis: "Attack and defence matchup",
    v6FluidDecision: "Fluid Formation decision",
    v6LinkUpPlan: "Link-ups for this match",
    v6Use: "USE",
    v6DoNotUse: "DO NOT USE",
    v6NotActivatable: "NOT ACTIVATABLE",
    v6InsufficientData: "INSUFFICIENT DATA",
    maxThreeCoachPhotos: "Maximum 3 photos: coach card and up to 2 Link-ups",
    maxThreeCoachPhotosFormat: "Card + up to 2 Link-ups • JPG, PNG",
    coachCardRequired: "Upload the coach card to continue.",
  },
  es: {
    // Sidebar
    guide: "Guía",
    dashboard: "Panel",
    coachAI: "Coach AI",
    profile: "Perfil",
    yourSquad: "Tu plantilla",
    matchHistory: "Historial de Partidos",
    charts: "Gráficos",
    countermeasures: "Contramedidas",
    videoTutorials: "Videotutoriales",
    videoTutorialsSubtitle: "Guías rápidas en YouTube",
    videoTutorialRoster: "Tutorial de plantilla",
    videoTutorialCoachGym: "Tutorial de gimnasio coach",
    watchOnYoutube: "Ver en YouTube",
    logout: "Cerrar sesión",
    toggleMenu: "Abrir/cerrar menú",
    appName: "From Zero to Hero",
    prelaunchAccessBadge: "Acceso privado antes del lanzamiento público",
    prelaunchThanksTitle: "Gracias por registrarte.",
    prelaunchAccountCreated:
      "Tu cuenta se ha creado correctamente. El acceso público a la plataforma aún no está abierto.",
    prelaunchReservedAccessText:
      "En esta fase, el acceso completo está reservado a colaboraciones seleccionadas y acuerdos comerciales mediante códigos dedicados.",
    prelaunchFeatureMatchesTitle: "Análisis de partidos",
    prelaunchFeatureMatchesText:
      "Una lectura más clara de los partidos, del contexto y de lo que realmente importa para mejorar.",
    prelaunchFeatureSquadTitle: "Gestión de plantilla y formación",
    prelaunchFeatureSquadText:
      "Un espacio estructurado para trabajar sobre jugadores, roles, posición y organización del equipo.",
    prelaunchFeatureCoachTitle: "Coach AI",
    prelaunchFeatureCoachText:
      "Un soporte construido para acompañarte con lógica, continuidad y personalización.",
    prelaunchFeatureCounterTitle: "Contramedidas y lectura táctica",
    prelaunchFeatureCounterText:
      "Indicaciones más útiles para preparar los partidos y razonar mejor sobre las decisiones de juego.",
    prelaunchCodeBadge: "Código de acceso dedicado",
    prelaunchCodeTitle: "¿Ya has recibido un código de acceso?",
    prelaunchCodeText:
      "Si has recibido un código reservado, introdúcelo aquí para desbloquear la plataforma completa para esta sesión.",
    prelaunchCodePlaceholder: "Introduce el código de acceso",
    prelaunchCodeButton: "Desbloquear acceso",
    prelaunchCodeButtonLoading: "Desbloqueando el acceso...",
    prelaunchCodeHint:
      "Estos códigos de acceso anticipado están reservados a socios comerciales seleccionados y colaboraciones dedicadas.",
    prelaunchInsideTitle: "¿Qué encontrarás dentro?",
    prelaunchInsideText:
      "Una plataforma pensada para unir lectura de partidos, estructura de la plantilla, contexto táctico y soporte AI en un único entorno de trabajo serio.",
    prelaunchVisionAlt: "Visión de la plataforma",
    prelaunchNoCodeTitle: "¿Aún no tienes un código?",
    prelaunchNoCodeText:
      "Tu registro ya es válido. El acceso público se habilitará en la apertura oficial de la plataforma, mientras que los códigos reservados siguen dedicados a los accesos comerciales anticipados seleccionados.",
    prelaunchControlPanelButton: "Ir al panel de control",
    prelaunchCodeEnterError: "Introduce el código de acceso que has recibido.",
    prelaunchCodeUnlockError: "No se pudo desbloquear el acceso.",
    prelaunchCodeUnlocked:
      "Acceso desbloqueado. Te estoy llevando a la plataforma...",
    prelaunchCodeInvalid: "Código de acceso no válido.",
    prelaunchGateCheckingTitle: "Verificando acceso...",
    prelaunchGateCheckingText: "Estoy preparando tu sesión.",
    loginSuccessKicker: "Zero to Hero",
    loginSuccessCompletingTitle: "Desbloqueando tu Coach AI",
    loginSuccessCompletingStatus:
      "Verifico el acceso y preparo plantilla, análisis y consejos a medida para ti.",
    loginSuccessDoneTitle: "Estás oficialmente dentro",
    loginSuccessDoneStatus:
      "En un momento estás en el panel: partidos, plantilla y tu ventaja competitiva te esperan.",
    loginSuccessTipLabel: "Mientras entras",
    loginSuccessTips: [
      "Carga la plantilla: el Coach te da consejos reales, no teoría genérica.",
      "Después de cada partido guarda resultado y valoraciones para desbloquear contramedidas pre-partido.",
      "Card Advisor te dice si una carta vale los créditos — antes de gastarlos.",
      "Chat Coach (2 HP): preguntas precisas sobre formación, estilo y los jugadores que usas de verdad.",
    ],
    loginSuccessErrorKicker: "Acceso",
    loginSuccessFailedTitle: "No pudimos entrar",
    loginSuccessFailed: "Acceso fallido. Inténtalo de nuevo en breve.",
    loginSuccessFailedStatus:
      "Te llevo de vuelta al inicio de sesión: revisa email y enlace, luego inténtalo de nuevo.",
    loginSuccessGenericError: "Ha ocurrido un problema. Inténtalo de nuevo.",
    loginSuccessBackToLogin: "Volviendo a la página de inicio de sesión...",
    magiclinkCompleting: "Completando acceso",
    magiclinkPreparing: "Configurando tu sesión...",
    magiclinkDone: "Acceso completado",
    magiclinkRedirecting: "Redirigiendo...",
    magiclinkFailed: "Acceso fallido",
    magiclinkBackToLogin: "Volver al inicio de sesión",
    loadingSimple: "Cargando...",

    // Dashboard
    roster: "Roster",
    yourPlayers: "Tus jugadores",
    viewPlayers: "Ver Jugadores",
    manageCollection: "Gestiona tu colección",
    squadOverview: "Vista general del equipo",
    yourSquad: "Tu plantilla",
    squadSlots: "Plantilla (21 slots)",
    startersAndBench: "Titulares y banquillo",
    tacticalGoals: "Objetivos Tácticos Abiertos",
    goals: "Objetivos",
    comingSoon: "Próximamente...",
    userProfile: "Perfil de Usuario",
    anonymousUser: "Usuario Anónimo",
    masterLevel: "Nivel Máster",
    aiKnowledge: "Conocimiento AI",
    high: "Alta",
    matchInsights: "Insight de Partido",
    analysis: "Análisis",
    quickLinks: "Enlaces Rápidos",
    navigation: "Navegación",
    total: "Total",
    topPlayers: "Top Jugadores",
    aiInsights: "Insight AI",
    aiInsightsPlaceholder: "Insights y sugerencias AI se mostrarán aquí",
    aiInsightsNoData:
      "Carga tus partidos para obtener información sobre tus patrones tácticos y recibir consejos personalizados.",
    formationUsage: "Formaciones más usadas",
    playingStyleUsage: "Estilos de juego más usados",
    recurringIssues: "Problemas recurrentes",
    matches: "partidos",
    winRate: "victorias",
    frequency: "Frecuencia",
    severity: "Severidad",
    manageFormation: "Gestionar Formación",
    home: "Casa",
    away: "Fuera de Casa",
    homeAwayLabel: "¿Has jugado en casa o fuera?",
    homeAwayHint:
      "Selecciona si has jugado en casa o fuera para identificar correctamente tu equipo",
    required: "Obligatorio",
    players: "Jugadores",
    squadBuilder: "Constructor de Equipo",
    dataAnalytics: "Datos y Análisis",
    memoryHub: "Hub de Memoria",
    coaching: "Entrenamiento",
    memoryInsights: "Insight de Memoria",
    aiLearning: "Aprendizaje AI",
    startSession: "Iniciar Sesión",
    opponentFormation: "Formación Rival",
    analyzeOpponent: "Analizar formación rival para contramedidas",
    strugglesCoachingPress: "Dificultad en la presión",
    reluctantChangeFormation: "Reacio a cambiar de formación",
    prefersQuickTips: "Prefiere consejos rápidos y prácticos",
    strugglesHighPress: "Dificultad contra la presión alta",

    // Palestra Coach
    palestraCoachTitle: "Gimnasio Coach",
    palestraCoachDesc: "Cuéntame tu experiencia de juego",
    saveAndClose: "Guardar y cerrar",
    coachFeedbackSaved: "¡Feedback guardado!",
    coachFeedbackSaving: "Guardando...",

    // Informazioni IA
    aiInfoTitle: "Información IA",
    aiInfoDescription:
      "Completa estas preguntas para ayudar a la IA a darte consejos más específicos. Todo opcional.",
    aiInfoSectionConnection: "Juego y conexión",
    aiInfoSectionContext: "Contexto y preferencias",
    aiInfoSectionNames: "Cómo te llamas / cómo llamar a la IA",
    aiInfoSectionNotes: "Notas para la IA",
    aiInfoConnectionQuality: "Conexión: ¿buena o a menudo lag/retrasos?",
    aiInfoConnectionGood: "Buena",
    aiInfoConnectionUnstable: "A veces inestable",
    aiInfoConnectionLag: "A menudo lag",
    aiInfoSlowOpponent: "¿Dificultad contra rivales con conexión lenta?",
    aiInfoInputDelay: "¿Tienes a menudo retraso de input?",
    aiInfoYes: "Sí",
    aiInfoNo: "No",
    aiInfoSometimes: "A veces",
    aiInfoPassLevel: "Nivel de pases (PA)",
    aiInfoPA1: "PA1",
    aiInfoPA2: "PA2",
    aiInfoPA3: "PA3",
    aiInfoSmartAssist: "¿Usas el smart assist?",
    aiInfoPlatform: "¿En qué plataforma juegas?",
    aiInfoPlatformConsole: "Consola",
    aiInfoPlatformPC: "PC",
    aiInfoPlatformMobile: "Móvil",
    aiInfoPlatformOther: "Otro",
    aiInfoDivision: "¿En qué división juegas?",
    aiInfoHoursPerWeek: "Horas de juego a la semana",
    aiInfoFavouritePlayer: "Jugador favorito (en plantilla)",
    aiInfoWeakPoint: "¿Qué te hace perder más a menudo?",
    aiInfoWeakPointDefence: "Defensa",
    aiInfoWeakPointAttack: "Ataque",
    aiInfoWeakPointSetPieces: "A balón parado",
    aiInfoWeakPointTransitions: "Transiciones",
    aiInfoWeakPointFinalMinutes: "Final del partido",
    aiInfoLearnGoals: "¿Qué te gustaría aprender de nosotros?",
    aiInfoFirstName: "¿Cómo quieres que te llamemos?",
    aiInfoAiName: "¿Cómo quieres llamar a la IA?",
    aiInfoNotes: "Notas para la IA (opcional)",
    aiInfoSave: "Guardar información",
    aiInfoSaved: "Información guardada",
    aiInfoError: "Error al guardar",
    aiInfoHintInProfile:
      'Para horas de juego, conexión y contexto para la IA usa el botón "Información IA" en el panel.',

    // Statistiche di gioco
    gameAnalysisTitle: "Estadísticas de juego",
    gameAnalysisDescription:
      "Carga las capturas de pantalla de Análisis (últimos 10 partidos) para consejos y tareas personalizadas.",
    gameAnalysisUpload: "Cargar análisis",
    gameAnalysisUploadHint:
      "Carga las 2 pantallas de Análisis: cada slot corresponde a una pantalla. Si cargas solo una, está bien: los datos se guardan igualmente.",
    gameAnalysisSlot1: "Tipo de gol, Disparo, Comandos especiales",
    gameAnalysisSlot1Desc: "Primera pantalla de Análisis (gráfico circular + barras)",
    gameAnalysisSlot2: "Pase, Regate, Defensa",
    gameAnalysisSlot2Desc:
      "Segunda pantalla de Análisis (barras de pase/regate/defensa)",
    gameAnalysisSlotMissing: "No cargada",
    gameAnalysisLastCapture: "Último análisis",
    gameAnalysisAnalyzing: "Análisis en curso…",
    gameAnalysisSuccess: "Análisis guardado.",
    gameAnalysisError: "Error durante el guardado.",
    gameAnalysisRetryOne: "Si has cargado 2 imágenes, inténtalo de nuevo con una sola.",
    gameAnalysisChooseFile: "Cargar",
    gameAnalysisNoImage: "Ninguna imagen seleccionada",
    gameAnalysisScreensLabel: "pantallas",
    chartsAndComparisonTitle: "Gráficos y comparación",
    chartsAndComparisonSubtitle: "Tu perfil respecto a la referencia top",
    chartsAndComparisonOverview: "Vista general",
    chartsAndComparisonDetail: "Detalle por categoría",
    chartsAndComparisonEmpty:
      "Para ver tu perfil y la comparación con los top, completa las Estadísticas de juego.",
    chartsAndComparisonCta: "Completar Estadísticas de juego",
    chartsAndComparisonAskCoach: "Preguntar al coach",
    chartsAndComparisonAskCoachContext:
      "Me gustaría un consejo sobre mis gráficos y la comparación con la referencia top.",
    chartsAndComparisonYou: "Tú",
    chartsAndComparisonTop: "Referencia top",
    chartsAndComparisonDesc:
      "Visualiza la evolución de tu equipo, las formaciones más eficaces, y compara las estadísticas clave de tus últimos partidos.",
    chartsAndComparisonCtaButton: "Ir a Gráficos y Análisis de Datos",
    chartsCategoryShot: "Disparo",
    chartsCategoryPassing: "Pase",
    chartsCategoryDribbling: "Regate",
    chartsCategoryDefense: "Defensa",
    chartsCategorySpecialCommands: "Comandos especiales",

    // Rosa
    squad: "Plantilla",
    uploadScreenshots: "Cargar Capturas",
    dragDropHint:
      "Arrastra aquí o haz clic. Puedes cargar 2 o 3 fotos por jugador, incluso mezcladas.",
    imagesLoaded: "Imágenes cargadas",
    analyzeBatch: "Analizar lote",
    analyzing: "Análisis…",
    reset: "Reset",
    slot: "Slot",
    starters: "Titulares",
    bench: "Banquillo",
    insertPlayer: "Insertar este jugador",
    saveToSupabase: "Guardar en Supabase",
    slotSelected: "slot seleccionado",
    name: "Nombre",
    role: "Rol",
    card: "Carta",
    team: "Equipo",
    boosters: "Boosters",
    missing: "Falta",
    missingData: "Datos Faltantes",
    missing_detailed_stats_table: "Estadísticas Detalladas",
    missing_skills_screen: "Pantalla de Habilidades",
    missing_additional_positions_screen: "Posiciones Adicionales",
    missing_stats_screen: "Pantalla de Estadísticas",
    missing_boosters_screen: "Pantalla de Boosters",
    missing_profile_screen: "Pantalla de Perfil",
    myPlayers: "Mis Jugadores",
    playersSaved: "jugadores guardados",
    loading: "Cargando...",
    notFoundTitle: "404",
    notFoundMessage: "Página no encontrada.",
    noPlayersSaved: "Ningún jugador guardado",
    uploadScreenshotsToSee:
      "Carga capturas y guarda jugadores para verlos aquí",
    listaGiocatori: "Lista de Jugadores",
    takePhoto: "Tomar Foto",
    cameraCaptureTitle: "Tomar foto",
    cameraCaptureButton: "Capturar",
    cameraClose: "Cancelar",
    cameraNotAvailable: "Cámara no disponible o permiso denegado.",
    cameraCaptureFailed: "Captura fallida. Inténtalo de nuevo.",
    cameraStarting: "Iniciando cámara…",
    extractData: "Extraer Datos",
    extracting: "Extrayendo...",
    savePlayer: "Guardar Jugador",
    removePhotos: "Quitar Fotos",
    details: "Detalles",
    hide: "Ocultar",
    edit: "Editar",
    complete: "Completo",
    incomplete: "Incompleto",
    missingFields: "Falta",
    nationality: "Nacionalidad",
    physical: "Físico",
    age: "Edad",
    form: "Forma",
    skills: "Habilidades",
    // Caratteristiche giocatore
    weakFoot: "Pierna Mala",
    weakFootFrequency: "Frecuencia Pierna Mala",
    weakFootAccuracy: "Precisión Pierna Mala",
    formDetailed: "Forma Detallada",
    injuryResistance: "Resistencia a Lesiones",
    aiPlaystyles: "Estilos de Juego IA",
    additionalPositions: "Posiciones Adicionales",
    // Valori caratteristiche
    rarely: "Raramente",
    sometimes: "A Veces",
    often: "A Menudo",
    high: "Alta",
    medium: "Media",
    low: "Baja",
    unbreakable: "Inquebrantable",
    stable: "Estable",
    inconsistent: "Inestable",
    // Valori form
    b: "B",
    a: "A",
    c: "C",
    d: "D",
    e: "E",
    resetMyData: "Resetear mis datos Supabase",
    // Edit Player Data
    completeData: "Completar Datos",
    missingDataSection: "Datos Faltantes",
    addMissingData: "Añadir Datos Faltantes",
    editPlayerData: "Editar Datos del Jugador",
    close: "Cerrar",
    save: "Guardar",
    saving: "Guardando...",
    saved: "Datos guardados",
    statsDetails: "Estadísticas Detalladas",
    attacking: "Ataque",
    defending: "Defensa",
    athleticism: "Fuerza",
    physicalData: "Datos Físicos",
    height: "Altura",
    weight: "Peso",
    teamName: "Nombre del Equipo",
    nationalityCountry: "Nacionalidad",
    playingStyle: "Estilo de Juego",
    playerSkills: "Habilidades del Jugador",
    addSkill: "Añadir Habilidad",
    removeSkill: "Quitar",
    additionalSkills: "Habilidades Adicionales",
    addAdditionalSkill: "Añadir Habilidad",
    aiPlaystylesList: "Estilos de Juego IA",
    addPlaystyle: "Añadir Estilo",
    additionalPositionsList: "Posiciones Adicionales",
    addPosition: "Añadir Posición",
    boostersList: "Boosters",
    addBooster: "Añadir Booster",
    boosterName: "Nombre del Booster",
    boosterEffect: "Efecto",
    boosterCondition: "Condición de Activación",
    characteristics: "Características",
    weakFootFrequencyLabel: "Frecuencia Pierna Mala",
    weakFootAccuracyLabel: "Precisión Pierna Mala",
    formDetailedLabel: "Forma Detallada",
    injuryResistanceLabel: "Resistencia a Lesiones",
    cm: "cm",
    kg: "kg",
    years: "años",
    saved: "Guardado en Supabase",
    resetSuccess: "Datos Supabase reseteados para este usuario anónimo",
    error: "Error",
    errorServer: "Error del servidor",
    thisCoach: "este entrenador",
    manualEntryInstead: "Introducción manual",
    playerNameRequired: "Nombre del jugador obligatorio",
    positionRequired: "Posición obligatoria",
    editPlayer: "Editar Jugador",
    newPlayer: "Nuevo Jugador",
    completeOrEditData: "Completar o editar datos",
    manualEntry: "Introducción manual",
    playerNameLabel: "Nombre del jugador *",
    positionLabel: "Posición *",
    placeholderPlayerNameExample: "ej. Kylian Mbappé",
    placeholderYourName: "Tu nombre",
    placeholderTeamExample: "Ej: Naturalborngamers.it, AC Milan...",
    appTitle: "From Zero to Hero - eFootball AI Coach",
    appDescription:
      "Coach AI para eFootball: plantilla, partidos, análisis y consejos tácticos personalizados.",
    saveFailed: "Guardado fallido",
    errorSaveFormation: "Error al guardar la formación",
    loadingShort: "Cargando...",
    matchNotFoundOrDenied: "Partido no encontrado o acceso denegado",
    unknownPlayer: "Desconocido",
    yourCoachAI: "Tu Coach AI",
    creditsAndGuideAria: "Créditos y guía",
    backToDashboard: "Panel Principal",
    backToSquad: "Plantilla",

    // Authentication
    login: "Iniciar sesión",
    signup: "Regístrate",
    logout: "Cerrar sesión",
    email: "Email",
    password: "Contraseña",
    emailPlaceholder: "tu@email.com",
    passwordPlaceholder: "Mínimo 6 caracteres",
    loginDescription: "Inicia sesión para guardar tus datos permanentemente",
    signupDescription: "Crea una cuenta para guardar tu plantilla y perfil",
    emailPasswordRequired: "Email y contraseña son obligatorios",
    loginError: "Error durante el inicio de sesión",
    signupError: "Error durante el registro",
    loginSuccess: "¡Inicio de sesión exitoso!",
    signupSuccess: "¡Registro completado!",
    forgotPassword: "¿Contraseña olvidada?",
    forgotPasswordTitle: "Recuperar contraseña",
    forgotPasswordDescription:
      "Introduce el email de la cuenta. Te enviaremos un enlace para restablecer la contraseña.",
    sendResetLink: "Enviar enlace",
    resetLinkSent:
      "Si el email está registrado, recibirás en breve un enlace para restablecer la contraseña. Revisa también el spam.",
    resetPasswordTitle: "Nueva contraseña",
    resetPasswordDescription: "Elige una nueva contraseña (mínimo 6 caracteres).",
    newPasswordPlaceholder: "Nueva contraseña",
    setNewPassword: "Establecer contraseña",
    passwordUpdated: "Contraseña actualizada. Redirigiendo al inicio de sesión...",
    resetPasswordError: "Error durante la recuperación de contraseña.",
    resetLinkExpired:
      "Enlace no válido o caducado. Solicita un nuevo enlace desde la página Recuperar contraseña.",
    confirmPassword: "Confirmar contraseña",
    passwordsDoNotMatch: "Las contraseñas no coinciden.",
    backToLogin: "Volver al inicio de sesión",
    loggingIn: "Iniciando sesión...",
    signingUp: "Registrando...",
    retryInSeconds: "Inténtalo de nuevo en {{n}} s",
    noAccountSignup: "¿No tienes cuenta? Regístrate",
    hasAccountLogin: "¿Ya tienes cuenta? Inicia sesión",
    continueAsGuest: "Continuar como invitado",
    supabaseNotAvailable: "Supabase no disponible",
    unexpectedError: "Error inesperado",
    loggedInAs: "Conectado como",

    // Statistics translations
    offensive_awareness: "Comportamiento Ofensivo",
    ball_control: "Control de Balón",
    dribbling: "Regate",
    tight_possession: "Posesión Estrecha",
    low_pass: "Pase Raso",
    lofted_pass: "Pase Alto",
    finishing: "Finalización",
    heading: "Juego de Cabeza",
    place_kicking: "Tiros Libres",
    curl: "Tiro con Efecto",
    defensive_awareness: "Comportamiento Defensivo",
    defensive_engagement: "Implicación Defensiva",
    tackling: "Entrada",
    aggression: "Agresividad",
    goalkeeping: "Comportamiento POR",
    gk_catching: "Agarre POR",
    gk_parrying: "Parada POR",
    gk_reflexes: "Reflejos POR",
    gk_reach: "Estirada POR",
    speed: "Velocidad",
    acceleration: "Aceleración",
    kicking_power: "Potencia de Tiro",
    jump: "Salto",
    physical_contact: "Contacto Físico",
    balance: "Control Corporal",
    stamina: "Resistencia",

    // Opponent Formation
    opponentFormationTitle: "Formación Rival",
    opponentFormationSubtitle:
      "Carga captura de la formación rival para análisis y contramedidas",
    backToDashboardBtn: "Volver al Panel",
    dragScreenshotHere: "Arrastra la captura aquí",
    orClickToSelect: "o haz clic para seleccionar",
    uploadedScreenshot: "Captura Cargada",
    extractFormation: "Extraer Formación",
    formationExtractedSuccess: "Formación extraída correctamente",
    playersDetected: "jugadores detectados",
    formation: "Formación",
    overallStrength: "Fuerza Total",
    tacticalStyle: "Estilo Táctico",
    team: "Equipo",
    formationNameOptional: "Nombre de la formación (opcional)",
    saveFormation: "Guardar Formación",
    formationSaved: "Formación rival guardada",
    saveError: "Error al guardar",
    playersDetectedFromScreenshot: "Jugadores Detectados de la Foto",
    verifyPlayersRead:
      "Verifica que todos los jugadores se hayan leído correctamente",
    goalkeeper: "Portero",
    defense: "Defensa",
    midfield: "Mediocampo",
    attack: "Ataque",
    substitutes: "Suplentes",
    reserves: "Reservas",
    loadAnotherFormation: "Cargar Otra Formación",
    extractionError: "Error de extracción",
    invalidAuthToken:
      "Token de autenticación no válido. Recarga la página e inténtalo de nuevo.",
    completeness: "Completitud",
    identity: "Identidad",
    stats: "Stats",
    skills: "Habilidades",
    boosters: "Boosters",
    complete: "Completo",
    incomplete: "Incompleto",
    processingImage: "Procesando imagen",
    of: "de",
    multiPlayerDetected: "Detectados jugadores diferentes",
    loadSamePlayer:
      "Carga 1-3 capturas del mismo jugador para tener datos completos",
    missingStatsPhoto: "Carga captura con estadísticas detalladas",
    missingSkillsPhoto: "Carga captura con habilidades y estilos de juego",
    missingBoostersPhoto: "Carga captura con boosters",
    incompleteDataWarning:
      "Datos incompletos: carga las fotos que faltan para completar el perfil",
    uploadFormation: "Cargar Formación",
    uploadFormationPhoto: "Cargar Foto de Formación Completa",
    formationInstructions:
      'Carga los jugadores uno a uno desde la sección "Jugadores" del juego (NO desde "Esquema de juego"). Para cada jugador carga 3 fotos: Estadísticas, Habilidades y Booster.',
    uploadPlayerCard: "Cargar Carta de Jugador",
    playerCardInstructions:
      "Carga 1-3 capturas de cartas de jugadores individuales (estadísticas, habilidades, booster). Se guardarán como reservas.",
    selectUploadType: "Seleccionar Tipo de Carga",
    extractingFormation: "Extrayendo formación...",
    formationExtracted: "Formación extraída con éxito",
    playersExtracted: "jugadores extraídos",
    savingFormation: "Guardando formación...",
    formationSaved: "Formación guardada con éxito",
    formationLayoutSaved:
      '¡Layout de formación guardado! Ve a "Gestionar Formación" para asignar los jugadores.',
    titolari: "Titulares",
    riserve: "Reservas",
    maxReservesReached: "Máximo de 12 reservas alcanzado.",
    swapFormation: "Gestionar Formación",
    instructions: "Instrucciones",
    teamPlayingStyle: "Estilo de Juego del Equipo",
    teamPlayingStyleDescription:
      "Selecciona el enfoque táctico para tu equipo",
    possesso_palla: "Posesión de balón",
    contropiede_veloce: "Contraataque rápido",
    contrattacco: "Contraataque",
    vie_laterali: "Juego por bandas",
    passaggio_lungo: "Balón largo",
    pressing_totale: "Overload",
    individualInstructions: "Instrucciones Individuales",
    individualInstructionsDescription:
      "Asigna instrucciones específicas a los jugadores",
    attack1: "Ataque 1",
    attack1Description: "Instrucciones para jugadores de ataque (lado izquierdo)",
    attack2: "Ataque 2",
    attack2Description: "Instrucciones para jugadores de ataque (lado derecho)",
    defense1: "Defensa 1",
    defense1Description: "Instrucciones para jugadores defensivos (lado izquierdo)",
    defense2: "Defensa 2",
    defense2Description: "Instrucciones para jugadores defensivos (lado derecho)",
    selectInstruction: "Seleccionar Instrucción",
    selectPlayer: "Seleccionar Jugador",
    instruction: "Instrucción",
    player: "Jugador",
    noPlayerSelected: "Ningún jugador seleccionado",
    noInstructionSelected: "Ninguna instrucción seleccionada",
    noCompatiblePlayers: "Ningún jugador compatible disponible",
    anchoring: "Anclaje",
    anchoringDescription:
      "Impide que el jugador indicado se aleje horizontalmente de su posición. Por ejemplo, el delantero centro permanecerá en posición central, y los extremos no se centrarán.",
    attackSpace: "Ataque al Espacio",
    attackSpaceDescription:
      "El jugador busca espacios en profundidad para crear ocasiones de gol",
    counterTarget: "Contraataque",
    counterTargetDescription:
      "El jugador es el objetivo para los contraataques, se mantiene arriba listo para transiciones rápidas",
    offensive: "Ofensivo",
    offensiveDescription:
      "El jugador participa activamente en los ataques, se proyecta hacia adelante",
    tightMarking: "Marcaje Estrecho",
    tightMarkingDescription:
      "Los defensas marcan a un determinado jugador de forma bastante estrecha. No siempre como en el MARCAJE AL HOMBRE, pero lo suficiente para interceptar fácilmente sus ocasiones.",
    manMarking: "Marcaje al Hombre",
    manMarkingDescription:
      "Esta instrucción hace que un defensa marque a un determinado jugador del equipo rival en todo momento. DC, SD, MP, MC, cualquiera.",
    deepLine: "Línea Baja",
    deepLineDescription:
      "Esta instrucción permite a un jugador posicionarse en el campo de manera que pueda unirse más fácilmente a la defensa. Contribuyen al juego, sí, pero también contribuyen a la defensa. Imposible indicar un defensa. Cuando se utiliza un esquema con 5 defensas, también es imposible asignar un centrocampista.",
    tacticalSettings: "Configuración Táctica",
    saveTacticalSettings: "Guardar Configuración Táctica",
    tacticalSettingsSaved: "Configuración táctica guardada con éxito",
    tacticalSettingsError: "Error al guardar la configuración táctica",
    loadingTacticalSettings: "Cargando configuración táctica...",

    // Matches / Partite
    addMatch: "Añadir Partido",
    recentMatches: "Últimos Partidos",
    noMatchesSaved:
      'Ningún partido guardado. Haz clic en "Añadir Partido" para empezar.',
    result: "Resultado",
    matchComplete: "✓ Completo",
    missingPhotos: "{count} faltantes",
    dateNotAvailable: "Fecha no disponible",
    unknownOpponent: "Rival desconocido",
    showMoreMatches: "Mostrar otros {count} partidos...",
    match: "Partido",
    dateAndTime: "Fecha y Hora",
    opponent: "Rival",
    notSpecified: "No especificado",
    completion: "Completado",
    completeWithMissingPhotos: "Completar con Fotos Faltantes",
    missing: "Faltante",
    uploadPhoto: "Cargar Foto",
    extracting: "Extrayendo...",
    extractAndSave: "Extraer y Guardar",
    backToDashboard: "Volver al Panel",
    // Match Wizard Steps
    stepHomeAway: "Casa/Fuera",
    stepHomeAwayInstruction:
      "Indica si has jugado en casa o fuera. Sirve para asociar correctamente los datos a tu equipo.",
    stepPlayerRatings: "Valoraciones de Jugadores",
    stepPlayerRatingsPhoto1: "Primera pantalla (foto 1)",
    stepPlayerRatingsPhoto2: "Segunda pantalla (foto 2, opcional)",
    stepTeamStats: "Estadísticas del Equipo",
    stepAttackAreas: "Áreas de Ataque",
    stepBallRecoveryZones: "Áreas de Recuperación de Balón",
    stepFormationStyle: "Formación Rival",
    // Match Wizard Actions
    selectValidImage: "Selecciona un archivo de imagen válido",
    imageTooLarge: "La imagen es demasiado grande (máx. 10MB)",
    loadImageFirst: "Carga primero una imagen",
    sessionExpiredRedirect: "Sesión caducada. Redirigiendo al inicio de sesión...",
    extractDataError: "Error al extraer datos",
    loadAtLeastOneSection: "Carga al menos una sección antes de guardar",
    loadAtLeastThreePhotos: "Carga al menos 3 capturas antes de guardar",
    summaryRequiresThreePhotosAndHomeAway:
      "Carga al menos 3 capturas y selecciona Casa o Fuera para generar el resumen",
    sessionExpired: "Sesión caducada",
    playerNotFound: "Jugador no encontrado",
    errorLoadingPlayer: "Error al cargar jugador",
    selectAtLeastOneImage: "Selecciona al menos una imagen",
    errorExtractingData: "Error al extraer datos",
    unableToExtractData: "No se pueden extraer datos de la imagen",
    errorUpdatingPlayer: "Error al actualizar jugador",
    saveMatchError: "Error al guardar partido",
    matchSavedSuccess: "¡Partido guardado con éxito! Redirigiendo...",
    changeImage: "Cambiar Imagen",
    loadImage: "Cargar Imagen",
    extractData: "Extraer Datos",
    skip: "Saltar",
    saving: "Guardando...",
    saveMatch: "Guardar Partido",
    matchNotFound: "Partido no encontrado",
    loadMatchError: "Error al cargar partido",
    loadPhotoError: "Error al cargar foto",
    updateMatchError: "Error al actualizar partido",
    tokenNotAvailable: "Token no disponible",
    step0Instruction:
      "Carga una o dos capturas de las valoraciones (primera y, si es necesario, segunda pantalla).",
    step1Instruction:
      "Carga una captura de las estadísticas del equipo (posesión, disparos, pases, etc.).",
    step2Instruction:
      "Carga una captura de las áreas de ataque (porcentajes por zona).",
    step3Instruction:
      "Carga una captura de las áreas de recuperación de balón (puntos verdes en el campo).",
    step4Instruction:
      "Carga una captura de la formación y estilo de juego (esquema, estilo, fuerza del equipo).",
    dataExtractedSuccess: "✓ Datos extraídos con éxito",
    resultExtracted: "Resultado extraído",
    matchSummary: "Resumen del Partido",
    sectionsComplete: "Secciones Completas",
    sectionsMissing: "Secciones Faltantes",
    photosUploadedCount: "fotos cargadas",
    opponentNameLabel: "Nombre del Rival",
    optional: "(opcional)",
    opponentNamePlaceholder:
      "Ej: GONDİKLENDİNİZZZ, AC Milan, Amistoso vs Mario...",
    opponentNameHint:
      "Ayuda a identificar el partido. Si se deja vacío, se extraerá automáticamente de las imágenes o se usará un identificador.",
    clickToEditOpponentName: "Haz clic para editar el nombre del rival",
    generateAnalysis: "Generar Análisis AI",
    generatingAnalysis: "Generando análisis...",
    aiAnalysis: "Análisis AI",
    regenerateSummary: "Regenerar Resumen",
    noSummaryAvailable:
      "Ningún resumen disponible. Genera un resumen para ver el análisis del partido.",
    aiSummaryLabel: "Resumen AI:",
    readMore: "Leer todo →",
    generateAiSummary: "Generar Resumen AI",
    errorGeneratingSummary: "Error al generar resumen",
    noSummaryGenerated: "Ningún resumen generado",
    errorSavingSummary: "Error al guardar resumen",
    analysisBasedOnPartialData: "Análisis basado en datos parciales",
    completeness: "completitud",
    missingData: "Datos faltantes",
    loadMorePhotos: "Carga más fotos para sugerencias más precisas",
    confirmSave: "Confirmar y Guardar",
    confirm: "Confirmar",
    cancel: "Cancelar",
    deleteMatch: "Eliminar Partido",
    confirmDeleteMatch: "¿Estás seguro de que quieres eliminar este partido?",
    confirmDeleteCoachTitle: "Confirmar Eliminación",
    confirmDeleteCoachMessage: "¿Estás seguro de que quieres eliminar a",
    confirmDeleteCoach: "¿Estás seguro de que quieres eliminar a este entrenador?",
    confirmDeleteCoachDetails: "Esta acción no se puede deshacer.",
    coachesTitle: "Entrenadores",
    uploadCoach: "Cargar Entrenador",
    noCoachesLoaded: "Ningún entrenador cargado",
    uploadCoachDescription:
      "Carga un entrenador subiendo una captura del juego",
    uploadFirstCoach: "Carga el primer entrenador",
    activeCoach: "Entrenador activo",
    activeCoachInfo:
      "Este entrenador está actualmente activo e influye en la competencia de estilo de juego del equipo.",
    viewCoachDetails: "Detalles del Entrenador",
    setAsTitular: "Establecer como titular",
    uploadCoachInstructions:
      "Carga 2 capturas: primera con datos principales y competencias, segunda con conexión (opcional).",
    informations: "Información",
    age: "Edad",
    nationality: "Nacionalidad",
    category: "Categoría",
    type: "Tipo",
    playingStyleCompetence: "Competencia de estilo de juego",
    trainingAffinity: "Afinidad de entrenamiento",
    statBoosters: "Bonus de estadísticas",
    connection: "Conexión",
    focalPoint: "Punto focal",
    keyMan: "Hombre clave",
    counter_attack: "Contraataque",
    wide: "Ancho",
    ball_possession: "Posesión de balón",
    long_ball: "Balón largo",
    quick_counter: "Contraataque rápido",
    finishing: "Finalización",
    defensive_behavior: "Comportamiento defensivo",
    confirmAction: "Confirmar Acción",
    confirmDeletePlayer:
      "¿Estás seguro de que quieres eliminar definitivamente a este jugador? Esta acción no se puede deshacer.",
    confirmPositionChangeTitle: "Confirmar Cambio de Posición",
    continue: "Continuar",
    delete: "Eliminar",
    deleteAndProceed: "Eliminar y Proceder",
    duplicateReserveTitle: "Reserva Duplicada",
    coach: "Entrenador",
    historicalInsights: "Insight Histórico",
    noPhotosSelected: "Ninguna foto seleccionada",
    photoSelected: "foto seleccionada",
    photosSelected: "fotos seleccionadas",
    playerName: "Nombre del jugador",
    replace: "Sustituir",
    selectFormation: "Seleccionar formación",
    strengths: "Puntos Fuertes",
    weaknesses: "Puntos Débiles",
    matchDeleted: "Partido eliminado con éxito",
    deleteMatchError: "Error al eliminar partido",
    errorQuotaExhausted: "Cuota OpenAI agotada. Inténtalo de nuevo en unos minutos.",
    openAQuotaError:
      "Cuota OpenAI agotada. Revisa tu plan y detalles de facturación en https://platform.openai.com/account/billing",
    errorTimeout: "Timeout durante la generación. Inténtalo de nuevo.",
    errorImageTooLarge:
      "La imagen es demasiado grande (máx. 10MB). Prueba a comprimirla o usa un formato más ligero.",
    imageOptimizeHighQualityHint:
      "La foto sigue siendo demasiado pesada después de la compresión (alta resolución o formato pesado). Reduce la calidad en los ajustes de la cámara, recorta solo la pantalla útil o usa una captura del juego en lugar de foto al monitor.",
    imageOptimizeFailedLoad:
      "No se puede abrir la imagen. Prueba con otro archivo o formato (JPEG/PNG).",
    imageOptimizeFailedCanvas:
      "El navegador no ha podido procesar la imagen. Prueba a cerrar otras pestañas o a reducir la resolución.",
    imageOptimizeFailedGeneric:
      "No se puede preparar la imagen para el envío. Prueba un archivo más ligero o una resolución más baja.",
    errorInvalidImage: "El archivo no es una imagen válida",
    errorExtractingFormation: "Error al extraer formación",
    errorInvalidScreenshot:
      "Captura no válida para esta sección. Asegúrate de cargar la captura correcta.",
    extractionErrorFriendly:
      "No se pueden leer los datos de la imagen. Prueba con una captura más nítida.",
    errorAnalysisGeneration: "Error al generar análisis",
    tryAgainInMoment: "¡Inténtalo de nuevo en un momento!",
    errorChatGeneric: "Lo siento, ha ocurrido un error.",
    chatCreditsPaused:
      "**Sin pánico, ¡Coach en pausa!**\n\nHas agotado los **Hero Points** para este chat — no es un error: el contador simplemente está a cero.\n\n**Recarga** y volvemos enseguida con consejos sobre plantilla, partidos, formaciones y cartas.",
    chatCreditsRechargeCta: "Recargar Hero Points",
    countermeasuresLive: "Contramedidas pre-partido",
    uploadOpponentFormation: "Cargar Formación Rival",
    generateCountermeasures: "Generar Contramedidas",
    opponentFormationAnalysis: "Análisis de Formación Rival",
    tacticalCountermeasures: "Contramedidas Tácticas",
    playerSuggestions: "Sugerencias de Jugadores",
    howToPlayIt: "Cómo jugarlo",
    playSummaryMatchKey: "Clave del partido",
    playSummaryBasePlan: "Plan base",
    playSummaryAttacking: "Cuando atacas",
    playSummaryDefending: "Cuando defiendes",
    playSummaryAvoid: "Error a evitar",
    applySelected: "Aplicar Seleccionados",
    metaFormation: "Formación Meta",
    formationStrengths: "Puntos Fuertes",
    formationWeaknesses: "Puntos Débiles",
    defensiveLine: "Línea Defensiva",
    pressing: "Presión",
    possessionStrategy: "Estrategia de Posesión",
    reason: "Motivación",
    addToStartingXI: "Añadir a Titulares",
    replaceInStartingXI:
      "Poner a ${playerName} (${playerRole}) en lugar de ${replacePlayerName} (${replacePlayerRole})",
    replaceInStartingXIHint: "${replacePlayerName} va al banquillo",
    replaceInStartingXIRoleNote:
      "Entra en el slot ${replacePlayerRole}; el rol guardado de la reserva es ${playerRole}",
    substitutionIncomplete: "Sustituye a un titular con ${playerName}",
    substitutionIncompleteHint:
      "Indica quién sale de la formación (datos de contramedida incompletos)",
    removeFromStartingXI: "Quitar de Titulares",
    changePlayingStyle: "Cambiar Estilo de Juego",
    adjustDefensiveLine: "Ajuste de Línea Defensiva",
    adjustPressing: "Ajuste de Presión",
    adjustPossession: "Ajuste de Posesión",
    warnings: "Advertencias",
    confidence: "Fiabilidad",
    dataQuality: "Calidad de Datos",
    generatingCountermeasures: "Generando contramedidas...",
    errorGeneratingCountermeasures: "Error al generar contramedidas",
    noFormationUploaded: "Carga primero una formación rival",
    selectSuggestionsToApply: "Selecciona las sugerencias a aplicar",
    suggestionsApplied: "Sugerencias aplicadas con éxito",
    errorApplyingSuggestions: "Error al aplicar sugerencias",
    applying: "Aplicando...",
    formationExtracted: "Formación Extraída",
    playingStyle: "Estilo de Juego",
    uploadPhotoDescription: "Carga una captura de la formación rival",
    countermeasuresAutoStart:
      "Extracción y contramedidas se inician automáticamente",
    countermeasuresPreMatchContext:
      "Consejos pre-partido basados en la formación rival cargada.",
    countermeasuresPostMatchTitle: "Después del partido",
    countermeasuresPostMatchPhotosIntro:
      "¿Has jugado? Añade el partido y carga las capturas: datos más precisos para análisis y consejos futuros.",
    countermeasuresPostMatchAddMatchCta: "Añadir partido y fotos",
    countermeasuresPostMatchPalestraIntro:
      "Cuéntame cómo ha ido: cuanto más sé, más te puedo ayudar.",
    photosCount: "fotos cargadas",
    howToAddMatch: "¿Cómo cargo un partido?",
    howToManageFormation: "¿Cómo gestiono la formación?",
    whereAmI: "¿Dónde estoy?",
    whatCanYouDo: "¿Qué puedes hacer?",
    typeMessage: "Escribe un mensaje...",
    openAssistant: "Abrir asistente",
    closeAssistant: "Cerrar asistente",
    sendMessage: "Enviar mensaje",
    voiceInput: "Entrada de voz",
    voiceListening: "Estoy escuchando...",
    voiceNotSupported: "Tu navegador no soporta el reconocimiento de voz.",
    voiceError: "Error durante el reconocimiento de voz. Inténtalo de nuevo.",
    yourCoach: "Tu Coach AI",
    assistantGreetingShort: "¡Hola {{name}}! 👋",
    liveCoachOpen: "Abrir Coach Live premium",
    liveCoachClose: "Cerrar Coach Live",
    liveCoachPremiumBadge: "Coach Live Premium",
    liveCoachTitle: "Coach Live",
    liveCoachSubtitle:
      "Carga la foto del rival y luego habla con {{coachName}} para recibir consejos en directo durante el partido.",
    liveCoachCommercialIntro:
      "Cuanto más contexto des al coach, más precisos serán los consejos.",
    liveCoachPhotoTitle: "Foto del rival",
    liveCoachPhotoSubtitle:
      "Carga una captura de la formación rival antes de empezar o durante la preparación.",
    liveCoachPhotoHelper:
      "Primero la foto, luego el coach. Con la foto las sugerencias son más precisas.",
    liveCoachPhotoButton: "Cargar foto de formación",
    liveCoachPhotoUploading: "Analizando foto...",
    liveCoachPhotoReady: "Foto analizada",
    liveCoachPhotoDetected: "Formación detectada",
    liveCoachPhotoError:
      "No se puede leer la foto para Coach Live. Inténtalo de nuevo con una captura más nítida.",
    liveCoachVoiceTitle: "Habla con {{coachName}}",
    liveCoachVoiceSubtitle:
      "Recibe correcciones rápidas y consejos prácticos mientras juegas.",
    liveCoachVoiceHelper:
      "Cuando estés listo, inicia la sesión y habla con {{coachName}} como lo harías con un coach real.",
    liveCoachVoiceMarin: "Marin - Premium cálida",
    liveCoachVoiceCedar: "Cedar - Premium limpia",
    liveCoachVoiceCoral: "Coral - Brillante y directa",
    liveCoachVoiceVerse: "Verse - Fluida y natural",
    liveCoachVoiceSage: "Sage - Segura y autoritaria",
    liveCoachVoiceBallad: "Ballad - Calma y envolvente",
    liveCoachConnecting: "Conectando en directo...",
    liveCoachStartTalking: "Iniciar Coach Live",
    liveCoachMute: "Silenciar micrófono",
    liveCoachUnmute: "Reactivar micrófono",
    liveCoachStop: "Cerrar sesión",
    liveCoachStatusReady: "Listo para el saque",
    liveCoachStatusLive: "En directo",
    liveCoachStatusIdle: "Toca para empezar",
    liveCoachStatusConnecting: "Conectando...",
    liveCoachHpHint: "Soporte en directo durante el partido",
    liveCoachLiveFeed: "Feed en directo",
    liveCoachFeedHelper:
      "Aquí aparecerán tu solicitud y la respuesta en directo de {{coachName}}.",
    liveCoachYou: "Tú",
    liveCoachCoach: "Coach",
    liveCoachStatHp: "HP",
    liveCoachStatTime: "Tiempo",
    liveCoachStatSpent: "Sesión",
    liveCoachReadyShort: "Listo",
    liveCoachLiveShort: "Live",
    liveCoachLauncherSubtitle: "Coach vocal premium siempre listo.",
    liveCoachLauncherSubtitleDash:
      "Coach vocal premium destacado para el panel.",
    liveCoachLauncherSubtitleActive: "Tu coach está contigo en tiempo real.",
    liveCoachDashboardTitle: "Coach Live premium en partido",
    liveCoachDashboardSubtitle:
      "Habla con tu coach durante el partido y recibe correcciones rápidas cuando las necesites.",
    liveCoachDashboardCta: "Abrir Coach Live",
    liveCoachOpponentReady: "Rival listo",
    liveCoachOpponentMissing: "Sin foto",
    liveCoachWaitingYou:
      "En cuanto hables, aquí verás el foco de tu solicitud.",
    liveCoachWaitingCoach: "...",
    liveCoachStartError: "No se puede iniciar Coach Live ahora.",
    liveCoachRealtimeError: "Error en la conexión de voz en tiempo real.",
    liveCoachBillingError: "Error al verificar Hero Points para Coach Live.",
    liveCoachEndedNoCredits:
      "Coach Live detenido por Hero Points insuficientes.",

    baseFormations: "Formaciones Base",
    variations: "Variaciones",
    formationWide: "Ancho",
    formationCompact: "Compacto",
    formationOffensive: "Ofensivo",
    formationDefensive: "Defensivo",
    searchFormation: "Buscar formación...",
    selectFormationTactical: "Seleccionar Formación Táctica",
    formationDescription:
      "Elige una formación táctica oficial eFootball. Los jugadores ya asignados se mantendrán en sus posiciones, solo cambiarán las coordenadas visuales en el campo.",
    variationsCount: "variaciones",
    expandVariations: "Expandir variaciones",
    collapseVariations: "Contraer variaciones",
    expandSection: "Mostrar más",
    collapseSection: "Mostrar menos",
    expandSectionGoals: "Mostrar objetivos semanales",
    collapseSectionGoals: "Ocultar objetivos",
    expandSectionMatches: "Mostrar últimos partidos",
    collapseSectionMatches: "Ocultar partidos",
    expandGuideCard: "Expandir guía e ir a la página",
    collapseGuideCard: "Contraer guía",
    confirmFormation: "Confirmar Formación",
    selectOriginalPositions: "Seleccionar Posiciones Originales",
    positionSelectionTitle:
      "Selecciona las posiciones en las que este jugador puede jugar",
    positionSelectionDescription:
      "¿En qué posiciones puede jugar este jugador? (Selecciona todas las destacadas en la carta)",
    competenceLevel: "Nivel de Competencia",
    competenceHigh: "Alta",
    competenceMedium: "Intermedia",
    competenceLow: "Baja",
    editCompetences: "Editar competencias",
    editBoosters: "Editar booster",
    manualBoosters: "Introducción manual de booster",
    competencesUpdated: "Competencias actualizadas",
    boostersUpdated: "Booster actualizados",
    mainPosition: "Posición Principal",
    selectPositions: "Seleccionar Posiciones",
    mustSelectAtLeastOne: "Debes seleccionar al menos una posición",
    positionGroupGoalkeeper: "Porteros",
    positionGroupPortiere: "Portero",
    positionGroupDefense: "Defensa",
    positionGroupMidfield: "Mediocampo",
    positionGroupAttack: "Ataque",
    positionRolePT: "Portero",
    positionRoleDC: "Defensa central",
    positionRoleTS: "Lateral izquierdo",
    positionRoleTD: "Lateral derecho",
    positionRoleCC: "Centrocampista",
    positionRoleMED: "Mediocentro",
    positionRoleCLS: "Exterior izquierdo",
    positionRoleCLD: "Exterior derecho",
    positionRoleTRQ: "Mediapunta",
    positionRoleESA: "Extremo izquierdo",
    positionRoleEDA: "Extremo derecho",
    positionRoleSP: "Segundo delantero",
    positionRoleP: "Delantero",
    positionRoleUnknown: "Rol",
    confirmPositionChange:
      "${playerName} es ${originalPositions} original, pero lo estás moviendo al slot ${slotPosition}.\n\n${slotPosition} NO es una posición original.\nCompetencia en ${slotPosition}: ${competence}\n${statsWarning}¿Quieres usarlo igualmente como ${slotPosition}? (Rendimiento reducido)\n\nSi confirmas, asumes la responsabilidad y el sistema acepta la elección.",
    positionNotOriginal: "${slotPosition} NO es una posición original",
    positionOriginal: "Posición original",
    duplicatePlayerAlert:
      'El jugador "${playerName}"${playerAge} ya está presente:',
    duplicateInField: "En el campo en el slot ${slotIndex}",
    duplicateInReserves: "En las reservas (${count} duplicado/s)",
    deleteDuplicatesAndProceed: "¿Quieres eliminar los duplicados y proceder?",
    playersOutOfRoleAlert: "⚠️ Algunos jugadores están fuera de rol:\n\n",
    playerOutOfRoleLine:
      "- ${playerName}: ${originalPositions} original → ${newRole} (NO original)",
    cannotPlayTheseRoles: "No me consta que puedan desempeñar estos roles.",
    addCompetenceAndSave: "¿Quieres añadir competencia y guardar igualmente?",
    duplicateReserveAlert:
      'El jugador "${playerName}"${playerAge} ya está presente en las reservas. ¿Quieres eliminar el duplicado en las reservas?',
    duplicateInFormationAlert:
      'El jugador "${playerName}"${playerAge} ya está presente en la formación en el slot ${slotIndex}. ¿Quieres sustituirlo?',
    duplicateReserveReplaceAlert:
      'El jugador "${playerName}"${playerAge} ya está presente en las reservas. ¿Quieres sustituirlo con los nuevos datos?',
    thisPlayer: "este jugador",
    duplicatePlayerTitle: "Jugador Duplicado",
    duplicateInFormationMessage:
      'El jugador "${playerName}"${playerAge} ya está en la formación en el slot ${slotIndex}.',
    duplicateInFormationDetails: "¿Quieres sustituirlo con los nuevos datos?",
    confirmUpdate: "Confirmar actualización",
    dataMismatch: "ATENCIÓN: ¡Los datos no coinciden!",
    nameDifferent: "El nombre es diferente",
    teamDifferent: "El equipo es diferente",
    positionDifferent: "La posición es diferente",
    ageDifferent: "La edad es diferente",
    ensureSamePlayer:
      "Asegúrate de que la foto sea del mismo jugador antes de proceder.",
    confirmAnyway: "Confirmar de todos modos",
    formationValidationTitle: "Validación de Formación",
    proceedAnyway: "Proceder de Todos Modos",
    playersOutOfRoleTitle: "Jugadores Fuera de Rol",
    missingDataTitle: "Datos Faltantes",
    missingDataDescription:
      "Algunos datos obligatorios no se han extraído de las fotos. Introdúcelos manualmente o recarga las fotos.",
    missingDataCompleteLater:
      "Si guardas de todos modos o introduces solo los campos obligatorios, podrás completar el resto después: haz clic en el jugador (en el campo o en reservas) y en la ficha de detalle carga las fotos que faltan (Estadísticas, Habilidades, Booster). El completado siempre se hace cargando las fotos, no rellenando campos a mano.",
    requiredFields: "Campos Obligatorios",
    optionalFields: "Campos Opcionales",
    enterValue: "Introducir valor...",
    enterValueOptional: "Opcional...",
    retryUpload: "Recargar Foto",
    saveAnyway: "Guardar de Todos Modos",
    saveWithManualData: "Guardar con Datos Manuales",
    missingOptionalData: "Algunos datos opcionales no se han extraído",
    continueWithoutOptionalData:
      "¿Quieres continuar de todos modos? Puedes añadirlos después.",

    // Guide dettagliate
    guideFormationTitle: "Cómo cargar una formación",
    guideFormationStep1: '1. Selecciona "Cargar Formación"',
    guideFormationStep2:
      '2. Carga los jugadores uno a uno desde la sección "Jugadores" (NO "Esquema de juego")',
    guideFormationStep3: '3. Haz clic en "Extraer Formación" para analizar',
    guideFormationStep4:
      "4. Los 11 jugadores se guardarán automáticamente como TITULARES",
    guideFormationNote:
      '💡 Las fotos deben tomarse desde la sección "Jugadores" donde se ven las estadísticas detalladas',
    guideCardTitle: "Cómo cargar reservas",
    guideCardStep1: '1. Selecciona "Cargar Carta de Jugador"',
    guideCardStep2:
      "2. Carga 1-3 capturas de cartas de jugadores individuales (estadísticas, habilidades, booster)",
    guideCardStep3: '3. Haz clic en "Extraer Datos" para analizar cada carta',
    guideCardStep4:
      "4. Los jugadores se guardarán automáticamente como RESERVAS",
    guideCardNote: "💡 Puedes cargar hasta 3 cartas a la vez",
    guideSwapTitle: "Cómo intercambiar jugadores",
    guideSwapStep1: "1. Haz clic en un jugador (titular o reserva)",
    guideSwapStep2:
      "2. Haz clic en otro jugador para intercambiar sus posiciones",
    guideSwapStep3: "3. El jugador titular pasará a reserva y viceversa",
    guideSwapNote: "💡 Solo puedes intercambiar jugadores de tu plantilla",
    guideEmptyFormation:
      'Ninguna formación cargada. Carga los jugadores uno a uno desde la sección "Jugadores".',
    guideEmptyReserves:
      "Sin reservas. Carga cartas de jugadores individuales para añadir reservas.",
    redirectToFormation: "Redirigiendo a Gestión de Formación...",
    noReservesUploadPlayers:
      "Sin reservas. Carga jugadores para añadirlos a las reservas.",
    errorLoadingLayout: "Error al cargar layout",
    errorLoadingPlayers: "Error al cargar jugadores",
    errorLoadingData: "Error al cargar datos",
    playerNotFoundInReserves: "Jugador no encontrado en las reservas",
    errorDeletingDuplicateReserve:
      "Error al eliminar jugador duplicado de reserva",
    operationCancelledDuplicateReserve:
      "Operación cancelada: jugador ya presente en las reservas",
    errorRemoving: "Error al quitar",
    imagesDifferentPlayers:
      "Las imágenes pertenecen a jugadores diferentes. Verifica las imágenes.",
    errorExtractionDataList: "Error al extraer datos",
    errorPlayerDataNotExtracted:
      "Error: datos del jugador no extraídos. Verifica las imágenes e inténtalo de nuevo.",
    errorDeletingDuplicateReserveReplace:
      "Error al eliminar jugador duplicado",
    errorSavingPlayerGeneric: "Error al guardar jugador",
    errorAssignment: "Error de asignación",
    errorRemovalAfterDuplicate: "Error al quitar después de eliminar duplicado",
    errorDeletion: "Error de eliminación",
    errorUnknown: "Error desconocido",
    errorSavingLayout: "Error al guardar layout",
    errorSavingFormation: "Error al guardar formación",
    errorSavingPlayerAfterReplace:
      "Error al guardar jugador después de sustitución",
    errorLoadingReserve: "Error al cargar reserva",
    errorProfileLoad: "Error al cargar perfil",
    errorProfileSave: "Error al guardar perfil",
    selectOneImage: "Selecciona una imagen",
    invalidJsonStructure: "Estructura JSON no válida",

    // Guida Completa
    guideTitle: "Guía Completa",
    guideSubtitle: "Descubre cómo usar mejor la plataforma",
    guideCompleteProfileTitle: "Completa Tu Perfil",
    guideCompleteProfileDesc:
      "¡Cuanto más completes el perfil, más puede ayudarte la IA de forma personalizada!",
    guideProfileProgress: "Completado del Perfil",
    guideProfileComplete: "¡Perfil Completo! ✅",
    guideCompleteProfileButton: "Completar el Perfil",
    guideUseBrainTitle: "Usa el Cerebro AI",
    guideUseBrainDesc:
      "¡Consejos tácticos siempre disponibles! Haz clic en el botón del cerebro abajo a la derecha para formación, plantilla, esquema, sustituciones, estilo. Para saber cómo usar la app (cargar fotos, wizard) usa la Guía o el tour Muéstrame cómo.",
    guideBrainFeature1: "Guía Personal",
    guideBrainFeature1Desc: "Te acompaña en cada paso",
    guideBrainFeature2: "Motivante",
    guideBrainFeature2Desc: "Celebra tus éxitos",
    guideBrainFeature3: "Siempre Disponible",
    guideBrainFeature3Desc: "24/7 a tu servicio",
    guidePagesTitle: "Guías por Página",
    guideSteps: "Cómo hacer:",
    guideGoToPage: "Ir a la Página",
    guideFooterTitle: "¿Tienes Preguntas?",
    guideFooterDesc:
      "Pregunta al cerebro AI para consejos tácticos (formación, plantilla, esquema, sustituciones). Para uso de la app usa la Guía o el tour Muéstrame cómo. 💪",
    guideFooterDescTourOnly:
      'Usa el tour "Muéstrame cómo" (brújula arriba a la derecha) en cada página para una guía paso a paso. Aquí arriba encuentras las guías por sección.',
    guideDashboardTitle: "Panel",
    guideDashboardDesc: "Vista completa de tu equipo",
    guideDashboardStep1:
      "Visualiza estadísticas del equipo (titulares, reservas, total)",
    guideDashboardStep2: "Consulta los top 3 jugadores por valoración",
    guideDashboardStep3: "Accede a los últimos partidos con un clic",
    guideDashboardStep4: "Navega rápidamente a las otras secciones",
    guideFormationDesc: "Campo 2D interactivo para gestionar tu plantilla",
    guideFormationStep1: "Elige entre 14 formaciones oficiales eFootball",
    guideFormationStep2: "Haz clic en los slots para asignar jugadores",
    guideFormationStep3: "Carga jugadores con capturas (hasta 3 imágenes)",
    guideFormationStep4: "Gestiona reservas en la sección dedicada",
    guideFormationStep5: "Visualiza detalles de jugadores haciendo clic en las cartas",
    guideAddMatchTitle: "Añadir Partido",
    guideAddMatchDesc:
      "Wizard de 6 pasos (Casa/Fuera + 5 secciones de fotos) para cargar datos del partido",
    guideAddMatchStep1: "Paso 1: Carga captura de valoraciones de jugadores",
    guideAddMatchStep2: "Paso 2: Carga captura de estadísticas del equipo",
    guideAddMatchStep3: "Paso 3: Carga captura de áreas de ataque",
    guideAddMatchStep4: "Paso 4: Carga captura de recuperaciones de balón",
    guideAddMatchStep5: "Paso 5: Carga captura de formación rival",
    guideAddMatchStep6: "Guarda el partido cuando todos los pasos estén completados",
    guideMatchDetailTitle: "Detalle del Partido",
    guideMatchDetailDesc:
      "Desde el panel haz clic en un partido para análisis completo, resumen AI y sugerencias.",
    guideMatchDetailStep1:
      "Desde el panel haz clic en un partido para abrir el detalle",
    guideMatchDetailStep2:
      "Visualiza todos los datos del partido y genera resumen AI bilingüe (IT/EN)",
    guideMatchDetailStep3: "Analiza el rendimiento de los jugadores",
    guideMatchDetailStep4: "Consulta sugerencias tácticas",
    guidePlayerDetailTitle: "Detalle del Jugador",
    guidePlayerDetailDesc:
      "Desde la formación haz clic en un jugador para estadísticas, habilidades y carga de capturas.",
    guidePlayerDetailStep1:
      "Desde gestión de formación haz clic en un jugador para abrir el detalle",
    guidePlayerDetailStep2: "Completa el perfil con fotos adicionales",
    guidePlayerDetailStep3: "Carga capturas de stats, habilidades, booster",
    guideProfileTitle: "Configuración del Perfil",
    guideProfileDesc: "Personaliza tu perfil y preferencias",
    guideProfileStep1: "Introduce datos personales (nombre, apellido)",
    guideProfileStep2: "Configura datos de juego (división, equipo favorito)",
    guideProfileStep3: "Personaliza preferencias IA (nombre IA, cómo recordarte)",
    guideProfileStep4: "Indica problemas comunes para sugerencias específicas",
    guidePalestraCoachTitle: "Gimnasio Coach",
    guidePalestraCoachDesc:
      "Solo perfil de juego y feedback post-partido. Desde el panel abre el modal; para consejos tácticos usa el chat principal.",
    guidePalestraCoachStep1: 'Desde el panel haz clic en "Gimnasio Coach"',
    guidePalestraCoachStep2:
      "Rellena el perfil de juego (plataforma, conexión, PA, etc.) o cuenta el feedback sobre el partido",
    guidePalestraCoachStep3:
      "Guarda y cierra: los datos alimentan el Conocimiento AI y los consejos personalizados",
    guideCountermeasuresTitle: "Contramedidas pre-partido",
    guideCountermeasuresDesc:
      "Carga formación rival, extrae datos y genera contramedidas tácticas con la IA (pre-partido).",
    guideCountermeasuresStep1:
      "Carga una captura de la formación rival",
    guideCountermeasuresStep2:
      "Extracción y contramedidas se inician automáticamente",
    guideCountermeasuresStep3: "Lee análisis y sugerencias generadas",
    guideCountermeasuresStep4:
      "Lee análisis, ajustes tácticos e instrucciones individuales",
    guideCoachesTitle: "Entrenadores",
    guideCoachesDesc:
      "Carga fotos de entrenadores, establece activo y consulta competencias por estilo de juego.",
    guideCoachesStep1:
      "Carga 1 o 2 capturas (foto principal y conexión)",
    guideCoachesStep2: "La IA extrae nombre, equipo y competencias",
    guideCoachesStep3:
      "Establece un entrenador como activo; ve detalles o elimina",
    guideClassificaTitle: "Clasificación mensual",
    guideClassificaDesc:
      "Clasificación From Zero to Hero: puntos por partidos, uso IA y perfil. Elegibilidad: al menos 1 partido completo en el mes y perfil ≥50%.",
    guideClassificaStep1: "Consulta tu posición y los puntos del mes",
    guideClassificaStep2:
      'Expande "Detalle de puntos" para ver cómo se calculan',
    guideClassificaStep3:
      "Participa con al menos 1 partido completo en el mes y perfil completado al 50%",
    guideGestioneProfiloTitle: "Gestión de perfil (Hero Points)",
    guideGestioneProfiloDesc:
      "Créditos restantes, análisis totales, rango y transacciones. Compra créditos y consulta tu actividad reciente.",
    guideGestioneProfiloStep1:
      "Visualiza créditos restantes (Hero Points) y rango (Bronze/Silver/Gold/Platinum)",
    guideGestioneProfiloStep2:
      "Controla análisis, créditos y actividad reciente de tu cuenta",
    guideGestioneProfiloStep3:
      "Controla las transacciones (uso de créditos para análisis, chat, extracciones)",
    guideDashboardStep3:
      "Accede a los últimos partidos con un clic (expande la tarjeta para ver la lista)",
    guideDashboardStepBanner:
      'Barra Conocimiento: indica cuánto te conoce la IA. "Información IA" y "Actualizar análisis" para actualizar.',
    guideDashboardStepObiettivi:
      "Objetivos semanales: expande la tarjeta para ver las tareas; complétalas para aumentar la puntuación.",
    guideDashboardStepClassifica:
      "Panel: controla estado del setup, misiones y accesos directos principales.",
    guideDashboardStepStatistiche:
      "Estadísticas de juego: carga las 2 pantallas de Análisis eFootball para consejos sobre disparo, pase y defensa.",
    guideShowMeHowTitle: "Muéstrame cómo",
    guideShowMeHowDesc:
      "¡Tour interactivo en cada página! Haz clic en el botón de la brújula arriba a la derecha para una guía paso a paso. Disponible en Panel, Formación, Añadir Partido, Contramedidas, Entrenadores, Guía, Perfil y Gestión de perfil.",
    guideShowMeHowFeature1: "Tours contextuales",
    guideShowMeHowFeature1Desc: "Un tour diferente para cada página",
    guideShowMeHowFeature2: "Siempre disponible",
    guideShowMeHowFeature2Desc: "Reinicia cuando quieras",
    guideLink: "Guía Completa",

    // Tour interattivo
    tourShowMeHow: "Muéstrame cómo",
    tourNext: "Siguiente",
    tourPrev: "Atrás",
    tourFinish: "Fin",
    tourClose: "Cerrar",
    tourStart: "Empezar",
    tourSkip: "Saltar tour",
    tourProgress: "{{current}} / {{total}}",
    tourNoTour: "Ninguna guía para esta página.",
    tourDashboardIntroTitle: "¡Hola! 👋",
    tourDashboardIntroDesc:
      "Esto es lo que encuentras aquí: equipo, objetivos y navegación. ¿Listo?",
    tourDashboardAiTitle: "¿Cuánto me conoces? 📊",
    tourDashboardAiDesc:
      "Cuantos más datos introduzcas (perfil, plantilla, partidos) → consejos más precisos para ti.",
    tourDashboardTaskTitle: "Tus objetivos 🎯",
    tourDashboardTaskDesc:
      "Tareas personalizadas para mejorar. Te ayudan a completar el setup y usar mejor la app.",
    tourDashboardSquadTitle: "Tu equipo 👥",
    tourDashboardSquadDesc: "Titulares y reservas siempre a mano.",
    tourDashboardNavTitle: "¿A dónde quieres ir? 🧭",
    tourDashboardNavDesc:
      "Todas las secciones a un clic: formación, partidos, entrenadores...",
    tourDashboardAddMatchTitle: "Añade un partido ➕",
    tourDashboardAddMatchDesc:
      "Carga capturas y deja que la IA analice por ti.",
    tourDashboardMatchesTitle: "Tus partidos 🎮",
    tourDashboardMatchesDesc:
      "Haz clic para ver análisis y consejos personalizados.",
    tourDashboardInsightsTitle: "¿Qué emerge? 💡",
    tourDashboardInsightsDesc:
      "Patrones de tu juego y consejos sobre qué mejorar.",
    tourDashboardClassificaTitle: "Clasificación mensual",
    tourDashboardClassificaDesc:
      "Puntos From Zero to Hero: partidos, uso IA y perfil. Haz clic para ver la clasificación completa y tu posición.",
    tourClassificaIntroTitle: "Clasificación mensual",
    tourClassificaIntroDesc:
      "Aquí ves la clasificación del mes, los días hasta fin de mes y cómo subir de posición.",
    tourClassificaYourPositionTitle: "Tu posición",
    tourClassificaYourPositionDesc:
      'Puntos y posición. Usa "Detalle de puntos" para ver cómo se calculan (partidos, uso IA, perfil).',
    tourClassificaRankingsTitle: "Clasificación",
    tourClassificaRankingsDesc:
      "Podio y lista completa. Para aparecer se necesitan al menos 1 partido completo en el mes y perfil al 50% o más.",
    tourGestioneProfiloIntroTitle: "Gestión de perfil",
    tourGestioneProfiloIntroDesc:
      "Hero Points (créditos), análisis totales, rango y enlaces a clasificación y transacciones.",
    tourGestioneProfiloBalanceTitle: "Créditos restantes",
    tourGestioneProfiloBalanceDesc:
      "Créditos disponibles para análisis, chat y extracciones. Compra para recargar.",
    tourGestioneProfiloLeaderboardTitle: "Clasificación y premios",
    tourGestioneProfiloLeaderboardDesc:
      "Tu posición en la clasificación mensual e historial. Premios para los primeros clasificados.",
    tourGestioneProfiloTransactionsTitle: "Actividad reciente",
    tourGestioneProfiloTransactionsDesc:
      "Transacciones: uso de créditos para análisis de partidos, chat, extracciones de jugadores y formaciones.",
    tourFormationIntroTitle: "Gestión de Formación",
    tourFormationIntroDesc:
      "Aquí gestionas la plantilla: campo 2D, titulares, reservas, carga de formación y cartas de jugadores.",
    tourFormationHeaderTitle: "Cabecera y Formación",
    tourFormationHeaderDesc:
      "Vuelve al Panel, cambia de formación o personaliza posiciones. El nombre de la formación actual se muestra aquí.",
    tourFormationActiveCoachTitle: "Entrenador Activo",
    tourFormationActiveCoachDesc:
      "El entrenador activo influye en estilo y competencias. Puedes cambiarlo desde la sección Entrenadores.",
    tourFormationFieldTitle: "Campo 2D",
    tourFormationFieldDesc:
      "Haz clic en los slots para asignar jugadores de reservas o cargar desde captura. Personaliza posiciones en modo edición.",
    tourFormationReservesTitle: "Reservas",
    tourFormationReservesDesc:
      "Jugadores no en el campo. Carga cartas individuales o asigna a las posiciones haciendo clic en los slots.",
    tourFormationUploadTitle: "Cargar Formación / Reservas",
    tourFormationUploadDesc:
      'Carga los jugadores uno a uno desde la sección "Jugadores" o añade reservas individuales.',
    tourFormationCoachesLinkTitle: "Entrenadores",
    tourFormationCoachesLinkDesc:
      "Ve a la gestión de entrenadores: carga fotos, establece activo, consulta competencias.",

    tutorialRosaTitle: "Tutorial: carga de plantilla",
    tutorialRosaIntro:
      "Cómo cargar titulares y reservas, qué fotos se necesitan, qué significan las alertas y qué hacer si las fotos no se reconocen.",
    tutorialRosaSectionSteps: "Cómo cargar la plantilla",
    tutorialRosaSectionPhotos: "Las 3 fotos a cargar",
    tutorialRosaSectionAlerts: "Qué son las alertas",
    tutorialRosaSectionCompleteMove: "Completar después y mover los jugadores",
    tutorialRosaSectionTroubleshoot: "¿La foto no se reconoce?",
    tutorialRosaCompleteLaterIntro:
      "Si algunas cosas no se han extraído o quieres añadir fotos después:",
    tutorialRosaCompleteLater1:
      "Haz clic en el jugador (en el campo o en reservas) para abrir la ficha de detalle.",
    tutorialRosaCompleteLater2:
      "En la ficha puedes completar el perfil cargando las fotos que faltan (Estadísticas, Habilidades, Booster), no rellenando campos a mano.",
    tutorialRosaMoveIntro: "Cómo mover los jugadores en el campo:",
    tutorialRosaMove1:
      'Asignar un slot: haz clic en el slot vacío en el campo → elige un jugador de las reservas o "Cargar foto" para añadir uno nuevo.',
    tutorialRosaMove2:
      'Sustituir un titular: haz clic en el slot con el jugador → en la ventana puedes "Quitar de la formación" (va a reservas) o asignar otro de la lista de reservas.',
    tutorialRosaMove3:
      'Personalizar las posiciones en el campo: haz clic en "Personalizar posiciones" (icono de lápiz) en la cabecera → arrastra los jugadores en el campo para moverlos, luego "Guardar posiciones".',
    tutorialRosaStep1:
      'Si aún no tienes una formación: haz clic en "Cargar Formación" y carga los jugadores uno a uno desde la sección "Jugadores" del juego (NO desde "Esquema de juego"). Para cada jugador se necesitan 3 fotos: Estadísticas, Habilidades y Booster.',
    tutorialRosaStep2:
      'Para añadir o sustituir un jugador en un slot: haz clic en el slot en el campo, luego "Cargar foto" (o el icono de upload).',
    tutorialRosaStep3:
      "Carga al menos 2 fotos del jugador: Estadísticas (obligatoria) y Habilidades (obligatoria). La tercera (Booster) es opcional.",
    tutorialRosaStep4:
      'Haz clic en "Guardar Jugador". La app extrae nombre, valoración, posición y habilidades de las imágenes.',
    tutorialRosaStep5:
      'Para las reservas: en la sección Reservas haz clic en "Cargar jugadores" y carga los mismos 3 tipos de fotos para cada reserva.',
    tutorialRosaPhotosIntro:
      "Cada jugador puede tener hasta 3 capturas del juego eFootball:",
    tutorialRosaPhoto1Title: "Foto Estadísticas",
    tutorialRosaPhoto1Desc:
      "La carta del jugador con estadísticas numéricas (disparo, pase, defensa, etc.). En eFootball: abre la ficha del jugador, sección Estadísticas.",
    tutorialRosaPhoto2Title: "Foto Habilidades",
    tutorialRosaPhoto2Desc:
      "La pantalla con las Player Skills (Pase filtrado, Tiro con efecto, etc.). En eFootball: ficha del jugador, sección Habilidades.",
    tutorialRosaPhoto3Title: "Foto Booster",
    tutorialRosaPhoto3Desc:
      "Opcional: pantalla con booster y bonus especiales. Si no la tienes, puedes saltarla.",
    tutorialRosaPhotoRulesTitle: "Reglas importantes:",
    tutorialRosaPhotoFullScreen:
      "Cada foto debe mostrar toda la pantalla del juego (nombre, valoración, estadísticas, gráficos), no solo un recorte con los números. Algunos usuarios envían solo las estadísticas: no es suficiente.",
    tutorialRosaPhotoBoosterActive:
      "Para la foto Booster: activa el toggle «Ver efecto Booster máx.» (verde, arriba a la derecha) antes de hacer la captura, así la app lee el efecto correctamente.",
    tutorialRosaAlertsIntro:
      "Durante la carga pueden aparecer mensajes (alertas). Esto es lo que significan:",
    tutorialRosaAlertDuplicate: "Jugador ya presente",
    tutorialRosaAlertDuplicateDesc:
      "Estás añadiendo un jugador que ya está en la plantilla (mismo nombre). Puedes sustituirlo en el slot o en las reservas, o cancelar.",
    tutorialRosaAlertOutOfRole: "Jugador fuera de rol",
    tutorialRosaAlertOutOfRoleDesc:
      "Uno o más jugadores están en una posición para la que no tienen competencia suficiente. Revisa las posiciones originales y mueve o sustituye a los jugadores.",
    tutorialRosaAlertReplace: "Sustituir reserva/slot",
    tutorialRosaAlertReplaceDesc:
      "El jugador ya está en la formación o en el banquillo. Elige si sustituir con los nuevos datos (ej. después de haber cargado fotos mejores) o mantener los datos existentes.",
    tutorialRosaTroubleshootIntro:
      "Si la extracción falla o los datos son incorrectos:",
    tutorialRosaTroubleshoot1:
      "Verifica haber cargado la pantalla correcta: Estadísticas = números y gráficos; Habilidades = lista de Player Skills; Booster = bonus (opcional).",
    tutorialRosaTroubleshoot2:
      "Usa capturas nítidas, sin reflejos. Evita fotos demasiado oscuras o mal recortadas.",
    tutorialRosaTroubleshoot3:
      'Si aparece "Datos faltantes": puedes "Recargar Foto" e intentarlo de nuevo con una imagen mejor. O introduce solo los campos obligatorios y "Guardar con datos manuales": el resto del perfil lo completarás después cargando las fotos que faltan desde la ficha del jugador.',
    tutorialRosaTroubleshoot4:
      "Si la app no reconoce nada: comprueba que la imagen sea realmente de la ficha del jugador de eFootball (no menú u otra pantalla).",
    tutorialRosaTroubleshoot5:
      "¿Foto solo de las estadísticas? No es suficiente: envía la pantalla completa (nombre del jugador, valoración, gráficos, todo el contexto).",
    tutorialRosaTroubleshoot6:
      "Para la foto Booster: en la captura el toggle «Ver efecto Booster máx.» debe estar activo (verde), de lo contrario la extracción puede fallar.",
    tutorialRosaGotIt: "Entendido",
    tutorialRosaButton: "Tutorial de plantilla",
    goToFormation: "Ir a la formación",
    openPalestraCoach: "Abrir Gimnasio Coach",
    tourMatchIntroTitle: "Añadir Partido",
    tourMatchIntroDesc:
      "Wizard en 6 pasos: primero Casa/Fuera, luego carga capturas de valoraciones, estadísticas, áreas de ataque, recuperaciones de balón y formación rival.",
    tourMatchProgressTitle: "Progreso",
    tourMatchProgressDesc:
      "Barra y conteo de fotos cargadas. El resultado extraído (si está presente) se muestra aquí.",
    tourMatchStepsTitle: "Pasos del Wizard",
    tourMatchStepsDesc:
      "Haz clic en un paso para pasar. Verde = completado, gris = saltado. Carga, extrae o salta cada sección.",
    tourMatchContentTitle: "Contenido del Paso",
    tourMatchContentDesc:
      "Carga la imagen, haz clic en Extraer para analizar. Puedes saltar un paso si no tienes la captura.",
    tourMatchSaveTitle: "Guardar Partido",
    tourMatchSaveDesc:
      "Cuando al menos un paso está completado, haz clic aquí para resumen, Casa/Fuera y guardado.",
    tourGuidaIntroTitle: "Guía Completa",
    tourGuidaIntroDesc:
      'Descubre la plataforma: perfil, Cerebro AI, tour "Muéstrame cómo" y guías para cada página.',
    tourGuidaProfileHeroTitle: "Completar el Perfil",
    tourGuidaProfileHeroDesc:
      "Cuanto más completes el perfil, más te conoce la IA. Ve a Configuración de Perfil para rellenarlo.",
    tourGuidaBrainHeroTitle: "Cerebro AI",
    tourGuidaBrainHeroDesc:
      "Asistente siempre disponible abajo a la derecha. Pregunta lo que quieras: guía, motivación, pasos operativos.",
    tourGuidaPagesTitle: "Guías por Página",
    tourGuidaPagesDesc:
      "Guías rápidas para Panel, Formación, Añadir Partido, Contramedidas, Entrenadores, Perfil. Expande y ve a la página.",
    tourGuidaFooterTitle: "¿Tienes Preguntas?",
    tourGuidaFooterDesc:
      'Usa el Cerebro AI o el tour "Muéstrame cómo" (botón brújula arriba a la derecha) en cada página.',
    tourProfileIntroTitle: "Configuración del Perfil",
    tourProfileIntroDesc:
      "Personaliza datos personales, juego, preferencias IA y experiencia. Guarda sección por sección.",
    tourProfileProfilingTitle: "Perfilado",
    tourProfileProfilingDesc:
      "Indica cuánto te conoce la IA. Completa todas las secciones para acercarte al 100%.",
    tourProfilePersonalTitle: "Datos Personales",
    tourProfilePersonalDesc:
      'Nombre, apellido. Guarda con el botón "Guardar" en la sección.',
    tourProfileGameTitle: "Datos de Juego",
    tourProfileGameDesc:
      "División, equipo favorito, nombre del equipo en juego. Usados para consejos y estadísticas.",
    tourProfileAITitle: "Preferencias IA",
    tourProfileAIDesc:
      "Nombre de la IA, cómo recordarte. Personaliza el asistente.",
    tourProfileExpTitle: "Experiencia de Juego",
    tourProfileExpDesc:
      "Horas a la semana, problemas comunes. Ayudan a la IA a dar sugerencias específicas.",
    tourProfileCompleteTitle: "Completar Perfil",
    tourProfileCompleteDesc:
      'Guarda todo el perfil de una vez. Usa también los botones "Guardar" en las secciones individuales.',
    tourCounterIntroTitle: "Contramedidas pre-partido",
    tourCounterIntroDesc:
      "Carga la formación rival, extrae los datos, genera contramedidas tácticas e instrucciones con la IA.",
    tourCounterUploadTitle: "Cargar Formación Rival",
    tourCounterUploadDesc:
      "Carga una captura. Extracción y contramedidas se inician automáticamente.",
    tourCounterExtractedTitle: "Formación Extraída",
    tourCounterExtractedDesc:
      "Formación extraída. Las contramedidas se generan automáticamente.",
    tourCounterGenerateTitle: "Generar Contramedidas",
    tourCounterGenerateDesc:
      "La IA produce análisis, ajustes tácticos, instrucciones y sugerencias de jugadores.",
    tourCounterResultTitle: "Contramedidas Generadas",
    tourCounterResultDesc:
      "Análisis, contramedidas tácticas, instrucciones y jugadores clave. Aplica las sugerencias que prefieras.",
    tourCoachesIntroTitle: "Entrenadores",
    tourCoachesIntroDesc:
      "Gestiona los entrenadores: carga hasta 2 fotos (principal + conexión), establece activo, consulta detalles.",
    tourCoachesUploadTitle: "Cargar Entrenador",
    tourCoachesUploadDesc:
      "Carga 1 o 2 capturas (foto principal y conexión). La IA extrae nombre, equipo y competencias.",
    tourCoachesListTitle: "Lista de Entrenadores",
    tourCoachesListDesc:
      "Tarjeta para cada entrenador. Estrella = activo. Detalles, establecer como titular o eliminar.",

    tourDashboardSetupBannerTitle: "Completado del Setup",
    tourDashboardSetupBannerDesc:
      "Banner que muestra lo que falta para configurar completamente tu equipo: entrenador, estadísticas de juego, o formación completa. Haz clic en los enlaces para completar.",
    tourDashboardMissionCenterTitle: "Centro de Misiones",
    tourDashboardMissionCenterDesc:
      "Tu hub personal: objetivos diarios, desafíos especiales y seguimiento de progreso. Úsalo para entender el próximo paso útil.",
    tourDashboardGameAnalysisTitle: "Análisis Rápido de Partido",
    tourDashboardGameAnalysisDesc:
      "Carga las capturas de las estadísticas de juego (últimos 10 partidos) para recibir consejos personalizados y tareas específicas sobre tu estilo de juego.",
    tourFormationTacticalTitle: "Configuración Táctica",
    tourFormationTacticalDesc:
      "Personaliza instrucciones individuales para cada jugador: estilo de defensa, posicionamiento, apoyo y mucho más. Guarda tus preferencias tácticas.",
    tourMatchHomeAwayTitle: "Casa o Fuera",
    tourMatchHomeAwayDesc:
      "Selecciona si has jugado en casa o fuera. Esto ayuda a la IA a identificar correctamente tu equipo en las estadísticas del partido.",
    tourCoachesActiveTitle: "Entrenador Activo",
    tourCoachesActiveDesc:
      "El entrenador con la estrella es el actualmente configurado para tu equipo. Su estilo de juego influye en los consejos tácticos que recibes.",

    back: "Atrás",
    whatIsFormation: "¿Qué es una formación?",
    whatIsFormationDesc:
      "Una formación es una captura que muestra los 11 jugadores en el campo. Cargando una formación, los jugadores se identifican automáticamente como TITULARES.",
    whatIsCard: "¿Qué es una carta de jugador?",
    whatIsCardDesc:
      "Una carta es una captura de un solo jugador que muestra sus estadísticas, habilidades y booster. Las cartas se guardan como RESERVAS.",
    whatIsSwap: "¿Cómo funciona el intercambio?",
    whatIsSwapDesc:
      "Haz clic en un jugador para seleccionarlo, luego haz clic en otro para intercambiar sus posiciones. Un titular pasa a reserva y viceversa.",
    noFormationLoaded: "Ninguna formación cargada",
    loadFormationFirst:
      'Carga los jugadores uno a uno desde la sección "Jugadores" para ver el campo 2D',
    clickToAssign: "Haz clic para asignar",
    assignPlayer: "Asignar Jugador",
    modifySlot: "Modificar Slot",
    currentPlayer: "Jugador actual",
    removeFromSlot: "Quitar del Slot",
    deletePermanently: "Eliminar Definitivamente",
    moveToReserves: "Mover a Reservas",
    photoUploadedSuccessfully: "¡Foto cargada con éxito!",
    uploadedPhotoLabel: "Foto cargada",
    playerAssignedSuccessfully: "¡Jugador asignado con éxito!",
    playerDeletedSuccessfully: "¡Jugador eliminado con éxito!",
    playerMovedToReserves: "¡Jugador movido a reservas!",
    tacticalSettingsSaved: "¡Configuración táctica guardada con éxito!",
    errorUploadingPhoto: "Error al cargar la foto",
    errorAssigningPlayer: "Error al asignar el jugador",
    errorDeletingPlayer: "Error al eliminar el jugador",
    errorMovingPlayer: "Error al mover el jugador",
    errorSavingTacticalSettings:
      "Error al guardar la configuración táctica",
    uploadPlayerPhoto: "Cargar Foto del Jugador",
    changePlayer: "Cambiar Jugador (Cargar Foto)",
    orSelectFromReserves: "O seleccionar de reservas",
    noFormationMessage:
      'Ninguna formación cargada. Carga los jugadores uno a uno desde la sección "Jugadores" para ver el campo 2D',
    changeFormation: "Cambiar Formación",
    priority: "Prioridad",
    priorityHigh: "ALTA",
    priorityMedium: "MEDIA",
    priorityLow: "BAJA",
    importFromScreenshot: "Importar desde Captura (Avanzado)",
    removeFromSlot: "Quitar del Slot",
    deletePermanently: "Eliminar Definitivamente",
    remove: "Quitar",
    loadReserve: "Cargar Reserva",
    completeProfile: "Completar Perfil",
    goToPlayerProfile: "Ir al perfil",
    partialProfile: "Perfil parcial",
    clickToComplete: 'Haz clic en "Completar Perfil" para añadir datos faltantes',
    profileSettings: "Configuración del Perfil",
    personalData: "Datos Personales",
    gameData: "Datos de Juego",
    aiPreferences: "Preferencias IA",
    gameExperience: "Experiencia de Juego",
    teamNameInGame: "Nombre del equipo en el juego",
    important: "Importante",
    teamNameDescription:
      "💡 Este nombre se usará para identificar tu equipo en los partidos y en las estadísticas",
    profiling: "Perfilado",
    completeFor100: "Completa para el 100%",
    moreYouAnswer: "💡 ¡Cuanto más respondas, más te conoce la IA y mejor te ayuda!",
    firstName: "Nombre",
    lastName: "Apellido",
    yourFirstName: "Tu nombre",
    yourLastName: "Tu apellido",
    currentDivision: "División actual",
    selectDivision: "Seleccionar división",
    favoriteTeam: "Equipo favorito",
    favoriteTeamPlaceholder: "Ej: Juventus, Real Madrid...",
    aiName: "Nombre de la IA (opcional)",
    aiNamePlaceholder: 'Ej: "Coach Mario", "Alex"',
    howToRemember: "¿Cómo quieres que te recuerde?",
    howToRememberPlaceholder:
      'Ej: "Soy un jugador competitivo...", "Juego por diversión..."',
    hoursPerWeek: "¿Cuántas horas juegas a la semana?",
    hoursPerWeekPlaceholder: "0-168 horas",
    whichProblems: "¿Qué problemas encuentras?",
    problemPassaggi: "Pases",
    problemDifesa: "Defensa",
    problemCentrocampo: "Mediocampo",
    problemAttacco: "Ataque",
    problemFormazione: "Formación",
    problemIstruzioniTattiche: "Instrucciones tácticas",
    loadingProfile: "Cargando perfil...",
    profileSectionSaved: "¡guardado con éxito!",
    profileLevelComplete: "Completo",
    profileLevelIntermediate: "Intermedio",
    profileLevelBeginner: "Principiante",
    savedSuccessfully: "¡guardado con éxito!",
    skipped: "Saltado",
    sectionsCompleted: "secciones completadas",
    deleteReserve: "Eliminar Reserva",
    confirmDeleteReserve:
      "¿Estás seguro de que quieres eliminar definitivamente a este jugador de las reservas?",
    formationCustom: "Personalizado",
    customizePositions: "Personalizar Posiciones",
    saveChanges: "Guardar Cambios",
    cancel: "Cancelar",
    editModeActive:
      "Modo personalización activo: arrastra los jugadores para moverlos",
    positionsSavedSuccessfully: "Posiciones guardadas con éxito",
    errorSavingPositions: "Error al guardar posiciones",
    changesCancelled: "Cambios cancelados",
    formationInvalidTitle: "Revisa la formación",
    formationInvalidConfirm: "¿Quieres guardar de todos modos?",
    formationValidationSimple:
      "Verifica que cada jugador esté en el rol que usas realmente en el partido. La app y la coach AI usan esta disposición y estas posiciones, junto con otros datos de la plantilla, para personalizar consejos y análisis.",
    formationSavedWithWarnings:
      "Formación guardada. Comprueba que roles y posiciones reflejen cómo sales al campo: la coach AI se basa también en esta pantalla.",
    saveCancelled: "Guardado cancelado",
    deleteReserveError: "Error al eliminar jugador",
    details: "Detalles del Jugador",
    assignPlayer: "Asignar Jugador",
    slot: "Slot",
    playerInfo: "Info del Jugador",
    age: "Edad",
    club: "Club",
    nationality: "Nacionalidad",
    playingStyle: "Estilo de Juego",
    years: "años",
    overallRating: "Overall",
    uploadOneImageOnly: "Carga solo una imagen a la vez",
    saveAndUpdate: "Guardar y Actualizar",
    createFormation: "Crea tu formación",
    selectFormationDesc:
      "Selecciona una formación táctica predefinida para empezar. Luego podrás cargar las cartas de los jugadores para cada slot.",
    createFormationBtn: "Crear Formación",
    updatePhoto: "Actualizar Foto",
    uploadModifyPhoto: "Cargar/Modificar Foto",
    uploadPlayerInstructions:
      "Carga las imágenes para extraer automáticamente los datos del jugador",
    photoStats: "Foto Estadísticas",
    photoStatsDesc: "Carta con estadísticas numéricas",
    photoSkills: "Foto Habilidades",
    photoSkillsDesc: "Habilidades del jugador (Player Skills)",
    photoBooster: "Foto Booster",
    photoBoosterDesc: "Booster y bonus especiales (opcional)",
    slotInfo: "Slot",
    currentPlayerInfo: "Jugador actual",
    extractedDataFromPhoto: "Datos Extraídos de la Foto",
    statsSection: "Estadísticas",
    skillsSection: "Habilidades",
    boostersSection: "Booster",
    notAvailable: "No disponibles",
    extractedFromCard: "(extraídos de la carta)",
    profileComplete: "Perfil Completo",
    sectionsCompleted: "secciones completadas",
    statsNotAvailable: "Estadísticas no disponibles",
    skillsNotAvailable: "Ninguna habilidad disponible",
    boostersNotAvailable: "Booster no disponibles",
    updateStats: "Actualizar Estadísticas",
    uploadStats: "Cargar Estadísticas",
    updateSkills: "Actualizar Habilidades",
    uploadSkills: "Cargar Habilidades",
    updateBoosters: "Actualizar Booster",
    uploadBoosters: "Cargar Booster",
    skillsLabel: "HABILIDADES",
    comSkillsLabel: "COM SKILLS",
    activeBoosters: "BOOSTER ACTIVOS",
    effect: "Efecto",
    condition: "Condición",
    statsLabel: "Estadísticas",
    statistics: "Estadísticas",
    comSkills: "Habilidades adicionales",
    skillsBoosterLabel: "Habilidades/Booster",
    name: "Nombre",
    team: "Equipo",
    role: "Rol",
    nA: "N/D",
    aiKnowledge: "Conocimiento AI",
    aiKnowledgeLevel: "Nivel",
    aiKnowledgeBeginner: "Principiante",
    aiKnowledgeIntermediate: "Intermedio",
    aiKnowledgeAdvanced: "Avanzado",
    aiKnowledgeExpert: "Experto",
    aiKnowledgeDescription: "Estamos aprendiendo a conocerte",
    aiKnowledgeDescriptionBeginner:
      "Estamos aprendiendo a conocerte: añade perfil, plantilla y partidos para consejos realmente tuyos.",
    aiKnowledgeDescriptionIntermediate:
      "Te conocemos bastante bien: los consejos ya son personalizados. Añade partidos y objetivos para ir más allá.",
    aiKnowledgeDescriptionAdvanced:
      "Te conocemos bien: los consejos reflejan tu forma de jugar.",
    aiKnowledgeDescriptionExpert:
      "Nivel experto: los consejos son muy a medida. Más partidos y uso ayudan a alcanzar el 100%.",
    aiKnowledgeProfile: "Perfil",
    aiKnowledgeRoster: "Plantilla",
    aiKnowledgeMatches: "Partidos",
    aiKnowledgePatterns: "Patrones",
    aiKnowledgeCoach: "Entrenador",
    aiKnowledgeUsage: "Uso",
    aiKnowledgeSuccess: "Éxitos",
    aiKnowledgeBadge: "AI COACH INSIGHT",
    poweredByCoachAI: "Powered by Coach AI Engine",
    aiKnowledgeBeginnerShort: "Empieza tu camino",
    aiKnowledgeIntermediateShort: "Estás mejorando",
    aiKnowledgeAdvancedShort: "Competencia elevada",
    aiKnowledgeExpertShort: "Maestro del juego",
    viewDetails: "Ver detalles",
    completeProfileToIncreaseKnowledge:
      "Un paso más: completa nombre, equipo y división. Así los consejos serán realmente tuyos.",
    ctaNextStepProfile:
      "Falta un poco de perfil (nombre, equipo, división). Rellénalo para consejos a medida.",
    ctaNextStepProfileDetails:
      "Añade otros detalles en Configuración del perfil (equipo favorito, horas de juego, cómo recordarte) para consejos aún más a medida.",
    ctaNextStepRoster:
      "Introduce tu plantilla y la formación (11 titulares): así podemos hablar de tus jugadores.",
    ctaNextStepMatches:
      "Añade los partidos que juegas: cuantos más introduzcas, más reflejarán los consejos cómo juegas realmente.",
    ctaNextStepPattern:
      "Añade más partidos: de ahí obtenemos formaciones y estilos que usas y los puntos en los que trabajar.",
    ctaNextStepCoach:
      "Elige un entrenador activo en la sección Entrenadores: los consejos tendrán en cuenta su estilo.",
    ctaNextStepUsage:
      "Usa el chat y las funciones IA: cuanto más las uses, más entendemos cómo ayudarte.",
    ctaNextStepSuccess:
      "Completa los objetivos semanales: además de subir la barra, nos dicen cómo estás mejorando.",
    ctaNextStepCoachTraining:
      "Usa el Gimnasio Coach: las sesiones con feedback táctico aumentan el conocimiento que la IA tiene de ti.",
    aiKnowledgePatternsHint:
      "Formaciones y estilos que usas en partido y problemas recurrentes: los obtenemos de los partidos que introduces. Sirven para consejos más específicos.",
    aiKnowledgeSuccessHint:
      "Objetivos semanales completados, mejora de división y defensa (comparando los últimos partidos con los anteriores). Muestran tus progresos.",
    setupReminderIntro:
      "Cuanto más rellenes la barra, más a medida serán los consejos para ti.",
    setupReminderMissingCoach: "Entrenador",
    setupReminderMissingStats: "Estadísticas de juego",
    setupReminderMissingRoster: "Plantilla (11 titulares)",
    setupReminderMissingRosterEmpty: "Carga tu plantilla",
    setupReminderMissingRosterPartial: "Completa tu plantilla",
    setupTipStatsRefresh:
      "Actualiza las estadísticas (2 fotos) para consejos más precisos",
    setupTipCoachGymCheckin:
      "Haz un check-in en Gimnasio Coach para mantener la IA alineada",
    setupTipCoachReview:
      "Revisa coach y estilo para mejorar la coherencia de los consejos",
    setupTipRosterReview:
      "Revisa la plantilla y los roles para mantener el plan táctico estable",
    setupReminderComplete: "Setup completo",
    setupReminderDismiss: "Ocultar",
    pwaInstallTitle: "Añade Zero to Hero a la pantalla de inicio",
    pwaInstallSubtitle:
      "Abre la app como un icono en el teléfono, sin pasar por el navegador.",
    pwaInstallBenefit:
      "Acceso rápido, pantalla completa y la misma experiencia del panel.",
    pwaInstallStepIos1: "Toca Compartir abajo (icono con la flecha)",
    pwaInstallStepIos2: "Desliza y elige «Añadir a la pantalla de inicio»",
    pwaInstallStepIos3: "Confirma: el icono «Zero to Hero» aparecerá en la pantalla de inicio",
    pwaInstallStepAndroid1: "Toca el menú ⋮ arriba a la derecha (o Compartir)",
    pwaInstallStepAndroid2: "Elige «Añadir a la pantalla de inicio» o «Instalar app»",
    pwaInstallStepAndroid3: "Confirma: el icono aparecerá en la pantalla de inicio",
    pwaInstallIosHint:
      "En iPhone usa Safari: Chrome no soporta la adición a la pantalla de inicio.",
    pwaInstallCtaGotIt: "Entendido, procedo",
    pwaInstallCtaInstall: "Instalar app",
    pwaInstallInstalling: "Instalando…",
    pwaInstallRemindLater: "Recuérdamelo en unos días",
    pwaInstallDismiss: "No mostrar más",
    pwaInstallOpenManual: "Añadir a la pantalla de inicio",
    setupStatusRosterMissing:
      "Carga tu plantilla para empezar a tener consejos realmente a medida.",
    setupStatusRosterPartial:
      "La plantilla ya está: complétala para tener consejos aún más coherentes.",
    setupStatusCritical:
      "Aún quedan algunos pasos por completar para tener consejos más coherentes.",
    setupStatusPartial:
      "Solo te falta algún detalle para que los consejos sean más precisos.",
    setupStatusComplete:
      "Setup completo. Los consejos se basan en los datos que has introducido.",
    refreshAnalysis: "Actualizar análisis",
    refreshAnalysisSuccess: "Análisis actualizado",
    refreshAnalysisRateLimit:
      "Puedes actualizar el análisis como máximo 2 veces por minuto. Inténtalo de nuevo en {seconds} segundos.",

    creditsTitle: "Créditos AI",
    creditsSubtitle:
      "Usados para chat, análisis de partidos, extracción de datos y contramedidas.",
    creditsUsed: "Usados",
    creditsIncluded: "Incluidos",
    creditsOverage: "Sobre el plan",
    creditsPeriod: "Período",
    creditsLoading: "Cargando uso…",
    creditsError: "No se puede cargar el uso de créditos.",
    creditsOverageHint:
      "Créditos por encima de los incluidos en el plan. Se facturarán por consumo.",
    creditsViewAria: "Ver créditos AI",
    creditsCloseAria: "Cerrar créditos",
    creditsTempBalance: "Bonus temporales",
    creditsTempExpiry: "Caducan en 7 días desde la asignación",
    creditsPermanent: "créditos",
    creditsTemporary: "créditos temporales",
    heroPoints: "Hero Points",
    creditiResidui: "Créditos restantes",
    acquista: "Comprar",
    gestioneProfilo: "Gestión de perfil",
    goToHeroPoints: "Ir a Hero Points",
    editProfileData: "Editar datos del perfil",
    attivitaRecente: "Actividad reciente",
    analisiTotali: "Análisis totales",
    rankAttuale: "Rango actual",
    membroDal: "Miembro desde",
    vediTutteTransazioni: "Ver todas las transacciones",
    acquistaCreditiCard: "Comprar créditos",
    acquistaCreditiSubtitle: "Consigue Hero Points para los análisis",
    personalizzaAvatar: "Personalizar avatar",
    personalizzaAvatarSubtitle: "Desbloquea avatares exclusivos",
    acquistoCrediti: "Compra de créditos",
    transactionUsage: "Uso",
    transactionAnalysis: "Análisis",
    noTransactionsYet: "Ninguna transacción aún.",
    retry: "Reintentar",
    errorLoadingUsage: "Error al cargar créditos.",
    rankPlatinum: "PLATINUM",
    rankGold: "GOLD",
    rankSilver: "SILVER",
    rankBronze: "BRONZE",
    transactionTypeAssistantChat: "Chat asistente",
    transactionTypeExtractPlayer: "Extracción de jugador",
    transactionTypeExtractCoach: "Extracción de entrenador",
    transactionTypeExtractMatchData: "Extracción de datos de partido",
    transactionTypeGenerateCountermeasures: "Contramedidas",
    transactionTypeExtractFormation: "Extracción de formación",
    transactionTypeExtractGameAnalysis: "Estadísticas de juego",
    transactionTypeAnalyzeMatch: "Análisis de partido",
    weeklyGoals: "Objetivos Semanales",
    noGoalsThisWeek: "Ningún objetivo esta semana",
    goalsWillBeGenerated:
      "Los objetivos se generarán automáticamente cada domingo",
    goalCompleted: "Objetivo completado",
    goalCompletedFeedback:
      "¡Objetivo completado! Contribuye a la barra de Conocimiento IA.",
    goalFailed: "Objetivo fallido",
    goalsIncreaseKnowledge:
      "Completar los objetivos aumenta el conocimiento que la IA tiene de ti.",
    goalsContributeToBar:
      "Completando los objetivos semanales nos ayudas a conocerte mejor: los consejos serán más específicos.",
    goalDifficultyEasy: "Fácil",
    goalDifficultyMedium: "Medio",
    goalDifficultyHard: "Difícil",
    viewAllGoals: "Ver todos los objetivos",
    currentWeek: "Semana actual",
    active: "activos",
    notAuthenticated: "No autenticado",
    failedToFetchTasks: "Error al recuperar las tareas",
    errorLoadingTasks: "Error al cargar las tareas",
    goalCompleteMatches: "Completa al menos {count} partidos esta semana",
    goalCleanSheets:
      "Mantén la portería a cero en al menos {count} partidos (clean sheet)",
    goalUseRecommendedFormation:
      "Usa la formación recomendada en al menos {count} partido(s)",
    goalUseAIRecommendations:
      "Usa al menos {count} veces chat, análisis de partido o contramedidas esta semana",
    goalReduceGoalsConceded:
      "Reduce los goles encajados en un 20% (de {from} a {to} por partido)",
    goalImprovePossession:
      "Mejora la posesión de balón en un 10% (del {from}% al {to}%)",
    goalIncreaseWins: "Gana al menos {count} partidos esta semana",
    goalImproveDefense:
      "Usa formación más defensiva en al menos {count} partidos",
    errorLoadingLeaderboard: "Error al cargar la clasificación.",
    classifica: "Clasificación",
    classificaMensile: "Clasificación mensual",
    fromZeroToHero: "From Zero to Hero",
    puntiCoach: "Puntos Coach",
    laTuaPosizione: "Tu posición",
    vediClassifica: "Ver clasificación",
    giorniAllaFineMese: "Días hasta fin de mes",
    comeSalire: "Cómo subir",
    comeSalireHint:
      'Los puntos provienen de: partidos completos, uso de herramientas AI y perfil completo. Las tareas semanales sirven para la barra "cuánto te conoce la IA", no para la clasificación.',
    posizione: "Posición",
    nickname: "Nickname",
    leaderboardConsent: "Incluirme en la clasificación mensual",
    leaderboardConsentHint:
      "Si está activo, tu posición y nickname serán visibles en la clasificación From Zero to Hero.",
    nicknamePlaceholder: "Ej: TuNick",
    nicknameHint:
      "Nombre visible en la clasificación (opcional). Si está vacío se mostrará un guion.",
    leaderboardParticipant: "inscrito",
    leaderboardParticipants: "inscritos",
    punti: "Puntos",
    nonInClassifica: "No en clasificación",
    entraInClassifica:
      "Entra en la clasificación: completa al menos 1 partido este mes y perfil al 50% o más.",
    risultatiOttenuti: "Resultados obtenidos",
    storicoClassifica: "Historial de clasificación",
    iMieiPremi: "Mis premios",
    daRiscattare: "Por canjear",
    riscattato: "Canjeado",
    riscatta: "Canjear",
    nessunPremio: "Ningún premio por canjear.",
    breakdownPunti: "Detalle de puntos",
    daPartite: "De partidos",
    daObiettivi: "De objetivos",
    daUtilizzoIA: "De uso IA",
    daProfilo: "De perfil",
    daMiglioramento: "De mejora",
    prizeCoachFree: "Coach gratuito",
    prizeCredits: "Créditos de regalo",
    prizeMatchTicket: "Billete de partido",
    prizeStampa3d: "Impresión 3D de jugador",

    coachDataSettingsTitle: "Datos técnicos de juego",
    coachDataSettingsDesc:
      "Para modificar plataforma, conexión, nivel de pase y punto débil, usa el Gimnasio Coach.",
    openCoachGym: "Abrir Gimnasio Coach",

    missionRosterTitle: "Completa la Plantilla",
    missionRosterMsg:
      "Tienes {{current}}/11 titulares. ¡Faltan {{missing}} para el equipo completo!",
    missionRosterAction: "Añadir jugadores",
    missionRosterChat:
      "Solo tengo {{current}} jugadores en la plantilla. ¿Por qué debería completarla antes de jugar?",
    missionFirstMatchTitle: "¿Listo para el Debut?",
    missionFirstMatchMsg:
      "Tu plantilla está lista. ¡Carga tu primer partido para desbloquear la IA!",
    missionFirstMatchAction: "Cargar partido",
    missionFirstMatchChat:
      "Acabo de completar la plantilla. ¿Qué me recomiendas para el primer partido?",
    missionProfileTitle: "Último Paso: Perfil",
    missionProfileMsg:
      "Añade tu punto débil para recibir consejos específicos.",
    missionProfileAction: "Completar perfil",
    missionProfileChat:
      "No sé qué poner como punto débil en el perfil. ¿Puedes ayudarme a entender cuál es mi problema principal?",
    missionAnalysisTitle: "Análisis eFootball",
    missionAnalysisMsg:
      "Carga la captura de las estadísticas para análisis avanzados.",
    missionAnalysisAction: "Cargar análisis",
    missionAnalysisChat:
      "¿Para qué sirve el análisis de estadísticas eFootball? ¿Cómo lo encuentro en el juego?",
    missionCompleteTitle: "¡Misión Completada!",
    missionCompleteMsg:
      "¡Has completado todo! Ahora puedes estudiar contramedidas y afinar tu juego.",
    missionCompleteAction: "Contramedidas",
    missionCompleteChat:
      "He completado todas las misiones iniciales. ¿Qué me recomiendas para seguir mejorando mi juego?",
    missionProgressLabel: "Progreso",
    viewDetails: "Ver detalles",
    askCoach: "Preguntar al Coach",
    completed: "completados",
    taskHelpMessage: "Ayúdame con este objetivo: {{task}}",

    roadmapTitle: "Tu camino de Zero a Hero",
    roadmapSubtitle: "Cada dato cuenta. Cuantos más datos tengas, más tuyos serán los consejos.",
    roadmapRosterTitle: "Construye tu Plantilla",
    roadmapRosterShort: "11 titulares + 5 reservas",
    roadmapRosterDesc:
      "Sin tus jugadores, la IA no sabe quién eres. Carga fotos, estadísticas y posiciones para recibir consejos basados en TUS jugadores, no genéricos.",
    roadmapRosterWhy:
      'Cuantos más datos tengas sobre la plantilla, más podrá la IA decirte "Con Ronaldo en ataque, prueba este estilo" en lugar de "Prueba un delantero rápido".',
    roadmapFirstMatchTitle: "Juega y Carga",
    roadmapFirstMatchShort: "Tu primer partido",
    roadmapFirstMatchDesc:
      "Un partido cargado vale más que 1000 palabras. La IA ve tu formación, el resultado, las estadísticas.",
    roadmapFirstMatchWhy:
      "El primer partido activa el análisis básico. La IA empieza a entender si prefieres jugar en casa o fuera, si atacas más o defiendes.",
    roadmapProfileTitle: "Cuenta quién eres",
    roadmapProfileShort: "Plataforma, conexión, punto débil",
    roadmapProfileDesc:
      "¿Estás en consola o PC? ¿Tienes lag? ¿Tu punto débil es la defensa? Estos datos filtran los consejos.",
    roadmapProfileWhy:
      'Si juegas con PA1 y dices "defensa", la IA sugiere tácticas diferentes que si juegas PA3 y dices "ataque". Personalización real.',
    roadmapMatchesTitle: "Construye la Historia",
    roadmapMatchesShort: "3-5 partidos para patrones",
    roadmapMatchesDesc:
      'Con 3 partidos la IA ve patrones: "Siempre usas el 4-3-3 y pierdes contra el 5-3-2". Con 5, los consejos se vuelven precisos.',
    roadmapMatchesWhy:
      "3 partidos = patrones básicos (uso de formaciones). 5 partidos = patrones avanzados (qué funciona contra qué). 10+ = consejos de pro.",
    roadmapAnalysisTitle: "Análisis eFootball",
    roadmapAnalysisShort: "Estadísticas de juego",
    roadmapAnalysisDesc:
      "Carga la captura de las estadísticas eFootball. Posesión de balón, pases acertados, disparos a puerta.",
    roadmapAnalysisWhy:
      'Las estadísticas objetivas confirman o desmienten tus percepciones. "Creo que paso bien" vs "Tienes 65% de pases acertados".',
    roadmapPalestraTitle: "Gimnasio Coach",
    roadmapPalestraShort: "Feedback y conversación",
    roadmapPalestraDesc:
      'Cuéntale a la IA cómo ha ido. "Seguí tu consejo pero perdí". Esto adapta los consejos futuros.',
    roadmapPalestraWhy:
      "Cada sesión de Gimnasio aumenta un 10% el conocimiento AI. Después de 4 sesiones, la IA te conoce como un coach real.",
    roadmapMasteryTitle: "Maestro",
    roadmapMasteryShort: "De Zero a Hero",
    roadmapMasteryDesc:
      "Tienes 10+ partidos, perfil completo, usas el Gimnasio. La IA conoce tus patrones, tus puntos débiles, tus puntos fuertes.",
    roadmapMasteryWhy:
      'A este nivel, los consejos son específicos al 90%. "En tu 4-3-3 con esa conexión, contra el 5-3-2 usa este enfoque".',
    current: "Actual",
    whyImportant: "Por qué es importante:",
    continue: "Continuar",
    completed: "Completado",
    inProgress: "En curso",
    locked: "Bloqueado",
    viewFullRoadmap: "Ver Roadmap completa",
    roadmapMiniTitle: "Tu camino",

    onboardingTitle: "Cómo funciona",
    onboardingSubtitle: "Descubre cómo mejorar con tu Coach AI",
    onboardingKeyMessage: "Cuanto más me uses seriamente, más te ayudo",
    onboardingStep1Title: "Pre-partido",
    onboardingStep1Desc:
      "Crea contramedidas tácticas analizando la formación rival antes del partido",
    onboardingStep2Title: "Después del partido",
    onboardingStep2Desc:
      "Añade el partido y carga las capturas para el análisis detallado",
    onboardingStep3Title: "Análisis",
    onboardingStep3Desc:
      "Cuenta tu experiencia en el Gimnasio Coach para feedback personalizado",
    onboardingStep4Title: "Mejora",
    onboardingStep4Desc:
      "Pide consejos al Chat AI para mejorar tu juego",
    onboardingStep5Title: "Live Coach",
    onboardingStep5Desc:
      "Habla directamente con tu Coach AI en tiempo real para consejos inmediatos antes de los partidos",
    onboardingStart: "¡Empieza ahora!",
    onboardingNext: "Siguiente",
    onboardingClose: "Cerrar",

    formationOnboardingTitle: "Cómo funciona",
    formationOnboardingKeyTitle: "Tu formación es fundamental",
    formationOnboardingKeySubtitle:
      "Descubre cómo cargar y gestionar la plantilla en pocos pasos",
    formationStep1Title: "Carga tu formación",
    formationStep1Desc:
      "Para cada jugador carga 3 fotos: estadísticas, habilidades y booster. La IA extraerá automáticamente los datos.",
    formationStep2Title: "Introducción manual",
    formationStep2Desc:
      "Si la IA no reconoce algún jugador, puedes introducirlo manualmente. Revisa siempre los datos extraídos antes de guardar.",
    formationStep3Title: "Posibles errores",
    formationStep3Desc:
      "Capturas borrosas, recortadas o con gráficos diferentes pueden causar errores. Asegúrate de que el nombre del jugador y las estadísticas sean legibles.",
    formationStep4Title: "Guarda las posiciones",
    formationStep4Desc:
      "Comprueba que cada jugador esté en la posición correcta. Una vez guardado, el sistema usará estos datos para todos los análisis futuros.",
    formationStep5Title: "Personaliza posiciones",
    formationStep5Desc:
      "Activa el modo 'Personalizar' para arrastrar a los jugadores por el campo. Útil si quieres simular diferentes disposiciones tácticas.",
    formationOnboardingStart: "¡Empieza ahora!",
    formationOnboardingTutorialLink:
      "¿Quieres instrucciones y consejos específicos? Haz clic aquí",
    starterPackImportCta: "Importar una formación de prueba",
    starterPackImportLoading: "Importando...",
    starterPackEmptyMessage:
      "Ahora puedes probar la app enseguida y testear todas las funciones, incluido el coach. Recuerda sin embargo que esta no es tu formación real. Para recibir consejos realmente personalizados, carga tu plantilla.",
    starterPackPartialMessage:
      "Mantenemos los jugadores que ya has introducido y completamos automáticamente solo lo que falta.",
    starterPackDismiss: "Ocultar sugerencia de formación de prueba",
    starterPackImportSuccess: "Formación de prueba importada con éxito.",
    starterPackFillSuccess:
      "Hemos completado automáticamente lo que faltaba.",
    starterPackImportError:
      "No se puede importar la formación de prueba. Inténtalo de nuevo en breve.",
    nuovaRosaPrivateLab: "Lab privado",
    nuovaRosaTitle: "Nueva Plantilla",
    nuovaRosaOpenCurrent: "Abrir la plantilla actual",
    nuovaRosaStatusLabel: "Tu plantilla en construcción",
    nuovaRosaPlayers: "Jugadores",
    nuovaRosaStarters: "Titulares",
    nuovaRosaFormation: "Formación",
    nuovaRosaWorkspace: "Workspace de formación",
    nuovaRosaReserves: "Reservas",
    nuovaRosaNoReserves: "Sin reservas aún.",
    nuovaRosaLoading: "Cargando plantilla...",
    nuovaRosaStageEmptyTitle: "Empieza la plantilla con cartas reales",
    nuovaRosaStageEmptyText:
      "Haz clic en un slot para abrir el catálogo oficial. Completa la plantilla con menos fricción y mantén los datos editables.",
    nuovaRosaStageEmptyCta: "Importar starter pack",
    nuovaRosaStageSeededTitle: "Ya tienes una base",
    nuovaRosaStageSeededText:
      "Completa los slots que faltan con el catálogo, luego afina roles, reservas y detalles de jugador.",
    nuovaRosaStageSeededCta: "Completa los que faltan",
    nuovaRosaStagePartialTitle: "Plantilla en construcción",
    nuovaRosaStagePartialText:
      "Añade los titulares desde el campo y luego afina reservas, tácticas y fichas de jugador.",
    nuovaRosaStageFormationReadyTitle: "Formación lista",
    nuovaRosaStageFormationReadyText:
      "Tienes los once titulares. Añade coach y tácticas para una lectura más completa.",
    nuovaRosaStageSystemReadyTitle: "Sistema listo",
    nuovaRosaStageSystemReadyText:
      "Plantilla, formación y contexto táctico están alineados.",
    nuovaRosaSelectOfficialSkill: "Selecciona habilidad oficial",
    nuovaRosaChooseOfficialSkill: "Elige entre las habilidades eFootball",

    coachSuggestionLabel: "Tu coach te sigue",
    coachSuggestionCriticalTitle: "Mantengámonos actualizados",
    coachSuggestionCriticalMessage:
      "Cuanto más me actualices sobre cómo juegas, más puedo ayudarte de verdad. Si quieres, empecemos por tus estadísticas.",
    coachSuggestionCriticalMessageWithMatches:
      "Ya has hecho un gran trabajo con los partidos guardados. Si añades también las estadísticas, mis consejos serán aún más a medida.",
    coachSuggestionPostMatchTitle: "Hagamos un chequeo rápido",
    coachSuggestionPostMatchMessage:
      "Cuéntame cómo ha ido: incluso un breve debrief me ayuda a entender qué reforzar y qué arreglar enseguida.",
    coachSuggestionFirstTimeTitle: "Empecemos bien juntos",
    coachSuggestionFirstTimeMessage:
      "Si compartes conmigo algunas estadísticas, te conozco mejor y puedo guiarte con indicaciones más útiles desde el principio.",
    coachSuggestionCoachMissingTitle: "Añade el coach cuando quieras",
    coachSuggestionCoachMissingMessage:
      "Con un coach activo los consejos siguen mejor tu estilo de equipo. Puedes añadirlo ahora o hacerlo más tarde.",
    coachSuggestionPalestraTitle: "¿Te apetece una actualización rápida?",
    coachSuggestionPalestraMessage:
      "Un paso por el Gimnasio Coach me ayuda a mantenerme alineado contigo y a darte consejos cada vez más precisos.",
    coachSuggestionActionSetup: "Abrir el resumen",
    coachSuggestionActionStats: "Actualízame con las estadísticas",
    coachSuggestionActionCoaches: "Ir a Entrenadores",
    coachSuggestionActionPalestra: "Abrir Gimnasio Coach",
    coachSuggestionLater: "Más tarde",
    selectImageFile: "Selecciona un archivo de imagen",
    notVisible: "No visible",
    fluidFormation: "Formación fluida",
    fluidFormationHelp: "Los mismos 11 titulares, disposición distinta en ataque y en defensa. La formación principal no cambia.",
    fluidFormationToggle: "¿La usas en eFootball?",
    fluidFormationToggleHint: "Si no, Hero sigue usando la formación normal.",
    fluidAttack: "Ataque",
    fluidDefense: "Defensa",
    fluidCopyBase: "Copiar base",
    fluidCopyOther: "Copiar la otra fase",
    fluidNeedStarters: "Hace falta una formación guardada y 11 titulares. La Formación fluida no crea una segunda plantilla.",
    fluidSaved: "Formación fluida guardada. Hero ahora conoce Ataque y Defensa.",
    fluidDisabled: "Formación fluida desactivada. La configuración se conserva.",
    fluidSave: "Guardar formación fluida",
    fluidSaveError: "No se pudo guardar la Formación fluida.",
    fluidLoadError: "No se pudo cargar la Formación fluida.",
    fluidPitchHelp: "Arrastra a los titulares a la posición del Plan de Juego y asigna el rol de esa fase. No cambia quién es titular.",
    coachLinkUps: "Conexiones del entrenador",
    coachLinkUpsHelp: "Algunos entrenadores v6 tienen hasta dos Link-up Play. Guarda solo lo visible en la carta.",
    coachLinkUpsNoCoach: "Define primero un entrenador activo.",
    coachLinkUpsNeedScreenshot: "Carga al menos una captura de la Conexión.",
    coachLinkUpsRead: "Leer Conexiones (2 HP)",
    coachLinkUpsReading: "Hero está leyendo...",
    coachLinkUpsReadError: "No se pudieron leer las Conexiones.",
    coachLinkUpsReadDone: "Lectura completada: {{count}} Conexión/es. Revisa y guarda.",
    coachLinkUpsSaved: "Conexiones guardadas. Hero las evalúa una a una con tus 11 titulares.",
    coachLinkUpsSave: "Guardar Conexiones",
    coachLinkUpsSaveError: "No se pudieron guardar las Conexiones.",
    coachLinkUpsLoadError: "No se pudieron cargar las Conexiones.",
    coachLinkUpsSlot1: "Primera Conexión",
    coachLinkUpsSlot2: "Segunda Conexión, si existe",
    coachLinkUpsCost: "1 o 2 pantallas en un solo análisis: 2 HP.",
    coachLinkUpsEmpty: "No hay Conexión que guardar. Si el entrenador no tiene, no añadas nada.",
    opponentFluidToggle: "Formación fluida rival",
    opponentFluidToggleHint: "No: una sola foto, como siempre. Hero arranca solo.",
    opponentFluidNeedBoth: "Hacen falta las dos fotos. Hero arranca solo cuando Ataque y Defensa están listas.",
    opponentFluidMissingSecond: "Falta una foto. Añádela, o vuelve a Formación fluida = NO.",
    opponentAttackPhase: "Ataque",
    opponentDefensePhase: "Defensa",
    v6PhaseAnalysis: "Cruce de ataque y defensa",
    v6FluidDecision: "Decisión de Formación fluida",
    v6LinkUpPlan: "Conexiones para este partido",
    v6Use: "USAR",
    v6DoNotUse: "NO USAR",
    v6NotActivatable: "NO ACTIVABLE",
    v6InsufficientData: "DATOS INSUFICIENTES",
    maxThreeCoachPhotos: "Máximo 3 fotos: tarjeta de entrenador y hasta 2 Conexiones",
    maxThreeCoachPhotosFormat: "Tarjeta + hasta 2 Conexiones • JPG, PNG",
    coachCardRequired: "Carga la tarjeta de entrenador para continuar.",
  },
};

import React from "react";

// Create Context for global language state
const LanguageContext = React.createContext();

export function LanguageProvider({ children }) {
  // FIX: Sempre 'it' nello state iniziale per evitare hydration mismatch (server non ha localStorage).
  // Dopo mount, useEffect legge localStorage e aggiorna se diverso.
  const [lang, setLang] = React.useState("it");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_language");
      if (saved && (saved === "it" || saved === "en" || saved === "es")) {
        setLang(saved);
      }
    }
  }, []);

  const t = React.useCallback(
    (key, vars) => {
      let str = translations[lang]?.[key] || translations.en[key] || key;
      if (vars && typeof vars === "object") {
        str = String(str).replace(/\{\{(\w+)\}\}/g, (_, name) =>
          vars[name] != null ? String(vars[name]) : `{{${name}}}`,
        );
      }
      return str;
    },
    [lang],
  );

  const changeLanguage = React.useCallback((newLang) => {
    setLang(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("app_language", newLang);
      if (document.documentElement) document.documentElement.lang = newLang;
    }
  }, []);

  React.useEffect(() => {
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const value = React.useMemo(
    () => ({
      t,
      lang,
      changeLanguage,
    }),
    [t, lang, changeLanguage],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Chiave i18n per il nome esteso di un codice ruolo (PositionSelectionModal).
 * Include alias/legacy (CMF→CC, CF→P, …) così le etichette restano centralizzate qui.
 */
export function getPositionRoleTranslationKey(roleCode) {
  const c = String(roleCode || "")
    .trim()
    .toUpperCase();
  switch (c) {
    case "PT":
      return "positionRolePT";
    case "DC":
      return "positionRoleDC";
    case "TS":
      return "positionRoleTS";
    case "TD":
      return "positionRoleTD";
    case "CC":
    case "CMF":
      return "positionRoleCC";
    case "MED":
    case "DMF":
      return "positionRoleMED";
    case "CLS":
    case "LMF":
      return "positionRoleCLS";
    case "CLD":
    case "RMF":
      return "positionRoleCLD";
    case "TRQ":
    case "AMF":
      return "positionRoleTRQ";
    case "ESA":
    case "LWF":
      return "positionRoleESA";
    case "EDA":
    case "RWF":
    case "EDE":
      return "positionRoleEDA";
    case "P":
    case "CF":
      return "positionRoleP";
    case "SP":
    case "SS":
      return "positionRoleSP";
    default:
      return "positionRoleUnknown";
  }
}

// Helper function that can be used outside React components
export function getTranslation(key, lang = null) {
  if (!lang && typeof window !== "undefined") {
    lang = localStorage.getItem("app_language") || "it";
  }
  lang = lang || "it";
  return translations[lang]?.[key] || translations.en[key] || key;
}

function getLangFallback() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("app_language")
    if (saved === "it" || saved === "en" || saved === "es") return saved
    return "it"
  }
  return "it";
}

export function useTranslation() {
  const context = React.useContext(LanguageContext);
  if (!context) {
    const langFallback = getLangFallback();
    return {
      t: (key, vars) => {
        let str = getTranslation(key, langFallback);
        if (vars && typeof vars === "object") {
          str = String(str).replace(/\{\{(\w+)\}\}/g, (_, name) =>
            vars[name] != null ? String(vars[name]) : `{{${name}}}`,
          );
        }
        return str;
      },
      lang: langFallback,
      changeLanguage: (newLang) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("app_language", newLang);
          window.location.reload();
        }
      },
    };
  }
  // Garantire sempre lang definito (evita ReferenceError se context.lang manca)
  const lang =
    context.lang === "en" || context.lang === "it" || context.lang === "es" ? context.lang : "it";
  return {
    t: context.t,
    lang,
    changeLanguage: context.changeLanguage,
  };
}
