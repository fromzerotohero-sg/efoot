// Copies only remaining plain-JS sources that tsc (allowJs: false) does not emit:
// still-JS domains + Tommaso's auth/providers perimeter. Converted .ts domains are
// already in dist/ from tsc — never copy .ts files, never overwrite emitted .js.
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const ROOT = process.cwd()
const SRC_DOMAINS = join(ROOT, 'src', 'domains')
const DIST_DOMAINS = join(ROOT, 'dist', 'domains')

function ensureDir(path) {
  mkdirSync(path, { recursive: true })
}

function copyIfExists(from, to) {
  if (!existsSync(from)) return false
  ensureDir(dirname(to))
  copyFileSync(from, to)
  return true
}

function walkJsFiles(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) walkJsFiles(full, out)
    else if (entry.endsWith('.js')) out.push(full)
  }
  return out
}

ensureDir(join(ROOT, 'dist'))

for (const srcFile of walkJsFiles(SRC_DOMAINS)) {
  const rel = relative(SRC_DOMAINS, srcFile)
  copyIfExists(srcFile, join(DIST_DOMAINS, rel))
}

copyIfExists(join(ROOT, 'src', 'auth.js'), join(ROOT, 'dist', 'auth.js'))
copyIfExists(join(ROOT, 'src', 'providers.js'), join(ROOT, 'dist', 'providers.js'))
