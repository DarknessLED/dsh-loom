#!/usr/bin/env bash
# Poll the three arms until every one of them is out of `running`, then print a
# one-line summary per arm. Bounded by MAXT so a stuck arm cannot hang the night.
cd /c/Projects/RSI || exit 1
NODE="/c/Users/Darkness/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/node/bin/node.exe"
MAXT=${MAXT:-10800}
start=$(date +%s)
while true; do
  out=$("$NODE" - <<'MJSEOF'
const { readFileSync, existsSync } = require('node:fs')
const { join } = require('node:path')
const { homedir } = require('node:os')
const ROOT = join(homedir(), '.dsh', 'loom', 'campaigns')
const rows = []
for (const id of ['ab-cand1', 'ab-cand2', 'ab-cand3']) {
  const f = join(ROOT, id, 'views', 'state.json')
  if (!existsSync(f)) { rows.push(`${id} missing`); continue }
  const s = JSON.parse(readFileSync(f, 'utf8'))
  const done = (s.rounds || []).filter((r) => r.status && r.status !== 'running')
  const q = done.map((r) => {
    const a = (r.attempts || [])[0]
    return a && a.metrics && Number.isFinite(Number(a.metrics.quality)) ? Number(a.metrics.quality) : null
  })
  rows.push(`${id} ${s.status} ${done.length}/${s.budget?.rounds} [${q.map((x) => (x === null ? '?' : x.toFixed(2))).join(',')}]`)
}
console.log(rows.join(' | '))
MJSEOF
)
  echo "$(date +%H:%M:%S) $out"
  nrun=$(echo "$out" | grep -o "running" | wc -l)
  if [ "$nrun" -eq 0 ]; then echo "ALL-ARMS-DONE"; exit 0; fi
  now=$(date +%s)
  if [ $((now - start)) -gt "$MAXT" ]; then echo "TIMEOUT"; exit 2; fi
  sleep 120
done
