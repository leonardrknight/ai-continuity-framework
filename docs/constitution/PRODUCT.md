# PRODUCT.md — AI Continuity Framework

**Version:** 3.0
**Date:** 2026-03-16
**Status:** APPROVED
**Approved by:** Leo Knight, 2026-03-16
**Supersedes:** Version 2.0 (GitHub-only Guardian scope)

---

## Product Intent

The AI Continuity Framework is an open-source methodology **and working reference implementation** for giving AI assistants bulletproof, unlimited memory. It is both the documentation of how AI memory should work and a living agent that proves it.

The project has two complementary halves:

1. **The Methodology** — Numbered guides, templates, and research papers that define *how* AI memory and identity should work (provider-neutral, battle-tested patterns).
2. **The Guardian Agent** — A standalone AI agent that *proves* the methodology by living it. Guardian manages this repository, engages with contributors through GitHub and direct conversation, and never forgets anyone it interacts with — ever.

**One-liner:** An open-source framework for AI that never forgets — with a living agent that proves it works.

**Vision:** Guardian is a single brain with multiple interfaces. It manages its own GitHub repo, reviews PRs, answers questions, and holds conversations — all powered by the same memory pipeline. Every interaction, regardless of channel, feeds the same memory. Every response draws from the full history. No one ever has to repeat themselves.

For developers, Guardian is also a **reference architecture** — grab it, stand it up, and build your own multi-agent system with deep, persistent memory.

---

## Problem Statement

Every AI session starts fresh. Without intentional architecture, AI assistants are stateless tools that forget everything between conversations. Users repeat themselves, context is lost, mistakes recur, and hardware migration means starting over.

Current platform memory features are shallow (transcripts, not distilled understanding), platform-locked, unstructured, and ephemeral. Even the best AI assistants hit context window ceilings and undergo compaction — losing thread state, decision reasoning, and conversational nuance mid-session.

**What's changed:** After 7 research iterations and 40+ papers, we have enough validated architecture to stop describing the system and start *building* it. The methodology is mature enough to implement. The Guardian Agent is the proof — an AI that remembers everyone it talks to, keeps every conversation separate, and is always on point.

---

## Actors

| Actor | Description | Auth Plane |
|-------|-------------|------------|
| **Guardian Agent** | The AI agent that manages this repo, holds conversations, remembers everyone, and demonstrates the framework's patterns | Service (API keys, GitHub App credentials, LLM keys) |
| **Contributor** | Community member who interacts with Guardian via GitHub (PRs, issues, comments) | GitHub (OAuth via GitHub identity) |
| **Conversational User** | Anyone who chats with Guardian directly via web interface or API | User (email/OAuth, per-user identity) |
| **Repo Maintainer** | Person with merge authority who reviews Guardian recommendations and approves changes | GitHub (repo admin/maintainer role) |
| **Framework Reader** | Someone consuming the methodology docs without contributing code | Public (no auth — docs are open source) |
| **Implementer** | Developer building their own memory system based on this framework's patterns | Public (no auth — patterns are open source) |
| **Admin** | Project owner (Leo) with full authority over Guardian configuration, memory, and deployments | Admin (direct service access + GitHub owner) |

### Auth Model

**Dual-plane with unified identity.** Two interaction channels feed the same memory:

1. **GitHub plane** — Contributors and maintainers interact via PRs, issues, and comments. Guardian authenticates as a GitHub App.
2. **Conversation plane** — Users interact via web chat or API. Simple auth (email/OAuth) creates a per-user identity.

When a GitHub contributor also chats with Guardian directly, their identity can be linked — one person, one memory, regardless of channel.

```
Public (read docs) → GitHub OAuth (contribute) / Email (chat) → Maintainer (merge) → Admin (configure)
```

Guardian itself operates on a service plane (API keys, Supabase service role) and surfaces GitHub actions where they are visible and auditable. Conversation interactions are stored privately per-user.

