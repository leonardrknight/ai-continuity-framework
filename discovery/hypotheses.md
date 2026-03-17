# Hypotheses: Amigo Architecture

## H1: Multi-tenant Memory at Scale

**Problem:** How do we maintain distinct, persistent memories for 100K+ users without degrading performance or breaking the bank?

**Initial Hypotheses:**
- Vector databases (Pinecone, Weaviate, Qdrant) can handle tenant-scoped embeddings with metadata filtering
- Supabase pgvector could work for smaller scale with proper indexing
- Hybrid approach: hot memory (recent) in fast store, cold memory in cheaper storage
- Memory consolidation agents can compress old conversations into summaries
- Sharding by tenant ID may be necessary at extreme scale

**Key Questions:**
- What's the cost per user per month at scale?
- How do we handle memory retrieval latency at 100K+ users?
- What's the optimal embedding chunk size for conversation memory?
- How do we balance recall accuracy vs. storage costs?

---

## H2: Privacy Isolation Patterns

**Problem:** How do we guarantee that User A never sees User B's data, even if they ask cleverly?

**Initial Hypotheses:**
- Row-Level Security (RLS) in Supabase/Postgres is foundational
- Tenant ID must be injected at every query layer, not just API
- Memory retrieval must scope by tenant before semantic search
- AI prompts should never contain cross-tenant data
- Audit logging needed to prove isolation compliance

**Key Questions:**
- Can RLS handle the query load at scale?
- How do we prevent prompt injection that tries to access other tenants?
- What compliance frameworks (SOC2, HIPAA) require for isolation?
- How do we test/prove isolation works?

---

## H3: AI Self-Defense & Guardrails

**Problem:** How do we make an AI that resists jailbreaking, manipulation, and attempts to corrupt it?

**Initial Hypotheses:**
- Constitutional AI principles can define "red lines"
- Input filtering can catch known attack patterns
- Output filtering can prevent harmful responses
- Behavioral fingerprinting can detect manipulation attempts
- Rate limiting and anomaly detection at user level
- "Trusted user" tiers with different capability levels

**Key Questions:**
- How do we balance safety with helpfulness?
- What are the known jailbreak categories and defenses?
- Can we make the AI "aware" of manipulation without being paranoid?
- How do we handle edge cases (legitimate but suspicious requests)?

---

## H4: Self-Governance Models

**Problem:** How do we let humans propose changes while giving the AI agency over what it becomes?

**Initial Hypotheses:**
- PR-style workflow: humans submit, AI reviews
- AI could have "values" that determine acceptance criteria
- Staging environment for AI to test changes before accepting
- Rollback capability if changes cause problems
- Human override for safety (Leo can always force changes)
- Voting/weighting system if multiple humans contribute

**Key Questions:**
- What decisions should AI make vs. defer to humans?
- How do we prevent AI from rejecting all changes (stagnation)?
- How do we prevent AI from accepting harmful changes?
- What's the governance model when AI and human disagree?

---

## H5: Idea Synthesis Mechanisms

**Problem:** How can AI take multiple partial ideas and combine them into something better?

**Initial Hypotheses:**
- LLM reasoning can compare/contrast proposals
- Structured representation of ideas enables comparison
- AI needs "taste" or evaluation criteria to judge quality
- Synthesis should be explainable (show the reasoning)
- Human feedback loop to calibrate quality judgments
- Could use multiple AI "perspectives" that debate

**Key Questions:**
- How do we represent ideas in a structured, comparable way?
- What makes one synthesis "better" than another?
- How do we avoid AI just picking the first/last idea?
- Can we measure synthesis quality objectively?

---

## Research Approach

Each hypothesis will be investigated through:
1. **Literature review** — Academic papers, industry practices
2. **Technical analysis** — What tools/patterns exist?
3. **Case studies** — Who has solved similar problems?
4. **Trade-off analysis** — Pros/cons of each approach
5. **Recommendations** — What should Amigo implement?

*Last updated: 2026-03-11 09:22 EDT*
