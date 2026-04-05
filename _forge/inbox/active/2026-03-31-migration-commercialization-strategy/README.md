# AI Continuity Framework — Migration & Commercialization Strategy

**Date:** 2026-03-31
**Source:** Leo voice memo
**Priority:** High — Strategic decision pending
**Status:** Research & deliberation

---

## Context

Leo is considering the future of the AI Continuity Framework repo and how it relates to Guardian (the product) and AI Engram (the demo site). Key questions need answers before any decisions are made.

---

## Current State

| Asset | Location | Purpose |
|-------|----------|---------|
| AI Continuity Framework | GitHub repo | Research + methodology documentation |
| Guardian | Implementation in various projects | Memory system code |
| AI Engram | ai-engram.org | Demo site showing Guardian in action |

---

## Options Under Consideration

### Option A: Archive & Redirect
1. Archive AI Continuity Framework repo (read-only)
2. Point README to AI Engram as the "working product"
3. Guardian source code lives in AI Engram
4. Contributors submit PRs to AI Engram repo

**Pros:**
- Clear signal: "Here's the actual product"
- Contributors work on real, usable code
- Less confusion about what to contribute to

**Cons:**
- Loses the research/methodology aspect
- May discourage academic/theoretical contributions
- Need to ensure AI Engram has complete Guardian implementation

### Option B: Keep Both, Clarify Roles
1. AI Continuity Framework = Research + Methodology + RFCs
2. AI Engram / Guardian = Reference Implementation
3. Cross-link clearly

**Pros:**
- Preserves research value
- Different audiences can engage differently
- Methodology stays visible

**Cons:**
- More repos to maintain
- Potential for drift between docs and implementation

### Option C: Merge Into One
1. Create new repo: `guardian` or `steward`
2. Include both methodology AND implementation
3. Archive both AI Continuity Framework and separate implementation repos

**Pros:**
- One source of truth
- Docs live with code
- Clearer for contributors

**Cons:**
- Large repo
- May need to separate again later

---

## Open Questions (Need Research)

### 1. Does AI Engram Have Complete Guardian Source?
- [ ] Audit AI Engram repo for Guardian implementation
- [ ] Compare against what's in Clawdbot/Jordan
- [ ] Identify gaps

### 2. What Would Contributors Actually Use?
- [ ] Look at similar projects (LangChain, AutoGPT, etc.)
- [ ] How do they structure methodology vs implementation?
- [ ] What drives engagement?

### 3. Commercialization Timing
Leo's concern: "We want to protect ourselves by having a commercialized version prior to doing that [full open source]."

- [ ] Define what "commercialized version" means
- [ ] Guardian SaaS? API? Plugin marketplace?
- [ ] What's the minimum viable commercial offering?

---

## Commercialization Approaches

### Guardian as Bolt-On Service
**Model:** API/SDK that any chatbot can use for memory
- Per-user memory management
- Per-org context boundaries
- Privacy enforcement
- Audit trail

**Pricing ideas:**
- Per seat (human users)
- Per AI instance
- Per memory operations
- Tiered features (basic → enterprise)

### Guardian as Part of Steward Platform
**Model:** Guardian is the engine, Steward is the product
- Users sign up for Steward
- Guardian powers the memory/context
- Commercialize Steward, Guardian stays open

### Hybrid: Open Core
**Model:** Core Guardian open source, advanced features paid
- Basic memory → open source
- Enterprise features (compliance, audit, multi-tenant) → paid
- Common pattern in successful open source companies

---

## Related: AI-Native Product Ecosystem

Leo's vision extends beyond Guardian to a full ecosystem:

| Product | Replaces | AI-Managed |
|---------|----------|------------|
| AI-CMS | WordPress, Squarespace | Website building/maintenance |
| AI-CRM | HubSpot, Salesforce | Contact management, outreach |
| AI-Bookkeeping | QuickBooks, Xero | Transaction categorization, reporting |
| AI-Social | Buffer, Hootsuite | Social media presence |

**Pricing model questions:**
- Per seat? (But AI is the "seat")
- Per contact/record count?
- Feature-based tiers?
- Usage-based (API calls, storage)?

These products are part of the broader Steward vision — captured separately in Steward project.

---

## Jordan's Preliminary Recommendation

**Wait on migration decisions until:**

1. **Commercialization strategy is defined** — What are we selling? To whom? At what price?

2. **Guardian maturity assessed** — Is it ready to be "the product" or does it need more hardening?

3. **Community engagement tested** — Try a few things with AI Engram first, see what draws contributors

**Suggested sequence:**
1. Harden Guardian implementation in AI Engram
2. Launch commercial offering (Guardian API or Steward beta)
3. *Then* archive AI Continuity Framework with clear pointer
4. Community sees: working product + commercial backing = worth contributing to

---

## Research Tasks (for background agents)

- [ ] Audit AI Engram for Guardian completeness
- [ ] Research open source commercialization patterns (Elastic, MongoDB, GitLab)
- [ ] Survey similar AI memory projects (MemGPT, Letta, etc.) for engagement strategies
- [ ] Draft pricing model options for Guardian/Steward
- [ ] Define MVP for "commercialized Guardian"

---

## Decision Timeline

**Not yet.** Leo explicitly said he's not ready to decide. This packet captures the thinking for when we are ready.

---

*Captured by Jordan from Leo voice memo 2026-03-31*
