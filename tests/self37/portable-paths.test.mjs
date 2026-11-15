// Portability: a plugin that only works when a drive letter happens to be C:
// is not portable. Comments may explain Windows; code may not assume it.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`.replace(/\\/g, '/')
    if (entry.isDirectory()) walk(rel)
    else if (rel.endsWith('.js')) files.push(rel)
  }
}
walk('src')

const stripComments = (text) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')

const offenders = []
for (const file of files) {
  const code = stripComments(readFileSync(join(root, file), 'utf8'))
  for (const match of code.matchAll(/["'`]([A-Za-z]:[\\/][^"'`]*)["'`]/g)) {
    offenders.push(`${file}: ${match[1]}`)
  }
}

assert.deepEqual(offenders, [], `hardcoded drive paths in code:\n${offenders.join('\n')}`)
console.log(`ok - ${files.length} source files carry no hardcoded drive path`)
