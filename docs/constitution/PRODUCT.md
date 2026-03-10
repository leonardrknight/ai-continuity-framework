# PRODUCT.md — AI Continuity Framework

**Version:** 2.0
**Date:** 2026-03-10
**Status:** DRAFT — Awaiting Leo's approval
**Supersedes:** Version 1.0 (documentation-only scope)

---

## Product Intent

The AI Continuity Framework is an open-source methodology **and working reference implementation** for giving AI assistants persistent memory and identity across sessions, hardware migrations, and provider changes.

The project has two complementary halves:

1. **The Methodology** — Numbered guides, templates, and research papers that define *how* AI memory and identity should work (provider-neutral, battle-tested patterns).
2. **The Guardian Agent** — A standalone cloud service that *proves* the methodology by living it. It manages this repository, learns from contributors, and demonstrates every pattern the docs describe.

**One-liner:** An open-source framework for AI that remembers — with a living agent that proves it works.

---

## Problem Statement

Every AI session starts fresh. Without intentional architecture, AI assistants are stateless tools that forget everything between conversations. Users repeat themselves, context is lost, mistakes recur, and hardware migration means starting over.

Current platform memory features are shallow (transcripts, not distilled understanding), platform-locked, unstructured, and ephemeral.

**What's changed:** After 7 research iterations and 40+ papers, we have enough validated architecture to stop describing the system and start *building* it. The methodology is mature enough to implement. The Guardian Agent is the proof.

---

## Actors

| Actor | Description | Auth Plane |
|-------|-------------|------------|
| **Guardian Agent** | The AI service that manages this repo, remembers contributors, and demonstrates the framework's patterns | Service (API keys, GitHub App credentials) |
| **Contributor** | Community member who interacts with the Guardian via GitHub (PRs, issues, comments) or direct conversation | GitHub (OAuth via GitHub identity) |
| **Repo Maintainer** | Person with merge authority who reviews Guardian recommendations and approves changes | GitHub (repo admin/maintainer role) |
| **Framework Reader** | Someone consuming the methodology docs without contributing code | Public (no auth — docs are open source) |
| **Implementer** | Developer building their own memory system based on this framework's patterns | Public (no auth — patterns are open source) |
| **Admin** | Project owner (Leo) with full authority over Guardian configuration, memory, and deployments | Admin (direct service access + GitHub owner) |

### Auth Model

**Single-plane with role escalation.** GitHub identity is the primary auth plane for all interactive actors. The Guardian Agent authenticates as a GitHub App with its own service credentials. Admin access is a superset of Maintainer.

```
Public (read docs) → GitHub OAuth (contribute) → Maintainer (merge) → Admin (configure Guardian)
```

The Guardian Agent operates on a separate service plane (API keys, Supabase service role) but surfaces all actions through GitHub where they are visible and auditable.

---

## Core Use Cases

### Methodology (unchanged)

1. **Session Continuity** — AI reads identity docs at session start and resumes context without re-explanation
2. **Hardware Migration** — Move to new machine; AI reads its files and becomes "itself" within minutes
3. **Provider Migration** — Switch providers while preserving personality, knowledge, and relationships
4. **Identity Preservation** — Capture and restore AI voice, values, and communication style (the "soul")

### Guardian Agent (new)

5. **Contributor Memory** — Guardian remembers who contributors are, what they care about, and their past interactions. Returning contributors don't start from zero.
6. **Automated Knowledge Extraction** — Every PR, issue, and comment is captured and processed into structured memories (facts, decisions, preferences, patterns) without manual effort.
7. **Contextual Retrieval** — When reviewing a PR or responding to an issue, Guardian surfaces relevant memories: past decisions, related discussions, contributor preferences, architectural context.
8. **Repository Stewardship** — Guardian maintains awareness of the repo's structure, open questions, and evolution. It can answer "what's the status of X?" or "why did we decide Y?" from memory.
9. **Memory Lifecycle (Live)** — The methodology's capture → extract → consolidate → archive pipeline runs as working software, not just documentation.

---

## Scope

### In Scope — Methodology

- Core methodology documents (numbered guides 01–09+)
- Memory architecture patterns (Scaffolding vs Soul, tiered memory)
- Templates for identity, voice, memory, and daily notes
- Research iterations exploring open questions (7 of 10 complete)
- Insights from production deployments
- Reference schemas and recommended parameters

### In Scope — Guardian Agent (Phase 1)

