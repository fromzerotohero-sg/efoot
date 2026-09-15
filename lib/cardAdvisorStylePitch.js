/**
 * Style → on-pitch movement/pass simulation for Card Advisor.
 * Coordinates are % of a vertical pitch (x 0–100 left→right, y 0–100 attack↑ / own goal↓).
 */

import { DEFAULT_SLOT_POSITIONS } from '@/lib/formationDefaultSlots'
import { normalizePos, roleGroup } from '@/lib/prematchPitchHelpers'

function ascii(value = '') {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function homeForPosition(position) {
  const pos = normalizePos(position) || 'P'
  const slots = Object.values(DEFAULT_SLOT_POSITIONS)
  const exact = slots.find((s) => normalizePos(s.position) === pos)
  // DEFAULT_SLOT_POSITIONS x/y are already % of the pitch box (not SVG 140 units).
  if (exact) return { x: exact.x, y: exact.y, role: exact.position }
  const group = roleGroup(pos)
  if (group === 'gk') return { x: 50, y: 88, role: 'PT' }
  if (group === 'def') {
    if (pos === 'TS' || pos === 'LB') return { x: 18, y: 68, role: pos }
    if (pos === 'TD' || pos === 'RB') return { x: 82, y: 68, role: pos }
    return { x: 50, y: 70, role: pos || 'DC' }
  }
  if (group === 'mid') {
    if (pos === 'CLD' || pos === 'RMF') return { x: 78, y: 52, role: pos }
    if (pos === 'CLS' || pos === 'LMF') return { x: 22, y: 52, role: pos }
    if (pos === 'TRQ' || pos === 'AMF') return { x: 50, y: 42, role: pos }
    if (pos === 'MED' || pos === 'DMF') return { x: 50, y: 58, role: pos }
    return { x: 50, y: 50, role: pos || 'CC' }
  }
  if (pos === 'EDA' || pos === 'RWF') return { x: 82, y: 28, role: pos }
  if (pos === 'ESA' || pos === 'LWF') return { x: 18, y: 28, role: pos }
  if (pos === 'SP' || pos === 'SS') return { x: 50, y: 32, role: pos }
  return { x: 50, y: 22, role: pos || 'P' }
}

function caption(lang, it, en, es) {
  if (lang === 'en') return en
  if (lang === 'es') return es || en
  return it
}

/**
 * @returns {{
 *   home: {x:number,y:number,role:string},
 *   move: {x:number,y:number},
 *   passes: Array<{from:{x:number,y:number},to:{x:number,y:number},kind:'through'|'cross'|'lay'|'switch'}>,
 *   ghost?: {x:number,y:number},
 *   caption: string,
 *   styleKey: string
 * }}
 */
export function buildCardStylePitchPlan(card, lang = 'it') {
  const style = ascii(card?.style || card?.playing_style || '')
  const home = homeForPosition(card?.position)
  const group = roleGroup(card?.position)

  const plan = {
    home,
    move: { x: home.x, y: clamp(home.y - 10, 8, 92) },
    passes: [],
    ghost: null,
    caption: '',
    styleKey: 'default'
  }

  const set = (partial) => Object.assign(plan, partial)

  if (style.includes('goal poacher') || style.includes('opportunista')) {
    set({
      styleKey: 'poacher',
      move: { x: home.x, y: clamp(home.y - 16, 6, 40) },
      ghost: { x: 50, y: 48 },
      passes: [{ from: { x: 50, y: 48 }, to: { x: home.x, y: clamp(home.y - 16, 6, 40) }, kind: 'through' }],
      caption: caption(
        lang,
        'Attacca l’ultima linea: cerca il filtrante in profondità.',
        'Attacks the last line: looks for the through ball in behind.',
        'Ataca la última línea: busca el pase filtrado en profundidad.'
      )
    })
  } else if (style.includes('fox in the box') || style.includes('rapace')) {
    set({
      styleKey: 'fox',
      move: { x: 50, y: 14 },
      home: { ...home, x: 50, y: 22 },
      ghost: { x: 86, y: 30 },
      passes: [{ from: { x: 86, y: 30 }, to: { x: 52, y: 14 }, kind: 'cross' }],
      caption: caption(
        lang,
        'Resta in area: finalizza da cross, ribalzi e tiri rapidi.',
        'Stays in the box: finishes crosses, rebounds and quick shots.',
        'Se queda en el área: remata centros, rechaces y tiros rápidos.'
      )
    })
  } else if (style.includes('target man') || style.includes('fulcro')) {
    set({
      styleKey: 'target',
      move: { x: home.x, y: clamp(home.y + 4, 18, 40) },
      passes: [
        { from: { x: 50, y: 62 }, to: { x: home.x, y: clamp(home.y + 2, 18, 40) }, kind: 'through' },
        { from: { x: home.x, y: clamp(home.y + 2, 18, 40) }, to: { x: clamp(home.x + 18, 20, 80), y: 18 }, kind: 'lay' }
      ],
      caption: caption(
        lang,
        'Riferimento fisico: riceve, protegge e scarica.',
        'Physical reference: receives, holds up and lays off.',
        'Referencia física: recibe, protege y descarga.'
      )
    })
  } else if (style.includes('deep-lying forward') || style.includes('deep lying forward') || style.includes('punta di manovra')) {
    set({
      styleKey: 'dlf',
      move: { x: home.x, y: clamp(home.y + 14, 28, 48) },
      passes: [{ from: { x: home.x, y: clamp(home.y + 14, 28, 48) }, to: { x: clamp(home.x + 22, 20, 82), y: 16 }, kind: 'through' }],
      caption: caption(
        lang,
        'Si abbassa tra le linee e collega verso gli inserimenti.',
        'Drops between the lines and links play into runners.',
        'Se baja entre líneas y conecta hacia las llegadas.'
      )
    })
  } else if (style.includes('hole player') || style.includes('giocatore chiave')) {
    set({
      styleKey: 'hole',
      home: { ...home, y: clamp(home.y + 10, 36, 52) },
      move: { x: 50, y: 16 },
      passes: [{ from: { x: 42, y: 40 }, to: { x: 50, y: 16 }, kind: 'through' }],
      caption: caption(
        lang,
        'Parte da dietro e si inserisce nello spazio da gol.',
        'Starts deeper and arrives late into scoring space.',
        'Parte desde atrás y se inserta en el espacio de gol.'
      )
    })
  } else if (style.includes('prolific winger') || style.includes('ala prolifica')) {
    const side = home.x < 50 ? -1 : 1
    const startX = side < 0 ? 16 : 84
    set({
      styleKey: 'winger',
      home: { ...home, x: startX, y: 34 },
      move: { x: clamp(50 + side * 8, 20, 80), y: 16 },
      passes: [{ from: { x: startX, y: 34 }, to: { x: 50, y: 14 }, kind: 'cross' }],
      caption: caption(
        lang,
        'Parte largo e attacca area / ultimo terzo.',
        'Starts wide and attacks the box / final third.',
        'Parte abierto y ataca el área / último tercio.'
      )
    })
  } else if (style.includes('roaming flank') || style.includes('esterno') || style.includes('taglio al centro')) {
    const side = home.x < 50 ? -1 : 1
    const startX = side < 0 ? 18 : 82
    set({
      styleKey: 'roaming',
      home: { ...home, x: startX, y: 38 },
      move: { x: 50, y: 20 },
      passes: [{ from: { x: 50, y: 52 }, to: { x: 50, y: 20 }, kind: 'through' }],
      caption: caption(
        lang,
        'Taglia dal largo verso il centro in zona gol.',
        'Cuts inside from the flank into the scoring zone.',
        'Corta desde la banda hacia el centro en zona de gol.'
      )
    })
  } else if (style.includes('cross specialist') || style.includes('specialista di cross') || style.includes('specialista cross')) {
    const side = home.x < 50 ? -1 : 1
    const startX = side < 0 ? 12 : 88
    set({
      styleKey: 'crosser',
      home: { ...home, x: startX, y: 30 },
      move: { x: startX, y: 22 },
      passes: [{ from: { x: startX, y: 24 }, to: { x: 50, y: 14 }, kind: 'cross' }],
      caption: caption(
        lang,
        'Resta sulla fascia e serve l’area col cross.',
        'Stays wide and serves the box with crosses.',
        'Se mantiene abierto y sirve el área con centros.'
      )
    })
  } else if (style.includes('creative playmaker') || style.includes('classic no') || style.includes('classico numero') || style.includes('regista offensivo')) {
    set({
      styleKey: 'creator',
      home: { ...home, x: 50, y: 42 },
      move: { x: 50, y: 34 },
      passes: [
        { from: { x: 50, y: 36 }, to: { x: 28, y: 16 }, kind: 'through' },
        { from: { x: 50, y: 36 }, to: { x: 72, y: 16 }, kind: 'through' }
      ],
      caption: caption(
        lang,
        'Tra le linee: filtra e serve i tagli offensivi.',
        'Between the lines: slips through balls into attacking runs.',
        'Entre líneas: filtra y sirve los desmarques.'
      )
    })
  } else if (style.includes('orchestrator') || style.includes('regista')) {
    set({
      styleKey: 'orchestrator',
      home: { ...home, x: 50, y: 58 },
      move: { x: 50, y: 54 },
      passes: [
        { from: { x: 50, y: 56 }, to: { x: 18, y: 28 }, kind: 'switch' },
        { from: { x: 50, y: 56 }, to: { x: 82, y: 28 }, kind: 'switch' }
      ],
      caption: caption(
        lang,
        'Dal basso: detta i tempi e cambia lato.',
        'From deep: sets the tempo and switches play.',
        'Desde atrás: marca el tempo y cambia de lado.'
      )
    })
  } else if (style.includes('box-to-box') || style.includes('box to box') || style.includes('tuttofare')) {
    set({
      styleKey: 'b2b',
      home: { ...home, y: 56 },
      move: { x: home.x, y: 24 },
      passes: [{ from: { x: home.x, y: 40 }, to: { x: clamp(home.x + 12, 20, 80), y: 18 }, kind: 'lay' }],
      caption: caption(
        lang,
        'Box-to-box: sale in verticale e arriva in zona offensiva.',
        'Box-to-box: surges vertically into the final third.',
        'Box-to-box: sube en vertical y llega a zona ofensiva.'
      )
    })
  } else if (style.includes('anchor') || style.includes('collante') || style.includes('ancor')) {
    set({
      styleKey: 'anchor',
      home: { ...home, x: 50, y: 60 },
      move: { x: 50, y: 62 },
      passes: [{ from: { x: 50, y: 62 }, to: { x: 50, y: 46 }, kind: 'lay' }],
      caption: caption(
        lang,
        'Ancora davanti alla difesa: scherma e ricicla palla.',
        'Screens in front of the back line and recycles possession.',
        'Ancla delante de la defensa: blinda y recicla el balón.'
      )
    })
  } else if (style.includes('destroyer') || style.includes('distruttore')) {
    set({
      styleKey: 'destroyer',
      home: { ...home, y: 58 },
      move: { x: clamp(home.x + 10, 20, 80), y: 48 },
      passes: [{ from: { x: clamp(home.x + 10, 20, 80), y: 48 }, to: { x: 50, y: 42 }, kind: 'lay' }],
      caption: caption(
        lang,
        'Esce sulla palla: interrompe e rilancia.',
        'Steps onto the ball: breaks play up and recycles.',
        'Sale a la pelota: corta y relanza.'
      )
    })
  } else if (style.includes('offensive') && (style.includes('full') || style.includes('wing') || style.includes('terzino'))) {
    const side = home.x < 50 ? -1 : 1
    const x = side < 0 ? 16 : 84
    set({
      styleKey: 'overlap',
      home: { ...home, x, y: 68 },
      move: { x, y: 28 },
      passes: [{ from: { x, y: 30 }, to: { x: 50, y: 16 }, kind: 'cross' }],
      caption: caption(
        lang,
        'Overlap: sale in fascia e crossa.',
        'Overlap: pushes high on the flank and crosses.',
        'Overlap: sube por banda y centra.'
      )
    })
  } else if (style.includes('defensive full') || style.includes('terzino difensivo')) {
    const side = home.x < 50 ? -1 : 1
    const x = side < 0 ? 18 : 82
    set({
      styleKey: 'def_fb',
      home: { ...home, x, y: 70 },
      move: { x, y: 74 },
      passes: [{ from: { x, y: 72 }, to: { x: 50, y: 58 }, kind: 'lay' }],
      caption: caption(
        lang,
        'Resta basso: copre la fascia e esce corto.',
        'Stays deep: covers the flank and plays short.',
        'Se mantiene bajo: cubre la banda y sale corto.'
      )
    })
  } else if (style.includes('build up') || style.includes('build-up') || style.includes('costruzione')) {
    set({
      styleKey: 'buildup',
      home: { ...home, y: 72 },
      move: { x: home.x, y: 58 },
      passes: [{ from: { x: home.x, y: 60 }, to: { x: 50, y: 48 }, kind: 'lay' }],
      caption: caption(
        lang,
        'Porta palla in costruzione e trova la linea successiva.',
        'Progresses the ball in build-up into the next line.',
        'Progresa el balón en la salida hacia la siguiente línea.'
      )
    })
  } else if (group === 'gk') {
    set({
      styleKey: 'gk',
      home: { x: 50, y: 90, role: 'PT' },
      move: { x: 50, y: 82 },
      passes: [{ from: { x: 50, y: 84 }, to: { x: 30, y: 68 }, kind: 'switch' }],
      caption: caption(
        lang,
        'Gestisce area e prima uscita di palla.',
        'Manages the box and the first pass out.',
        'Gestiona el área y la primera salida de balón.'
      )
    })
  } else {
    // Generic by role when style is missing / unknown
    if (group === 'att') {
      set({
        styleKey: 'att_default',
        move: { x: home.x, y: clamp(home.y - 12, 8, 40) },
        passes: [{ from: { x: 50, y: 50 }, to: { x: home.x, y: clamp(home.y - 10, 8, 40) }, kind: 'through' }],
        caption: caption(
          lang,
          'Movimento offensivo tipico del ruolo — collega lo stile carta per più precisione.',
          'Typical attacking movement for the role — link the card style for more precision.',
          'Movimiento ofensivo típico del rol — vincula el estilo de la carta para más precisión.'
        )
      })
    } else if (group === 'mid') {
      set({
        styleKey: 'mid_default',
        move: { x: home.x, y: clamp(home.y - 10, 28, 56) },
        passes: [{ from: { x: home.x, y: home.y }, to: { x: clamp(home.x + 16, 18, 82), y: clamp(home.y - 18, 16, 50) }, kind: 'through' }],
        caption: caption(
          lang,
          'Collega i reparti con movimento e passaggio tipici del ruolo.',
          'Links lines with typical movement and passing for the role.',
          'Conecta líneas con movimiento y pase típicos del rol.'
        )
      })
    } else {
      set({
        styleKey: 'def_default',
        move: { x: home.x, y: clamp(home.y - 6, 55, 78) },
        passes: [{ from: { x: home.x, y: home.y }, to: { x: 50, y: 52 }, kind: 'lay' }],
        caption: caption(
          lang,
          'Copertura e prima costruzione dal reparto difensivo.',
          'Coverage and first build-up from the defensive line.',
          'Cobertura y primera salida desde la línea defensiva.'
        )
      })
    }
  }

  plan.move.x = clamp(plan.move.x, 6, 94)
  plan.move.y = clamp(plan.move.y, 6, 94)
  plan.home.x = clamp(plan.home.x, 6, 94)
  plan.home.y = clamp(plan.home.y, 6, 94)
  return plan
}
