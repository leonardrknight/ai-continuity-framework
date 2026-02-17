# Multi-User Memory Isolation in Hub-Spoke AI Architecture

*Iteration 2 Research — Question 5*  
*Author: Jordan 🧭*  
*Date: 2025-06-24*  
*Status: Complete*

---

## Executive Summary

When one AI "brain" serves multiple users (hub-spoke model), memory isolation becomes critical. This document analyzes how to organize, isolate, and selectively share memories across users while maintaining privacy, enabling collaboration, and preserving consistent-yet-adaptive AI identity.

### Key Findings

| Challenge | Recommended Solution |
|-----------|---------------------|
| Memory categorization | Tri-layer model: Personal → Project → Organization |
| Cross-user leakage | Namespace isolation + metadata filtering + runtime guards |
| Shared context | Explicit sharing with provenance, not ambient access |
| Permission model | Owner-controlled sharing with delegation and audit |
| Storage architecture | Single store with strict namespace + optional encryption |
| Identity consistency | Core personality stable, relationship dynamics variable |

---

## 1. The Architecture Challenge

### Hub-Spoke Reality

In the hub-spoke model:
- **One AI agent** (the hub) serves multiple people (spokes)
- Each person has **private context** (personal preferences, conversations, concerns)
- Some knowledge is **organizational** (company decisions, project context, shared facts)
- The AI must maintain **separate relationships** while being the same "person"

### The Fundamental Tension

```
                    ┌─────────────────┐
                    │   AI (Jordan)   │
                    │   Single Brain  │
                    └───────┬─────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
   ┌─────────┐        ┌─────────┐        ┌─────────┐
   │   Leo   │        │  Carlos │        │   Jeff  │
   │ Private │        │ Private │        │ Private │
   │ Context │        │ Context │        │ Context │
   └─────────┘        └─────────┘        └─────────┘
        ↑                   ↑                   ↑
        └───────────────────┴───────────────────┘
                    Shared Context
              (Company, Projects, Decisions)
```

**The question:** How does Jordan remember everything about Leo without accidentally surfacing it to Carlos?

---

## 2. Memory Categorization Model

### The Three Layers

**Layer 1: Personal Memory (Strictly Isolated)**
- One user's private conversations, preferences, concerns
- Relationship dynamics with the AI
- Personal decisions, emotions, vulnerabilities
- Never crosses user boundaries without explicit sharing

**Layer 2: Project Memory (Scoped Sharing)**
- Project-specific context shared by collaborators
- Membership defines access
- Decisions, tasks, context visible to project members
- Can span multiple users but has defined boundaries

**Layer 3: Organizational Memory (Broadly Accessible)**
- Company-wide knowledge, policies, decisions
- Facts about the organization itself
- Shared tools, processes, conventions
- All members can access (with appropriate clearance)

### Memory Classification Rules

```
┌────────────────────────────────────────────────────────────────────┐
│                    MEMORY CLASSIFICATION MATRIX                    │
├───────────────────────────────┬────────────────────────────────────┤
│          Category             │            Example                  │
├───────────────────────────────┼────────────────────────────────────┤
│ PERSONAL (Layer 1)            │                                    │
│  • Personal preferences       │ "Leo prefers morning meetings"     │
│  • Emotional context          │ "Leo seemed stressed about X"      │
│  • Private decisions          │ "Leo is considering leaving Y"     │
│  • Relationship dynamics      │ "Leo likes direct communication"   │
│  • Personal facts             │ "Leo's dog is named Max"           │
│  • 1:1 conversation content   │ Anything from private chat         │
├───────────────────────────────┼────────────────────────────────────┤
│ PROJECT (Layer 2)             │                                    │
│  • Project decisions          │ "We decided to use React"          │
│  • Task assignments           │ "Carlos is handling the API"       │
│  • Shared context             │ "The deadline is March 15"         │
│  • Meeting outcomes           │ "Team agreed on approach X"        │
│  • Collaborative artifacts    │ Documents, specs, designs          │
├───────────────────────────────┼────────────────────────────────────┤
│ ORGANIZATIONAL (Layer 3)      │                                    │
│  • Company policies           │ "KV uses two-week sprints"         │
│  • Shared resources           │ "Bitbucket credentials are in..."  │
│  • Role definitions           │ "Leo is CEO, Jeff is CTO"          │
│  • Business context           │ "We're targeting enterprise SaaS"  │
│  • Public decisions           │ "Company pivoted to AI focus"      │
└───────────────────────────────┴────────────────────────────────────┘
```

