# ADR-006: Dual-Plane Auth for Conversation Channel

**Date:** 2026-03-16
**Status:** Proposed
**Extends:** ADR-004 (single-plane GitHub auth for Phase 1)

---

## Context

PRODUCT.md v3.0 introduces a conversation channel alongside the existing GitHub channel. Guardian now has two types of interactive users:

1. **GitHub contributors** — identified by GitHub username from webhook payloads (ADR-004)
2. **Conversational users** — anyone who chats with Guardian via web UI or API

ADR-004 explicitly noted: "Phase 2 (web chat interface) will need an additional auth plane for non-GitHub users. This ADR does not constrain that future decision."

We need to decide how conversational users authenticate and how their identity relates to GitHub contributor identities.

## Decision

**Dual-plane auth with optional identity linking via Supabase Auth.**

### Conversation Auth Plane

- Supabase Auth handles user registration and session management (email/password, OAuth providers)
- Each conversation user gets a `user_profiles` row linked to their `supabase_auth_id`
- JWT tokens from Supabase Auth secure the Chat API endpoints
- RLS policies on `conversations`, `messages`, and conversation-scoped memories enforce per-user isolation at the database level

### GitHub Auth Plane (unchanged)

- GitHub webhook signature verification (HMAC SHA-256)
- Contributor identity from webhook payloads
- `contributor_profiles` table (unchanged from Phase 1)

### Cross-Channel Identity Linking

- `user_profiles` has an optional `github_contributor_id` foreign key
- When a conversation user links their GitHub account, the Retriever and Curator treat both identity records as one person
- Linking is user-initiated and optional — unlinked identities remain separate
- The memory pipeline is scoped: GitHub memories use `contributor_id`, conversation memories use `user_id`, and the Retriever queries both when identities are linked

### Memory Isolation

- `extracted_memories` gains a nullable `user_id` column (in addition to existing `contributor_id`)
- Memories from GitHub events have `contributor_id` set, `user_id` NULL
- Memories from conversations have `user_id` set, `contributor_id` NULL
- When identities are linked, the Retriever queries both: `WHERE contributor_id = X OR user_id = Y`
- `consolidated_memories` follows the same pattern
- RLS ensures conversation users can only access their own memories via the anon/authenticated key

## Consequences

**Positive:**
- Zero friction for conversation users — standard email/OAuth signup
- GitHub contributors are unaffected — Phase 1 auth flow unchanged
- Per-user memory isolation enforced at database level (RLS), not just application code
- Cross-channel linking is additive and optional — no forced account merging
- Supabase Auth is already in our stack (managed, built-in OAuth, JWT)

**Negative:**
- Two identity tables (`contributor_profiles`, `user_profiles`) adds schema complexity
- Cross-channel queries are slightly more complex (OR conditions on two ID columns)
- Supabase Auth adds a dependency for the conversation channel (acceptable — already using Supabase)

**Neutral:**
- The service role key bypass for Guardian's internal operations remains unchanged
- This design does not preclude adding more auth planes later (API keys for programmatic access, SSO for enterprise — Steward scope)

---

*Template source: docs/adr/adr-template.md*
