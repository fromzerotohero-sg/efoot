import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const POSITION_GROUPS = {
  gk: ['PT'],
  def: ['DC', 'TD', 'TS'],
  mid: ['MED', 'CC', 'TRQ', 'CLS', 'CLD'],
  att: ['P', 'SP', 'ESA', 'EDA']
}

function roleFamily(position = '') {
  if (POSITION_GROUPS.gk.includes(position)) return 'gk'
  if (POSITION_GROUPS.def.includes(position)) return 'def'
  if (POSITION_GROUPS.mid.includes(position)) return 'mid'
  return 'att'
}

function normalizeCard(raw = {}) {
  return {
    id: String(raw.id || raw.sourcePlayerId || ''),
    name: String(raw.name || '').trim(),
    position: String(raw.position || '').trim(),
    overall: Number(raw.overall) || null,
    category: String(raw.category || '').trim(),
    style: String(raw.style || '').trim(),
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    imageUrl: String(raw.imageUrl || '').trim(),
    sourcePlayerId: String(raw.sourcePlayerId || '').trim()
  }
}

function buildUserId(userData, admin) {
  return async function resolve() {
    let userId = userData.user.id
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      if (!existingProfile?.user_id) throw new Error('User profile not found')
      userId = existingProfile.user_id
    }
    return userId
  }
}

