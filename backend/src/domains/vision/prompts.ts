// @ts-nocheck
export const PLAYER_PROMPT = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili del giocatore.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- PRIORITÀ: Usa la TABELLA statistiche se presente (non il radar chart)
- L'overall_rating è il numero direttamente sotto il playing_style e sopra bandiera o stemma; non calcolarlo.
- Estrai nome, posizione, original_positions, overall_rating, team, card_type, base_stats, skills, native_skills, additional_skills, com_skills, boosters, ai_playstyles, altezza, peso, età, nazionalità, livello, forma, ruolo, stili di gioco, presenze, gol, assist, piede debole e resistenza infortuni.
- Nel mini-campo, mappa tutte le zone verdi in original_positions con competence "Alta", "Intermedia" o "Bassa".
- Non mescolare "Stili di gioco IA" con skills.

Formato JSON richiesto:
{"player_name":"Nome Completo","position":"AMF","original_positions":[{"position":"AMF","competence":"Alta"}],"overall_rating":85,"team":"Team Name","card_type":"Type","base_stats":{"attacking":{},"defending":{},"athleticism":{}},"skills":[],"native_skills":[],"additional_skills":[],"com_skills":[],"boosters":[],"ai_playstyles":[],"height_cm":180,"weight_kg":75,"age":25,"nationality":"Country","level_current":10,"level_cap":50,"form":"B","role":"Role","playing_style":"Style Name","attacking_playing_style":null,"defensive_playing_style":null,"matches_played":204,"goals":86,"assists":37,"weak_foot_frequency":"Raramente","weak_foot_accuracy":"Alta","injury_resistance":"Media"}

Restituisci SOLO JSON valido, senza altro testo.`

export const COACH_PROMPT = `Analizza questo screenshot di eFootball e estrai TUTTI i dati visibili dell'allenatore/manager.

IMPORTANTE:
- Estrai SOLO ciò che vedi nell'immagine (null se non visibile)
- Estrai nome allenatore, età, nazionalità, squadra, categoria, tipo/pack.
- Estrai playing_style_competence per possesso_palla, contropiede_veloce, contrattacco, vie_laterali, passaggio_lungo e pressing_totale (anche Overload, Superioridad o Sovraccarico).
- Estrai training_affinity_description, stat_boosters e l'eventuale connection con focal_point e key_man.

Formato JSON richiesto:
{"coach_name":"Nome Completo Allenatore","age":45,"nationality":"Italia","team":"AC Milan","category":"Campionato italiano","pack_type":"Manager Pack","playing_style_competence":{"possesso_palla":46,"contropiede_veloce":57,"contrattacco":89,"vie_laterali":64,"passaggio_lungo":89,"pressing_totale":80},"training_affinity_description":"Descrizione","stat_boosters":[{"stat_name":"Finalizzazione","bonus":1}],"connection":{"name":"Nome","description":"Descrizione","focal_point":{"playing_style":"Tra le linee","position":"MED"},"key_man":{"playing_style":"Opportunista","position":"P"}}}

Restituisci SOLO JSON valido, senza altro testo.`

export const FORMATION_PROMPT = `Analizza uno o due screenshot di eFootball che mostrano la stessa formazione avversaria con 11 giocatori sul campo.
Se ricevi due immagini, usale insieme: possono mostrare viste complementari della stessa schermata. Non duplicare i giocatori e non inventare dati mancanti.

IMPORTANTE:
- Identifica TUTTI gli 11 giocatori visibili.
- Per ogni giocatore estrai nome, slot_index univoco 0-10, ruolo, overall, team/nazionalità e coordinate x_percent/y_percent (0-100).
- PT=0; assegna gli altri slot dal basso verso l'alto e da sinistra a destra.
- Estrai formation e un visual_tactical_profile prudente con width_profile, central_density, side_bias, isolated_striker, two_strikers, attackable_zones, defensive_gaps, tre confidence 0-1 e uncertain_points.
- L'allenatore è opzionale e deve essere null se non è visibile.

Formato JSON richiesto:
{"formation":"4-2-1-3","players":[{"player_name":"Nome","slot_index":0,"position":"PT","x_percent":50,"y_percent":92,"overall_rating":95,"team":"Team","nationality":"Country","player_face_description":"Descrizione"}],"coach":null,"visual_tactical_profile":{"width_profile":"unclear","central_density":"unclear","side_bias":"unclear","isolated_striker":false,"two_strikers":false,"attackable_zones":[],"defensive_gaps":[],"formation_confidence":0,"shape_confidence":0,"slot_confidence":0,"uncertain_points":[]}}