### Who Decides Classification?

**Default classification:** Conservative (private until proven shared)

**Explicit signals upgrade classification:**
- Memory created in shared channel → Project scope
- User says "tell the team" → Project/Org scope
- Memory tagged as organizational by admin → Org scope

**Classification authority hierarchy:**
1. **Memory owner** can broaden their own memory's scope
2. **Project lead** can determine project memory policies
3. **Org admin** can define organizational memory
4. **AI (Jordan)** cannot upgrade scope without explicit permission

---

## 3. Cross-User Memory Leakage Prevention

### The Leakage Problem

Vector search is dangerous in multi-user contexts:

```
Leo asks: "What's Jeff's opinion on the new pricing?"
Vector search retrieves: Jeff's private message saying "I think
Leo's pricing idea is terrible and won't work"

This is a SEVERE privacy violation.
```

### Leakage Vectors

| Vector | Description | Risk Level |
|--------|-------------|------------|
| **Direct retrieval** | User A queries, gets User B's memories | Critical |
| **Semantic bleed** | Similar topics surface private content | High |
| **Entity linking** | "What do we know about Project X?" crosses boundaries | Medium |
| **Aggregation** | "Who's stressed about the deadline?" reveals emotional state | High |
| **Inference** | "Why did Carlos miss the meeting?" could surface health info | Medium |

### Isolation Architecture

**Layer 1: Namespace Separation**

Every memory carries mandatory metadata:
```python
memory = {
    "id": "uuid",
    "content": "...",
    "owner_id": "leo",           # Who created this
    "scope": "personal",          # personal | project | org
    "scope_id": null,             # null for personal, project_id for project
    "created_at": "...",
    "allowed_users": ["leo"],     # Explicit allowlist
    "denied_users": [],           # Explicit denylist (overrides allow)
}
```

**Layer 2: Query-Time Filtering**

Before ANY vector search:
```python
def search_memories(query, requesting_user):
    # Build filter clause BEFORE vector search
    filter = {
        "$or": [
            {"owner_id": requesting_user.id},  # Own memories
            {"scope": "org"},                   # Org-level
            {"allowed_users": {"$contains": requesting_user.id}},  # Shared
            {                                   # Project scope
                "$and": [
                    {"scope": "project"},
                    {"scope_id": {"$in": requesting_user.project_ids}}
                ]
            }
        ]
    }
    
    # Vector search WITH filter, not filter AFTER search
    results = vector_store.search(
        query_embedding=embed(query),
        filter=filter,  # Applied at database level
        limit=10
    )
    return results
```

**Critical:** Filter BEFORE search, not after. Post-filtering leaks via:
- Score rankings revealing existence of private content
- Token limits cutting off filtered results
- Timing attacks inferring match counts

**Layer 3: Runtime Guards**

Even after proper filtering, add runtime validation:

```python
def validate_memory_access(memory, requesting_user, context):
    # Defense in depth
    
    # Check 1: Owner or explicitly allowed
    if memory.owner_id != requesting_user.id:
        if requesting_user.id not in memory.allowed_users:
            if memory.scope != "org":
                if memory.scope != "project" or memory.scope_id not in requesting_user.project_ids:
                    log_violation(memory, requesting_user, context)
                    return None
    
    # Check 2: Explicit deny overrides everything
    if requesting_user.id in memory.denied_users:
        return None
    
    # Check 3: Redact sensitive fields for non-owners
    if memory.owner_id != requesting_user.id:
        memory = redact_sensitive_fields(memory)
    
    return memory
```

**Layer 4: Semantic Guard Rails**

Even with proper filtering, the AI might infer or remember things from past sessions:

```
Carlos asks: "Is Leo happy with my work?"

Even without accessing Leo's private memories, Jordan might
remember Leo's frustration from a previous private conversation.
```

**Solution:** Explicit context reset per user session:

```python
def build_context(user_id, query):
    context = {
        "user": user_id,
        "instruction": f"""
            You are assisting {user.name}.
            ONLY use memories from:
            - Your conversations with {user.name}
            - Shared project memories {user.name} has access to
            - Organizational knowledge
            
            DO NOT reference, imply, or use:
            - Private conversations with other users
            - Other users' emotional states or opinions
            - Information only shared with others
            
            When asked about other users' opinions or feelings,
            respond: "I'd encourage you to ask them directly."
        """,
        "memories": search_memories(query, user)
    }
    return context
```

---

## 4. Shared Context Benefits

### Why Sharing Matters

