# Portable Agentic Workflow Bundle

A drop-in workflow system for multi-agent software teams. Copy this bundle into any new project and get a contract-first, gated, parallel-testing pipeline in minutes.

---

## What This Workflow Is — And Why It Works

Most agentic teams fail in one of three ways: agents step on each other, tests are written after the fact, or there's no gate between individual work and `main`. This workflow solves all three by enforcing a strict pipeline:

1. **Contracts before code** — the backend publishes an API contract before either the frontend or tester writes a single line.
2. **Parallel execution by design** — frontend and tester work simultaneously; the tester doesn't wait for the UI.
3. **Explicit handoff signals** — a file drop (the frontend handoff file) is the only trusted trigger for selector-level test work.
4. **A single merge gate** — no code lands on `main` without the lead's explicit review.

The workflow is **polyglot and stack-agnostic**. Every charter uses placeholder variables so the pattern ports instantly to any language or framework.

---

## The 5 Core Principles

| # | Principle | What It Means |
|---|-----------|---------------|
| 1 | **Contract-First** | Backend publishes `API_CONTRACT.md` (or equivalent spec) before frontend or tester starts work on a feature |
| 2 | **Handoff Gate** | Frontend agent writes a structured handoff file before declaring "done"; tester agent reads it before filling in selectors |
| 3 | **Parallel Testing** | Tester writes API contract skeletons during frontend build (Phase 1), then fills in UI selectors after handoff (Phase 2) |
| 4 | **PR Gate** | All non-trivial code changes (>5 lines or >1 file) must be reviewed and approved by the lead before merging to `main` |
| 5 | **Polyglot Agents** | Every agent's identity is defined by *function*, not by a specific language or tool; charters adapt to whatever stack the project uses |

---

## Full Pipeline Diagram

```
{{LEAD_NAME}} (Lead)
       │ writes API_CONTRACT.md
       ▼
┌──────────────────────────────────────┐
│  PARALLEL PHASE                       │
│  {{BACKEND_NAME}} (Backend) ───────┐  │
│  {{FRONTEND_NAME}} (Frontend) ───┐ │  │
│  {{TESTER_NAME}} (skeleton tests)◄┘ │  │
└────────────────────────────────────┘
       │ {{FRONTEND_NAME}} writes
       │   {agent}-handoff-{feature}.md
       ▼
{{TESTER_NAME}} fills in selectors (24h SLA)
       │
       ▼
{{LEAD_NAME}} reviews PR → merge to main
```

### Phase Detail

```
TIME ──────────────────────────────────────────────────────────►

CONTRACT ────────────►
                      BACKEND BUILD ──────────────────────────►
                      FRONTEND BUILD ─────────────────────────►
                      TESTER Phase 1 (API skeletons) ─────────►
                                     │ handoff file lands
                                     ▼
                                     TESTER Phase 2 (selectors)►
                                                     │ PR opened
                                                     ▼
                                                     LEAD REVIEW
                                                     │ approved
                                                     ▼
                                                     MERGE → main
```

---

## How to Bootstrap on a New Project

### Step 1 — Copy the bundle

```bash
# From your new project root:
cp -r /path/to/this/bundle/.squad/templates/workflow/.  ./  # Unix
# or run the bootstrap script directly:
bash .squad/templates/workflow/bootstrap.sh "MyProject" "Node.js + React + PostgreSQL"
# Windows:
.\.squad\templates\workflow\bootstrap.ps1 "MyProject" "Node.js + React + PostgreSQL"
```

### Step 2 — Substitute placeholders

Replace all occurrences of:

| Placeholder | Replace with |
|---|---|
| `{{PROJECT_NAME}}` | Your project name |
| `{{STACK}}` | Your tech stack summary |
| `{{REPO}}` | Your repository path / URL |
| `{{LEAD_NAME}}` | Your lead agent's name |
| `{{BACKEND_NAME}}` | Your backend agent's name |
| `{{FRONTEND_NAME}}` | Your frontend agent's name |
| `{{TESTER_NAME}}` | Your tester agent's name |

The bootstrap script handles this substitution automatically when you supply `PROJECT_NAME` and `STACK`.

### Step 3 — Customise charters

Each agent charter under `.squad/agents/{name}/charter.md` contains a `## Stack Agnosticism` section and a `## Tools & Stack` section. Fill in the project-specific tooling there. Everything else (protocol, constraints, success metrics) is ready to use as-is.

### Step 4 — Seed decisions

Copy `decisions-seed.md` to `.squad/decisions.md`. It is pre-populated with the seven foundational decisions that make this workflow function. Add project-specific decisions underneath.

### Step 5 — Write the first contract

Copy `API_CONTRACT_template.md` to the appropriate location in your repo (e.g., `packages/api/API_CONTRACT.md`). Backend fills it in. No feature work starts until this file is committed.

### Step 6 — Go

Start your agents. The pipeline runs itself from this point.

---

## Files in This Bundle

```
.squad/templates/workflow/
├── README.md                        ← this file
├── bootstrap.sh                     ← Unix bootstrap script
├── bootstrap.ps1                    ← Windows bootstrap script
├── decisions-seed.md                ← seed decisions.md with 8 foundational decisions
├── API_CONTRACT_template.md         ← blank API contract for backend to fill in
└── agent-charters/
    ├── lead.md                      ← Engineering Lead charter
    ├── backend.md                   ← Backend Engineer charter
    ├── frontend.md                  ← Frontend Engineer charter
    ├── tester.md                    ← Automation Engineer / Tester charter
    └── scribe.md                    ← Knowledge & Compliance Officer charter
```

---

## Worktrees on Demand

For parallel feature work, use git worktrees so agents don't block each other on separate branches:

```bash
git worktree add ../{{PROJECT_NAME}}-feature-x feature/x
git worktree add ../{{PROJECT_NAME}}-feature-y feature/y
# Each agent works in its own worktree; PRs opened back to main
git worktree remove ../{{PROJECT_NAME}}-feature-x  # clean up after merge
```

Worktrees are **on demand** — don't create them by default. Create one when two features would otherwise conflict on the same files.

---

## History Compaction — Always On

Each agent's `history.md` must stay under 10 KB. When it grows beyond that, Scribe archives older entries to `.squad/archive/history/{agent}-{date}.md` and keeps only the most recent learnings in the live file. This is not optional — it's always on.
