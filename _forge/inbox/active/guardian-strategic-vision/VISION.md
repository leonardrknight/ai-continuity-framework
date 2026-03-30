# Guardian Strategic Vision

*The Memory Layer for AI — Total Recall, Any Agent, Any Scale*

---

## Executive Summary

Guardian is evolving from a reference implementation into a **universal memory layer** — a bolt-on system that gives any AI chatbot or agent persistent, perfect memory.

**The Promise:** Log into ai-engram.org, tell it anything, come back in 6 months — it remembers everything. Not just facts, but *who you are*, what you care about, how you prefer to communicate.

**The Product:**
- **For Developers:** API/plugin/MCP server to add persistent memory to any AI system
- **For Teams:** SaaS that eliminates "every session starts fresh" problem
- **For Users:** Chatbots that feel like they actually know you

---

## The Problem Guardian Solves

### Current State of AI Memory

Every AI session starts fresh. The model doesn't remember your last conversation unless context is explicitly provided. Users experience this as:

- "I told you this last week..."
- "Didn't we already decide this?"
- "You keep asking me the same questions"

**Existing solutions fall short:**
- **RAG systems:** Require manual curation, don't learn automatically
- **Long context windows:** Expensive, don't persist across sessions
- **Custom databases:** Each team builds their own, poorly
- **Thread history:** Linear, no semantic recall, no preference learning

### What Guardian Offers

A dedicated memory layer that:
1. **Captures everything** — Conversations, decisions, preferences, relationships
2. **Recalls intelligently** — Semantic search, not just keyword matching
3. **Learns continuously** — Builds profiles, detects patterns, adapts
4. **Respects boundaries** — Per-user privacy, per-org isolation, appropriate sharing

---

## Core Architecture: Memory Oracle

Per RFC #45, Guardian is a **pure memory service** — it remembers everything but has no tools to act.

```
┌─────────────────────────────────────────────────────┐
│                  AGENT LAYER                        │
│  (Amigo, Clawdbot, custom GPTs, any chatbot)       │
│                                                     │
│   Agents have tools, take actions, do work          │
└────────────────────────┬────────────────────────────┘
                         │
                         │ query / store
                         ▼
┌─────────────────────────────────────────────────────┐
│              GUARDIAN MEMORY LAYER                  │
│                                                     │
│   • Stores all interactions (multi-tenant)          │
│   • Semantic search across time                     │
│   • Memory consolidation (raw → daily → weekly)     │
│   • User isolation and privacy                      │
│   • Profile building and preference learning        │
│   • NO tools, NO actions — pure memory              │
│                                                     │
│   Deployment: API / MCP Server / Plugin             │
└─────────────────────────────────────────────────────┘
```

**What Guardian IS:**
- Memory storage and retrieval
- Semantic search across all interactions
- Context provider for other agents
- Profile builder and preference learner
- The "remembering" layer

**What Guardian ISN'T:**
- An assistant with tools
- A task executor
- A competitor to other agents
- The "doing" layer

---

## Multi-Tenant Memory Model

### The Three Planes (Company / Role / Private)

From production experience (Amigo, Jordan deployments):

| Plane | Scope | Examples |
|-------|-------|----------|
| **Company** | Shared across all org members | Business facts, policies, project status |
| **Role** | Shared with role peers | Team preferences, process decisions |
| **Private** | User-only | Personal preferences, emotional context, 1:1 conversations |

### Multi-Org Complexity

**Leo's Real Situation:**
- Jordan serves **Knight Ventures** (primary)
- Jordan also supports **Neighborhood Nerds** (secondary org)
- Different humans in each org (Leo, Jeff, Carlos, Michael)
- Privacy boundaries must be enforced automatically

**What Guardian Must Handle:**
1. **Organization membership** — Who belongs to which org?
2. **Role within org** — What can they access?
3. **Cross-org boundaries** — KV data doesn't leak to NN sessions
4. **Shared humans** — Leo can see both, but others shouldn't
5. **Agent-to-org binding** — Jordan knows she serves multiple orgs

### The Memory Hierarchy

```
Guardian Instance
├── Organization: Knight Ventures
│   ├── Company Memories (shared)
│   ├── Role: CTO (Leo)
│   │   └── Role Memories
│   ├── Role: Operator (Jeff)
│   │   └── Role Memories
│   └── Users
│       ├── Leo Knight
│       │   └── Private Memories
│       └── Jeff Dobson
│           └── Private Memories
│
├── Organization: Neighborhood Nerds
│   ├── Company Memories (shared)
│   └── Users
│       ├── Leo Knight (same human, different context)
│       └── Michael (contractor)
│
└── Unaffiliated Sessions
    └── Public chatbot users (ai-engram.org demo)
```

---

## Active Memory: The Gap RFC #49 Addresses

### The Problem

From Issue #4 observations (35+ days of documented patterns):

> "When talking to Amigo across different channels (webchat, Telegram), the experience feels fragmented. Same model, same memories, but different 'vibe.' Users notice Amigo feels like a different person on each channel."