---

## Core Use Cases

### Methodology

1. **Session Continuity** — AI reads identity docs at session start and resumes context without re-explanation
2. **Hardware Migration** — Move to new machine; AI reads its files and becomes "itself" within minutes
3. **Provider Migration** — Switch providers while preserving personality, knowledge, and relationships
4. **Identity Preservation** — Capture and restore AI voice, values, and communication style (the "soul")

### Guardian Agent — GitHub Channel

5. **Contributor Memory** — Guardian remembers who contributors are, what they care about, and their past interactions. Returning contributors don't start from zero.
6. **Automated Knowledge Extraction** — Every PR, issue, and comment is captured and processed into structured memories (facts, decisions, preferences, patterns) without manual effort.
7. **Contextual Retrieval** — When reviewing a PR or responding to an issue, Guardian surfaces relevant memories: past decisions, related discussions, contributor preferences, architectural context.
8. **Repository Stewardship** — Guardian maintains awareness of the repo's structure, open questions, and evolution. It can answer "what's the status of X?" or "why did we decide Y?" from memory.

### Guardian Agent — Conversation Channel

9. **Unlimited Conversation Memory** — Guardian remembers every conversation with every user, permanently. If it hears something, it records it. Users never repeat themselves.
10. **Real-Time Knowledge Capture** — As conversations happen, a background Scribe extracts decisions, facts, preferences, emotional context, and thread state into structured memories — without interrupting the conversation.
11. **Memory-Augmented Response** — Before generating a response, Guardian retrieves relevant memories from the user's full history. The user experiences an AI that "just knows" their context.
12. **Per-User Memory Isolation** — Each user's conversations and memories are completely separate. Guardian maintains distinct, private relationships with every person it interacts with.
13. **Cross-Channel Continuity** — A GitHub contributor who also chats with Guardian has a unified memory. Decisions made in a PR discussion are available in conversation, and vice versa.

### Shared

14. **Memory Lifecycle (Live)** — The methodology's capture → extract → consolidate → curate → retrieve pipeline runs as working software across all channels, not just documentation.
15. **Reference Architecture** — Developers can clone this project, stand up their own Guardian instance, and have a working multi-agent memory system out of the box.

---

## Scope

### In Scope — Methodology

- Core methodology documents (numbered guides 01–09+)
- Memory architecture patterns (Scaffolding vs Soul, tiered memory)
- Templates for identity, voice, memory, and daily notes
- Research iterations exploring open questions (7 of 10 complete)
- Insights from production deployments
- Reference schemas and recommended parameters

### In Scope — Guardian Agent (Phase 1: Memory Swarm)

- **Extractor Agent** — Processes GitHub events (PRs, issues, comments, commits) into structured memories via webhooks
- **Consolidator Agent** — Deduplicates and merges extracted memories into consolidated long-term storage (hourly)
- **Retriever Agent** — Two-stage hybrid search (SQL candidates + app re-ranking) for surfacing relevant context (<500ms)
- **Curator Agent** — Manages memory lifecycle: importance scoring, tier promotion, decay, archival, contributor profiles (daily)
- **Supabase Backend** — Raw captures, extracted memories, consolidated memories, contributor/user profiles
- **GitHub App Integration** — Webhook receiver, issue/PR commenting, event processing
- **Dogfooding** — Guardian manages the ai-continuity-framework repo itself

### In Scope — Guardian Agent (Phase 2: Conversation + Unlimited Memory)

- **Scribe Agent** — Real-time extraction from conversation turns into structured memories. Same pipeline as Extractor, adapted for conversational input (decisions, preferences, thread state, emotional context)
- **Chat API** — Endpoint for sending messages and receiving memory-augmented responses
- **Web Chat Interface** — Simple UI for interacting with Guardian directly
- **Per-User Auth & Isolation** — User accounts (email/OAuth), per-user memory partitioning
- **Memory-Augmented Response Generation** — Every response is informed by the user's full history via Retriever

