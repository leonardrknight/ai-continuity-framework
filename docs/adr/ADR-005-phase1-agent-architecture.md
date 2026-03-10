# ADR-005: Phase 1 Agent Architecture — Four Agents with Separate Consolidator

**Date:** 2026-03-10
**Status:** Accepted

---

## Context

The initial TECH.md v2.0 draft specified 3 agents for Phase 1: Extractor, Retriever, and Curator. The Curator handled both consolidation (dedup/merge of extracted memories into consolidated storage) and lifecycle management (importance scoring, tier promotion, archival) on a single daily schedule at 3 AM.

During @R review, a conflict was identified: consolidation and lifecycle management have fundamentally different timing requirements. Deduplication should happen frequently to keep the consolidated_memories table current for the Retriever. Lifecycle management (importance decay, tier transitions, archival) is a slower process that benefits from running on accumulated data once daily.

The Memory Agent Swarm proposal (proposals/) and Iteration 7 research both specified a separate Consolidator agent. The 3-agent design was a Phase 1 simplification that merged two distinct responsibilities.

## Decision

Phase 1 deploys **4 agents**: Extractor, Consolidator, Retriever, and Curator.

| Agent | Schedule | Responsibility |
|-------|----------|----------------|
| **Extractor** | Every 5 min | raw_events → extracted_memories |
| **Consolidator** | Hourly (`0 * * * *`) | extracted_memories → consolidated_memories (dedup, merge, link) |
| **Retriever** | On-demand | Query consolidated_memories for relevant context |
| **Curator** | Daily 3 AM (`0 3 * * *`) | Importance scoring, tier management, archival, contributor profile refresh |

The pipeline is now: capture → extract → consolidate → curate → retrieve.

## Consequences

**Positive:**
- Consolidated memories stay fresh (hourly vs daily), improving Retriever relevance
- Each agent has a single, clear responsibility (SRP)
- Aligns with the Memory Agent Swarm proposal architecture
- Consolidator can be independently scaled or tuned without affecting lifecycle management

**Negative:**
- One additional Inngest cron function to maintain
- Slightly more operational surface area (4 agents vs 3)

**Neutral:**
- Net code complexity is similar — the consolidation logic moves from Curator to Consolidator, not duplicated
- The BUILDPLAN PR sequence grows by one PR (8 total, up from 7)

---

*Template source: docs/adr/adr-template.md*
