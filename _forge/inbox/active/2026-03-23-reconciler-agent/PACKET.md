# Reconciler Agent — Memory Conflict Resolution

**Created:** 2026-03-23
**Priority:** High
**Requested By:** Leo Knight
**Context:** Guardian needs an agent for managing memories when new information conflicts with existing knowledge.

---

## The Problem

When new information is learned about a topic, how do we reconcile it with existing memories?

**Example scenarios:**
- User says "Antonio is the CEO" but we have a memory saying "Antonio is the CTO"
- A legal document is updated — the new version should supersede the old
- User corrects a fact: "Actually, the deadline is April 15, not April 10"
- Conflicting information from two different humans

## The Vision

A **Reconciler Agent** in the Guardian pipeline that:

1. **Detects Conflicts** — When Scribe captures new information, check for semantic conflicts with existing memories
2. **Classifies Updates** — Is this a correction, an update, superseding information, or genuinely conflicting perspectives?
3. **Resolves or Flags** — Auto-resolve clear cases (corrections, updates), flag ambiguous conflicts for human review
4. **Maintains History** — Don't delete old information; mark it as superseded with a link to the new truth

## Proposed Architecture

```
New Information → Scribe (capture) 
                    ↓
              Reconciler (check for conflicts)
                    ↓
        ┌──────────┴──────────┐
   No Conflict          Conflict Detected
        ↓                      ↓
  Store normally        Classify conflict type
                              ↓
              ┌───────────────┼───────────────┐
         Correction      Supersede       Ambiguous
              ↓              ↓                ↓
         Update old     Archive old      Flag for human
         memory          version         review
```

## Agent Specification

**Name:** Reconciler
**Role:** Detect and resolve memory conflicts
**Trigger:** After Scribe extracts new memories, before storage

**Inputs:**
- New memory candidates from Scribe
- Access to existing memory store (semantic search)

**Outputs:**
- Resolved memories (with conflict resolution metadata)
- Flagged conflicts (for human review queue)
- Archived superseded memories

**Conflict Types:**
1. `correction` — Human explicitly correcting prior information
2. `update` — New information about evolving situation
3. `supersede` — New document/source replacing old one
4. `perspective` — Different humans have different views (both valid)
5. `unclear` — Needs human judgment

## Success Criteria

- [ ] Agent architecture designed
- [ ] Conflict detection logic defined
- [ ] Resolution rules documented
- [ ] Integration point in Guardian pipeline identified
- [ ] Human review queue for ambiguous conflicts

---

## Implementation Notes

This is an architecture/design packet. Define the agent specification fully before any code. May require database schema updates for conflict tracking.