### In Scope — Guardian Agent (Phase 3: Active Memory Management)

- **Context Window Monitor** — Tracks token usage and proactively pages low-value context to warm storage, replacing compaction with intelligent paging
- **Retrieval Anticipator** — Predictive pre-fetch of relevant memories before they're explicitly needed
- **Thread-Aware Memory** — Tracks conversational threads, step-by-step progress, and cross-references so Guardian never loses its place

### Out of Scope (Future Phases)

- Voice Keeper Agent (style/personality tracking)
- Archivist Agent (long-term compression)
- Multi-repo support (deploying Guardian on other repos)
- Memory analytics dashboard (Phase 4+; see `research/iteration-7/03-analytics.md`)
- Platform-specific adapters (Claude, GPT, Gemini)
- Hosted SaaS offering for third parties
- Self-governance / self-modification capabilities (Steward product scope)
- Multi-tenant enterprise scaling (100K+ users) (Steward product scope)

### Explicit Boundaries

- The methodology docs remain **provider-neutral**. The Guardian Agent implementation uses specific providers (Claude API, Supabase, OpenAI embeddings) but the *patterns* it demonstrates are portable.
- The Guardian Agent is **open source**. Anyone can deploy their own instance.
- The docs are **authoritative**. If the software diverges from the docs, the docs win and the software gets fixed.
- Guardian is architectured so it *could* scale to multi-tenant (Steward), but multi-tenant is not a deliverable here. Per-user isolation is sufficient.
- Self-governance, self-modification, and AI autonomy features belong to the Steward product. Guardian may inform that work but does not implement it.

---

## Success Criteria

### Methodology

| Metric | Target |
|--------|--------|
| Session warm-up turns needed | 0–1 (AI is contextual from first message) |
| Migration identity restoration | 80%+ personality fidelity with framework docs alone |
| Community adoption | Framework used/referenced by other AI memory projects |
| Research completeness | All 10 planned iteration cycles complete |

### Guardian Agent — Phase 1 (Memory Swarm)

| Metric | Target |
|--------|--------|
| Capture rate | 100% of GitHub events processed (zero data loss) |
| Extraction latency | <5 min from event to structured memory |
| Retrieval latency | <500ms for context queries |
| Contributor recognition | Guardian identifies returning contributors and recalls context |
| Memory accuracy | >90% recall on "what do we know about X?" queries |
| Dogfood fidelity | Guardian's behavior matches patterns described in core docs |

### Guardian Agent — Phase 2 (Conversation + Unlimited Memory)

| Metric | Target |
|--------|--------|
| Conversation capture rate | 100% of turns processed into memory (zero data loss) |
| User recognition | Guardian recognizes returning users from first message |
| Context relevance | User never needs to re-explain prior decisions or preferences |
| Memory isolation | Zero cross-user memory leakage |
| Response quality | Responses demonstrably improved by memory vs. stateless baseline |
| Redundant question rate | <5% (Guardian almost never asks something the user already told it) |

### Guardian Agent — Phase 3 (Active Memory Management)

| Metric | Target |
|--------|--------|
| Context preservation | Zero mid-conversation amnesia events |
| Anticipation accuracy | >60% of pre-fetched memories are actually referenced |
| Thread continuity | Guardian can resume interrupted threads without user prompting |

---

## Key Concepts

