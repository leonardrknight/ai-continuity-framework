# TECH.md — AI Continuity Framework

**Version:** 1.0
**Date:** 2026-03-10
**Status:** DRAFT — Awaiting approval

---

## Project Type

Documentation and methodology repository. No compiled artifacts, no runtime services. Deliverables are Markdown documents, YAML templates, and research papers.

---

## Repository Structure

```
ai-continuity-framework/
├── 01-The-Problem.md          # Core methodology (numbered sequence)
├── 02-Memory-Architecture.md
├── 03-Journal-Guide.md
├── 04-Migration-Playbook.md
├── 05-Session-Management.md
├── 06-Weekly-Reflection.md
├── 07-Hub-and-Spoke.md
├── 08-Multi-Agent-Memory.md
├── 09-Voice-Capture.md
├── templates/                  # Ready-to-use identity/memory templates
│   ├── VOICE.md
│   ├── SOUL-TEMPLATE.md
│   ├── MEMORY-TEMPLATE.md
│   ├── JOURNAL-TEMPLATE.md
│   ├── USER-TEMPLATE.md
│   ├── AGENTS-TEMPLATE.md
│   └── DAILY-NOTE-TEMPLATE.md
├── research/                   # Deep research iterations
│   ├── iteration-log.md        # Master log of all research cycles
│   ├── iteration-1/ through iteration-7/
│   ├── jordan/                 # Jordan's strategic research
│   └── perplexity-requests/    # Research queries
├── proposals/                  # Implementation proposals
│   ├── soul-capture-implementation-plan.md
│   └── memory-agent-swarm.md
├── insights/                   # Production observations
├── docs/                       # FORGE governance
│   ├── constitution/           # PRODUCT.md, TECH.md, GOVERNANCE.md
│   ├── adr/                    # Architecture Decision Records
│   └── parking-lot/            # Deferred items
├── abc/                        # FORGE entry artifacts
├── _forge/                     # FORGE inbox/ledger
└── .claude/                    # FORGE agents and skills
```

---

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Content format | Markdown (.md) | All documents |
| Data format | YAML | Templates, config, exemplars |
| Version control | Git | GitHub-hosted |
| Package manager | npm | For any future tooling only |
| Research tooling | Perplexity AI | Web-grounded research via MCP |
| Memory graph | MCP Memory Server | Knowledge graph for dev context |

**No build step. No compilation. No runtime dependencies.**

---

## Reference Architecture (Documented, Not Implemented)

The framework documents a layered memory architecture for implementers:

```
┌─────────────────────────────────────┐
│          SOUL (Identity)            │  Stable — updated rarely
├─────────────────────────────────────┤
│       MEMORY (Operational)          │  Active — updated as needed
├─────────────────────────────────────┤
│        DAILY (Short-term)           │  Volatile — updated daily
├─────────────────────────────────────┤
│      SCAFFOLDING (Technical)        │  Infrastructure — configs, creds
└─────────────────────────────────────┘
```

### Proposed Implementation Stack (from research)

| Component | Recommendation | Source |
|-----------|---------------|--------|
| Background agents | Inngest + LangGraph + Redis | Iteration 1 |
| Semantic search | Hybrid BM25 + Vector (α=0.6) | Iteration 1 |
| Voice restoration | Multi-layer capture (guide + stats + embeddings + exemplars) | Iteration 1 |
| Memory consolidation | Ebbinghaus decay + SM-2 reinforcement | Iteration 1 |
| Reranking | Similarity 85% / Recency 15%, min similarity 0.35 | Insight: memory-reranking |
| Storage | Supabase (structured) + Vector store (semantic) + Files (rendered) | Proposals |
| Conflict resolution | Source hierarchy + temporal recency, soft delete | Iteration 2 |

---

## Document Numbering Convention

Core methodology documents use sequential numbering: `NN-Title.md` (e.g., `01-The-Problem.md`). New core documents get the next available number.

Research iterations use: `research/iteration-N/NN-topic.md` with a `00-synthesis.md` summary per iteration.

---

## Quality Standards

| Check | Method |
|-------|--------|
| Markdown validity | Manual review (no linter configured) |
| Internal link integrity | Verify cross-references on PR review |
| Consistent terminology | Use glossary from PRODUCT.md Key Concepts |
| Research citation | Each finding traces to a research document |
| Template usability | Templates must be self-documenting with inline guidance |

---

## Boundaries

- **No executable code** in the main framework. Implementation examples may appear in proposals or research as illustrative pseudocode/snippets.
- **Provider-neutral.** All patterns must work across Claude, GPT, Gemini, and local LLMs. No provider lock-in in core docs.
- **Templates are starting points.** Users adapt them; they are not prescriptive schemas.
- **Research is exploratory.** Findings are recommendations, not mandates.

---

*This document defines HOW the project is structured. See PRODUCT.md for WHAT and WHY. See GOVERNANCE.md for decision authority.*
