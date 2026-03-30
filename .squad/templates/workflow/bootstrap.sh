#!/bin/bash
# bootstrap.sh — Bootstrap the portable agentic workflow for a new project
#
# Usage:
#   chmod +x .squad/templates/workflow/bootstrap.sh
#   ./.squad/templates/workflow/bootstrap.sh "MyProject" "Node.js + React + PostgreSQL"
#
# Arguments:
#   $1 — PROJECT_NAME   e.g. "MyProject"
#   $2 — STACK          e.g. "Node.js + React + PostgreSQL"
#
# Optional environment variables:
#   LEAD_NAME      default: "lead"
#   BACKEND_NAME   default: "backend"
#   FRONTEND_NAME  default: "frontend"
#   TESTER_NAME    default: "tester"
#   REPO           default: current git remote origin URL

set -euo pipefail

PROJECT_NAME="${1:-MyProject}"
STACK="${2:-your stack here}"
LEAD_NAME="${LEAD_NAME:-lead}"
BACKEND_NAME="${BACKEND_NAME:-backend}"
FRONTEND_NAME="${FRONTEND_NAME:-frontend}"
TESTER_NAME="${TESTER_NAME:-tester}"
REPO="${REPO:-$(git remote get-url origin 2>/dev/null || echo '{{REPO}}')}"
TODAY="$(date -u +%Y-%m-%d)"

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(pwd)"

echo ""
echo "🚀 Bootstrapping agentic workflow for: $PROJECT_NAME"
echo "   Stack:    $STACK"
echo "   Repo:     $REPO"
echo "   Agents:   $LEAD_NAME (lead) | $BACKEND_NAME (backend) | $FRONTEND_NAME (frontend) | $TESTER_NAME (tester) | scribe"
echo ""

# ── Helper: substitute placeholders in a file ──────────────────────────────
substitute() {
  local file="$1"
  sed -i \
    -e "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" \
    -e "s|{{STACK}}|$STACK|g" \
    -e "s|{{REPO}}|$REPO|g" \
    -e "s|{{LEAD_NAME}}|$LEAD_NAME|g" \
    -e "s|{{BACKEND_NAME}}|$BACKEND_NAME|g" \
    -e "s|{{FRONTEND_NAME}}|$FRONTEND_NAME|g" \
    -e "s|{{TESTER_NAME}}|$TESTER_NAME|g" \
    -e "s|{{PROJECT_START_DATE}}|$TODAY|g" \
    "$file"
}

# ── Create .squad directory structure ──────────────────────────────────────
echo "📁 Creating .squad directory structure..."
mkdir -p \
  "$PROJECT_ROOT/.squad/agents/$LEAD_NAME" \
  "$PROJECT_ROOT/.squad/agents/$BACKEND_NAME" \
  "$PROJECT_ROOT/.squad/agents/$FRONTEND_NAME" \
  "$PROJECT_ROOT/.squad/agents/$TESTER_NAME" \
  "$PROJECT_ROOT/.squad/agents/scribe" \
  "$PROJECT_ROOT/.squad/decisions/inbox" \
  "$PROJECT_ROOT/.squad/log" \
  "$PROJECT_ROOT/.squad/archive/history"

# ── Copy and substitute charters ──────────────────────────────────────────
echo "📋 Installing agent charters..."

copy_charter() {
  local src="$1"
  local dest="$2"
  cp "$src" "$dest"
  substitute "$dest"
}

copy_charter "$BUNDLE_DIR/agent-charters/lead.md"     "$PROJECT_ROOT/.squad/agents/$LEAD_NAME/charter.md"
copy_charter "$BUNDLE_DIR/agent-charters/backend.md"  "$PROJECT_ROOT/.squad/agents/$BACKEND_NAME/charter.md"
copy_charter "$BUNDLE_DIR/agent-charters/frontend.md" "$PROJECT_ROOT/.squad/agents/$FRONTEND_NAME/charter.md"
copy_charter "$BUNDLE_DIR/agent-charters/tester.md"   "$PROJECT_ROOT/.squad/agents/$TESTER_NAME/charter.md"
copy_charter "$BUNDLE_DIR/agent-charters/scribe.md"   "$PROJECT_ROOT/.squad/agents/scribe/charter.md"