| Concept | Definition |
|---------|------------|
| **Scaffolding** | Technical backup — files, configs, credentials. Gets the AI operational. |
| **Soul** | Identity documentation — values, voice, relationships, lessons. Makes the AI "itself." |
| **Guardian Agent** | The reference implementation: a standalone AI agent that manages a repo, holds conversations, and never forgets anyone it interacts with. |
| **Memory Swarm** | Collection of specialized background agents (Extractor, Scribe, Consolidator, Retriever, Curator) that automate memory so the main agent doesn't think about it. |
| **Scribe** | Background agent that captures conversation turns into structured memories in real time — the conversational equivalent of the Extractor. |
| **Hub-and-Spoke** | Architecture for one AI brain serving multiple interfaces. Guardian embodies this: one memory, multiple channels (GitHub, chat, future integrations). |
| **Unlimited Memory** | The core promise: Guardian never forgets. Every interaction is captured, extracted, consolidated, and retrievable — permanently. Context window limits are managed, not accepted. |
| **Active Memory Management** | Replacing blunt compaction with continuous memory paging, predictive pre-fetch, and intelligent context curation. Virtual memory for AI. |
| **Memory Reranking** | Relevance over recency — treat curated memories as durable assets, not decaying data. |
| **Dogfooding** | Guardian manages the repo that defines it AND converses with people about it. The methodology proves itself in both channels. |

---

## Deliverables

### Methodology

1. Numbered core documents (01-XX) covering each aspect of the methodology
2. Templates directory with ready-to-use identity/memory files
3. Research library with deep dives on open questions
4. Insights collection from production observations

### Guardian Agent — Phase 1 (Memory Swarm + GitHub)

5. GitHub App configuration and webhook receiver
6. Extractor Agent — GitHub event processing pipeline
7. Consolidator Agent — deduplication and merge
8. Retriever Agent — hybrid search service
9. Curator Agent — lifecycle management and contributor profiles
10. Supabase schema and migrations
11. Deployment configuration (containerized, self-hostable)
12. Dogfooding — Guardian live on the ai-continuity-framework repo

### Guardian Agent — Phase 2 (Conversation + Unlimited Memory)

13. Scribe Agent — real-time conversation extraction
14. Chat API — memory-augmented conversation endpoint
15. Web chat interface — simple UI for direct interaction
16. Per-user authentication and memory isolation
17. User profile management (interests, preferences, communication style)

### Guardian Agent — Phase 3 (Active Memory Management)

18. Context Window Monitor — intelligent paging replaces compaction
19. Retrieval Anticipator — predictive pre-fetch
20. Thread-aware memory — step tracking, cross-references, resumption

### Developer Toolkit (Ongoing)

21. Documentation organized as methodology + implementation guide
22. `npm install` / Docker setup for standing up your own Guardian
23. Contributing guide explaining how Guardian interacts with contributors

---

## Phasing

| Phase | Focus | Prerequisite |
|-------|-------|-------------|
| **Phase 1** | Core swarm (Extractor + Consolidator + Retriever + Curator) managing this repo via GitHub | TECH.md approved, architecture sound |
| **Phase 2** | Conversation channel + Scribe + chat interface + per-user memory | Phase 1 stable, GitHub dogfooding validated |
| **Phase 3** | Active memory management — context monitor, anticipator, thread awareness | Phase 2 stable, conversations flowing |
| **Phase 4+** | Voice Keeper, Archivist, analytics dashboard, additional channel adapters | Phase 3 stable |

### Long-Term Horizon

Guardian is architected so that it could evolve into a multi-tenant product (Steward). The per-user isolation, memory swarm, and channel-agnostic pipeline are deliberate foundations for that possibility. But Steward is a separate project with separate governance — Guardian stays focused on being the best open-source unlimited memory agent.

---

## Stakeholders

| Stakeholder | Interest | Engagement |
|-------------|----------|------------|
| **Leo** (Admin) | Product vision, final authority on all decisions | Approves all scope, reviews Guardian behavior |
| **Open-source contributors** | Use the methodology, contribute to Guardian | Interact via GitHub AND conversation, experience Guardian firsthand |
| **AI memory community** | Reference patterns for their own implementations | Consume docs and study Guardian's architecture |
| **Developers** | Build their own memory-powered agents | Clone repo, follow implementation guide, deploy own instance |

---

*This document defines WHAT we are building and WHY. See TECH.md for HOW. See GOVERNANCE.md for WHO decides.*
