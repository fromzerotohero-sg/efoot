const fullPhotoSlots = {
  card: true,
  statistiche: true,
  abilita: true,
  booster: true
}

function makeBaseStats(archetype) {
  switch (archetype) {
    case 'goalkeeper':
      return {
        goalkeeping: { awareness: 96, catching: 95, parrying: 95, reflexes: 96, reach: 95 },
        athleticism: { jumping: 84, physical_contact: 82, stamina: 78 }
      }
    case 'center_back':
      return {
        defending: { defensive_awareness: 95, tackling: 93, aggression: 90, defensive_engagement: 94 },
        athleticism: { speed: 82, acceleration: 78, physical_contact: 92, stamina: 84 },
        attacking: { heading: 88, low_pass: 74 }
      }
    case 'fullback':
      return {
        defending: { defensive_awareness: 86, tackling: 87, aggression: 84, defensive_engagement: 88 },
        athleticism: { speed: 88, acceleration: 86, stamina: 90, physical_contact: 80 },
        attacking: { low_pass: 82, lofted_pass: 81, dribbling: 77 }
      }
    case 'anchor':
      return {
        defending: { defensive_awareness: 90, tackling: 91, aggression: 86, defensive_engagement: 90 },
        athleticism: { stamina: 91, physical_contact: 86, speed: 80, acceleration: 78 },
        attacking: { low_pass: 86, lofted_pass: 83, ball_control: 84 }
      }
    case 'box_to_box':
      return {
        defending: { defensive_awareness: 80, tackling: 82, aggression: 80, defensive_engagement: 82 },
        athleticism: { stamina: 92, speed: 84, acceleration: 82, balance: 84 },
        attacking: { low_pass: 85, lofted_pass: 82, finishing: 78, ball_control: 85 }
      }
    case 'playmaker':
      return {
        attacking: { ball_control: 95, dribbling: 91, tight_possession: 94, low_pass: 95, lofted_pass: 92, finishing: 88 },
        athleticism: { balance: 92, acceleration: 86, speed: 80, stamina: 82 },
        defending: { defensive_awareness: 62, tackling: 60 }
      }
    case 'winger':
      return {
        attacking: { ball_control: 91, dribbling: 93, tight_possession: 90, low_pass: 82, lofted_pass: 80, finishing: 90, curl: 88 },
        athleticism: { speed: 94, acceleration: 95, stamina: 86, balance: 90 },
        defending: { defensive_awareness: 55, tackling: 56 }
      }
    case 'striker':
    default:
      return {
        attacking: { offensive_awareness: 95, finishing: 95, heading: 84, kicking_power: 90, ball_control: 86 },
        athleticism: { speed: 91, acceleration: 90, physical_contact: 86, stamina: 84, balance: 84 },
        defending: { defensive_awareness: 45, tackling: 44 }
      }
  }
}

function makeSkills(archetype) {
  switch (archetype) {
    case 'goalkeeper':
      return ['GK Low Punt', 'GK High Punt', 'Penalty Saver']
    case 'center_back':
      return ['Interception', 'Blocker', 'Aerial Superiority']
    case 'fullback':
      return ['Pinpoint Crossing', 'Track Back', 'Interception']
    case 'anchor':
      return ['Interception', 'Weighted Pass', 'One-touch Pass']
    case 'box_to_box':
      return ['Through Passing', 'One-touch Pass', 'Long-Range Shooting']
    case 'playmaker':
      return ['Through Passing', 'One-touch Pass', 'Long-Range Curler']
    case 'winger':
      return ['Double Touch', 'Sole Control', 'Long-Range Curler']
    case 'striker':
    default:
      return ['First-time Shot', 'Acrobatic Finishing', 'Heading']
  }
}

function makeBoosters(archetype) {
  switch (archetype) {
    case 'goalkeeper':
      return [{ name: 'Goalkeeping', effect: '+2 GK' }]
    case 'center_back':
      return [{ name: 'Defending', effect: '+2 difesa' }]
    case 'fullback':
      return [{ name: 'Balance', effect: '+2 equilibrio' }]
    case 'anchor':
      return [{ name: 'Defensive Pivot', effect: '+2 recupero' }]
    case 'box_to_box':
      return [{ name: 'Engine', effect: '+2 stamina' }]
    case 'playmaker':
      return [{ name: 'Vision', effect: '+2 passaggio' }]
    case 'winger':
      return [{ name: 'Burst', effect: '+2 accelerazione' }]
    case 'striker':
    default:
      return [{ name: 'Finishing', effect: '+2 finalizzazione' }]
  }
}

function makePlayer({
  player_name,
  position,
  overall_rating,
  playing_style_name,
  preferred_positions,
  archetype,
  team = 'Starter Pack XI',
  nationality = 'Global Selection',
  club_name = 'From Zero to Hero Selection',
  age = 28,
  form = 'A'
}) {
  return {
    player_name,
    position,
    overall_rating,
    playing_style_name,
    preferred_positions,
    role: playing_style_name,
    team,
    nationality,
    club_name,
    age,
    form,
    base_stats: makeBaseStats(archetype),
    skills: makeSkills(archetype),
    com_skills: [],
    available_boosters: makeBoosters(archetype),
    photo_slots: fullPhotoSlots,
    original_positions: preferred_positions.map((pos) => ({ position: pos, competence: 'Alta' })),
    extracted_data: {
      source: 'starter-pack',
      starter_pack: true,
      card_variant_label: `${player_name} · Starter Pack`
    }
  }
}

