import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const dir = process.argv[2]
if (!dir) throw new Error('usage: node scripts/tmp-session-tail.mjs <sessionDir>')

function readAny(p) {
  const buf = fs.readFileSync(p)
  if (p.endsWith('.zstd')) {
    // multiple concatenated zstd frames: split on the magic and inflate each
    const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])
    const parts = []
    let start = 0
    for (let i = 1; i < buf.length - 3; i += 1) {
      if (buf[i] === magic[0] && buf[i + 1] === magic[1] && buf[i + 2] === magic[2] && buf[i + 3] === magic[3]) {
        parts.push(buf.subarray(start, i))
        start = i
      }
    }
    parts.push(buf.subarray(start))
    return parts
      .map((p) => {
        try {
          return zlib.zstdDecompressSync(p).toString('utf8')
        } catch {
          return ''
        }
      })
      .join('')
  }
  return buf.toString('utf8')
}

const files = fs.readdirSync(dir).filter((f) => f.startsWith('session'))
for (const f of files) {
  const text = readAny(path.join(dir, f))
  const lines = text.split(/\r?\n/).filter(Boolean)
  console.log(`== ${f}: ${lines.length} lines`)
  const tail = lines.slice(-14)
  for (const l of tail) {
    let e
    try {
      e = JSON.parse(l)
    } catch {
      console.log('  <unparsable line>')
      continue
    }
    const brief = JSON.stringify(e.data ?? e).slice(0, 260)
    console.log(`  ${e.type ?? e.kind ?? '?'}: ${brief}`)
  }
}
