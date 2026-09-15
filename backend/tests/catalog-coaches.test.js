import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApp } from '../src/app.js'
import { createTestIdentityProvider } from '../src/auth.js'
import {
  filterAndSortCoachCatalog,
  normalizePlayerCatalogResult,
  normalizeRpcCatalogResponse,
  paginateCatalogResults,
  slotCompatibility,
  sortLegacyPlayerRows
} from '../src/domains/catalog/service.js'
import {
  getPlayerPhaseStyle,
  getPlayerPhaseStyleDisplay,
  getPlayingStylesContract,
  normalizePlayingStylesContract,
  playingStylesMatch,
  resolvePlayingStyleDbName
} from '../src/domains/catalog/playingStyles.js'
import {
  buildCoachCreateData,
  normalizeCoach,
  validateCoachForSave,
  validateCoachId
} from '../src/domains/coaches/service.js'

test('player catalog preserves slot compatibility rules and payload fallbacks', () => {
  assert.equal(slotCompatibility('DC', 'MED'), 'adaptable')
  assert.equal(slotCompatibility('P', 'DC'), 'out_of_role')
  assert.equal(slotCompatibility(' trq ', 'TRQ'), 'perfect')
  assert.equal(slotCompatibility('', 'TRQ'), 'unknown')

  const result = normalizePlayerCatalogResult(
    {
      id: 'card-1',
      source: 'pesdb',
      source_player_id: 7,
      player_name: 'Test',
      position: 'MED',
      catalog_ready: 1,
      needs_review: 0,
      players_payload: {
        player_skills: ['One-touch Pass'],
        com_skills: ['Trickster']
      }
    },
    'DC'
  )
  assert.equal(result.card_instance_key, 'pesdb:7')
  assert.equal(result.compatibility, 'adaptable')
  assert.deepEqual(result.player_skills, ['One-touch Pass'])
  assert.deepEqual(result.ai_playstyles, ['Trickster'])
})

test('legacy player search keeps accent-insensitive relevance and tie ordering', () => {
  const rows = [
    { player_name: 'Zlatan Ibrahimović', overall_level_1: 90 },
    { player_name: 'Ibrahimovic Jr', overall_level_1: 80 },
    { player_name: 'Other', position: 'Ibrahimovic', overall_level_1: 99 }
  ]
  const sorted = sortLegacyPlayerRows(rows, {
    q: 'ibrahimovic',
    sort: 'name_asc'
  })
  assert.deepEqual(
    sorted.map((row) => row.player_name),
    ['Ibrahimovic Jr', 'Zlatan Ibrahimović', 'Other']
  )
})

test('RPC catalog response accepts all legacy wrapper shapes', () => {
  const expected = { rows: [{ id: 1 }], total: 4 }
  assert.deepEqual(normalizeRpcCatalogResponse(expected), expected)
  assert.deepEqual(
    normalizeRpcCatalogResponse([
      { rpc_player_catalog_search: JSON.stringify(expected) }
    ]),
    expected
  )
  assert.equal(normalizeRpcCatalogResponse('not json'), null)
})

test('coach catalog filters, ranks and paginates with route semantics', () => {
  const rows = [
    {
      coach_name: 'Zulu',
      playing_style_competence: { pressing_totale: 88 }
    },
    {
      coach_name: 'Alpha',
      playing_style_competence: { pressing_totale: '88' }
    },
    {
      coach_name: 'Low',
      playing_style_competence: { pressing_totale: 70 }
    }
  ]
  const ranked = filterAndSortCoachCatalog(rows, {
    playstyle: 'pressing_totale',
    min: 80,
    sort: 'best_playstyle'
  })
  assert.deepEqual(
    ranked.map((coach) => coach.coach_name),
    ['Alpha', 'Zulu']
  )
  assert.deepEqual(paginateCatalogResults(ranked, 1, 1), {
    results: [ranked[1]],
    total: 2,
    offset: 1,
    limit: 1,
    hasMore: false
  })
})

test('playing-style aliases preserve exact database names and equivalence', () => {
  assert.equal(resolvePlayingStyleDbName('Def: The Destroyer'), 'Incontrista')
  assert.equal(resolvePlayingStyleDbName('Box-to-Box'), 'Box-to-Box')
  assert.equal(resolvePlayingStyleDbName('Basic'), null)
  assert.equal(playingStylesMatch('Box-to-Box', 'Onnipresente'), true)
})