export const DEFAULT_META_FORMATION = {
  formation: '4-2-1-3',
  slot_positions: {
    0: { x: 50, y: 90, position: 'PT' },
    1: { x: 18, y: 70, position: 'TS' },
    2: { x: 39, y: 68, position: 'DC' },
    3: { x: 61, y: 68, position: 'DC' },
    4: { x: 82, y: 70, position: 'TD' },
    5: { x: 36, y: 54, position: 'CC' },
    6: { x: 50, y: 58, position: 'MED' },
    7: { x: 50, y: 42, position: 'TRQ' },
    8: { x: 22, y: 28, position: 'ESA' },
    9: { x: 50, y: 22, position: 'P' },
    10: { x: 78, y: 28, position: 'EDA' }
  }
}

export const DEFAULT_META_COACH = {
  coach_name: 'Fabio Capello',
  age: 78,
  nationality: 'Italy',
  team: 'Starter Pack',
  category: 'Legendary',
  pack_type: 'Starter Pack',
  playing_style_competence: {
    contrattacco: 89,
    passaggio_lungo: 89,
    contropiede_veloce: 57,
    possesso_palla: 46,
    vie_laterali: 64
  },
  stat_boosters: [
    { name: 'Defending', effect: '+2 difesa' },
    { name: 'Counter', effect: '+2 transizioni' }
  ],
  connection: null,
  photo_slots: fullPhotoSlots,
  extracted_data: {
    source: 'starter-pack',
    starter_pack: true
  }
}

export const DEFAULT_META_TACTICS = {
  team_playing_style: 'contrattacco',
  individual_instructions: {}
}

export const DEFAULT_META_GAME_ANALYSIS = {
  goal_types: {
    'Passaggio filtrante rasoterra': 34,
    Cross: 18,
    Dribbling: 12,
    'Calcio piazzato': 5
  },
  shot_usage: {
    Normale: 64,
    'Tiro calibrato': 24,
    Pallonetto: 4
  },
  special_commands: {
    'Chiama pressing': 92,
    'Cambio cursore': 214,
    'Uno-due in avanti': 19
  },
  passing: {
    'Passaggio rasoterra': 58,
    'Passaggio filtrante rasoterra': 28,
    'Passaggio alto': 9
  },
  dribbling: {
    Normale: 31,
    Scatta: 55,
    'Dribbling di precisione': 10
  },
  defense: {
    Pressa: 39,
    'Testa a testa': 27,
    Movimento: 31
  }
}

