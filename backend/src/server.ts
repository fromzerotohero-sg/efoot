import { buildApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = await buildApp({ logger: true })

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info({
    dormant: config.dormant,
    mode: config.mode,
    host: config.host,
    port: config.port
  }, 'efoot-backend started (no production traffic)')
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
