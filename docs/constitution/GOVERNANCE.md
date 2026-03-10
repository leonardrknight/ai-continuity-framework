# GOVERNANCE.md — AI Continuity Framework

**Version:** 2.0
**Date:** 2026-03-10
**Status:** DRAFT — Awaiting Leo's approval
**Supersedes:** Version 1.0 (methodology-only scope)

---

## Autonomy Tier

**Tier 0** — All agent actions require explicit human (Leo) approval.

This is a retroactively adopted project. FORGE lifecycle agents are available but operate under maximum governance until trust is established.

---

## Decision Authority

| Decision Type | Authority | Process |
|---------------|-----------|---------|
| New core document (numbered) | Leo | Proposal → review → merge |
| Research iteration scope | Leo + Jordan | Jordan frames questions, Leo approves dispatch |
| Template changes | Leo | Review impact on existing users |
| Proposal promotion (proposal → core doc) | Leo | ADR required |
| Framework architecture changes | Leo | ADR required |
| Terminology/glossary changes | Leo | Update PRODUCT.md Key Concepts |
| FORGE tier promotion | Leo | Governance checkpoint |
| Guardian Agent architecture changes | Leo | ADR required |
| Guardian Agent new webhook events | Leo | PR with documented action |
| Supabase schema migrations | Leo | PR + staging test |
| GitHub App permission changes | Leo | PR + scope rationale |
| README/contributing updates | Leo | Standard PR review |

---

## Change Control

### Core Documents (01-XX)
- Changes to existing core documents require a PR with rationale.
- New core documents require a brief proposal explaining what gap they fill and how they connect to existing content.
- Numbering is append-only. Never renumber existing documents.

### Research
- New research iterations can be dispatched by Leo (often via Jordan).
- Each iteration produces a `00-synthesis.md` summarizing findings.
- Research does not automatically change core documents — findings must be explicitly promoted.

### Templates
- Template changes should be backward-compatible where possible.
- Breaking changes require an ADR.

### Insights
- Production observations can be added freely. They document what happened, not what should change.
- Insights that warrant framework changes should reference the insight and go through normal change control.

### Guardian Agent (`guardian/` directory)

All changes to `guardian/` require a PR with review. Additional controls by change type:

| Change Type | Requirements |
|-------------|-------------|
| **Code changes** | PR + Sacred Four pass (`pnpm build`, `pnpm lint`, `pnpm test`, `pnpm typecheck`) |
| **Supabase migrations** | PR + migration review by Leo. Migrations must be additive (no destructive column drops without ADR). Test against staging before merge. |
| **GitHub App config** | PR + Leo approval. Permission scope changes require rationale in PR description. Webhook event additions must document the Guardian action triggered. |
| **Environment variables** | Update `.env.example` in the same PR. Never commit actual secrets. |
| **Agent behavior changes** | PR + verify against methodology docs. If behavior diverges from core docs (01-XX), the software gets fixed — docs are authoritative. |
| **Dependency updates** | PR + `pnpm audit` clean. Major version bumps require rationale. |

**Sacred Four enforcement:** All Guardian PRs must pass the four commands before merge:
```bash
cd guardian && pnpm build && pnpm lint && pnpm test && pnpm typecheck
```

---

## FORGE Agent Permissions

| Agent | Permitted Actions |
|-------|-------------------|
| @F (Frame) | Draft/update PRODUCT.md |
| @O (Orchestrate) | Draft/update TECH.md, architecture proposals |
| @R (Refine) | Review any artifact for coherence and conflicts |
| @G (Govern) | Route requests, enforce policy, log events |
| @E (Execute) | Write documents per approved handoffs only |
| @Q (Quality) | Advisory analysis — never blocks |

**All agents require Leo's explicit approval before modifying files.** (Tier 0 policy)

---

## ADR Policy

Architecture Decision Records go in `docs/adr/` using the template at `docs/adr/adr-template.md`.

ADRs are required for:
- Changes to the layered memory model (Scaffolding/Soul architecture)
- New core document topics
- Template schema changes
- Promoting research findings to core recommendations
- Changes to the document numbering or structure convention
- Guardian Agent architecture changes (agent additions/removals, pipeline changes)
- Destructive Supabase schema changes (column drops, table removals)

ADRs are NOT required for:
- Adding research iterations
- Adding insights
- Typo/clarity fixes to existing documents
- Parking lot updates

---

## Git Workflow

- **Main branch:** `main` — always stable
- **Feature branches:** `feature/<topic>` or `insight/<topic>`
- **PR required** for all changes to core documents and templates
- **Direct push** allowed for research iteration content (expedites research velocity)
- **No force push** to main

---

## Review Checklist

Before merging changes to core documents:

- [ ] Consistent with existing framework terminology
- [ ] Cross-references to related documents are valid
- [ ] Provider-neutral (no vendor lock-in)
- [ ] Templates updated if schema changed
- [ ] README updated if new core document added

---

## Parking Lot

Deferred decisions and future work tracked in:
- `docs/parking-lot/future-work.md`
- `docs/parking-lot/known-issues.md`

Items move out of parking lot via normal change control.

---

## Tier Promotion Path

| From | To | Requirement |
|------|----|-------------|
| Tier 0 | Tier 1 | 3+ successful FORGE-governed changes merged without issues |
| Tier 1 | Tier 2 | Established patterns; Leo approves expanded autonomy |

---

*This document defines WHO decides and HOW changes are governed. See PRODUCT.md for WHAT. See TECH.md for HOW.*