- **Extractor Agent** — Processes GitHub events (PRs, issues, comments, commits) into structured memories via webhooks
- **Consolidator Agent** — Deduplicates and merges extracted memories into consolidated long-term storage (hourly)
- **Retriever Agent** — Two-stage hybrid search (SQL candidates + app re-ranking) for surfacing relevant context (<500ms)
- **Curator Agent** — Manages memory lifecycle: importance scoring, tier promotion, decay, archival, contributor profiles (daily)
- **Supabase Backend** — Raw captures, extracted memories, consolidated memories, contributor profiles (per Memory Agent Swarm schema)
- **GitHub App Integration** — Webhook receiver, issue/PR commenting, event processing
- **Dogfooding** — Guardian manages the ai-continuity-framework repo itself

### Out of Scope (Phase 2+)

- Voice Keeper Agent (style/personality tracking)
- Archivist Agent (long-term compression)
- Multi-repo support (deploying Guardian on other repos)
- Web chat interface for direct conversations
- Memory analytics dashboard — insights from memory patterns, topic evolution, contributor activity (Phase 3; see `research/iteration-7/03-analytics.md`)
- Platform-specific adapters (Claude, GPT, Gemini)
- Hosted SaaS offering for third parties
- UI/frontend for memory visualization

### Explicit Boundaries

- The methodology docs remain **provider-neutral**. The Guardian Agent implementation may use specific providers (Claude API, Supabase) but the *patterns* it demonstrates are portable.
- The Guardian Agent is **open source**. Anyone can deploy their own instance.
- The docs are **authoritative**. If the software diverges from the docs, the docs win and the software gets fixed.

---

## Success Criteria

### Methodology

| Metric | Target |
|--------|--------|
| Session warm-up turns needed | 0–1 (AI is contextual from first message) |
| Migration identity restoration | 80%+ personality fidelity with framework docs alone |
| Community adoption | Framework used/referenced by other AI memory projects |
| Research completeness | All 10 planned iteration cycles complete |

### Guardian Agent (Phase 1)

| Metric | Target |
|--------|--------|
| Capture rate | 100% of GitHub events processed (zero data loss) |
| Extraction latency | <5 min from event to structured memory |
| Retrieval latency | <500ms for context queries |
| Contributor recognition | Guardian identifies returning contributors and recalls context |
| Memory accuracy | >90% recall on "what do we know about X?" queries |
| Dogfood fidelity | Guardian's behavior matches patterns described in core docs |

---

## Key Concepts

| Concept | Definition |
|---------|------------|
| **Scaffolding** | Technical backup — files, configs, credentials. Gets the AI operational. |
| **Soul** | Identity documentation — values, voice, relationships, lessons. Makes the AI "itself." |
| **Guardian Agent** | The reference implementation: a standalone cloud service that manages a repo using the framework's own patterns. |
| **Memory Swarm** | Collection of specialized background agents (Extractor, Consolidator, Retriever, Curator, etc.) that automate memory so the main agent doesn't think about it. |
| **Identity Journal** | Living record where AI captures voice, values, lessons, relationships, and evolution. |
| **Hub-and-Spoke** | Architecture for one AI brain serving multiple interfaces. |
| **Memory Reranking** | Relevance over recency — treat curated memories as durable assets, not decaying data. |
| **Dogfooding** | The Guardian Agent manages the repo that defines it. The methodology proves itself. |

---

## Deliverables

### Methodology

1. Numbered core documents (01-XX) covering each aspect of the methodology
2. Templates directory with ready-to-use identity/memory files
3. Research library with deep dives on open questions
4. Insights collection from production observations

### Guardian Agent (Phase 1)

5. GitHub App configuration and webhook receiver
6. Extractor Agent — event processing pipeline
7. Retriever Agent — hybrid search service
8. Curator Agent — consolidation and lifecycle management
9. Supabase schema and migrations (raw_captures, extracted_memories, consolidated_memories, contributor_profiles)
10. Deployment configuration (containerized, self-hostable)
11. Contributing guide that explains how the Guardian interacts with contributors

---

## Phasing

| Phase | Focus | Prerequisite |
|-------|-------|-------------|
| **Phase 1** | Core swarm (Extractor + Consolidator + Retriever + Curator) managing this repo | TECH.md updated, architecture approved |
| **Phase 2** | Voice Keeper + Archivist + multi-repo support | Phase 1 stable, dogfooding validated |
| **Phase 3** | Web chat interface + conversation memory + memory analytics dashboard | Phase 2 stable |

---

## Stakeholders

| Stakeholder | Interest | Engagement |
|-------------|----------|------------|
| **Leo** (Admin) | Product vision, final authority on all decisions | Approves all Phase 1 scope, reviews Guardian behavior |
| **Open-source contributors** | Use the methodology, potentially contribute to Guardian | Interact via GitHub, experience Guardian firsthand |
| **AI memory community** | Reference patterns for their own implementations | Consume docs and study Guardian's architecture |

---

*This document defines WHAT we are building and WHY. See TECH.md for HOW. See GOVERNANCE.md for WHO decides.*
