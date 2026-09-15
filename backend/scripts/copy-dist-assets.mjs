// Copies the plain-JS sources that tsc (allowJs: false in tsconfig.build.json)
// does not emit: the domains (still JS by design) and Tommaso's auth/providers
// perimeter (JS by owner decision).
import { cpSync, copyFileSync, mkdirSync } from 'node:fs'

mkdirSync('dist', { recursive: true })
cpSync('src/domains', 'dist/domains', { recursive: true })
copyFileSync('src/auth.js', 'dist/auth.js')
copyFileSync('src/providers.js', 'dist/providers.js')