Restituisci SOLO JSON valido, senza altro testo.`

const TEAM_HINT = (isHome, userTeamInfo) => {
  if (typeof isHome === 'boolean') return `
IDENTIFICAZIONE SQUADRA CLIENTE:
- eFootball mostra sempre SINISTRA/CASA vs DESTRA/FUORI.
- team1 = squadra a SINISTRA / CASA; team2 = squadra a DESTRA / FUORI.
- Il cliente ha giocato ${isHome ? 'IN CASA: cliente = team1/sinistra' : 'FUORI CASA: cliente = team2/destra'}.
- Estrai SEMPRE il risultato grezzo come appare sullo schermo (sinistra-destra), non ribaltarlo tu.`
  const hints = [
    userTeamInfo?.team_name && `Nome squadra cliente: "${userTeamInfo.team_name}"`,
    userTeamInfo?.favorite_team && `Squadra preferita: "${userTeamInfo.favorite_team}"`,
    userTeamInfo?.name && `Nome utente: "${userTeamInfo.name}"`
  ].filter(Boolean)
  return hints.length ? `\nIDENTIFICAZIONE SQUADRA CLIENTE:\n${hints.join('\n')}` : ''
}

export function matchSectionPrompt(section, userTeamInfo = null, isHome = null) {
  const hint = TEAM_HINT(isHome, userTeamInfo)
  const prompts = {
    player_ratings: `Analizza questo screenshot di eFootball e estrai TUTTE le pagelle (ratings) dei giocatori.
- Estrai SOLO ciò che vedi. Questa schermata mostra SOLO i voti.
- Per ogni giocatore estrai nome, rating numerico e team ("team1" sinistra/casa, "team2" destra/fuori).${hint}
Formato JSON: {"result":"6-1","ratings":{"Nome":{"rating":8.5,"team":"team1"}}}
Restituisci SOLO JSON valido, senza altro testo.`,
    team_stats: `Analizza questo screenshot di eFootball e estrai TUTTE le statistiche di squadra.
- Estrai il risultato grezzo sinistra-destra.
- Separa team1 (sinistra/casa) e team2 (destra/fuori): possession, shots, shots_on_target, fouls, offsides, corner_kicks, free_kicks, passes, successful_passes, crosses, interceptions, tackles, saves.${hint}
Formato JSON: {"result":"0-4","team1":{"possession":45,"shots":5},"team2":{"possession":55,"shots":16}}
Restituisci SOLO JSON valido, senza altro testo.`,
    attack_areas: `Analizza questo screenshot di eFootball e estrai le aree di attacco.
- Estrai percentuali left, center e right per team1 e team2 e il risultato se visibile.${hint}
Formato JSON: {"result":"6-1","team1":{"left":46,"center":45,"right":9},"team2":{"left":19,"center":64,"right":17}}
Restituisci SOLO JSON valido, senza altro testo.`,
    ball_recovery_zones: `Analizza questo screenshot di eFootball e estrai le zone di recupero palla.
- Per ogni punto verde estrai x e y normalizzati 0-1 e team1/team2.${hint}
Formato JSON: {"result":"6-1","zones":[{"x":0.3,"y":0.5,"team":"team1"}]}
Restituisci SOLO JSON valido, senza altro testo.`,
    formation_style: `Analizza questo screenshot di eFootball e estrai formazione, stile di gioco e forza squadra.
- Estrai SOLO ciò che vedi: formation, playing_style e team_strength.${hint}
Formato JSON: {"result":"3-1","formation":"4-2-1-3","playing_style":"Contrattacco","team_strength":3245}
Restituisci SOLO JSON valido, senza altro testo.`
  }
  return prompts[section]
}

export const GAME_ANALYSIS_PROMPT = `Analizza gli screenshot della schermata "Analisi" di eFootball (statistiche ultime 10 partite). Le etichette possono essere in italiano, inglese o spagnolo.
Puoi ricevere 1 o 2 immagini: una con "Tipo di gol", "Tiro", "Comandi speciali"; l'altra con "Passaggio", "Dribbling", "Difesa".

Estrai tutti i dati visibili. Per ogni categoria restituisci le etichette esatte lette dallo schermo e il valore numerico indicato per l'utente ("Tu").
Formato JSON:
{"goal_types":null,"shot_usage":null,"special_commands":null,"passing":null,"dribbling":null,"defense":null}
- I valori sono numeri.
- Includi solo le voci effettivamente visibili; usa null per categorie non presenti.
- Restituisci SOLO JSON valido, senza altro testo.`

