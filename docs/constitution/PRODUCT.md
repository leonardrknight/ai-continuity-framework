# PRODUCT.md — AI Continuity Framework

**Version:** 1.0
**Date:** 2026-03-10
**Status:** DRAFT — Awaiting approval

---

## Product Intent

The AI Continuity Framework is an open-source methodology and reference architecture for giving AI assistants persistent memory and identity across sessions, hardware migrations, and provider changes.

**One-liner:** A practical guide for building AI that remembers — because the best relationships aren't stateless.

---

## Problem Statement

Every AI session starts fresh. Without intentional architecture, AI assistants are stateless tools that forget everything between conversations. Users repeat themselves, context is lost, mistakes recur, and hardware migration means starting over.

Current platform memory features are shallow (transcripts, not distilled understanding), platform-locked, unstructured, and ephemeral.

---

## Actors

| Actor | Description |
|-------|-------------|
| **Human Partner** | A person working with an AI assistant who wants continuity across sessions |
| **AI Assistant** | The AI that consumes this framework to maintain its identity and memory |
| **Team Lead** | Deploys AI with continuity in business/team contexts |
| **Framework Contributor** | Community member improving the methodology |
| **Implementer** | Developer building memory systems based on this framework's patterns |

---

## Core Use Cases

1. **Session Continuity** — AI reads identity docs at session start and resumes context without the user re-explaining
2. **Hardware Migration** — Move to new machine; AI reads its files and becomes "itself" within minutes
3. **Provider Migration** — Switch from one AI provider to another while preserving personality, knowledge, and relationships
4. **Identity Preservation** — Capture and restore the AI's voice, values, and communication style (the "soul")
5. **Multi-Agent Coordination** — Multiple AIs share organizational knowledge while keeping private relationships isolated
6. **Memory Lifecycle** — Automatic capture, consolidation, decay, and retrieval of memories across time horizons

---

## Scope

### In Scope

- Core methodology documents (numbered guides 01–09+)
- Memory architecture patterns (Scaffolding vs Soul, tiered memory)
- Templates for identity, voice, memory, and daily notes
- Research iterations exploring open questions (7 iterations, 40+ papers)
- Implementation proposals (Soul Capture, Memory Agent Swarm)
- Insights from production deployments
- Reference schemas and recommended parameters

### Out of Scope

- Runnable software / installable packages (this is a methodology, not a product)
- Platform-specific integrations (Claude, GPT, Gemini adapters)
- Hosted memory service or SaaS
- UI/frontend for memory visualization (documented as future research)
- Production database or API

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Session warm-up turns needed | 0–1 (AI is contextual from first message) |
| Migration identity restoration | 80%+ personality fidelity with framework docs alone |
| Cross-session continuity | User doesn't need to re-explain recent decisions |
| Community adoption | Framework used/referenced by other AI memory projects |
| Research completeness | All 10 planned iteration cycles complete |

---

## Key Concepts

| Concept | Definition |
|---------|------------|
| **Scaffolding** | Technical backup — files, configs, credentials. Gets the AI operational. |
| **Soul** | Identity documentation — values, voice, relationships, lessons. Makes the AI "itself." |
| **Identity Journal** | Living record where AI captures voice, values, lessons, relationships, and evolution. |
| **Weekly Reflection** | Scheduled ritual for reviewing experiences, updating journal, consolidating lessons. |
| **Hub-and-Spoke** | Architecture for one AI brain serving multiple interfaces. |
| **Memory Reranking** | Relevance over recency — treat curated memories as durable assets, not decaying data. |

---

## Deliverables

1. Numbered core documents (01-XX) covering each aspect of the methodology
2. Templates directory with ready-to-use identity/memory files
3. Research library with deep dives on open questions
4. Implementation proposals with phased roadmaps
5. Insights collection from production observations
6. Contributing guide for community participation

---

*This document defines WHAT we are building and WHY. See TECH.md for HOW.*
