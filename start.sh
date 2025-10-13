#!/bin/sh
set -e
#!/bin/sh
set -e

python3 /app/web_entrypoint.py &
WEB_PID=$!

cleanup() {
  if kill -0 "$WEB_PID" 2>/dev/null; then
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
  fi
  if [ -n "${EMQX_PID:-}" ] && kill -0 "$EMQX_PID" 2>/dev/null; then
    kill "$EMQX_PID" 2>/dev/null || true
    wait "$EMQX_PID" 2>/dev/null || true
  fi
}

trap cleanup INT TERM

/usr/bin/docker-entrypoint.sh emqx foreground &
EMQX_PID=$!

wait "$EMQX_PID"
STATUS=$?

cleanup
exit $STATUS
