import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const dir = process.argv[2]
const buf = fs.readFileSync(path.join(dir, 'session.v4.jsonl.zstd'))
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
const text = parts
  .map((p) => {
    try {
      return zlib.zstdDecompressSync(p).toString('utf8')
    } catch {
      return ''
    }
  })
  .join('')

for (const line of text.split(/\r?\n/)) {
  if (!line.trim()) continue
  let e
  try {
    e = JSON.parse(line)
  } catch {
    continue
  }
  const kind = e.type ?? e.kind
  if (kind === 'turn/end' && e.data?.reason?.error) {
    console.log('--- turn/end error ---')
    console.log(JSON.stringify(e.data.reason, null, 2).slice(0, 6000))
  }
}
