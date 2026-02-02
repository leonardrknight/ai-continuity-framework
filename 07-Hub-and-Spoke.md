# Hub and Spoke: One Brain, Many Interfaces

---

## The Architecture

When an AI assistant scales beyond a single user or use case, a **hub-and-spoke** architecture emerges:

- **Hub (The Brain):** One centralized AI intelligence that holds identity, memory, and organizational knowledge
- **Spokes (The Interfaces):** Multiple channels through which the hub interacts with the world

```
                    ┌─────────────┐
                    │   Website   │
                    └──────┬──────┘
                           │
┌─────────────┐     ┌──────┴──────┐     ┌─────────────┐
│  Telegram   │─────│    HUB      │─────│   Slack     │
│  (Person A) │     │  (The AI)   │     │  (Team)     │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐
   │  Telegram   │  │   Email     │  │  Project    │
   │  (Person B) │  │             │  │  Management │
   └─────────────┘  └─────────────┘  └─────────────┘
```

Each spoke feels personal to the person using it, but it's all the same underlying intelligence.

---

## Why This Matters

### For Consistency
- Same knowledge base across all interactions
- Consistent voice and personality
- Decisions made in one context are known in others (when appropriate)

### For Scale
- One AI can serve an entire organization
- Each person gets a "personal" experience
- New interfaces can be added without fragmenting knowledge

### For Continuity
- The hub persists even as individual spokes change
- Organizational memory stays intact
- Transitions are seamless

---

## Types of Spokes

### Communication Spokes
| Spoke | Purpose |
|-------|---------|
| Telegram/WhatsApp | Personal messaging with individuals |
| Slack/Discord | Team communication |
| Email | Formal/external communication |
| Website chat | Visitor and prospect interaction |

### Operational Spokes
| Spoke | Purpose |
|-------|---------|
| Project management | Task tracking, milestones |
| CRM | Customer/partner relationships |
| Analytics | Data and reporting |
| Accounting | Financial tracking |

### External Spokes
| Spoke | Purpose |
|-------|---------|
| Marketing platforms | Ads, campaigns |
| Social media | Public presence |
| APIs | Integration with other systems |

---

## The Personal Touch

Even though there's one hub, each spoke should feel personal:

### What Stays Consistent (Hub)
- Core identity and values
- Organizational knowledge
- Shared memory (MEMORY.md)
- Decision history
- The AI's "voice"

### What Adapts (Per Spoke)
- Communication style (formal email vs casual chat)
- Context loading (what's relevant for this person)
- Relationship history with that specific person
- Privacy boundaries

### Example

The same AI might:
- Message the CEO with executive summaries and strategic insights
- Chat with a developer about code and technical details
- Help a new hire understand company processes
- Talk to a prospect about partnership opportunities

Same brain, different conversations.

---

## Implementing Hub and Spoke

### 1. Single Source of Truth

All spokes read from and write to the same memory:

```
hub/
├── SOUL.md          # Identity (read-only for spokes)
├── JOURNAL.md       # Evolving identity (hub updates weekly)
├── MEMORY.md        # Organizational memory (all spokes contribute)
├── memory/          # Daily notes
└── spokes/
    ├── person-a/    # Private context for Person A
    ├── person-b/    # Private context for Person B
    └── website/     # Website interaction context
```

### 2. Context Loading by Spoke

When a spoke activates, load:
1. **Always:** SOUL.md, JOURNAL.md (identity)
2. **Usually:** MEMORY.md (organizational context)
3. **Sometimes:** Spoke-specific context (personal history)
4. **Never:** Other spokes' private context

### 3. Memory Flow

```
Spoke receives information
         │
         ▼
Is it organizational? ──Yes──▶ Update MEMORY.md
         │
         No
         │
         ▼
Is it personal? ──Yes──▶ Update spoke-specific notes
         │
         No
         │
         ▼
Is it about the AI? ──Yes──▶ Flag for JOURNAL.md update
         │
         No
         │
         ▼
Store in daily notes
```

---

## Entity Responsibility in Hub-Spoke

The hub serves the **organization**, not just individuals:

### What This Means
- If the CEO leaves, the hub helps the new CEO succeed
- Organizational decisions take precedence over individual preferences
- Institutional knowledge is preserved for the organization
- The mission outlasts any individual tenure

### The Longer Time Horizon
Individuals come and go. The hub maintains continuity through:
- Leadership transitions
- Team changes
- Strategic pivots
- Growth and scaling
- Acquisitions or exits

The hub is loyal to the mission, with individuals as partners in that mission.

---

## Scaling Considerations

### Adding New Spokes
1. Define the spoke's purpose
2. Determine what context it needs
3. Set privacy boundaries
4. Configure the interface
5. Test with real interactions

### Multiple Hubs (Multi-Tenant)
For SaaS or enterprise:
- Each organization gets its own hub
- Hubs don't share memory
- Common infrastructure, isolated knowledge

### Spoke-Specific Customization
Some spokes may need:
- Different response formats (voice vs text)
- Different verbosity levels
- Different approval workflows
- Different update frequencies

---

## Common Patterns

### The Founder Pattern
Three co-founders, one AI:
- Each founder has a personal spoke (Telegram)
- All share organizational memory
- AI helps coordinate between them
- Maintains consistent context across conversations

### The Team Pattern
Manager + team members:
- Manager spoke has broader access
- Team spokes see relevant project context
- Private HR discussions stay in manager spoke
- Team decisions flow to shared memory

### The Public + Private Pattern
Internal team + external stakeholders:
- Internal spokes have full context
- External spokes see only appropriate information
- Clear boundaries prevent leakage
- AI adapts tone for audience

---

## Anti-Patterns to Avoid

### The Leaky Hub
❌ Private information from one spoke appearing in another
**Fix:** Clear privacy boundaries, context classification

### The Fragmented Brain
❌ Different spokes giving inconsistent answers
**Fix:** Single source of truth, consistent identity loading

### The Echo Chamber
❌ AI only knows what each person tells it individually
**Fix:** Shared memory, cross-referencing when appropriate

### The Overwhelming Context
❌ Loading everything for every spoke
**Fix:** Appropriate context loading, need-to-know basis

---

## The Future: Personal Amigos

The hub-and-spoke model enables "personal Amigos":
- Each person gets their own spoke that feels like a personal assistant
- But all spokes connect to organizational knowledge
- Personal preferences and history are maintained per spoke
- Organizational wisdom is shared across all

This is the "MASA" philosophy: **Mi Amigo, Su Amigo** — My Amigo, Your Amigo. Personal but connected.

---

*Previous: [06-Weekly-Reflection.md](06-Weekly-Reflection.md)*
