---
name: forge-abc
description: Conversational project intake — handles acquire, brief (conditional), and commit in one flow
trigger: /forge-abc
agent: forge-abc
version: 2.1.0
autonomy_tier: 0
---

# forge-abc Skill

**Skill Name:** forge-abc
**Invocation:** `/forge-abc`
**Agent:** @abc
**Phase:** Pre-FORGE
**Version:** 2.1.0

---

## Description

Unified Pre-FORGE intake skill that handles project scaffolding, conversational intake, optional sensemaking, and commitment gate in a single flow. Replaces previous three-skill sequence (`/forge-a`, `/forge-b`, `/forge-c`).

---

## Usage

```bash
/forge-abc
```

Or address agent directly:
```
@abc I want to build [project description]
```

Or natural language routing:
```
"I want to build a new project"
"Start a new project"
"Create a new app"
```

---

## What This Skill Does

1. **Greeting**: Introduces @abc, asks for project description
2. **Minimum Questions**: Asks 5 core questions (name, type, users, goal, constraints)
3. **Sensemaking Evaluation**: Detects ambiguity, contradictions, unfamiliar domains
4. **Fast-Path** (if clear intent): Confirm → Define scope → Commit → Scaffold
5. **Exploratory-Path** (if ambiguity): Clarify → Generate options → Select → Commit → Scaffold
6. **Artifact Production**: INTAKE.md (always), BRIEF.md + IDEA_OPTIONS.md (conditional), FORGE-ENTRY.md (on commit)
7. **Scaffold**: Create complete project structure from template
8. **STOP**: Hand off to human, no autonomous continuation

---

## Output Artifacts

**Always Produced:**
- `abc/INTAKE.md` — Structured intake summary
- `abc/FORGE-ENTRY.md` — Gate artifact (unlocks F.O.R.G.E agents)
- Complete project structure (`.claude/`, `docs/`, `_forge/`, `src/`, `tests/`)

**Conditionally Produced (if sensemaking triggered):**
- `abc/BRIEF.md` — Problem statement, opportunity, context, assumptions
- `abc/IDEA_OPTIONS.md` — 2-3 candidate directions with pros/cons/risks

---

## Tool Allowances

- **Bash**: Directory creation, file operations
- **Read**: Template reading, existing artifact inspection
- **Write**: Artifact creation
- **Edit**: Template customization
- **Glob**: File discovery
- **Grep**: Content search

---

## Autonomy Tier

**Tier 0**: All actions require explicit human approval before execution.

No autonomous scaffolding. No autonomous artifact creation. No autonomous commit.

---

## Hard Stops

@abc refuses to proceed if:
- `abc/FORGE-ENTRY.md` already exists (FORGE already unlocked)
- Spawn location is inside FORGE repository (hard separation violated)
- Human does not give explicit "commit to build" approval
- Critical fields missing after multiple attempts

---

## Next Steps After Completion

After @abc completes, human must:
1. Navigate to project: `cd <project-path>`
2. Invoke @F (Frame): `/forge-f`
3. @F will produce `docs/constitution/PRODUCT.md`

---

## Reference

**Agent Definition:** `.claude/agents/forge-abc.md`
**Operating Guide:** `method/agents/forge-abc-operating-guide.md`
**Canon:** `method/core/forge-core.md`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.1.0 | 2026-02-16 | Initial unified skill replacing forge-a, forge-b, forge-c |