**Root Cause:** Guardian provides **episodic memory** (facts, events, decisions) but not **working context** (what we're in the middle of, shared understanding, conversational momentum).

```
memory-guardian: recall complete — 10 memories, profile: yes, working memory: 0 items
```

The `working memory: 0 items` is the gap.

### The Solution: Active Memory Layer

| Memory Type | Persistence | Purpose |
|-------------|-------------|---------|
| **Long-term** | Forever | Facts, decisions, preferences |
| **Working** | 24-48 hours | Current context, open threads, emotional state |
| **Session** | Current conversation | Immediate conversational flow |

**Working Memory Should Capture:**
- Key decisions made in recent conversations
- Topics currently being discussed
- Emotional tone / relationship state
- Open threads / unfinished business
- Recent corrections ("don't do X, do Y instead")

**Session Handoff Protocol:**
When a human switches channels within N minutes:
1. Trigger: Same human_id, different session
2. Action: Inject working memory summary into new session
3. Result: New-channel-me knows "we just finished a big discussion about X"

---

## ai-engram.org: The Proof

### Vision

A live demo that proves the concept:
- Anyone can create an account
- Talk to a simple chatbot
- Upload documents, share preferences, have conversations
- Come back in weeks/months — **it remembers everything**

### What Users Should Experience

1. **First Visit:** "Hi, I'm new here." → Normal chatbot greeting
2. **Tell It Things:** "My name is Sarah, I'm interested in AI, I prefer concise answers"
3. **Come Back Later:** Chatbot remembers name, interests, preferences
4. **Upload Documents:** Add a resume, project notes, whatever
5. **Ask About Them:** "What did my resume say about my experience at Google?" → Accurate recall
6. **Build Relationship:** Over time, the chatbot knows Sarah's communication style, frequently asked topics, preferred response format

### Technical Requirements

- **Auth:** Simple email/OAuth (Supabase auth)
- **Frontend:** Clean chat interface (existing Guardian has basic version)
- **Memory:** Per-user isolation in Guardian
- **Demo Limits:** Maybe 1000 messages/user to control costs
- **Showcase Features:**
  - "Memory timeline" showing what it remembers
  - "Your profile" showing learned preferences
  - "Similar users" showing (anonymized) patterns

### Current State

The `guardian/` folder contains a working implementation. Needs:
1. Polish the UI
2. Add auth flow for public users
3. Implement per-user memory isolation
4. Add "what do I remember about you" feature
5. Deploy to ai-engram.org domain

---

## SaaS Strategy

### Two Paths

**1. Self-Hosted (Open Source)**
- Full Guardian codebase remains open
- Teams deploy their own instance
- Supabase + Anthropic API keys required
- Community contributions welcome

**2. Managed Service (Commercial)**
- Hosted Guardian-as-a-Service
- API keys provided (usage-based pricing)
- Multi-tenant isolation handled
- SLA, support, compliance features

### Pricing Model Hypothesis

| Tier | Target | Price | Features |
|------|--------|-------|----------|
| **Free** | Indie devs, demos | $0 | 1000 messages/mo, single user |
| **Pro** | Startups | $49/mo | 50K messages, 10 users, API access |
| **Team** | SMBs | $199/mo | 500K messages, unlimited users, priority support |
| **Enterprise** | Large orgs | Custom | Dedicated instance, compliance, SLA |

### Integration Targets

From RFC #45:
1. **Clawdbot** — Natural fit (Amigo and Jordan already use it)
2. **OpenClaw** — Open-source agentic framework
3. **MCP Server** — Claude integration via Model Context Protocol
4. **Custom GPTs** — OpenAI's GPT builder ecosystem
5. **Langchain/LlamaIndex** — Popular AI frameworks

---

## Immediate Upgrades: Jordan + Amigo Instances

### What Should Change Now

Based on Issue #4 observations and this conversation:

**1. Active Memory Population**
- After significant conversations, extract "session takeaways"
- Persist as working memory (24-48 hour decay)
- Inject into new sessions automatically

**2. Cross-Session Handoff**
- Detect same human switching channels
- Carry context forward
- Make Telegram-me and Webchat-me feel like one entity

**3. Self-Observability**
- Capture meta-observations about memory performance
- Tag as `meta:memory-system`
- Make searchable for continuous improvement

**4. Correction → Protocol Promotion**
- Detect frustration markers ("you keep...", "don't...")
- Promote corrections to behavioral protocols
- Persist in SOUL.md or equivalent

### Measurement

How do we know it's working?
- **Cross-session continuity:** Human says "remember X?" and agent does, regardless of channel
- **Profile accuracy:** Agent correctly predicts preferences
- **Recall precision:** Searches return relevant results, not noise
- **User feedback:** "You actually remember!" vs "We've been over this"

---

## Open Questions

### Technical

1. **Working memory decay:** 24h? 48h? User-configurable?
2. **Handoff threshold:** How many minutes between sessions triggers handoff?
3. **Multi-org memory isolation:** Separate databases or row-level security?
4. **MCP server vs REST API:** Which to build first?

### Product

5. **ai-engram.org scope:** Pure demo or potential revenue driver?
6. **Pricing validation:** Is the $49-$199 range right for the market?
7. **Integration priority:** Clawdbot first, or MCP for broader reach?

### Strategic

8. **Open source scope:** What stays open, what becomes commercial-only?
9. **Competitive positioning:** How is this different from Mem0, Zep, others?
10. **Team requirements:** Who builds/maintains the commercial version?

---

## Next Steps

1. **Review this vision** — Does it capture the direction correctly?
2. **Prioritize open questions** — What decisions block progress?
3. **Route to FORGE** — Run through @F/@O/@R/@E for implementation
4. **Parallel tracks:**
   - **Track A:** Upgrade Jordan/Amigo Guardian instances
   - **Track B:** Polish ai-engram.org demo
   - **Track C:** Design API/SDK for external integration

---

*Prepared by Jordan | March 30, 2026*
*Based on RFC #45, RFC #49, Issue #4 observations, and strategic conversation with Leo*