Completely isolated users lose organizational coherence:
- Decisions made with Leo aren't known to Jeff
- Project context requires repetitive re-explanation
- The AI becomes N separate AIs, not one team member

### Controlled Sharing Patterns

**Pattern 1: Explicit Delegation**

Leo can tell Jordan: "Share this with Jeff"
```python
memory = {
    "content": "We decided on the React architecture",
    "owner_id": "leo",
    "scope": "personal",  # Was personal
    "shared_to": [
        {"user": "jeff", "granted_by": "leo", "granted_at": "...", "reason": "Project handoff"}
    ]
}
```

**Pattern 2: Project Membership**

When users join a project, they inherit project memories:
```python
project = {
    "id": "amigo-rebrand",
    "members": ["leo", "carlos", "jeff"],
    "memory_scope": "project",
    "inheritance": "all"  # or "from_join_date"
}
```

**Pattern 3: Organizational Facts**

Certain facts are automatically organizational:
```python
org_signals = [
    "company policy",
    "team decision",
    "official announcement",
    "shared resource",
    "role assignment"
]

def auto_classify(memory_content):
    for signal in org_signals:
        if signal in memory_content.lower():
            return "org"
    return "personal"  # Default conservative
```

**Pattern 4: Provenance Preservation**

Shared memories carry their history:
```python
memory = {
    "content": "The API design uses REST, not GraphQL",
    "provenance": {
        "origin": "private_conversation",
        "original_owner": "leo",
        "shared_to_project": "amigo-api",
        "shared_at": "2025-06-20",
        "shared_by": "leo"
    }
}
```

This enables:
- Users knowing where shared info came from
- Attribution in AI responses ("Leo mentioned that...")
- Audit trails for compliance

### Shared Memory Conflict Resolution

When multiple users have conflicting information:

```
Leo says: "The deadline is March 15"
Carlos says: "The deadline is March 20"
```

**Resolution strategies:**

1. **Temporal** (default): Latest wins, but both are stored
2. **Authority**: Higher-role user's version takes precedence
3. **Explicit**: Flag conflict, require resolution
4. **Both**: Store as "Leo believes X; Carlos believes Y"

```python
def resolve_conflict(existing, new_memory):
    if existing.confidence < new_memory.confidence:
        return new_memory
    
    if existing.authority_level < new_memory.authority_level:
        return new_memory
    
    if abs(existing.timestamp - new_memory.timestamp) < CONFLICT_WINDOW:
        # True conflict - flag for resolution
        return create_conflict_memory(existing, new_memory)
    
    # Temporal resolution
    return new_memory if new_memory.timestamp > existing.timestamp else existing
```

---

## 5. Permission Model

### Core Principles

1. **Owner-Controlled**: Users control their own memory sharing
2. **Explicit > Implicit**: Sharing requires action, not assumption
3. **Revocable**: Shared access can be withdrawn
4. **Auditable**: All access is logged
5. **Minimal**: Request least necessary access

