# Decisions — {{PROJECT_NAME}}

This file is the canonical decision log for {{PROJECT_NAME}}. All significant technical and process decisions are recorded here. Scribe maintains this file; every entry is attributed to the agent or person who made the decision.

---

## Foundational Workflow Decisions

### DEC-001 — Contract-First Development Pipeline
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** No feature development (frontend or tester) begins until {{BACKEND_NAME}} has written and committed `API_CONTRACT.md` for that feature, and {{LEAD_NAME}} has approved it.

**Rationale:** Contract-first eliminates the most common cause of integration failures: frontend and backend making incompatible assumptions about request/response shapes. It also unblocks {{TESTER_NAME}} to write API contract tests immediately, without waiting for any UI work.

**Consequences:** {{BACKEND_NAME}} must budget time for contract writing before implementation. Small delays at contract time prevent large delays at integration time.

---

### DEC-002 — Frontend→Tester Handoff Gate
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** {{TESTER_NAME}} must not write UI selector-level tests until {{FRONTEND_NAME}} has written a `{agent}-handoff-{feature}.md` file in `.squad/decisions/inbox/`. {{TESTER_NAME}} must read this file and use only the selectors documented in it.

**Rationale:** Selectors guessed or derived by inspection are brittle and frequently wrong. The handoff protocol makes the selector contract explicit and owned by the person who built the UI.

**Consequences:** {{FRONTEND_NAME}} must add the handoff file step to their definition of done. {{TESTER_NAME}} has a 24h SLA to fill in Phase 2 tests after the handoff file lands.

---

### DEC-003 — Two-Phase Parallel Testing Protocol
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** Testing runs in two phases. Phase 1 (API contract skeletons using `test.todo()`) runs in parallel with frontend development, triggered by the API contract. Phase 2 (UI selector fill-in) begins when the handoff file lands. The two phases eliminate the serial bottleneck of waiting for complete UI before starting any test work.

**Rationale:** In a serial workflow, {{TESTER_NAME}} is idle for the entire duration of backend + frontend work. The two-phase approach gives {{TESTER_NAME}} meaningful, non-blocking work from the moment the contract is published.

**Consequences:** {{TESTER_NAME}} must maintain a clear discipline between Phase 1 (no selectors — `test.todo()`) and Phase 2 (selectors from handoff only). Mixing phases creates brittle tests.

---

### DEC-004 — PR Review Gate (No Direct Merges to Main)
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** All non-trivial changes (>5 lines or >1 file) must be opened as pull requests and reviewed by {{LEAD_NAME}} before merging to `main`. Direct commits to `main` are prohibited for all agents. Scribe's `.squad/`-only housekeeping commits are exempt.

**Rationale:** Without a review gate, agents can make architecturally incorrect or security-compromising changes that look plausible but drift from the established design. A review gate with a <2h SLA keeps the team unblocked while ensuring quality.

**Consequences:** All agents must understand the PR workflow. {{LEAD_NAME}} commits to <2h standard review / <30min hotfix SLA to avoid blocking the team.

---

### DEC-005 — Polyglot / Stack-Agnostic Agents
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** Every agent's identity is defined by their function (lead, backend, frontend, tester, scribe), not by a specific language or framework. Charters use `{{STACK}}` placeholders and `## Stack Agnosticism` sections. Agents adapt to whatever technology the project uses.

**Rationale:** Agent expertise is in discipline and process, not in any particular tool. This makes the workflow portable across projects and allows stack changes without replacing the team structure.

**Consequences:** Tool-specific details belong in the `## Tools & Stack` section of each charter, not in the workflow protocol sections. Protocol sections must remain tool-neutral.

---

### DEC-006 — `test.skip()` Ban
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** `test.skip()` (or equivalent in your test runner) is banned at all times in all test files. `test.todo()` (or equivalent) is the only allowed placeholder, and only during Phase 1. All `test.todo()` entries must be filled within 24h of the handoff file landing.

**Rationale:** `test.skip()` silently removes tests from CI execution, creating invisible gaps in coverage. `test.todo()` is tracked, visible, and clearly communicates intent. Any CI system can be configured to count and alert on outstanding `test.todo()` entries.

**Consequences:** PR review checklist includes a check for new `test.skip()` calls. {{LEAD_NAME}} rejects PRs that introduce `test.skip()` without a documented exception approved by the lead.

---

### DEC-007 — History Compaction Always On
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** Scribe proactively compacts each agent's `history.md` whenever it exceeds 10 KB. Older entries are archived to `.squad/archive/history/{agent}-{date}.md`. This is always active — no sprint or explicit trigger needed.

**Rationale:** Unbounded history files degrade agent context window efficiency. Compaction keeps working memory lean and ensures agents load only high-signal recent learnings.

**Consequences:** Historical entries are never deleted — they are archived and remain accessible. The archive pointer in the live history file ensures discoverability.

---

### DEC-008 — Worktrees on Demand for Parallel Features
**Date:** {{PROJECT_START_DATE}}
**Owner:** {{LEAD_NAME}}
**Status:** Accepted

**Decision:** Git worktrees are used on demand when two or more features would otherwise conflict on the same files. Worktrees are NOT created by default — only when needed. Each worktree maps to a feature branch; PRs are opened back to `main` after lead review.

**Rationale:** Worktrees allow multiple agents to work on overlapping file paths simultaneously without branch conflicts, while keeping the main working tree clean. Creating them by default would add unnecessary overhead.

**Consequences:** Agents must be aware of which worktree they are operating in. Scribe logs worktree creation and removal events. Worktrees are cleaned up immediately after their PR merges.

---

## ADR Index

*(Scribe maintains this index. Add ADRs as the project makes decisions.)*

| ADR # | Title | Status | Owner | Date |
|---|---|---|---|---|
| DEC-001 | Contract-First Development Pipeline | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-002 | Frontend→Tester Handoff Gate | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-003 | Two-Phase Parallel Testing Protocol | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-004 | PR Review Gate | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-005 | Polyglot / Stack-Agnostic Agents | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-006 | test.skip() Ban | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-007 | History Compaction Always On | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |
| DEC-008 | Worktrees on Demand | Accepted | {{LEAD_NAME}} | {{PROJECT_START_DATE}} |

---

*Project-specific decisions go below this line.*
