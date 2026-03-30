# Guardian Strategic Vision — Open Questions

*Decisions needed before implementation can proceed*

---

## 🔴 Blocking (Need Leo's Input)

### Q1: ai-engram.org Scope

**Question:** Is ai-engram.org a *demo* (showcase technology) or a *product* (potential revenue)?

**Options:**
- **A: Pure Demo** — Minimal features, free tier only, goal is proving concept
- **B: Lead-Gen Demo** — Free tier but captures emails, upsells to managed service
- **C: Standalone Product** — Own pricing, own brand, separate from Guardian SaaS

**Jordan's Lean:** Option B — Demo that doubles as lead capture. Low lift, high signal.

---

### Q2: Multi-Org Memory Model

**Question:** How should Guardian handle agents serving multiple organizations?

**Options:**
- **A: Separate Instances** — One Guardian per org, agent connects to multiple
- **B: Row-Level Security** — Single database, org_id scoping, simpler but riskier
- **C: Hybrid** — Shared infrastructure, logical separation, encryption per org

**Jordan's Lean:** Option C for SaaS, Option B for self-hosted (simpler).

---

### Q3: Commercial vs Open Source Boundary

**Question:** What features are open source vs commercial-only?

**Proposal:**
| Feature | Open Source | Commercial |
|---------|-------------|------------|
| Core memory storage | ✅ | ✅ |
| Semantic search | ✅ | ✅ |
| Basic extraction | ✅ | ✅ |
| Multi-tenant isolation | ✅ | ✅ |
| Working memory layer | ✅ | ✅ |
| Advanced analytics | ❌ | ✅ |
| Priority support/SLA | ❌ | ✅ |
| Compliance features (SOC2, GDPR) | ❌ | ✅ |
| Custom integrations | ❌ | ✅ |

**Needs Decision:** Is this split right? Too generous? Too restrictive?

---

### Q4: Integration Priority

**Question:** Which integration to build first?

**Options:**
- **A: Clawdbot Plugin** — Natural fit, immediate value (we're the users)
- **B: MCP Server** — Broader reach, standard protocol, Claude ecosystem
- **C: REST API** — Universal, works with anything, but requires more integration work
- **D: All three in parallel** — If team capacity allows

**Jordan's Lean:** A first (we use it), then B (growing ecosystem), then C (universal fallback).

---

## 🟡 Important (Research Needed)

### Q5: Working Memory Decay

**Question:** How long should working memory persist before decaying?

**Research inputs:**
- 24h = too short (conversations span multiple days)
- 7d = too long (stale context becomes noise)
- Per-topic decay? (active threads persist, stale ones decay)

**Proposed Experiment:** Start at 48h, measure user feedback on "lost context" complaints.

---

### Q6: Competitive Differentiation

**Question:** How is Guardian different from Mem0, Zep, Langchain Memory?

**Research tasks:**
1. Review existing research docs in `research/` folder
2. Identify unique value prop (multi-tenant? extraction quality? UI?)
3. Position statement for marketing

---

### Q7: Team/Resource Requirements

**Question:** Who builds and maintains Guardian SaaS?

**Options:**
- **A: Leo + AI agents** — Current approach, limited human time
- **B: Contractor** — Hire for specific features
- **C: Partner** — Find co-builder interested in the space
- **D: Community** — Open source with community contributions

**Reality check:** SaaS requires ongoing maintenance, support, billing, compliance. What's the sustainable model?

---

## 🟢 Nice to Resolve (Lower Priority)

### Q8: Pricing Validation

**Question:** Is $49-$199/mo the right range?

**Needs:** Customer discovery conversations, competitor pricing analysis

---

### Q9: Name/Brand

**Question:** Is "Guardian" the right name for the commercial product?

**Considerations:**
- "Guardian" is generic, hard to trademark
- ai-engram.org uses "AI Engram" — brand confusion?
- Alternative: Keep "Guardian" for open source, new name for SaaS

---

### Q10: Demo Limits

**Question:** What usage limits for ai-engram.org free tier?

**Proposed:**
- 1000 messages/user
- 100 document pages
- 1 year retention
- No SLA

---

## Decision Matrix

| Question | Blocks | Owner | Target Date |
|----------|--------|-------|-------------|
| Q1: ai-engram scope | Track B | Leo | April 7 |
| Q2: Multi-org model | Track C | Leo/Jordan | April 7 |
| Q3: OSS boundary | Track C | Leo | April 14 |
| Q4: Integration priority | Track A/C | Leo | April 7 |
| Q5: Working memory decay | Track A | Jordan (experiment) | April 14 |
| Q6: Competitive position | Track C | Jordan (research) | April 21 |
| Q7: Team resources | Strategic | Leo | April 21 |

---

*Generated: March 30, 2026*
*To discuss: Tag Leo in chat or schedule time*
