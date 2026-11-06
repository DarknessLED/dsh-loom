import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

/** Root state directory. Overridable for tests / multiple profiles. */
export function loomHome(config) {
  return resolve(process.env.LOOM_HOME || config?.home || join(homedir(), '.dsh', 'loom'))
}

export function campaignDir(home, id) {
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(id)) throw new Error(`invalid campaign id: ${id}`)
  return join(home, 'campaigns', id)
}

export function ensureDir(dir) {
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Safe path segment for run/attempt ids. */
export function seg(x) {
  return String(x).replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120)
}

export function nowId() {
  const d = new Date()
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-` +
    `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  )
}
