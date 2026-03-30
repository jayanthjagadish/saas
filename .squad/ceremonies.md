# Ceremonies

> Team meetings that happen before or after work. Each squad configures their own.

## Design Review

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | before |
| **Condition** | multi-agent task involving 2+ agents modifying shared systems |
| **Facilitator** | lead |
| **Participants** | all-relevant |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. Review the task and requirements
2. Agree on interfaces and contracts between components
3. Identify risks and edge cases
4. Assign action items

---

## Retrospective

| Field | Value |
|-------|-------|
| **Trigger** | auto |
| **When** | after |
| **Condition** | build failure, test failure, or reviewer rejection |
| **Facilitator** | lead |
| **Participants** | all-involved |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Agenda:**
1. What happened? (facts only)
2. Root cause analysis
3. What should change?
4. Action items for next iteration

---

## Targeted Smoke Gate

| Field | Value |
|-------|-------|
| **Trigger** | manual |
| **When** | after |
| **Condition** | fix batch collected (before running full suite) |
| **Facilitator** | Baskar |
| **Participants** | fix-agent(s), lead |
| **Time budget** | focused |
| **Enabled** | ✅ yes |

**Steps:**
1. Run only the spec files touched by the fix batch: `npx playwright test --project=chromium {spec1} {spec2} --reporter=line`
2. Report pass/fail delta vs previous run
3. If new failures introduced, block full suite run and route back to fix agents
4. If no regressions and target tests improved, proceed to full suite
