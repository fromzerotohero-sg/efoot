import { canonicalSkillStorageName, getSkillDisplayLabel, normalizeSkillKey } from './playerSkillLabels.js'

const SEMANTICS = {
  scissorsfeint: {
    category: 'dribbling',
    effect: 'Finta di corpo utile per cambiare lato e superare l\'uomo.',
    usefulFor: 'Ali, seconde punte e trequartisti in 1v1.',
    caution: 'Non risolve da sola problemi di finalizzazione o passaggio.'
  },
  doubletouch: {
    category: 'dribbling',
    effect: 'Cambio rapido di piede per evitare il contrasto diretto.',
    usefulFor: 'Giocatori tecnici tra le linee, ali e punte mobili.',
    caution: 'Richiede timing: con lag o pressione alta puo portare perdite palla.'
  },
  flipflap: {
    category: 'dribbling',
    effect: 'Dribbling stretto per spostare palla fuori dalla linea del difensore.',
    usefulFor: '1v1 laterale o ingresso in area.',
    caution: 'Valore basso su difensori o mediani usati solo in copertura.'
  },
  marseilleturn: {
    category: 'dribbling',
    effect: 'Rotazione per proteggere palla e uscire da pressione ravvicinata.',
    usefulFor: 'CC/TRQ e attaccanti che ricevono spalle alla porta.',
    caution: 'Non va trattata come skill di velocita o tiro.'
  },
  sombrero: {
    category: 'dribbling',
    effect: 'Alza la palla per superare un intervento o creare una giocata aerea.',
    usefulFor: 'Giocatori tecnici in area o vicino alla linea laterale.',
    caution: 'Situazionale: non e una base per valutare acquisto.'
  },
  crossoverturn: {
    category: 'dribbling',
    effect: 'Cambio direzione secco per uscire dal pressing.',
    usefulFor: 'Ali, terzini offensivi e centrocampisti tecnici.',
    caution: 'Va pesata con controllo palla e uso reale del dribbling.'
  },
  cutbehindturn: {
    category: 'dribbling',
    effect: 'Taglio dietro al corpo per girarsi e proteggere palla.',
    usefulFor: 'Punte di raccordo, TRQ e ali che ricevono marcate.',
    caution: 'Aiuta la ricezione, non aumenta il movimento senza palla.'
  },
  scotchmove: {
    category: 'dribbling',
    effect: 'Finta corta per spostare palla in conduzione.',
    usefulFor: 'Dribblatori e giocatori da 1v1.',
    caution: 'Non e indicatore di fit tattico da solo.'
  },
  solecontrol: {
    category: 'dribbling',
    effect: 'Migliora controllo con la suola e gestione palla nello stretto.',
    usefulFor: 'TRQ, CC tecnici e attaccanti che ricevono tra le linee.',
    caution: 'Non e una skill di passaggio: aiuta prima del passaggio, non la precisione.'
  },
  steponskillcontrol: {
    category: 'dribbling',
    effect: 'Controllo tecnico con suola per preparare finte e protezione.',
    usefulFor: 'Giocatori tecnici sotto pressione.',
    caution: 'Da non sommare mentalmente a Sole Control se la UI li mostra come varianti simili.'
  },
  momentumdribbling: {
    category: 'dribbling',
    effect: 'Potenzia il dribbling vicino all\'area avversaria.',
    usefulFor: 'Ali, TRQ e attaccanti che entrano negli ultimi metri.',
    caution: 'Vale se il giocatore arriva spesso vicino all\'area, non per un DC bloccato dietro.'
  },
  accelerationburst: {
    category: 'dribbling',
    effect: 'Scatto esplosivo dopo controllo o cambio ritmo.',
    usefulFor: 'Ali, punte rapide e transizioni.',
    caution: 'Non sostituisce velocita/accelerazione basse o problemi di ricezione.'
  },
  magneticfeet: {
    category: 'dribbling',
    effect: 'Aiuta controllo e protezione palla in zone affollate.',
    usefulFor: 'MED, CC e TRQ che ricevono sotto pressing.',
    caution: 'Non e una skill di tiro o passaggio: e valore di gestione palla.'
  },
  heading: {
    category: 'shooting',
    effect: 'Migliora le conclusioni di testa verso la porta.',
    usefulFor: 'Punte fisiche e giocatori mandati in area sui cross.',
    caution: 'Non e la skill difensiva per duelli aerei: per quello conta Dominio palle alte.'
  },
  bulletheader: {
    category: 'shooting',
    effect: 'Colpo di testa schiacciato e piu incisivo verso la porta.',
    usefulFor: 'Attaccanti e difensori portati sui piazzati offensivi.',
    caution: 'Non trasforma un difensore in soluzione offensiva stabile.'
  },
  longrangecurler: {
    category: 'shooting',
    effect: 'Migliora i tiri a giro da fuori area.',
    usefulFor: 'TRQ, ali a piede invertito e seconde punte.',
    caution: 'Serve se il giocatore tira davvero da quelle zone.'
  },
  blitzcurler: {
    category: 'shooting',
    effect: 'Tiro a giro spiovente con traiettoria speciale.',
    usefulFor: 'Esterni e attaccanti che rientrano sul piede forte.',
    caution: 'Non va confuso con Cross spiovente o abilita di passaggio.'
  },
  chipshotcontrol: {
    category: 'shooting',
    effect: 'Migliora il pallonetto quando il portiere esce.',
    usefulFor: 'Punte e seconde punte in profondita.',
    caution: 'Situazionale: vale se crei 1v1 col portiere.'
  },
  knuckleshot: {
    category: 'shooting',
    effect: 'Tiro potente con traiettoria imprevedibile.',
    usefulFor: 'Tiratori da fuori e calci piazzati.',
    caution: 'Non e passaggio lungo e non migliora la costruzione.'
  },
  dippingshot: {
    category: 'shooting',
    effect: 'Tiro con traiettoria discendente.',
    usefulFor: 'Tiri da fuori quando hai spazio per caricare.',
    caution: 'Richiede contesto di tiro: non basta averla sulla carta.'
  },
  risingshot: {
    category: 'shooting',
    effect: 'Tiro con traiettoria ascendente e potente.',
    usefulFor: 'Tiratori da fuori, piazzati e seconde palle.',
    caution: 'Su difensori e solo bonus marginale: non deve mai guidare consiglio acquisto, summary o verdetto.'
  },
  longrangeshooting: {
    category: 'shooting',
    effect: 'Aumenta precisione dei tiri da fuori area.',
    usefulFor: 'TRQ, CC offensivi, seconde punte e specialisti sui piazzati.',
    caution: 'Se e su un DC, e solo extra su piazzati/seconda palla: non comprare o consigliare un difensore per tirare da fuori.'
  },
  longranger: {
    category: 'shooting',
    effect: 'Tratto Showtime per minaccia da tiri dalla distanza.',
    usefulFor: 'Giocatori che arrivano al tiro da fuori con frequenza.',
    caution: 'Non confondere con lancio/passaggio lungo; su difensori non deve diventare motivo d\'acquisto.'
  },
  lowscreamer: {
    category: 'shooting',
    effect: 'Tiro rasoterra forte e teso, utile anche con potenza contenuta.',
    usefulFor: 'Attaccanti e centrocampisti che tirano dal limite.',
    caution: 'Non e una skill di passaggio basso.'
  },
  acrobaticfinishing: {
    category: 'shooting',
    effect: 'Migliora conclusioni acrobatiche o in equilibrio difficile.',
    usefulFor: 'Punte in area affollata e finalizzatori su cross/sporche.',
    caution: 'Non risolve costruzione o creazione occasioni.'
  },
  heeltrick: {
    category: 'shooting',
    effect: 'Consente tocchi di tacco utili per tiro o rifinitura ravvicinata.',
    usefulFor: 'Punte tecniche e giocatori in area.',
    caution: 'Situazionale, non motivo principale di acquisto.'
  },
  firsttimeshot: {
    category: 'shooting',
    effect: 'Migliora precisione dei tiri di prima intenzione.',
    usefulFor: 'Punte, SP e inserimenti su passaggio/cross.',
    caution: 'Vale se la squadra crea conclusioni immediate.'
  },
  phenomenalfinishing: {
    category: 'shooting',
    effect: 'Aumenta qualita delle conclusioni in situazioni difficili.',
    usefulFor: 'Finalizzatori che tirano spesso in area o sotto pressione.',
    caution: 'E valore da attaccante: su ruoli arretrati e piu situazionale.'
  },
  willpower: {
    category: 'shooting',
    effect: 'Migliora progressivamente abilita di tiro dopo ogni conclusione, fino a stack multipli.',
    usefulFor: 'Attaccanti che tirano molto durante la partita.',
    caution: 'Poco valore se il giocatore tira raramente.'
  },
  onetouchpass: {
    category: 'passing',
    effect: 'Migliora passaggi di prima e velocita di scarico.',
    usefulFor: 'Punte di raccordo, TRQ, CC, MED e difensori in uscita pressione.',
    caution: 'Non e tiro di prima: non usarla per giustificare finalizzazione.'
  },
  throughpassing: {
    category: 'passing',
    effect: 'Migliora i passaggi filtranti in profondita.',
    usefulFor: 'Registi, TRQ, SP e giocatori che servono corse alle spalle.',
    caution: 'Serve se davanti ci sono movimenti che attaccano spazio.'
  },
  weightedpass: {
    category: 'passing',
    effect: 'Passaggi lunghi/filtranti con peso e backspin piu controllati.',
    usefulFor: 'Registi, MED, terzini e difensori che cambiano gioco.',
    caution: 'Non e skill di tiro: non confonderla con Tiro dalla distanza.'
  },
  longloftedpass: {
    category: 'passing',
    effect: 'Migliora lanci lunghi alti e cambi gioco.',
    usefulFor: 'Costruzione dal basso, contropiede e cambi lato.',
    caution: 'Non e Long-Range Shooting: e passaggio, non tiro.'
  },
  pinpointcrossing: {
    category: 'passing',
    effect: 'Migliora precisione dei cross dalla fascia.',
    usefulFor: 'Ali, terzini offensivi e squadre che crossano.',
    caution: 'Poco valore se il profilo utente usa pochi cross.'
  },
  edgedcrossing: {
    category: 'passing',
    effect: 'Cross speciale piu tagliente/spiovente.',
    usefulFor: 'Esterni e terzini in sistemi che attaccano l\'area.',
    caution: 'Non va confuso con Tiro a giro spiovente.'
  },
  outsidecurler: {
    category: 'passing_shooting',
    effect: 'Migliora uso dell\'esterno piede per passare o tirare con angoli difficili.',
    usefulFor: 'Giocatori tecnici con piede debole limitato o angoli stretti.',
    caution: 'E supporto tecnico, non garanzia di gol da fuori.'
  },
  rabona: {
    category: 'passing_shooting',
    effect: 'Consente rabona per passaggio o tiro in situazioni particolari.',
    usefulFor: 'Giocatori tecnici in rifinitura.',
    caution: 'Molto situazionale: non pesare troppo nel verdetto.'
  },
  nolookpass: {
    category: 'passing',
    effect: 'Passaggio senza guardare per rendere meno leggibile la giocata.',
    usefulFor: 'TRQ e creatori centrali.',
    caution: 'Non sostituisce Passaggio filtrante o Passaggio di prima.'
  },
  gamechangingpass: {
    category: 'passing',
    effect: 'Passaggi decisivi in momenti/zone ad alto impatto.',
    usefulFor: 'Creatori e rifinitori che servono l\'ultimo passaggio.',
    caution: 'Serve contesto di riceventi e movimenti, non e valore isolato.'
  },
  visionarypass: {
    category: 'passing',
    effect: 'Passaggio creativo Showtime per trovare linee difficili.',
    usefulFor: 'Registi e TRQ con compagni che attaccano spazio.',
    caution: 'Non sostituisce le skill base: Passaggio di prima/filtrante/calibrato restano rilevanti.'
  },
  phenomenalpassing: {
    category: 'passing',
    effect: 'Passaggio Showtime potente/preciso in situazioni complesse.',
    usefulFor: 'Creatori, registi e giocatori pressati.',
    caution: 'Non va contato come doppione di tutte le skill passaggio base.'
  },
  lowloftedpass: {
    category: 'passing',
    effect: 'Passaggio alto teso/a scavalcare per superare linee di pressione.',
    usefulFor: 'DC, MED, CC e terzini in uscita palla.',
    caution: 'E supporto alla costruzione, non skill di cross o tiro.'
  },
  gklowpunt: {
    category: 'goalkeeper',
    effect: 'Rilancio basso del portiere piu controllato.',
    usefulFor: 'Portieri usati per ripartenza rapida e uscita pulita.',
    caution: 'Non va valutata su giocatori di movimento.'
  },
  gkhighpunt: {
    category: 'goalkeeper',
    effect: 'Rilancio profondo/alto del portiere.',
    usefulFor: 'Squadre che saltano il pressing o cercano una punta fisica.',
    caution: 'Dipende dai riceventi, non solo dal portiere.'
  },
  longthrow: {
    category: 'throw',
    effect: 'Rimessa laterale lunga.',
    usefulFor: 'Terzini e situazioni laterali avanzate.',
    caution: 'Non e lancio lungo di piede e non e tiro da fuori.'
  },
  gklongthrow: {
    category: 'goalkeeper',
    effect: 'Rilancio lungo con le mani del portiere.',
    usefulFor: 'Transizioni rapide dopo parata o presa.',
    caution: 'Vale solo per portieri.'
  },
  penaltyspecialist: {
    category: 'set_piece',
    effect: 'Migliora affidabilita sui rigori.',
    usefulFor: 'Tiratori designati.',
    caution: 'Impatto limitato nel gioco aperto.'
  },
  penaltysaver: {
    category: 'goalkeeper',
    effect: 'Aiuta il portiere sui rigori.',
    usefulFor: 'Portieri, soprattutto in partite decise ai rigori.',
    caution: 'Non conta in fase difensiva normale.'
  },
  gkdirectingdefence: {
    category: 'goalkeeper',
    effect: 'Showtime PT che aumenta supporto difensivo ai difensori in zona bassa.',
    usefulFor: 'Portieri in squadre che difendono area e vantaggio.',
    caution: 'Non e abilita del DC: e effetto portiere sulla linea difensiva.'
  },
  gkspiritroar: {
    category: 'goalkeeper',
    effect: 'Showtime PT che galvanizza fisicamente i difensori in condizioni specifiche.',
    usefulFor: 'Gestione vantaggio e duelli difensivi nella ripresa.',
    caution: 'Situazionale e dipendente dallo stato partita.'
  },
  gamesmanship: {
    category: 'special',
    effect: 'Aumenta probabilita di subire falli quando si protegge palla.',
    usefulFor: 'Attaccanti, ali e centrocampisti che portano palla.',
    caution: 'Da evitare come argomento forte su difensori.'
  },
  manmarking: {
    category: 'defending',
    effect: 'Migliora marcatura sull\'uomo.',
    usefulFor: 'DC, TD, TS e mediani su riferimenti avversari.',
    caution: 'Non e pressing automatico: serve ruolo/posizionamento coerente.'
  },
  trackback: {
    category: 'defending',
    effect: 'Aiuta il rientro difensivo dopo perdita palla.',
    usefulFor: 'Ali, SP, TRQ e centrocampisti esterni.',
    caution: 'Su mediani centrali puo alterare posizionamento se il profilo deve restare fermo.'
  },
  interception: {
    category: 'defending',
    effect: 'Migliora lettura e intercetto delle linee di passaggio.',
    usefulFor: 'DC, MED, CC difensivi, terzini.',
    caution: 'Non e tackle: copre linee, non garantisce duelli fisici.'
  },
  blocker: {
    category: 'defending',
    effect: 'Migliora blocchi su tiri e passaggi.',
    usefulFor: 'Difensori e mediani davanti alla linea.',
    caution: 'Vale se il giocatore difende zona pericolosa.'
  },
  aerialsuperiority: {
    category: 'defending_aerial',
    effect: 'Aumenta probabilita di vincere duelli aerei.',
    usefulFor: 'DC, punte fisiche e difesa su cross/piazzati.',
    caution: 'Non e Colpo di testa: non parla automaticamente di conclusione offensiva.'
  },
  slidingtackle: {
    category: 'defending',
    effect: 'Migliora precisione e velocita della scivolata.',
    usefulFor: 'Difensori aggressivi e recuperi laterali.',
    caution: 'Piu utile a chi deve intervenire, meno a chi deve solo posizionarsi.'
  },
  longreachtackle: {
    category: 'defending',
    effect: 'Tackle in piedi efficaci anche con avversario piu lontano o da fermo.',
    usefulFor: 'DC, terzini e MED che recuperano palloni a distanza.',
    caution: 'Non e abilita offensiva e non va confusa con lancio lungo.'
  },
  anchor: {
    category: 'defending',
    effect: 'Migliora capacita difensive nella ripresa se la squadra e in vantaggio.',
    usefulFor: 'Difensori e mediani per proteggere il risultato.',
    caution: 'Situazionale: dipende da vantaggio e secondo tempo.'
  },
  acrobaticclearance: {
    category: 'defending',
    effect: 'Aiuta rinvii/interventi acrobatici in area o sotto pressione.',
    usefulFor: 'DC e terzini in difesa bassa.',
    caution: 'Non e finalizzazione acrobatica.'
  },
  aerialfort: {
    category: 'defending_aerial',
    effect: 'Migliora i duelli aerei difensivi dentro la propria area.',
    usefulFor: 'DC e portieri/difensori contro cross e corner.',
    caution: 'Non e abilita per segnare di testa.'
  },
  shadowhunt: {
    category: 'defending',
    effect: 'Pressione alle spalle e disturbo sul portatore/ricevente.',
    usefulFor: 'Difensori e mediani aggressivi.',
    caution: 'Non va confusa con Track Back/Tornante.'
  },
  captaincy: {
    category: 'special',
    effect: 'Leadership e stabilita mentale/fatica della squadra.',
    usefulFor: 'Giocatori chiave sempre in campo.',
    caution: 'Valore di contesto, non tecnico specifico.'
  },
  attacktrigger: {
    category: 'special',
    effect: 'Aumenta il comportamento offensivo degli altri compagni quando il possessore controlla palla.',
    usefulFor: 'Creatori centrali che toccano molti palloni.',
    caution: 'Non boosta il possessore stesso e non sostituisce skill di tiro/passaggio.'
  },
  supersub: {
    category: 'special',
    effect: 'Migliora rendimento quando entra dalla panchina.',
    usefulFor: 'Cambi d\'impatto nel secondo tempo.',
    caution: 'Poco valore se il giocatore parte sempre titolare.'
  },
  fightingspirit: {
    category: 'special',
    effect: 'Aiuta prestazione sotto fatica, pressione e momenti fisici.',
    usefulFor: 'DC, MED, CC, TRQ e giocatori molto coinvolti.',
    caution: 'Non e una skill tecnica: supporta tenuta e lucidita.'
  },
  aggressivedefence: {
    category: 'defending',
    effect: 'Contrasti piu aggressivi e decisi.',
    usefulFor: 'Difensori e mediani da duello.',
    caution: 'Va pesata con rischio falli e stile utente.'
  },
  crossspecialist: {
    category: 'passing',
    effect: 'Specializzazione sul cross dalla fascia.',
    usefulFor: 'Esterni e terzini in sistemi con cross frequenti.',
    caution: 'Poco valore se l\'utente non usa ampiezza/cross.'
  },
  setpiecespecialist: {
    category: 'set_piece',
    effect: 'Migliora calci piazzati e punizioni.',
    usefulFor: 'Tiratori piazzati.',
    caution: 'Non va confusa con tiro da fuori in azione.'
  },
  goalkeeperrush: {
    category: 'goalkeeper',
    effect: 'Aiuta uscita del portiere.',
    usefulFor: 'Portieri aggressivi e difese alte.',
    caution: 'Vale solo per PT.'
  },
  utilityplayer: {
    category: 'special',
    effect: 'Flessibilita di utilizzo in piu ruoli.',
    usefulFor: 'Rotazioni e copertura rosa.',
    caution: 'Non indica una capacita tecnica specifica.'
  }
}

export function getPlayerSkillSemantic(raw) {
  const canon = canonicalSkillStorageName(raw)
  const key = normalizeSkillKey(canon)
  const semantic = SEMANTICS[key]
  if (!semantic) return null
  return {
    skill: canon,
    display: getSkillDisplayLabel(canon, 'it'),
    ...semantic
  }
}

export function buildSkillMechanicsContext(rawSkills = [], { lang = 'it', max = 12 } = {}) {
  const isEn = lang === 'en'
  const out = []
  const seen = new Set()

  for (const raw of Array.isArray(rawSkills) ? rawSkills : []) {
    const semantic = getPlayerSkillSemantic(raw)
    if (!semantic) continue
    const key = normalizeSkillKey(semantic.skill)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push({
      skill: isEn ? semantic.skill : semantic.display,
      category: semantic.category,
      effect: semantic.effect,
      useful_for: semantic.usefulFor,
      caution: semantic.caution
    })
    if (out.length >= max) break
  }

  return out
}

export function hasSkillSemantic(raw) {
  return Boolean(getPlayerSkillSemantic(raw))
}