export const DEFAULT_META_CANDIDATES = [
  makePlayer({ player_name: 'Petr Čech', position: 'PT', overall_rating: 102, playing_style_name: 'Portiere difensivo', preferred_positions: ['PT'], archetype: 'goalkeeper', age: 38 }),
  makePlayer({ player_name: 'Pepe', position: 'TD', overall_rating: 101, playing_style_name: 'Terzino difensivo', preferred_positions: ['TD', 'TS'], archetype: 'fullback', age: 35 }),
  makePlayer({ player_name: 'Theo Hernández', position: 'TS', overall_rating: 101, playing_style_name: 'Terzino offensivo', preferred_positions: ['TS', 'TD'], archetype: 'fullback', age: 26 }),
  makePlayer({ player_name: 'Paolo Maldini', position: 'TS', overall_rating: 99, playing_style_name: 'Terzino difensivo', preferred_positions: ['TS', 'DC'], archetype: 'fullback', age: 34 }),
  makePlayer({ player_name: 'Rio Ferdinand', position: 'DC', overall_rating: 101, playing_style_name: 'Sviluppo', preferred_positions: ['DC'], archetype: 'center_back', age: 31 }),
  makePlayer({ player_name: 'Raphaël Varane', position: 'DC', overall_rating: 101, playing_style_name: 'Sviluppo', preferred_positions: ['DC'], archetype: 'center_back', age: 29 }),
  makePlayer({ player_name: 'Alessandro Nesta', position: 'DC', overall_rating: 102, playing_style_name: 'Incontrista', preferred_positions: ['DC'], archetype: 'center_back', age: 33 }),
  makePlayer({ player_name: 'Marquinhos', position: 'DC', overall_rating: 100, playing_style_name: 'Sviluppo', preferred_positions: ['DC'], archetype: 'center_back', age: 29 }),
  makePlayer({ player_name: 'Rodri', position: 'MED', overall_rating: 103, playing_style_name: 'Collante', preferred_positions: ['MED', 'CC'], archetype: 'anchor', age: 28 }),
  makePlayer({ player_name: 'Frank Rijkaard', position: 'MED', overall_rating: 98, playing_style_name: 'Collante', preferred_positions: ['MED', 'CC', 'DC'], archetype: 'anchor', age: 30 }),
  makePlayer({ player_name: 'Clarence Seedorf', position: 'CC', overall_rating: 100, playing_style_name: 'Onnipresente', preferred_positions: ['CC', 'MED'], archetype: 'box_to_box', age: 31 }),
  makePlayer({ player_name: 'Pedri', position: 'CC', overall_rating: 98, playing_style_name: 'Onnipresente', preferred_positions: ['CC', 'TRQ'], archetype: 'box_to_box', age: 22 }),
  makePlayer({ player_name: 'Lionel Messi', position: 'TRQ', overall_rating: 104, playing_style_name: 'Regista creativo', preferred_positions: ['TRQ', 'EDA', 'P'], archetype: 'playmaker', age: 36 }),
  makePlayer({ player_name: 'Pelé', position: 'TRQ', overall_rating: 102, playing_style_name: 'Regista creativo', preferred_positions: ['TRQ', 'P'], archetype: 'playmaker', age: 28 }),
  makePlayer({ player_name: 'Eden Hazard', position: 'TRQ', overall_rating: 102, playing_style_name: 'Giocatore chiave', preferred_positions: ['TRQ', 'ESA'], archetype: 'playmaker', age: 30 }),
  makePlayer({ player_name: 'Kylian Mbappé', position: 'ESA', overall_rating: 100, playing_style_name: 'Opportunista', preferred_positions: ['ESA', 'P', 'EDA'], archetype: 'winger', age: 25 }),
  makePlayer({ player_name: 'Neymar Jr', position: 'ESA', overall_rating: 101, playing_style_name: 'Giocatore chiave', preferred_positions: ['ESA', 'TRQ', 'CLS'], archetype: 'winger', age: 31 }),
  makePlayer({ player_name: 'Gareth Bale', position: 'EDA', overall_rating: 102, playing_style_name: 'Ala prolifica', preferred_positions: ['EDA', 'P'], archetype: 'winger', age: 31 }),
  makePlayer({ player_name: 'Luís Figo', position: 'EDA', overall_rating: 100, playing_style_name: 'Specialista di cross', preferred_positions: ['EDA', 'CLD'], archetype: 'winger', age: 32 }),
  makePlayer({ player_name: 'Erling Haaland', position: 'P', overall_rating: 103, playing_style_name: 'Rapace d\'area', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 24 }),
  makePlayer({ player_name: 'Cristiano Ronaldo', position: 'P', overall_rating: 101, playing_style_name: 'Opportunista', preferred_positions: ['P', 'ESA'], archetype: 'striker', age: 34 }),
  makePlayer({ player_name: 'Luis Suárez', position: 'P', overall_rating: 102, playing_style_name: 'Opportunista', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 32 }),
  makePlayer({ player_name: 'Samuel Eto\'o', position: 'P', overall_rating: 100, playing_style_name: 'Opportunista', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 30 }),
  makePlayer({ player_name: 'K. Heinz Rummenigge', position: 'P', overall_rating: 100, playing_style_name: 'Opportunista', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 29 }),
  makePlayer({ player_name: 'Alexander Isak', position: 'P', overall_rating: 101, playing_style_name: 'Opportunista', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 25 }),
  makePlayer({ player_name: 'Filippo Inzaghi', position: 'P', overall_rating: 100, playing_style_name: 'Opportunista', preferred_positions: ['P', 'CF'], archetype: 'striker', age: 31 })
  ,
  makePlayer({ player_name: 'Manuel Neuer', position: 'PT', overall_rating: 100, playing_style_name: 'Portiere offensivo', preferred_positions: ['PT'], archetype: 'goalkeeper', age: 35 })
]

export const DEFAULT_META_RESERVE_ORDER = [
  'Manuel Neuer',
  'Cristiano Ronaldo',
  'Luis Suárez',
  'Pelé',
  'Neymar Jr',
  'Samuel Eto\'o',
  'K. Heinz Rummenigge',
  'Alexander Isak',
  'Theo Hernández',
  'Frank Rijkaard',
  'Pedri',
  'Luís Figo',
  'Alessandro Nesta'
]

export const DEFAULT_META_STARTER_LINEUP = {
  0: 'Petr Čech',
  1: 'Theo Hernández',
  2: 'Raphaël Varane',
  3: 'Rio Ferdinand',
  4: 'Pepe',
  5: 'Clarence Seedorf',
  6: 'Rodri',
  7: 'Lionel Messi',
  8: 'Kylian Mbappé',
  9: 'Erling Haaland',
  10: 'Gareth Bale'
}

export const DEFAULT_META_STARTER_PACK = {
  slug: 'default-meta-pack-v1',
  formation: DEFAULT_META_FORMATION,
  coach: DEFAULT_META_COACH,
  tactics: DEFAULT_META_TACTICS,
  gameAnalysis: DEFAULT_META_GAME_ANALYSIS,
  candidates: DEFAULT_META_CANDIDATES,
  starterLineup: DEFAULT_META_STARTER_LINEUP,
  reserveOrder: DEFAULT_META_RESERVE_ORDER
}
