# Squad Team Reuse Guide

How to bring this AI team (Jayanth/Lead, Karthi/Backend, Senthil/Frontend, Baskar/Tester) to a new project.

---

## What to Copy

### Tier 1 — Must Copy (Core Team DNA)

These files ARE the team. Without them, agents start blind.

```
.squad/
  agents/
    jayanth/charter.md      ← Lead role, PR gates, DOD, infra-first triage
    karthi/charter.md       ← Backend role, AppError pattern, infra-first triage
    senthil/charter.md      ← Frontend role, auth hydration, infra-first triage
    baskar/charter.md       ← Tester role, pre-flight checklist, root cause classification
    scribe/charter.md       ← Session logging, decisions merge, git commits
    ralph/charter.md        ← Work monitor, backlog loop
  team.md                   ← Roster table (GitHub label routing depends on this)
  routing.md                ← Who handles what type of work
  ceremonies.md             ← Sprint ceremonies config
  casting/
    policy.json             ← Universe config
    registry.json           ← Name mappings (marks agents as legacy_named)
    history.json            ← Universe usage history
  templates/                ← ALL templates (Squad needs these at init and add-member time)
```

### Tier 2 — Copy if Relevant (Earned Knowledge)

Skills are lessons the team learned. Copy the ones that apply to your new project's stack.

| Skill File | Copy When |
|---|---|
| `.squad/skills/e2e-test-infra/SKILL.md` | Any project with Playwright E2E tests |
| `.squad/skills/architecture-patterns/SKILL.md` | Any SOLID/Clean Architecture project |
| `.squad/skills/express-sequelize-jwt-backend/SKILL.md` | Express + MySQL backend |
| `.squad/skills/saas-stripe-architecture/SKILL.md` | Any project with Stripe/subscriptions |
| `.squad/skills/payment-testing-patterns/SKILL.md` | Any project with payment flows |

### Tier 3 — Start Fresh (Project-Specific)

Do NOT copy these — they contain this project's specific decisions and history.

```
.squad/decisions.md           ← Fenster-specific decisions
.squad/decisions/inbox/       ← Pending decisions for this project
.squad/agents/*/history.md    ← Fenster-specific learnings (each agent's memory)
.squad/backlog.md             ← Fenster backlog
.squad/identity/now.md        ← Current focus (project-specific)
.squad/orchestration-log/     ← This project's session logs
.squad/log/                   ← This project's session logs
```

---

## Step-by-Step: Setting Up on a New Project

### Step 1 — Copy the files

```powershell
# From your new project root:
# Copy the entire .squad folder from lession3
xcopy /E /I /Y C:\Users\jayanth.jagadish\source\lession3\.squad .squad

# Then delete the project-specific state:
Remove-Item .squad\decisions\inbox\* -Force -ErrorAction SilentlyContinue
Remove-Item .squad\agents\*\history.md -Force -ErrorAction SilentlyContinue
Remove-Item .squad\orchestration-log\* -Force -ErrorAction SilentlyContinue
Remove-Item .squad\log\* -Force -ErrorAction SilentlyContinue
Remove-Item .squad\backlog.md -Force -ErrorAction SilentlyContinue
Remove-Item .squad\identity\now.md -Force -ErrorAction SilentlyContinue
```

### Step 2 — Reset decisions.md

Replace `.squad/decisions.md` with a blank slate:
```markdown
# Team Decisions

_No decisions recorded yet._
```

### Step 3 — Reseed agent histories

For each agent, create a fresh `.squad/agents/{name}/history.md` with:
```markdown
# {AgentName} — History

## Project Context
- **Project:** {Your new project name}
- **Stack:** {Your tech stack}
- **Owner:** {Your name}
- **Started:** {Date}

## Learnings
_Nothing yet — session 1._
```

### Step 4 — Update team.md

Edit `.squad/team.md` and update the `## Project Context` section with your new project name, stack, and description. The `## Members` roster stays the same (same team, different project).

### Step 5 — Update routing.md (optional)

If your new project has different domains (e.g., Python instead of TypeScript), update `.squad/routing.md` to match. The agent roles stay the same; just update the keywords and file patterns.

### Step 6 — Copy squad.bat (Windows launcher)

```powershell
copy C:\Users\jayanth.jagadish\source\lession3\squad.bat {new-project-root}\squad.bat
```

Edit `squad.bat` to match your new project's setup commands (npm install path, DB provisioning, etc).

### Step 7 — Copy .gitattributes merge drivers

```powershell
copy C:\Users\jayanth.jagadish\source\lession3\.gitattributes {new-project-root}\.gitattributes
```

This enables conflict-free merging of `.squad/` files across branches.

### Step 8 — Launch

```
squad.bat
```
Or manually: `gh copilot --agent Squad --yolo`

---

## What the Charters Enforce (Already Baked In)

You don't need to re-teach the team these rules — they're in the charters:

| Rule | Where |
|------|-------|
| Infra-First Triage — classify failures before writing code | All charters |
| Plan-First Protocol — write plan before any code | All charters |
| Definition of Done (4 gates) — code + test passes + no regressions + logged | All charters |
| Verify-Fix Protocol — run the test, confirm green, THEN declare done | Karthi, Senthil, Baskar |
| Pre-flight checklist before E2E tests | Baskar charter + e2e-test-infra SKILL |
| Root cause classification (code vs infra vs config) | Baskar charter |
| PR review gate — all non-trivial changes through Jayanth | Jayanth charter |
| test.skip() banned, test.fixme() for infra-blocked only | Baskar charter |
| AppError instanceof pattern | Karthi history (will re-learn if not in skill) |

---

## Files That Must Exist on GitHub (.github/agents/)

For Squad to work with GitHub Copilot as the coordinator, this file must exist in your new repo:

```
.github/agents/squad.agent.md   ← The Squad coordinator instructions
```

Copy from: `C:\Users\jayanth.jagadish\source\lession3\.github\agents\squad.agent.md`

---

## Quick Reference: File Purposes

| File | Purpose | Copy? |
|------|---------|-------|
| `.github/agents/squad.agent.md` | Squad coordinator brain | ✅ Always |
| `.squad/team.md` | Roster + project context | ✅ Update project section |
| `.squad/routing.md` | Work routing rules | ✅ Update for new stack |
| `.squad/ceremonies.md` | Sprint ceremonies | ✅ As-is |
| `.squad/agents/*/charter.md` | Agent roles + protocols | ✅ As-is (update stack refs) |
| `.squad/agents/*/history.md` | Agent memories | ❌ Start fresh |
| `.squad/decisions.md` | Team decisions | ❌ Start blank |
| `.squad/skills/e2e-test-infra/SKILL.md` | E2E hard lessons | ✅ If using Playwright |
| `.squad/skills/architecture-patterns/SKILL.md` | SOLID/Clean Arch | ✅ Always |
| `.squad/casting/` | Name persistence | ✅ As-is |
| `.squad/templates/` | Squad system templates | ✅ Always |
| `squad.bat` | One-command launcher | ✅ Edit for new project |
| `.gitattributes` | Merge drivers | ✅ Always |