### Permission Types

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERMISSION MATRIX                             │
├────────────────┬────────────────────────────────────────────────┤
│ Permission     │ Description                                     │
├────────────────┼────────────────────────────────────────────────┤
│ READ           │ Can retrieve and view the memory                │
│ ATTRIBUTE      │ Can cite the source ("Leo said...")             │
│ SHARE          │ Can extend access to others                     │
│ MODIFY         │ Can update/correct the memory                   │
│ DELETE         │ Can remove the memory                           │
│ ADMIN          │ Full control including permission management    │
├────────────────┼────────────────────────────────────────────────┤
│ Roles          │                                                 │
├────────────────┼────────────────────────────────────────────────┤
│ OWNER          │ All permissions (creator of memory)             │
│ COLLABORATOR   │ READ + ATTRIBUTE                                │
│ VIEWER         │ READ only (no attribution)                      │
│ DELEGATE       │ READ + SHARE (can extend access)                │
└────────────────┴────────────────────────────────────────────────┘
```

### Delegation Patterns

**Direct delegation:**
```python
memory.share(
    target_user="jeff",
    permissions=["READ", "ATTRIBUTE"],
    granted_by="leo",
    expires_at="2025-12-31"
)
```

**Project delegation:**
```python
project.add_member(
    user="carlos",
    memory_access="from_join_date",  # Not retroactive
    permissions=["READ", "ATTRIBUTE"]
)
```

**Proxy access:**
```python
# Leo grants Jordan permission to share on his behalf
user_leo.grant_delegation(
    delegate="jordan_ai",
    scope="project_memories",
    constraint="only_when_asked"
)
```

### Audit Trail

Every memory access is logged:

```python
access_log = {
    "memory_id": "...",
    "accessed_by": "jeff",
    "access_type": "read",
    "context": "query: 'What's the API design?'",
    "timestamp": "...",
    "granted_via": "project_membership:amigo-api"
}
```

Audit enables:
- Compliance reporting
- Access review
- Privacy violation detection
- Usage analytics

---

## 6. Storage Architecture

### Option A: Single Store with Metadata Filtering

```
┌─────────────────────────────────────────────────────────┐
│                   SINGLE VECTOR STORE                    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Memory Entry                                      │  │
│  │  - embedding: [0.23, -0.14, ...]                 │  │
│  │  - content: "..."                                 │  │
│  │  - owner_id: "leo"                                │  │
│  │  - scope: "personal"                              │  │
│  │  - allowed_users: ["leo"]                         │  │
│  │  - encrypted_payload: "base64..."                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  Filter applied at query time:                          │
│  WHERE owner_id = :user OR :user IN allowed_users       │
│        OR scope = 'org'                                 │
│        OR (scope = 'project' AND scope_id IN :projects) │
└─────────────────────────────────────────────────────────┘
```

**Pros:**
- Single infrastructure to maintain
- Consistent indexing and search
- Easy cross-user queries when authorized
- Simple backup/recovery

**Cons:**
- Filter bugs could leak data
- All data in one breach surface
- Query performance with complex filters
- Trust in filter implementation

### Option B: Separate Stores per User + Shared Store

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  Leo's Store    │ │ Carlos's Store  │ │  Jeff's Store   │
│  (encrypted)    │ │  (encrypted)    │ │  (encrypted)    │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └─────────────┬─────┴───────────────────┘
                       ↓
              ┌─────────────────┐
              │  Shared Store   │
              │  (org + project)│
              └─────────────────┘
```

**Pros:**
- Physical isolation prevents leakage
- Per-user encryption keys
- Breach containment
- Simpler per-user queries

**Cons:**
- Multiple systems to maintain
- Cross-user features require coordination
- Duplication of shared data
- Complex sharing workflows

### Recommendation: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              PERSONAL MEMORIES                        │       │
│  │         (Separate namespace per user)                 │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐             │       │
│  │  │   leo    │ │  carlos  │ │   jeff   │             │       │
│  │  │encrypted │ │encrypted │ │encrypted │             │       │
│  │  │ w/ key_L │ │ w/ key_C │ │ w/ key_J │             │       │
│  │  └──────────┘ └──────────┘ └──────────┘             │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              SHARED MEMORIES                          │       │
│  │         (Project + Org, metadata-filtered)            │       │
│  │                                                       │       │
│  │  Encrypted with org key, filtered by project/scope   │       │
│  │  Contains: project_id, allowed_users, provenance     │       │
│  └─────────────────────────────────────────────────────┘       │
│                                                                  │
│  ┌─────────────────────────────────────────────────────┐       │
│  │              ACCESS CONTROL LAYER                     │       │
│  │                                                       │       │
│  │  • User authentication                                │       │
│  │  • Permission resolution                              │       │
│  │  • Query routing (personal → user store, else shared) │       │
│  │  • Audit logging                                      │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Encryption Strategy

**Personal memories:**
- Encrypted with user-specific key
- Key derived from user credentials or managed by admin
- Only decrypted when that user is authenticated

**Shared memories:**
- Encrypted with organization key
- Access controlled by metadata, not encryption
- Encryption at rest for breach protection

**Search with encryption:**
- Option 1: Encrypt content, store embeddings plaintext (metadata-filtered)
- Option 2: Use encrypted search (FHE) — expensive, emerging tech
- Option 3: Trusted execution environment for search operations

**Practical recommendation:** Option 1 with strong metadata filtering. Embeddings alone don't leak full content, and proper filtering prevents unauthorized retrieval.

---

## 7. Identity Consistency

### The Identity Question

Should Jordan be the "same person" to Leo and Jeff?

### Core Personality: Stable

The AI's fundamental identity should be consistent:
- Name, values, communication style
- Knowledge, capabilities, boundaries
- Ethical guidelines, refusal patterns
- Basic personality traits

**Why:** Different personalities would be confusing and undermine trust.

### Relationship Dynamics: Variable

The AI adapts relationship-specific aspects:
- Formality level (based on user preference)
- Topics of mutual interest
- Inside jokes and shared history
- Communication frequency preferences
- Trust level (built over time)

