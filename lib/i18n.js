"use client";

// Simple i18n system - Italian/English
export const translations = {
  it: {
    // Sidebar
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
    chartsAndComparisonAskCoachContext:
      "Vorrei un consiglio sui miei grafici e la comparazione con il riferimento top.",

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
    pressing_totale: "Pressing totale",
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
    openAssistant: "Apri assistente",
    sendMessage: "Invia messaggio",
    yourCoach: "Il tuo Coach AI",
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

    // Tutorial
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
    openPalestraCoach: "Parla con Hero",

    // NUOVI TOUR STEP - Dashboard migliorata

    // NUOVI TOUR STEP - Formazione

    // NUOVI TOUR STEP - Partita

    // NUOVI TOUR STEP - Allenatori

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
    profileSectionGame: "Profilo di gioco",
    profileGroupAnagrafica: "Anagrafica",
    profileGroupGameIdentity: "Identità di gioco",
    profileGroupCoachAi: "Coach AI",
    profileSectionNotifications: "Notifiche",
    profileNotifWeeklyGoals: "Obiettivi settimanali",
    profileNotifCredits: "Crediti HP",
    profileNotifLeaderboard: "Classifica",
    profileNotifCoach: "Coach AI",
    profileSectionPreferences: "Preferenze app",
    profileSectionAccount: "Account",
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
    // Notification bell (centro notifiche)
    notifications: "Notifiche",
    notificationsEmpty: "Nessuna notifica",
    notificationsMarkAllRead: "Segna tutte lette",
    notificationsLoading: "Caricamento notifiche…",
    notificationsViewAria: "Vedi notifiche",
    notificationsCloseAria: "Chiudi notifiche",
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
      "Parlane con Hero nella chat: piattaforma, connessione, livello passaggio e punto debole li impara da come giochi.",
    openCoachGym: "Parla con Hero",

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

    current: "Attuale",
    whyImportant: "Perché è importante:",
    continue: "Continua",
    completed: "Completato",
    inProgress: "In corso",
    locked: "Bloccato",
    viewFullRoadmap: "Vedi Roadmap completa",

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
    fluidFormation: "Formazione fluida",
    fluidFormationHelp: "Stessi 11 titolari, disposizione diversa in attacco e in difesa. La formazione principale non cambia.",
    fluidFormationToggle: "La usi in eFootball?",
    fluidFormationToggleHint: "Se no, Hero continua a usare la formazione normale.",
    fluidAttack: "Attacco",
    fluidDefense: "Difesa",
    fluidBaseFormation: "Modulo base",
    fluidEditingPhase: "Stai modificando: {{phase}}",
    fluidPhasesGroupLabel: "Fase da configurare (stessi 11 titolari)",
    fluidCopyBase: "Copia base",
    fluidCopyOther: "Copia l'altra fase",
    fluidNeedStarters: "Servono una formazione salvata e 11 titolari. La Formazione fluida non crea una seconda rosa.",
    fluidSaved: "Formazione fluida salvata. Hero ora conosce Attacco e Difesa.",
    fluidDisabled: "Formazione fluida disattivata. La configurazione resta conservata.",
    fluidSave: "Salva formazione fluida",
    fluidSaveError: "Salvataggio formazione fluida non riuscito.",
    fluidLoadError: "Impossibile caricare la Formazione fluida.",
    fluidPitchHelp: "Trascina i titolari nella posizione del Game Plan e imposta il ruolo di quella fase. Non cambia chi è titolare.",
  },
  en: {
    // Sidebar
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
    chartsAndComparisonAskCoachContext:
      "I'd like advice on my charts and comparison with the top reference.",

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

    // Tutorials
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
    openPalestraCoach: "Talk to Hero",

    // NEW TOUR STEPS - Improved Dashboard

    // NEW TOUR STEPS - Formation

    // NEW TOUR STEPS - Match

    // NEW TOUR STEPS - Coaches

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
    profileSectionGame: "Game profile",
    profileGroupAnagrafica: "Personal details",
    profileGroupGameIdentity: "Game identity",
    profileGroupCoachAi: "AI coach",
    profileSectionNotifications: "Notifications",
    profileNotifWeeklyGoals: "Weekly goals",
    profileNotifCredits: "HP credits",
    profileNotifLeaderboard: "Leaderboard",
    profileNotifCoach: "AI coach",
    profileSectionPreferences: "App preferences",
    profileSectionAccount: "Account",
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
    pressing_totale: "Overload",
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
    // Progress
    photosCount: "photos uploaded",
    of: "of",
    // Assistant Chat
    howToAddMatch: "How do I add a match?",
    howToManageFormation: "How do I manage the formation?",
    whereAmI: "Where am I?",
    whatCanYouDo: "What can you do?",
    openAssistant: "Open assistant",
    sendMessage: "Send message",
    yourCoach: "Your Coach AI",
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
    // Notification bell (notification center)
    notifications: "Notifications",
    notificationsEmpty: "No notifications",
    notificationsMarkAllRead: "Mark all as read",
    notificationsLoading: "Loading notifications…",
    notificationsViewAria: "View notifications",
    notificationsCloseAria: "Close notifications",
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
      "Talk to Hero in the chat: it learns your platform, connection, passing level and weak point from how you play.",
    openCoachGym: "Talk to Hero",

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

    current: "Current",
    whyImportant: "Why it matters:",
    continue: "Continue",
    completed: "Completed",
    inProgress: "In Progress",
    locked: "Locked",
    viewFullRoadmap: "View Full Roadmap",

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
    fluidFormation: "Fluid Formation",
    fluidFormationHelp: "Same 11 starters, different shape in attack and defence. Your main formation stays unchanged.",
    fluidFormationToggle: "Do you use it in eFootball?",
    fluidFormationToggleHint: "If not, Hero keeps using your normal formation.",
    fluidAttack: "Attack",
    fluidDefense: "Defence",
    fluidBaseFormation: "Base formation",
    fluidEditingPhase: "Editing: {{phase}}",
    fluidPhasesGroupLabel: "Phase to configure (same 11 starters)",
    fluidCopyBase: "Copy base",
    fluidCopyOther: "Copy other phase",
    fluidNeedStarters: "You need a saved formation and 11 starters. Fluid Formation does not create a second squad.",
    fluidSaved: "Fluid Formation saved. Hero now knows Attack and Defence.",
    fluidDisabled: "Fluid Formation turned off. The setup is kept.",
    fluidSave: "Save Fluid Formation",
    fluidSaveError: "Could not save Fluid Formation.",
    fluidLoadError: "Unable to load Fluid Formation.",
    fluidPitchHelp: "Drag the starters into the Game Plan positions and set the role for that phase. Starters do not change.",
  },
  es: {
    pressing_totale: "Superioridad",
    toggleMenu: "Abrir/cerrar menú",
    appName: "From Zero to Hero",
    pwaInstallOpenManual: "Añadir a la pantalla de inicio",
    creditsError: "No se ha podido cargar el uso de créditos.",
    creditsViewAria: "Ver créditos de IA",
    creditsCloseAria: "Cerrar créditos",
    notifications: "Notificaciones",
    notificationsEmpty: "No hay notificaciones",
    notificationsMarkAllRead: "Marcar todas como leídas",
    notificationsLoading: "Cargando notificaciones…",
    notificationsViewAria: "Ver notificaciones",
    notificationsCloseAria: "Cerrar notificaciones",
    fluidFormation: "Formación fluida",
    fluidFormationHelp: "Los mismos 11 titulares, disposición distinta en ataque y en defensa. La formación principal no cambia.",
    fluidFormationToggle: "¿La usas en eFootball?",
    fluidFormationToggleHint: "Si no, Hero sigue usando la formación normal.",
    fluidAttack: "Ataque",
    fluidDefense: "Defensa",
    fluidBaseFormation: "Formación base",
    fluidEditingPhase: "Editando: {{phase}}",
    fluidPhasesGroupLabel: "Fase a configurar (mismos 11 titulares)",
    fluidCopyBase: "Copiar base",
    fluidCopyOther: "Copiar la otra fase",
    fluidNeedStarters: "Hace falta una formación guardada y 11 titulares. La Formación fluida no crea una segunda plantilla.",
    fluidSaved: "Formación fluida guardada. Hero ahora conoce Ataque y Defensa.",
    fluidDisabled: "Formación fluida desactivada. La configuración se conserva.",
    fluidSave: "Guardar formación fluida",
    fluidSaveError: "No se pudo guardar la Formación fluida.",
    fluidLoadError: "No se pudo cargar la Formación fluida.",
    fluidPitchHelp: "Arrastra a los titulares a la posición del Plan de Juego y asigna el rol de esa fase. No cambia quién es titular.",
  },
};

