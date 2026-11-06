#!/usr/bin/env bash
# Parallel range download of the Lean 4 stable toolchain, then install it into
# ~/.elan/toolchains so `elan`/`lake` pick it up without a second download.
set -euo pipefail

PROXY="http://127.0.0.1:7890"
URL="https://github.com/leanprover/lean4/releases/download/v4.35.0/lean-4.35.0-windows.tar.zst"
WORK="/c/Users/Darkness/.elan/dl/lean"
TOOLCHAIN="leanprover--lean4---v4.35.0"
DEST="/c/Users/Darkness/.elan/toolchains/$TOOLCHAIN"
CHUNKS=6

mkdir -p "$WORK"
cd "$WORK"

SIZE=$(curl -sIL -x "$PROXY" --max-time 30 "$URL" | tr -d '\r' | awk 'tolower($1)=="content-length:"{n=$2} END{print n}')
if [ -z "${SIZE:-}" ] || [ "$SIZE" -lt 1000000 ]; then
  echo "cannot determine size (got '${SIZE:-}')"
  exit 1
fi
echo "size=$SIZE chunks=$CHUNKS"

SLICE=$(( (SIZE + CHUNKS - 1) / CHUNKS ))
pids=()
for i in $(seq 0 $((CHUNKS - 1))); do
  start=$(( i * SLICE ))
  end=$(( start + SLICE - 1 ))
  [ "$end" -ge "$SIZE" ] && end=$(( SIZE - 1 ))
  part="chunk-$i"
  # Resume-safe: a re-run continues each chunk where it stopped.
  have=0
  [ -f "$part" ] && have=$(stat -c%s "$part")
  from=$(( start + have ))
  if [ "$have" -ge $(( end - start + 1 )) ]; then
    echo "chunk $i already complete"
    continue
  fi
  (
    curl -sL -x "$PROXY" --max-time 5400 -r "$from-$end" "$URL" >> "$part"
  ) &
  pids+=($!)
done

for p in "${pids[@]:-}"; do
  [ -n "$p" ] && wait "$p" || true
done

cat chunk-* > lean.tar.zst
GOT=$(stat -c%s lean.tar.zst)
echo "downloaded=$GOT expected=$SIZE"
[ "$GOT" -eq "$SIZE" ] || { echo "size mismatch"; exit 2; }

rm -rf "$DEST"
mkdir -p "$DEST"
tar --zstd -xf lean.tar.zst -C "$DEST" --strip-components=1
echo "installed into $DEST"
ls "$DEST" | head
