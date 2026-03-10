# Completion Packet — PR 3: GitHub App + Webhook Receiver

**Handoff:** `_forge/handoffs/pr3-github-handoff.md`
**Branch:** `feature/guardian-github`
**PR:** #15
**Status:** Ready for review

---

## What Was Built

### Core: `guardian/src/github/webhooks.ts`
- `verifySignature()` — HMAC SHA-256 with `timingSafeEqual`, rejects empty/invalid/tampered signatures
- `extractContentText()` — Switch on 5 event types, returns formatted string (`[Issue #42] Title...`)
- `extractUsername()` — Pulls `sender.login`, defaults to `"unknown"`
- `extractRepoId()` — Pulls `repository.full_name`, defaults to `"unknown/unknown"`
- `compositeEventType()` — Combines event + action (e.g. `issues.opened`)
- `extractGitHubTimestamp()` — Pulls created_at/submitted_at/timestamp per event type
- `processWebhookEvent()` — Main handler: upserts contributor, increments interaction count, inserts raw_event

### Endpoint: `guardian/src/app.ts`
- `POST /api/webhooks/github` — Full request lifecycle:
  - Validates required headers (x-github-event, x-github-delivery)
  - Verifies HMAC signature against `GITHUB_WEBHOOK_SECRET`
  - Filters unsupported event types → 200 ignored
  - Parses JSON → 400 on failure
  - Calls `processWebhookEvent()` → 201 captured
  - Handles duplicate delivery ID (Postgres 23505) → 200 duplicate

### Interface: `guardian/src/github/actions.ts`
- `GitHubActionsClient` interface (postComment, addLabels)
- `createNoopActionsClient()` factory for testing / pre-GitHub-App configuration

### Config: `guardian/src/config.ts`
- Added `GITHUB_INSTALLATION_ID: z.string().optional()`

---

## Test Results

**43 tests, 0 failures**

| Suite | Tests | Status |
|-------|-------|--------|
| verifySignature | 4 | ✅ |
| extractContentText | 7 | ✅ |
| extractUsername | 2 | ✅ |
| extractRepoId | 2 | ✅ |
| compositeEventType | 2 | ✅ |
| POST /api/webhooks/github | 8 | ✅ |
| DB schema (existing) | 17 | ✅ |
| Health check (existing) | 1 | ✅ |

### Sacred Four
- [x] Typecheck — clean
- [x] Lint + Prettier — clean
- [x] Tests — 43/43 passed
- [x] Build — clean

---

## Dependencies Added

- `@octokit/webhooks` — TypeScript types for GitHub webhook payloads (used for reference, not runtime dependency of current code)

---

## Next Steps

- **PR 4: Extractor Agent** — 5-minute cron via Inngest, processes unprocessed raw_events, calls Anthropic Haiku for memory extraction, generates embeddings, writes to extracted_memories
- **PR 5: Consolidator Agent** — Hourly merge of related extracted memories
- Supabase migrations from PR 2 should be applied to the live project before PR 4

---

*Produced by @E on 2026-03-10*
