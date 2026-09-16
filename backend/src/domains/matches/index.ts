export {
  calculateDataCompleteness,
  calculateMissingPhotos,
  calculateMissingSections,
  calculatePhotosUploaded,
  calculateSectionsPresent,
  classifyMatchResult,
  hasPlayerRatings,
  isLoss,
  isWin
} from './match.js'

export {
  averageZoneMaps,
  buildMatchZonePromptBlock,
  formatCompactZonePair,
  formatZonePct,
  normalizeSideKey,
  resolveMatchAttackZones,
  summarizeMatchAttackZones,
  toZoneMap
} from './zones.js'

export {
  buildPatternZonePayload,
  calculateTacticalPatterns,
  calculateUsage
} from './patterns.js'

export {
  MATCH_SECTIONS,
  MATCH_SELECT,
  MATCH_SUMMARY_SELECT,
  buildMatchInsert,
  buildMatchSectionPatch,
  mergeMatchData,
  normalizeMatchSummary,
  serializeAiSummary,
  validateMatchForSave,
  validateMatchId
} from './payloads.js'

export {
  createMatchWriteService
} from './service.js'

export { registerMatchRoutes } from './routes.js'