function styleName(player, stylesLookup) {
  return (player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || ''
}

function sameRolePlayers(card, players, stylesLookup) {
  return (players || [])
    .filter(player => player?.position === card.position)
    .map(player => ({
      name: player.player_name,
      overall: player.overall_rating,
      style: styleName(player, stylesLookup),
      skills: [...(Array.isArray(player.skills) ? player.skills : []), ...(Array.isArray(player.com_skills) ? player.com_skills : [])].slice(0, 6)
    }))
    .sort((a, b) => (Number(b.overall) || 0) - (Number(a.overall) || 0))
    .slice(0, 4)
}

function connectionName(connection) {
  if (!connection || typeof connection !== 'object') return ''
  return connection.name || connection.connection || connection.title || connection.label || ''
}

function connectionFit(card, coach) {
  const name = connectionName(coach?.connection)
  if (!name) return { label: '', impact: 'missing', textIt: '', textEn: '' }
  const family = roleFamily(card.position)
  const lower = name.toLowerCase()
  const depthRoles = ['P', 'SP', 'ESA', 'EDA', 'CLD', 'CLS', 'TD', 'TS']
  const supportsDepth = lower.includes('sopra') || lower.includes('over') || lower.includes('passaggio') || lower.includes('testa')
  const impact = supportsDepth && depthRoles.includes(card.position)
    ? 'high'
    : family === 'def' && card.position === 'DC'
      ? 'low'
      : 'medium'
  const textIt = impact === 'high'
    ? `Il Link-up ${name} valorizza ${card.name}: il profilo attacca spazio e riceve bene cambi gioco.`
    : impact === 'low'
      ? `Il Link-up ${name} pesa poco su ${card.name}: il suo valore resta copertura, duelli e posizione.`
      : `Il Link-up ${name} aggiunge valore solo come supporto: la leva principale resta il ruolo nella tua rosa.`
  const textEn = impact === 'high'
    ? `Link-up ${name} boosts ${card.name}: this profile attacks space and receives switches well.`
    : impact === 'low'
      ? `Link-up ${name} has low impact on ${card.name}: the value remains coverage, duels, and position.`
      : `Link-up ${name} adds support value only: the main lever remains the roster role.`
  return { label: name, impact, textIt, textEn }
}

function technicalProfile(card, lang) {
  const family = roleFamily(card.position)
  if (family === 'def') return lang === 'en' ? ['Coverage', 'Duels', 'Ball recovery'] : ['Copertura', 'Duelli', 'Recupero palla']
  if (family === 'mid') return lang === 'en' ? ['Build-up', 'Continuity', 'Team connection'] : ['Costruzione', 'Continuita', 'Connessione reparti']
  if (family === 'gk') return lang === 'en' ? ['Goal stability', 'Reflexes', 'Box control'] : ['Stabilita porta', 'Reattivita', 'Gestione area']
  return lang === 'en' ? ['Depth', 'Finishing', '1v1 threat'] : ['Profondita', 'Finalizzazione', '1 contro 1']
}

function mainLever(card, lang) {
  const family = roleFamily(card.position)
  if (family === 'def') return lang === 'en' ? 'Coverage and recovery' : 'Copertura e recupero'
  if (family === 'mid') return lang === 'en' ? 'Team-line connection' : 'Connessione tra reparti'
  if (family === 'gk') return lang === 'en' ? 'Goal stability' : 'Stabilita porta'
  return lang === 'en' ? 'Attacking depth' : 'Profondita offensiva'
}

function recommendedUse(card, lang) {
  const family = roleFamily(card.position)
  if (family === 'def') return lang === 'en'
    ? `Use ${card.name} to protect the exposed side and recover ground after losing possession.`
    : `Usa ${card.name} per proteggere il lato scoperto e recuperare campo dopo perdita palla.`
  if (family === 'mid') return lang === 'en'
    ? `Use ${card.name} to connect defence and attack, not as a simple runner.`
    : `Usa ${card.name} per collegare difesa e attacco, non come semplice giocatore da inserimento.`
  if (family === 'gk') return lang === 'en'
    ? `Use ${card.name} when you want fewer errors and rebounds in the box.`
    : `Usa ${card.name} quando vuoi ridurre errori e rimbalzi in area.`
  return lang === 'en'
    ? `Use ${card.name} to attack space and finish moves, not to drop deep for build-up.`
    : `Usa ${card.name} per attaccare spazio e chiudere azioni, non per abbassarsi a costruire.`
}

function evaluate({ card, players, formation, coach, tacticalSettings, profile, patterns, gameAnalysis, stylesLookup, lang }) {
  const sameRole = sameRolePlayers(card, players, stylesLookup)
  const hasRoster = players.length > 0
  const hasFormation = Boolean(formation?.formation) && players.some(player => player.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10)
  const hasCoach = Boolean(coach?.coach_name)
  const conn = connectionFit(card, coach)
  const roleGap = hasRoster && sameRole.length === 0
  const duplicate = sameRole.length >= 2 && (Number(card.overall) || 0) <= (Number(sameRole[0]?.overall) || 0) + 1
  let synergyLevel = lang === 'en' ? 'Card profile' : 'Profilo carta'
  if (hasRoster) synergyLevel = roleGap ? (lang === 'en' ? 'High synergy' : 'Sinergia alta') : duplicate ? (lang === 'en' ? 'Low synergy' : 'Sinergia bassa') : (lang === 'en' ? 'Medium synergy' : 'Sinergia media')
  if (hasCoach && conn.impact === 'high' && !duplicate) synergyLevel = lang === 'en' ? 'High synergy' : 'Sinergia alta'
  const title = !hasRoster
    ? (lang === 'en' ? 'Card profile' : 'Profilo carta')
    : !hasFormation
      ? (lang === 'en' ? 'Roster synergy' : 'Sinergia rosa')
      : hasCoach
        ? (lang === 'en' ? 'System synergy' : 'Sinergia sistema')
        : (lang === 'en' ? 'Module fit' : 'Fit modulo')
  const whyItMatters = lang === 'en'
    ? roleGap
      ? [`${card.name} covers ${card.position}, a role without a natural alternative in your roster.`, `${mainLever(card, lang)} is the main tactical lever.`]
      : duplicate
        ? [`${card.name} is rotation: ${sameRole.map(p => p.name).slice(0, 3).join(', ')} already cover ${card.position}.`, `${mainLever(card, lang)} does not add a new main lever to this role.`]
        : [`${card.name} adds ${mainLever(card, lang).toLowerCase()} to ${card.position}.`, `The value is in role balance, not just overall.`]
    : roleGap
      ? [`${card.name} copre ${card.position}, un ruolo senza alternativa naturale nella tua rosa.`, `${mainLever(card, lang)} e la leva tattica principale.`]
      : duplicate
        ? [`${card.name} e rotazione: ${sameRole.map(p => p.name).slice(0, 3).join(', ')} coprono gia ${card.position}.`, `${mainLever(card, lang)} non aggiunge una leva nuova in questo ruolo.`]
        : [`${card.name} aggiunge ${mainLever(card, lang).toLowerCase()} nel ruolo ${card.position}.`, `Il valore e nell'equilibrio del ruolo, non solo nell'overall.`]
  const technicalRisk = lang === 'en'
    ? duplicate
      ? 'Technical duplicate: use it as rotation, not as a priority.'
      : 'The role is clear: avoid using it outside its natural profile.'
    : duplicate
      ? 'Doppione tecnico: usalo come rotazione, non come priorita.'
      : 'Il ruolo e chiaro: evita di usarlo fuori dal suo profilo naturale.'
  const nextCta = !hasRoster
    ? { label: lang === 'en' ? 'Load roster for team synergy' : 'Carica la rosa per la sinergia squadra', target: 'formation' }
    : !hasFormation
      ? { label: lang === 'en' ? 'Save formation for starter fit' : 'Salva formazione per il fit titolari', target: 'formation' }
      : !hasCoach
        ? { label: lang === 'en' ? 'Add coach for Link-up fit' : 'Aggiungi coach per il fit Link-up', target: 'coach' }
        : null
  return {
    title,
    synergyLevel,
    mainLever: mainLever(card, lang),
    technicalProfile: technicalProfile(card, lang),
    whyItMatters,
    coachLinkup: conn.textEn && lang === 'en' ? conn.textEn : conn.textIt,
    recommendedUse: recommendedUse(card, lang),
    technicalRisk,
    alternatives: sameRole,
    nextCta,
    context: {
      hasRoster,
      hasFormation,
      hasCoach,
      hasTacticalSettings: Boolean(tacticalSettings?.team_playing_style),
      hasGameAnalysis: Boolean(gameAnalysis?.stats),
      weakPoint: profile?.ai_weak_point || null,
      recurringIssues: Array.isArray(patterns?.recurring_issues) ? patterns.recurring_issues.slice(0, 3) : []
    }
  }
}

export async function POST(req) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration missing' }, { status: 500 })
    }
    const token = extractBearerToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const card = normalizeCard(body.card)
    const lang = body.lang === 'en' ? 'en' : 'it'
    if (!card.name || !card.position) {
      return NextResponse.json({ error: 'Invalid card' }, { status: 400 })
    }
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const userId = await buildUserId(userData, admin)()
    const [
      profileRes,
      formationRes,
      playersRes,
      stylesRes,
      coachRes,
      tacticalRes,
      patternsRes,
      gameAnalysisRes
    ] = await Promise.all([
      admin.from('user_profiles').select('ai_weak_point, ai_learn_goals, ai_notes, input_delay, connection_quality, pass_level').eq('user_id', userId).maybeSingle(),
      admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
      admin.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, skills, com_skills, form, base_stats, original_positions, height, weight').eq('user_id', userId).limit(60),
      admin.from('playing_styles').select('id, name'),
      admin.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters').eq('user_id', userId).eq('is_active', true).maybeSingle(),
      admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
      admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(),
      admin.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle()
    ])
    const stylesLookup = {}
    ;(stylesRes.data || []).forEach(style => { stylesLookup[style.id] = style.name })
    const evaluation = evaluate({
      card,
      players: playersRes.data || [],
      formation: formationRes.data || null,
      coach: coachRes.data || null,
      tacticalSettings: tacticalRes.data || null,
      profile: profileRes.data || {},
      patterns: patternsRes.data || {},
      gameAnalysis: gameAnalysisRes.data || null,
      stylesLookup,
      lang
    })
    return NextResponse.json({ evaluation })
  } catch (error) {
    console.error('[card-advisor-lab:evaluate] error:', error)
    return NextResponse.json({ error: 'Evaluation unavailable' }, { status: 500 })
  }
}