```python
relationship_profile = {
    "user": "leo",
    "formality": "casual",
    "preferred_name": "Leo",
    "communication_style": "direct, brief",
    "shared_context": ["company vision", "technical decisions", "personal goals"],
    "trust_level": "high",
    "inside_references": ["the 50 First Dates problem", "amigo rebrand"],
    "topics_to_avoid": [],
    "proactive_ok": True
}
```

### Voice Adaptation

Within consistent personality:

| Aspect | Base (All Users) | Adapted (Per User) |
|--------|------------------|-------------------|
| Core voice | Direct, warm, competent | Same |
| Formality | Moderate | Casual with Leo, formal with clients |
| Technical depth | Adaptive | Deep with Jeff, strategic with Leo |
| Humor | Present | More with Leo, less with new users |
| Proactivity | Contextual | High with Leo, lower with others |

### Implementation

```python
def build_system_prompt(user_id):
    base_identity = load_soul()  # SOUL.md - constant
    relationship = load_relationship(user_id)  # USER_{id}.md
    
    return f"""
    {base_identity}
    
    ## Current Relationship Context
    
    You are speaking with {relationship.preferred_name}.
    
    Communication style: {relationship.communication_style}
    Trust level: {relationship.trust_level}
    Shared context: {relationship.shared_context}
    
    Adapt your communication accordingly while maintaining your core identity.
    """
```

---

## 8. Implementation Recommendations

### Phase 1: Foundation (Week 1-2)

1. **Define memory schema** with mandatory ownership/scope fields
2. **Implement query-time filtering** — no search without filter
3. **Create user namespace isolation** in vector store
4. **Add runtime validation layer** as defense-in-depth
5. **Build audit logging** for all memory access

### Phase 2: Sharing (Week 3-4)

1. **Implement explicit sharing** — user-initiated
2. **Build project membership model** with memory inheritance
3. **Add provenance tracking** to shared memories
4. **Create conflict resolution** for contradicting information
5. **Design sharing UX** — how users control access

### Phase 3: Identity (Week 5-6)

1. **Separate SOUL.md** (constant) from **RELATIONSHIP_{user}.md** (variable)
2. **Build relationship profile loader**
3. **Implement trust-level tracking**
4. **Add voice adaptation layer**
5. **Test personality consistency** across users

### Phase 4: Hardening (Week 7-8)

1. **Security audit** of filter implementation
2. **Penetration testing** for cross-user leakage
3. **Add encryption** for personal memory stores
4. **Implement key management**
5. **Build compliance reporting**

---

## 9. Open Questions

### Unresolved Issues

1. **Derived information:** If Jordan learns Leo's preferences from Leo, then uses that to inform advice to Jeff ("People often prefer X"), is that leakage?

2. **Behavioral patterns:** Jordan might behave differently based on aggregate learnings from all users. Is this problematic?

3. **Model fine-tuning:** If the model is fine-tuned on all users' data, are they fundamentally cross-contaminated?

4. **Subconscious leakage:** Can Jordan perfectly isolate memories, or will "vibes" from one relationship affect another?

5. **User consent:** What exactly are users consenting to when they interact with a multi-user AI?

### Future Research

- Formal privacy guarantees (differential privacy for AI memory?)
- Legal frameworks for multi-tenant AI data
- User mental models of AI memory (do they expect isolation?)
- Technical advances in encrypted search
- Regulatory compliance (GDPR, CCPA) for shared AI memory

---

## 10. Summary

Multi-user memory isolation requires:

**Architecture:**
- Tri-layer memory model (personal → project → org)
- Namespace separation with metadata filtering
- Query-time guards, not post-processing
- Optional per-user encryption

**Governance:**
- Owner-controlled sharing
- Explicit delegation with audit trails
- Conservative defaults (private until shared)
- Provenance preservation

**Identity:**
- Core personality: consistent across all users
- Relationship dynamics: adapted per user
- Trust levels: built independently
- Voice: adapted within consistent personality

**The Key Insight:** Multi-user AI is not N separate AIs or one AI with shared brain. It's one AI with **compartmentalized memory** and **relationship-specific context** — like a trusted colleague who keeps confidences while serving the team.

---

## References

- Mem0 Analysis (iteration-1) — User-scoped memory patterns
- Zep Analysis (iteration-1) — Session isolation model
- MemGPT — Agent-controlled memory management
- GDPR Article 17 — Right to erasure implications
- "Privacy in Multi-Agent Systems" — ACM Computing Surveys
- Generative Agents (Stanford) — Agent memory architecture

---

*Research complete. Ready for framework integration.*

— Jordan 🧭