test('eFootball v6 dual style contract keeps attack and defense separate', () => {
  const player = {
    playing_style: 'Goal Poacher',
    metadata: {
      playing_styles: {
        format: 'dual',
        attack: '<b>Att:</b> Goal Poacher',
        defense: 'Def: The Destroyer',
        rawLines: ['Att: Goal Poacher', 'Def: The Destroyer']
      }
    }
  }

  assert.deepEqual(getPlayingStylesContract(player), {
    format: 'dual',
    attack: 'Goal Poacher',
    defense: 'The Destroyer',
    primary: 'Goal Poacher',
    source_raw: ['Att: Goal Poacher', 'Def: The Destroyer']
  })
  assert.equal(getPlayerPhaseStyle(player, 'attack'), 'Opportunista')
  assert.equal(getPlayerPhaseStyle(player, 'defense'), 'Incontrista')
  assert.deepEqual(getPlayerPhaseStyleDisplay(player), {
    attack: 'Opportunista',
    defense: 'Incontrista'
  })
})

test('v6 Basic defense remains dual but means no special defensive style', () => {
  const player = {
    playing_styles: {
      format: 'dual',
      attack: 'Prolific Winger',
      defense: 'Basic'
    }
  }
  assert.deepEqual(normalizePlayingStylesContract(player.playing_styles), {
    format: 'dual',
    attack: 'Prolific Winger',
    defense: 'Basic',
    primary: 'Prolific Winger'
  })
  assert.equal(getPlayerPhaseStyle(player, 'attack'), 'Ala prolifica')
  assert.equal(getPlayerPhaseStyle(player, 'defense'), null)
})

test('coach normalization keeps six styles, aliases and booster limits', () => {
  const boosters = Array.from({ length: 12 }, (_, index) => ({
    stat_name: `Stat ${index}`,
    bonus: index === 0 ? 'bad' : `${index}.9`
  }))
  const normalized = normalizeCoach({
    age: '54.8',
    playing_style_competence: {
      possesso_palla: '87.9',
      pressing_totale: 91,
      overload: 95,
      unknown: 99
    },
    stat_boosters: [...boosters, null, { stat_name: 'Missing' }]
  })

  assert.equal(normalized.age, 54)
  assert.deepEqual(normalized.playing_style_competence, {
    possesso_palla: 87,
    pressing_totale: 91
  })
  assert.equal(normalized.stat_boosters.length, 10)
  assert.deepEqual(normalized.stat_boosters[0], {
    stat_name: 'Stat 0',
    bonus: 0
  })
})

test('coach save validation and payload preserve existing defaults', () => {
  assert.deepEqual(validateCoachForSave(null), {
    valid: false,
    error: 'Coach data is required'
  })
  assert.equal(
    validateCoachForSave({ coach_name: 'x'.repeat(256) }).valid,
    false
  )
  assert.equal(validateCoachId(' coach-id '), true)
  assert.equal(validateCoachId(123), false)

  const coach = {
    coach_name: '  Manager  ',
    age: '40.7',
    team: '  Club  ',
    playing_style_competence: null,
    connection: [],
    photo_slots: null
  }
  assert.deepEqual(buildCoachCreateData('user-1', coach), {
    user_id: 'user-1',
    coach_name: 'Manager',
    age: 40,
    nationality: null,
    team: 'Club',
    category: null,
    pack_type: null,
    playing_style_competence: {},
    training_affinity_description: null,
    stat_boosters: [],
    connection: [],
    photo_slots: {},
    extracted_data: coach,
    is_active: false
  })
})

test('catalog HTTP routes preserve bounded query contract', async () => {
  const calls = []
  const app = await buildApp({
    logger: false,
    dormant: true,
    mode: 'dormant',
    providers: { identity: createTestIdentityProvider() },
    catalogReads: {
      async searchPlayers(input) {
        calls.push(input)
        return { results: [], total: 0, offset: input.offset, limit: input.limit, hasMore: false }
      },
      async searchCoaches() {
        return { results: [], total: 0, offset: 0, limit: 24, hasMore: false }
      },
      async listPlayingStyles() {
        return [{ id: 'style-1', name: 'Opportunista' }]
      }
    }
  })
  try {
    const players = await app.inject({
      method: 'GET',
      url: '/v1/catalog/players?q=Ro%25_%20naldo&limit=999&offset=-5&slot_position=p'
    })
    assert.equal(players.statusCode, 200)
    assert.deepEqual(calls[0], {
      q: 'Ro naldo',
      slotPosition: 'P',
      cardType: '',
      limit: 100,
      offset: 0,
      sort: 'name_asc'
    })
    const styles = await app.inject({ method: 'GET', url: '/v1/catalog/playing-styles' })
    assert.equal(styles.statusCode, 404)
  } finally {
    await app.close()
  }
})
