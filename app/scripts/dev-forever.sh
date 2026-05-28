#!/usr/bin/env bash
#
# Supervised Vite dev server.
#
# Why this exists: a plain `npm run dev` can die after a stretch of
# inactivity (macOS idle-sleep, App Nap throttling the terminal, the
# process getting reaped) and you hit "connection refused". This wrapper:
#
#   1. caffeinate  -> stops the Mac from idle-sleeping while it runs
#   2. restart loop -> if vite exits for any reason, it comes back in ~1s
#   3. strictPort   -> always rebinds http://localhost:5173, so your
#                      existing browser tab reconnects automatically
#
# Usage:  npm run dev:forever   (Ctrl-C to stop for good)

set -u
cd "$(dirname "$0")/.." || exit 1

# Run the whole loop under caffeinate so the machine never idle-sleeps
# this process out from under us. -i: prevent idle sleep, -m: disk,
# -s: system sleep on AC power. Re-exec ourselves once, guarded by a flag.
if [ "${DEV_FOREVER_CAFFEINATED:-}" != "1" ]; then
  exec caffeinate -ims env DEV_FOREVER_CAFFEINATED=1 "$0" "$@"
fi

echo "▶  dev-forever: supervising vite on http://localhost:5173 (Ctrl-C to stop)"
trap 'echo; echo "■  dev-forever: stopped."; exit 0' INT TERM

while true; do
  npx vite "$@"
  code=$?
  # 130 = Ctrl-C passed through; honor it and stop.
  if [ "$code" -eq 130 ]; then
    echo "■  dev-forever: vite interrupted, stopping."
    exit 0
  fi
  echo "⚠  dev-forever: vite exited (code $code). Restarting in 1s…"
  sleep 1
done
