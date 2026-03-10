# PR 3 Handoff: GitHub App + Webhook Receiver

**Date:** 2026-03-10
**Source:** @G (transition management)
**Target:** @E (execution)
**Branch:** `feature/guardian-github`
**Depends on:** PR 2 (merged ✅)

---

## Objective

Build the GitHub App integration and webhook receiver that captures all GitHub events into `raw_events`. This is the "firehose" — every event goes to the database, no filtering, no processing.

## Deliverables

### Files to Create

1. **`guardian/src/github/app.ts`** — GitHub App initialization
   - Use `@octokit/app` or `octokit` with App authentication
   - Load private key from env (`GITHUB_PRIVATE_KEY`)
   - Create installation-authenticated Octokit instances

2. **`guardian/src/github/webhooks.ts`** — Webhook event handlers
   - Use `@octokit/webhooks` for event routing and signature verification
   - Subscribe to: `issues.opened`, `issue_comment.created`, `pull_request.opened`, `pull_request.closed`, `pull_request_review.submitted`, `push`
   - Each handler: extract `content_text` from payload → insert `raw_events` → lookup/create `contributor_profiles`

3. **`guardian/src/github/actions.ts`** — GitHub API helpers
   - `postComment(owner, repo, issueNumber, body)` — Post a comment on issue/PR
   - `addLabels(owner, repo, issueNumber, labels)` — Add labels
   - Used by later PRs when Guardian responds

4. **`guardian/tests/github/webhooks.test.ts`** — Tests
   - Signature verification (valid/invalid)
   - Each event type routes correctly and persists to `raw_events`
   - Contributor profiles created on first interaction, updated on subsequent
   - Idempotency: duplicate `github_delivery_id` is rejected gracefully

5. **`guardian/tests/fixtures/`** — GitHub webhook payload fixtures
   - Sample payloads for each subscribed event type

### Wire Into Existing Code

- **`guardian/src/app.ts`** — Add webhook endpoint (`POST /api/webhooks/github`)
- **`guardian/src/config.ts`** — Add GitHub App env vars to zod schema

## Key Requirements

- **Verify `X-Hub-Signature-256`** on every request using `GITHUB_WEBHOOK_SECRET`
- **Idempotency** via `github_delivery_id` UNIQUE constraint (already in schema)
- **Zero data loss** — every valid webhook becomes a `raw_events` row
- **Contributor identification** — extract `github_username` from payload, lookup/create profile
- **No processing** — raw capture only. Extractor Agent (PR 4) handles processing.

## Dependencies (package.json)

```
@octokit/app
@octokit/webhooks
```

## Environment Variables (add to .env.example)

```
GITHUB_APP_ID=
GITHUB_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_INSTALLATION_ID=
```

## Schema References

Uses tables from PR 2:
- `raw_events` — insert for every webhook event
- `contributor_profiles` — lookup/create per contributor

## Test Criteria (Sacred Four must pass)

- `pnpm typecheck` — No type errors
- `pnpm lint` — No lint violations
- `pnpm test` — All webhook tests pass, existing tests still pass
- `pnpm build` — Compiles successfully

---

*This handoff packet authorizes @E to execute PR 3 per BUILDPLAN.md.*