import React from "react";

export function pickLang(lang, variants) {
  if (variants && variants[lang] != null) return variants[lang];
  if (lang === "es" && variants?.en != null) return variants.en;
  return variants?.it;
}

function isSupportedLang(value) {
  return value === "it" || value === "en" || value === "es";
}

// Create Context for global language state
const LanguageContext = React.createContext();

export function LanguageProvider({ children }) {
  // FIX: Sempre 'it' nello state iniziale per evitare hydration mismatch (server non ha localStorage).
  // Dopo mount, useEffect legge localStorage e aggiorna se diverso.
  const [lang, setLang] = React.useState("it");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_language");
      if (isSupportedLang(saved)) {
        setLang(saved);
      }
    }
  }, []);

  const t = React.useCallback(
    (key, vars) => {
      let str =
        translations[lang]?.[key] ||
        translations.en[key] ||
        translations.it[key] ||
        key;
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
    if (!isSupportedLang(newLang)) return;
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
  lang = isSupportedLang(lang) ? lang : "it";
  return (
    translations[lang]?.[key] ||
    translations.en[key] ||
    translations.it[key] ||
    key
  );
}

function getLangFallback() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("app_language") || "it";
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
  const lang = isSupportedLang(context.lang) ? context.lang : "it";
  return {
    t: context.t,
    lang,
    changeLanguage: context.changeLanguage,
  };
}
