#!/usr/bin/env bash
# Stop-gate: typecheck + unit tests before an agent yields control back.
#
# Only runs when TypeScript source (*.ts/*.tsx) actually changed vs the working
# tree, so conversational/doc-only turns stay instant. On failure it exits 2,
# which BLOCKS the turn from ending and feeds the errors back to the agent so it
# fixes them before finishing — this is the "loop until verified" gate.
#
# Too slow? Comment out the "Unit tests" block below to gate on typecheck only.
set -uo pipefail

dir="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$dir" || exit 0

# Gate only when TS/TSX changed (staged, unstaged, or untracked).
changed=$(git status --porcelain 2>/dev/null | grep -E '\.(ts|tsx)("| ->.*)?$' || true)
if [ -z "$changed" ]; then
  exit 0
fi

# 1) Typecheck — fast-fail before spending time on tests.
if ! out=$(npx tsc --noEmit 2>&1); then
  {
    echo "❌ Verification gate: typecheck failed. Fix these before finishing:"
    echo "$out" | tail -n 40
  } >&2
  exit 2
fi

# 2) Unit tests.
if ! out=$(npx vitest run 2>&1); then
  {
    echo "❌ Verification gate: tests failed. Fix these before finishing:"
    echo "$out" | tail -n 40
  } >&2
  exit 2
fi

exit 0