# ── Initialize history files ───────────────────────────────────────────────
echo "📝 Initializing history files..."
for agent in "$LEAD_NAME" "$BACKEND_NAME" "$FRONTEND_NAME" "$TESTER_NAME" "scribe"; do
  history_file="$PROJECT_ROOT/.squad/agents/$agent/history.md"
  if [ ! -f "$history_file" ]; then
    cat > "$history_file" <<HISTORY
# $agent History

## Project Context

**Project:** $PROJECT_NAME
**Stack:** $STACK
**Started:** $TODAY

## Learnings

*(Scribe appends learnings here after each session.)*
HISTORY
  fi
done

# ── Copy and substitute decisions-seed.md ─────────────────────────────────
echo "📌 Installing decisions.md..."
if [ ! -f "$PROJECT_ROOT/.squad/decisions.md" ]; then
  cp "$BUNDLE_DIR/decisions-seed.md" "$PROJECT_ROOT/.squad/decisions.md"
  substitute "$PROJECT_ROOT/.squad/decisions.md"
else
  echo "   ⚠️  .squad/decisions.md already exists — skipping (not overwritten)"
fi

# ── Copy API contract template ─────────────────────────────────────────────
echo "📄 Installing API contract template..."
if [ ! -f "$PROJECT_ROOT/API_CONTRACT.md" ]; then
  cp "$BUNDLE_DIR/API_CONTRACT_template.md" "$PROJECT_ROOT/API_CONTRACT.md"
  substitute "$PROJECT_ROOT/API_CONTRACT.md"
  echo "   ✅ API_CONTRACT.md created at project root — fill this in before any feature work starts"
else
  echo "   ⚠️  API_CONTRACT.md already exists — skipping (not overwritten)"
fi

# ── Initialize team.md ────────────────────────────────────────────────────
echo "👥 Initializing team roster..."
cat > "$PROJECT_ROOT/.squad/team.md" <<TEAM
# Team Roster — $PROJECT_NAME

| Agent | Role | Charter |
|---|---|---|
| $LEAD_NAME | Engineering Lead | .squad/agents/$LEAD_NAME/charter.md |
| $BACKEND_NAME | Backend Engineer | .squad/agents/$BACKEND_NAME/charter.md |
| $FRONTEND_NAME | Frontend Engineer | .squad/agents/$FRONTEND_NAME/charter.md |
| $TESTER_NAME | Automation Engineer | .squad/agents/$TESTER_NAME/charter.md |
| scribe | Knowledge & Compliance Officer | .squad/agents/scribe/charter.md |

*Maintained by Scribe. Update when roles change.*
TEAM

# ── Initialize routing.md ─────────────────────────────────────────────────
cat > "$PROJECT_ROOT/.squad/routing.md" <<ROUTING
# Agent Routing — $PROJECT_NAME

## Who to involve for what

| Concern | Primary Agent | Reviewer |
|---|---|---|
| API contract changes | $BACKEND_NAME | $LEAD_NAME |
| Frontend UI / components | $FRONTEND_NAME | $LEAD_NAME |
| Test suite / automation | $TESTER_NAME | $LEAD_NAME |
| Schema / migrations | $BACKEND_NAME | $LEAD_NAME |
| Architecture decisions | $LEAD_NAME | — |
| Security review | $LEAD_NAME | — |
| Decisions / history | scribe | $LEAD_NAME |
| Handoff files | $FRONTEND_NAME → $TESTER_NAME | — |

*Maintained by Scribe. Update when responsibilities change.*
ROUTING

# ── Done ──────────────────────────────────────────────────────────────────
echo ""
echo "✅ Workflow bootstrapped for $PROJECT_NAME ($STACK)"
echo ""
echo "Next steps:"
echo "  1. Fill in the Tools & Stack sections in each agent charter"
echo "  2. Have $BACKEND_NAME fill in API_CONTRACT.md before any feature work"
echo "  3. Review .squad/decisions.md and update {{PROJECT_START_DATE}} entries if needed"
echo "  4. Start your first feature — the pipeline runs itself from here"
echo ""
