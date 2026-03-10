# PR 2 Handoff: Supabase Schema + Migrations

## Context
- Supabase project: effzofflphvbyvcenvly (Knight Ventures, us-east-1)
- Schema defined in TECH.md docs/constitution/TECH.md
- 4 agents: Extractor, Consolidator, Retriever, Curator

## Deliverables
- guardian/supabase/migrations/001_initial_schema.sql
  - raw_events, extracted_memories, consolidated_memories, contributor_profiles, agent_state tables
  - Include emotional_valence and emotional_arousal columns in extracted_memories
- guardian/supabase/migrations/002_rls_policies.sql
- guardian/supabase/migrations/003_functions.sql (match_memories, record_memory_access)
- guardian/src/db/client.ts — Supabase client init
- guardian/src/db/schema.ts — TypeScript types mirroring DB
- guardian/src/db/queries.ts — Typed helpers

## Validation
- Schema applies cleanly to local Supabase
- TypeScript types match DDL
- Sacred Four passes

## Reference
- TECH.md lines 290-500 (schema definitions)
- ADR-005 (4-agent architecture)
