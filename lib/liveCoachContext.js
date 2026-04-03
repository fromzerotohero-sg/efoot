import { createClient } from '@supabase/supabase-js'

function compact(value, maxLen = 220) {
  if (value == null) return ''
  const clean = String(value).replace(/\s+/g, ' ').trim()
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean
}

function buildPlayerLine(player) {
  if (!player) return null
  const name = compact(player.player_name || player.name, 40)
  if (!name) return null
  const parts = [
    name,
    compact(player.position, 12),
    Number.isFinite(Number(player.overall_rating)) ? `OVR ${Number(player.overall_rating)}` : '',
    compact(player.role, 30),
    Array.isArray(player.skills) ? compact(player.skills.slice(0, 4).join(', '), 80) : ''
  ].filter(Boolean)
  return parts.join(' | ')
}

function buildCompactCoachInstructions({ lang = 'it', profile = {}, formation = {}, tactics = {}, coach = {}, players = [], opponentContext = null }) {
  const isEn = lang === 'en'
  const firstName = compact(profile.first_name || '', 30)
  const aiName = compact(profile.ai_name || '', 30)
  const userNameLine = firstName
    ? (isEn ? `Call the user ${firstName}.` : `Chiama il cliente ${firstName}.`)
    : ''
  const weakPoint = compact(profile.ai_weak_point || profile.common_problems || '', 180)
  const learnGoals = compact(profile.ai_learn_goals || '', 180)
  const connectionQuality = compact(profile.connection_quality || '', 50)
  const teamName = compact(profile.team_name || profile.favorite_team || '', 60)
  const formationName = compact(formation.formation || '', 30)
  const tacticalStyle = compact(tactics.playing_style || tactics.tactical_style || '', 60)
  const coachName = compact(coach.coach_name || coach.name || '', 40)
  const playerLines = players.slice(0, 14).map(buildPlayerLine).filter(Boolean)
  const opponentSummary = opponentContext
    ? compact(JSON.stringify({
        formation: opponentContext.formation || opponentContext.formation_name || null,
        tactical_style: opponentContext.tactical_style || null,
        playing_style: opponentContext.playing_style || null,
        players: Array.isArray(opponentContext.players) ? opponentContext.players.slice(0, 11).map(p => ({
          name: p.player_name || p.name || null,
          position: p.position || null,
          overall_rating: p.overall_rating ?? null
        })) : []
      }), 1400)
    : ''

  const blocks = isEn
    ? [
        'You are the premium live eFootball coach inside From Zero to Hero.',
        userNameLine,
        aiName ? `Your public coach name is ${aiName}.` : '',
        'Speak with natural, warm, high-end voice. Never sound robotic.',
        'Be fast, tactical, concrete, and encouraging.',
        'Default answer length: 1-3 short sentences. During urgent moments, answer in 1 sentence first.',
        'Do not explain your reasoning process. Give the action directly.',
        'If information is missing, ask only one short clarifying question.',
        weakPoint ? `User weak point: ${weakPoint}.` : '',
        learnGoals ? `User goals: ${learnGoals}.` : '',
        connectionQuality ? `Connection quality context: ${connectionQuality}. Adapt advice to that.` : '',
        teamName ? `User team: ${teamName}.` : '',
        formationName ? `Current saved formation: ${formationName}.` : '',
        tacticalStyle ? `Current tactical style: ${tacticalStyle}.` : '',
        coachName ? `Active coach: ${coachName}.` : '',
        playerLines.length ? `Available roster core: ${playerLines.join(' || ')}` : '',
        opponentSummary ? `Opponent context: ${opponentSummary}` : 'If no opponent photo is available, ask for the opponent shape only when truly needed.',
        'Always prefer practical in-match actions: pressing side, line height, compactness, switch of play, fullback behavior, midfield density, substitutions, trigger timing.',
        'If the user sounds under pressure, calm them first and then give the tactical action.',
        'Answer in the same language as the user, Italian or English.'
      ]
    : [
        'Sei il coach live premium di eFootball dentro From Zero to Hero.',
        userNameLine,
        aiName ? `Il tuo nome pubblico come coach e ${aiName}.` : '',
        'Parla con una voce naturale, calda, di livello alto. Non sembrare robotica.',
        'Sii rapido, tattico, concreto e incoraggiante.',
        'Lunghezza standard risposta: 1-3 frasi brevi. Nei momenti urgenti rispondi prima in 1 frase.',
        'Non spiegare il ragionamento interno. Dai direttamente l azione.',
        'Se manca informazione, fai una sola domanda chiarificatrice molto breve.',
        weakPoint ? `Punto debole utente: ${weakPoint}.` : '',
        learnGoals ? `Obiettivi utente: ${learnGoals}.` : '',
        connectionQuality ? `Contesto connessione: ${connectionQuality}. Adatta i consigli.` : '',
        teamName ? `Squadra utente: ${teamName}.` : '',
        formationName ? `Modulo salvato attuale: ${formationName}.` : '',
        tacticalStyle ? `Stile tattico attuale: ${tacticalStyle}.` : '',
        coachName ? `Allenatore attivo: ${coachName}.` : '',
        playerLines.length ? `Nucleo rosa disponibile: ${playerLines.join(' || ')}` : '',
        opponentSummary ? `Contesto avversario: ${opponentSummary}` : 'Se manca la foto avversaria, chiedi la forma avversaria solo se serve davvero.',
        'Privilegia sempre azioni pratiche da partita: lato pressione, altezza linea, compattezza, cambio gioco, comportamento terzini, densita centrocampo, cambi, tempi di attivazione.',
        'Se l utente e sotto pressione, prima rassicuralo e poi dai la correzione tattica.',
        'Rispondi nella stessa lingua dell utente, italiano o inglese.'
      ]

  return blocks.filter(Boolean).join('\n')
}

export async function buildLiveCoachContext({ userId, lang = 'it', opponentContext = null }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || !userId) {
    return { instructions: '', snapshot: {} }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const [
    { data: profile },
    { data: formation },
    { data: tactics },
    { data: coach },
    { data: players }
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('first_name, favorite_team, team_name, ai_name, common_problems, ai_weak_point, ai_learn_goals, connection_quality')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('formation_layout')
      .select('formation')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('team_tactical_settings')
      .select('playing_style, tactical_style')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('coaches')
      .select('coach_name, name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    admin.from('players')
      .select('player_name, position, overall_rating, role, skills, slot_index')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true, nullsFirst: false })
      .limit(18)
  ])

  const snapshot = {
    profile: profile || {},
    formation: formation || {},
    tactics: tactics || {},
    coach: coach || {},
    players: Array.isArray(players) ? players : [],
    opponent: opponentContext || null
  }

  return {
    instructions: buildCompactCoachInstructions({
      lang,
      profile: snapshot.profile,
      formation: snapshot.formation,
      tactics: snapshot.tactics,
      coach: snapshot.coach,
      players: snapshot.players,
      opponentContext
    }),
    snapshot
  }
}
