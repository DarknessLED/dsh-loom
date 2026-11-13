#!/usr/bin/env bash
# All modules at once: 415 mutants, ~0.3-2s per guard spec, one process per module.
N="${LOOM_NODE:-node}"
set -u
pids=()
for m in src/knowledge/select.js src/knowledge/impact.js src/gate/gate.js src/runtime/selector.js src/gate/earned.js src/gate/oracle.js src/runtime/candidates.js src/runtime/baseline.js; do
  "$N" research/mutants/run.mjs --module="$m" --split=all > "research/mutants/.log-$(echo "$m" | tr '/' '-').txt" 2>&1 &
  pids+=($!)
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
echo "=== sweep done (fail=$fail) ==="
cat research/mutants/.log-*.txt
