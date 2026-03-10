# ADR-004: Guardian Agent Auth Architecture

**Date:** 2026-03-10
**Status:** Proposed

---

## Context

PRODUCT.md v2.0 introduces the Guardian Agent — a standalone cloud service that manages the ai-continuity-framework repository. It interacts with multiple actor types (Contributors, Maintainers, Admin) through GitHub and needs its own service credentials to operate.

The system has two distinct auth concerns:
1. **Identifying contributors** — who is interacting with the repo?
2. **Authorizing the Guardian** — what can the Guardian Agent do on GitHub and in Supabase?

We needed to decide between multi-plane auth (separate identity systems per actor type) versus single-plane auth (one identity system for all interactive actors).

## Decision

**Single-plane with role escalation, using GitHub identity as the primary auth plane.**

### Contributor Identity
- All interactive actors are identified by their GitHub username, derived from webhook payloads.
- No separate user accounts or login system. GitHub is the identity provider.
- Contributor profiles are created automatically on first interaction (stub profile, marked "new").
- Role escalation follows GitHub's existing permission model: Public → Contributor → Maintainer → Admin (repo owner).

### Guardian Agent Identity
- The Guardian authenticates to GitHub as a **GitHub App** with its own installation credentials.
- It authenticates to Supabase using a **service role key** (bypasses RLS).
- It authenticates to Anthropic and OpenAI using **API keys**.
- All Guardian actions on GitHub are visibly attributed to the App (transparent, auditable).

### Data Isolation
- RLS policies scope data by `repo_id` (prepared for multi-repo Phase 2).
- Contributor profiles are shared across repos (GitHub username is globally unique).
- In Phase 1, the Guardian manages a single repo, so repo isolation is structural preparation only.

### Auth Flow
```
GitHub webhook arrives
  → Verify X-Hub-Signature-256 (app webhook secret)
  → Extract github_username from payload
  → Lookup/create contributor_profile
  → Process with contributor context attached
  → Any Guardian responses go through GitHub API (authenticated as App)
```

## Consequences

**Positive:**
- Zero friction for contributors — they interact through GitHub, no extra signup
- Transparent — all Guardian actions visible as GitHub App activity
- Leverages GitHub's existing permission model instead of reimplementing
- Simple to implement and reason about

**Negative:**
- Contributors without GitHub accounts cannot interact (acceptable — this is a GitHub-hosted project)
- Service role key for Supabase means no per-user RLS in Phase 1 (mitigated by repo_id scoping)
- If GitHub App is compromised, the Guardian's entire identity is compromised

**Neutral:**
- Phase 2 (web chat interface) will need an additional auth plane for non-GitHub users. This ADR does not constrain that future decision.
- The single-plane design is sufficient for Phase 1's GitHub-only interaction model.

---

*Template source: docs/adr/adr-template.md*
