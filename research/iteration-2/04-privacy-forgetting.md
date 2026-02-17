# Privacy and Forgetting Rights in AI Memory Systems

**Research Document — Iteration 2**  
**Focus:** Technical and legal approaches to comprehensive data deletion

---

## Executive Summary

Implementing "right to be forgotten" in AI memory systems presents unique challenges that go beyond traditional database deletion. When a user requests "forget everything about X," the system must contend with:

- **Direct storage** (raw conversations, facts)
- **Derived data** (inferences, summaries, consolidated memories)
- **Encoded representations** (vector embeddings that entangle information)
- **Audit requirements** (logging that may conflict with deletion)

This document proposes a privacy-aware memory architecture that makes forgetting a first-class operation through careful data modeling, provenance tracking, and tiered retention policies.

---

## Part 1: What "Forget" Means Technically

### 1.1 The Spectrum of Forgetting

| Level | Description | Difficulty |
|-------|-------------|------------|
| **Surface deletion** | Remove the raw text mentioning X | Easy |
| **Reference cleanup** | Remove pointers, tags, links to X | Moderate |
| **Derived data removal** | Delete inferences/summaries that mention X | Hard |
| **Embedding disentanglement** | Remove X's contribution from vector embeddings | Very Hard |
| **Model unlearning** | Remove X's influence on fine-tuned models | Extremely Hard |

### 1.2 Practical Definition for Memory Systems

For a retrieval-based memory system (not fine-tuned), "forget X" should mean:

1. **Delete all memories** where X is a primary subject
2. **Delete all memories** where X is mentioned, even tangentially
3. **Regenerate any embeddings** from the surviving text (re-embed, don't patch)
4. **Remove audit entries** that would reveal X (or retain anonymized versions for compliance)
5. **Cascade to consolidated memories** that incorporated X

This is achievable because we're deleting stored data, not attempting to "unlearn" from a trained model.

---

## Part 2: GDPR and Legal Framework

### 2.1 GDPR Article 17 — Right to Erasure

The GDPR grants individuals the right to request deletion when:

- Data is no longer necessary for its original purpose
- Consent is withdrawn
- Individual objects to processing
- Data was unlawfully processed
- Legal obligation requires erasure

**Key exceptions:**
- Freedom of expression
- Legal claims defense
- Public health purposes
- Archiving in public interest

### 2.2 What GDPR Requires Technically

| Requirement | Implication for AI Memory |
|-------------|---------------------------|
| **Without undue delay** | Deletion must complete within 30 days |
| **Inform third parties** | If memories were shared/synced, notify recipients |
| **Best efforts** | Must attempt removal from backups (within reason) |
| **Derived data included** | Inferences about a person are also personal data |

### 2.3 CCPA Requirements

California Consumer Privacy Act adds:

- Right to know what data is collected
- Right to delete personal information
- Right to opt-out of data "sale" (including some sharing)
- No discrimination for exercising rights

### 2.4 Data Portability

Both GDPR (Article 20) and CCPA require:

- Export data in structured, machine-readable format
- Include all personal data the system holds
- For memory systems: export all memories about/from the user

---

## Part 3: Technical Challenges

### 3.1 Vector Embedding Problem

**The core issue:** A single embedding vector may encode information about multiple entities, topics, or facts. You cannot simply "subtract" one fact from the vector.

**Example scenario:**
```
Memory: "User mentioned their diabetes diagnosis during 
        our conversation about their daughter's wedding"
```

The embedding for this memory entangles:
- Health condition (diabetes)
- Family structure (has daughter)
- Life event (daughter's wedding)

**Solutions:**

**Option A: Delete and re-embed** (Recommended)
- Delete the entire memory
- Don't try to patch the embedding
- Any surviving memories get their own embeddings
- Simple, clean, verifiable

**Option B: Fine-grained memory atoms**
- Store each fact as a separate "atom" with its own embedding
- "User has diabetes" → separate memory
- "User's daughter is getting married" → separate memory
- Deletion is surgical, but storage/retrieval is more complex

**Option C: Attribute-tagged embeddings**
- Store metadata indicating what entities/topics are encoded
- On deletion, flag vectors for regeneration
- Middle ground between A and B

### 3.2 Consolidated Memory Problem

When memories are consolidated (compressed, summarized), original source boundaries blur.

**Example:**
```
Original memories:
1. "User is diabetic"
2. "User has heart issues"
3. "User exercises daily"

Consolidated: "User manages several health conditions including 
              diabetes and heart issues through daily exercise"
```

If user requests deletion of diabetes information:
- Must delete memory #1
- Must regenerate or delete the consolidated memory
- Cannot simply edit the consolidated text (provenance lost)

**Solution: Provenance Chains**
```
consolidated_memory:
  id: "mem_789"
  text: "User manages health through exercise..."
  source_ids: ["mem_123", "mem_456", "mem_012"]
  consolidation_timestamp: "2024-01-15T10:00:00Z"
```

When any source is deleted, the consolidated memory must be:
1. Deleted entirely, OR
2. Regenerated from surviving sources only

### 3.3 Audit Trail Conflict

**The paradox:** Regulations often require audit logs ("what data was accessed/modified"), but GDPR requires deletion. How do you prove you deleted something without recording what you deleted?

**Solution: Tombstone Records**
```
deletion_record:
  id: "del_001"
  deleted_at: "2024-01-20T15:30:00Z"
  deletion_type: "user_request"
  scope: "all_memories_about"
  subject_hash: "sha256(user_id + 'diabetes')"  # Not reversible
  memory_count: 7
  cascade_count: 2  # Consolidated memories affected
  # Note: Original content NOT stored
```

This provides:
- Proof that deletion occurred
- Scope of deletion (how many items)
- Compliance timestamp
- No ability to reconstruct deleted content

---

## Part 4: Categories of Sensitive Data

### 4.1 Sensitivity Taxonomy

| Category | Examples | Retention | Handling |
|----------|----------|-----------|----------|
| **Health (PHI)** | Diagnoses, medications, conditions | Shortest | Encrypt, prompt for deletion |
| **Financial** | Account numbers, income, debt | Short | Encrypt, no sharing |
| **Biometric** | Voice patterns, face data | Shortest | Local only, explicit consent |
| **Location** | Home address, routines | Short | Generalize when possible |
| **Political/Religious** | Beliefs, affiliations | User choice | Never share externally |
| **Relationships** | Family, romantic partners | Medium | Context-appropriate |
| **Professional** | Job, employer, salary | Medium | User controls sharing |
| **Preferences** | Likes, dislikes, habits | Longest | Core to personalization |

### 4.2 Automatic Sensitivity Detection

The system should automatically tag incoming memories:

```python
def classify_sensitivity(memory_text: str) -> SensitivityLevel:
    """
    Classify memory sensitivity using keyword matching 
    and semantic analysis.
    """
    # Health indicators
    health_patterns = [
        r'\b(diagnosed?|condition|medication|symptom|doctor|hospital)\b',
        r'\b(cancer|diabetes|depression|anxiety|HIV)\b',
    ]
    
    # Financial indicators  
    finance_patterns = [
        r'\b(salary|income|debt|account|ssn|credit)\b',
        r'\$[\d,]+',
    ]
    
    # Location indicators
    location_patterns = [
        r'\b(address|live at|located at|home is)\b',
        r'\d+\s+\w+\s+(street|avenue|road|drive|blvd)',
    ]
    
    # ... additional patterns ...
    
    # Combine pattern matching with LLM classification
    # for nuanced cases
```

### 4.3 Handling Special Categories

**Health Information (PHI)**
- Never store diagnosis names in searchable plaintext
- Use encrypted storage with separate key
- Prompt for deletion after 90 days: "I still have health information stored. Keep or delete?"
- Never include in memory exports without explicit confirmation

**Financial Information**
- Redact account numbers immediately after use
- Store only necessary metadata ("user has Chase account" not "account #1234567")
- Auto-delete after 30 days unless explicitly retained

**Location Data**
- Generalize when possible ("lives in Seattle" not "123 Main St")
- Don't store routine location data ("user is at gym") beyond session
- Home/work addresses require explicit consent

---

## Part 5: Retention Policies

### 5.1 Tiered Retention Model

```yaml
retention_tiers:
  ephemeral:
    duration: "session_only"
    categories: ["current_location", "temporary_context"]
    auto_delete: true
    
  short_term:
    duration: "7_days"
    categories: ["conversation_context", "task_state"]
    auto_delete: true
    user_extendable: true
    
  medium_term:
    duration: "90_days"
    categories: ["project_context", "recent_events"]
    auto_delete: false
    user_prompted: true  # "Should I keep remembering X?"
    
  long_term:
    duration: "indefinite"
    categories: ["preferences", "relationships", "core_facts"]
    auto_delete: false
    explicit_consent: true
    
  sensitive:
    duration: "30_days"
    categories: ["health", "financial", "biometric"]
    auto_delete: false
    user_prompted: true
    encrypted: true
```

### 5.2 User-Configurable Retention

Users should control:

1. **Global retention maximum:** "Never keep anything longer than 1 year"
2. **Category overrides:** "Delete health info after 7 days"
3. **Entity exceptions:** "Always remember things about my mom"
4. **Explicit pinning:** "This memory is important, keep forever"

### 5.3 Retention Prompts

Periodic prompts help users maintain control:

```
Memory Review (Monthly):

I have 23 memories older than 90 days. Here's a summary:

Health-related: 3 memories
  - Your diagnosis discussion (Oct 2023)
  - Medication change (Nov 2023)
  - Doctor appointment notes (Dec 2023)
  
Family-related: 8 memories
  - [summaries...]

Would you like to:
[A] Keep all
[B] Review individually  
[C] Delete health memories
[D] Delete all old memories
```

---

## Part 6: Privacy-Aware Memory Architecture

### 6.1 Core Design Principles

1. **Forgetting is a first-class operation** — not an afterthought
2. **Provenance is mandatory** — every derived datum traces to sources
3. **Encryption is default** for sensitive categories
4. **Separation of concerns** — identity, content, and embeddings stored separately
5. **Audit without content** — prove compliance without retaining deleted data

### 6.2 Recommended Schema

```sql
-- Core memory storage (content encrypted at rest)
CREATE TABLE memories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    content_encrypted BYTEA NOT NULL,  -- E2E encrypted
    content_hash TEXT NOT NULL,        -- For dedup, not reversible
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,            -- Retention policy
    sensitivity_level TEXT NOT NULL,   -- PHI, FINANCIAL, etc.
    retention_tier TEXT NOT NULL,      -- ephemeral, short, medium, long
    is_consolidated BOOLEAN DEFAULT FALSE,
    encryption_key_id UUID NOT NULL    -- Reference to key management
);

-- Provenance tracking
CREATE TABLE memory_sources (
    consolidated_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    source_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    contribution_type TEXT,  -- 'primary', 'context', 'inference'
    PRIMARY KEY (consolidated_id, source_id)
);

-- Entity extraction (what/who memory is about)
CREATE TABLE memory_entities (
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,  -- 'person', 'place', 'condition', etc.
    entity_hash TEXT NOT NULL,  -- sha256(normalized_entity_name)
    is_primary_subject BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (memory_id, entity_hash)
);

-- Vector embeddings (separate table, deletable independently)
CREATE TABLE memory_embeddings (
    memory_id UUID PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
    embedding vector(1536),
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

-- Deletion audit (no content, just proof)
CREATE TABLE deletion_log (
    id UUID PRIMARY KEY,
    deleted_at TIMESTAMPTZ NOT NULL,
    deletion_type TEXT NOT NULL,  -- 'user_request', 'retention', 'cascade'
    scope_type TEXT NOT NULL,     -- 'single', 'entity', 'category', 'all'
    scope_hash TEXT,              -- Hashed scope descriptor
    memory_count INTEGER NOT NULL,
    cascade_count INTEGER DEFAULT 0,
    user_confirmed BOOLEAN NOT NULL,
    request_reference TEXT        -- GDPR request ID if applicable
);

-- Sensitive data encryption keys (per-category)
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    category TEXT NOT NULL,       -- 'health', 'financial', etc.
    encrypted_key BYTEA NOT NULL, -- Key encrypted with master
    created_at TIMESTAMPTZ NOT NULL,
    rotated_at TIMESTAMPTZ
);
```

### 6.3 Deletion Cascades

When a memory is deleted:

```python
async def forget_memory(memory_id: str, reason: str) -> DeletionResult:
    """Delete a memory and cascade to dependents."""
    
    async with transaction():
        # 1. Find all consolidated memories that used this source
        consolidated = await db.query("""
            SELECT consolidated_id FROM memory_sources 
            WHERE source_id = ?
        """, memory_id)
        
        # 2. Delete the primary memory (cascades to entities, embeddings)
        await db.execute("DELETE FROM memories WHERE id = ?", memory_id)
        
        # 3. Handle consolidated memories
        cascade_deleted = 0
        for cons_id in consolidated:
            remaining_sources = await db.query("""
                SELECT COUNT(*) FROM memory_sources 
                WHERE consolidated_id = ?
            """, cons_id)
            
            if remaining_sources == 0:
                # No sources left, delete consolidated
                await db.execute("DELETE FROM memories WHERE id = ?", cons_id)
                cascade_deleted += 1
            else:
                # Regenerate from remaining sources
                await regenerate_consolidated_memory(cons_id)
        
        # 4. Log deletion (without content)
        await db.execute("""
            INSERT INTO deletion_log 
            (id, deleted_at, deletion_type, scope_type, memory_count, cascade_count)
            VALUES (?, NOW(), ?, 'single', 1, ?)
        """, uuid4(), reason, cascade_deleted)
        
        return DeletionResult(
            deleted=1, 
            cascaded=cascade_deleted,
            regenerated=len(consolidated) - cascade_deleted
        )
```

### 6.4 Entity-Based Forgetting

```python
async def forget_entity(
    entity_name: str, 
    entity_type: str,
    scope: Literal["primary", "any_mention"] = "any_mention"
) -> DeletionResult:
    """
    Forget everything about an entity.
    
    scope="primary": Only memories where entity is main subject
    scope="any_mention": All memories that mention entity
    """
    
    entity_hash = sha256(normalize(entity_name) + entity_type)
    
    if scope == "primary":
        memories = await db.query("""
            SELECT memory_id FROM memory_entities 
            WHERE entity_hash = ? AND is_primary_subject = TRUE
        """, entity_hash)
    else:
        memories = await db.query("""
            SELECT memory_id FROM memory_entities 
            WHERE entity_hash = ?
        """, entity_hash)
    
    total_deleted = 0
    total_cascaded = 0
    
    for memory_id in memories:
        result = await forget_memory(memory_id, "entity_deletion")
        total_deleted += result.deleted
        total_cascaded += result.cascaded
    
    # Log entity-level deletion
    await db.execute("""
        INSERT INTO deletion_log 
        (id, deleted_at, deletion_type, scope_type, scope_hash, memory_count, cascade_count)
        VALUES (?, NOW(), 'user_request', 'entity', ?, ?, ?)
    """, uuid4(), entity_hash, total_deleted, total_cascaded)
    
    return DeletionResult(deleted=total_deleted, cascaded=total_cascaded)
```

---

## Part 7: "Forget X" Implementation

### 7.1 User Interface Patterns

**Natural language requests:**
```
User: "Forget everything about my diabetes"
User: "Delete all memories mentioning my ex-wife"
User: "I don't want you to remember my address"
User: "Clear all health information"
User: "Forget our conversation from yesterday"
```

**Confirmation flow:**
```
AI: I found 12 memories related to "diabetes":
    
    Direct mentions: 8 memories
    - Discussion about diagnosis (March 2024)
    - Medication questions (April 2024)
    - Diet restrictions conversation (April 2024)
    - [... 5 more]
    
    Indirect references: 4 memories  
    - May be affected but don't directly mention diabetes
    
    Would you like me to:
    [A] Delete all 12 memories
    [B] Delete only the 8 direct mentions
    [C] Review each memory first
    [D] Cancel
    
User: A

AI: Done. I've deleted 12 memories and updated 3 summary 
    memories that referenced them. I no longer have any 
    information about diabetes in your memory.
    
    Reference: DEL-2024-001 (save this for compliance records)
```

### 7.2 Scope Clarification

When requests are ambiguous:

```
User: "Forget about John"

AI: I have memories about multiple people named John:
    
    1. John (your brother) - 23 memories
    2. John Smith (colleague) - 8 memories  
    3. John (contractor who fixed your roof) - 3 memories
    
    Which John should I forget? Or should I forget all of them?
```

### 7.3 Partial Forgetting

Some requests require nuance:

```
User: "Forget my salary, but you can remember I work at Acme Corp"

AI: I'll remove your salary information while keeping your 
    employment at Acme Corp. This will affect 4 memories:
    
    - Salary negotiation discussion → Will delete
    - Career planning conversation → Will remove salary 
      figures, keep role information
    - Tax question → Will delete (primarily about income)
    - Job comparison → Will remove compensation details
    
    Proceed?
```

Implementation requires memory surgery:
1. For some memories: delete entirely
2. For others: regenerate without sensitive component
3. Track that partial redaction occurred

### 7.4 Verification

After deletion, user should be able to verify:

```
User: "Do you remember anything about my diabetes?"

AI: I have no memories related to diabetes. My records show 
    a deletion request (DEL-2024-001) was processed on 
    January 15, 2024, but I don't have details about what 
    was deleted.
```

---

## Part 8: Compliance Considerations

### 8.1 GDPR Compliance Checklist

| Requirement | Implementation |
|-------------|----------------|
| Right to access | Export all memories as JSON/Markdown |
| Right to rectification | Edit memory content, regenerate embeddings |
| Right to erasure | Full deletion cascade with audit log |
| Right to portability | Standard export format (JSON) |
| Data minimization | Retention tiers, auto-expiration |
| Purpose limitation | Category-based access controls |
| Storage limitation | Configurable retention policies |

### 8.2 Audit Trail Design

**What to log:**
- Deletion timestamp
- Scope of deletion (hashed)
- Number of items affected
- Whether user confirmed
- Request reference number

**What NOT to log:**
- Actual content deleted
- Reconstructable identifiers
- Entity names in plaintext

### 8.3 Data Subject Access Requests (DSAR)

When a user requests their data:

```python
async def export_user_data(user_id: str) -> DataExport:
    """Generate GDPR-compliant data export."""
    
    memories = await db.query("""
        SELECT id, content_encrypted, created_at, sensitivity_level
        FROM memories WHERE user_id = ?
    """, user_id)
    
    # Decrypt and format
    export = {
        "export_date": datetime.now().isoformat(),
        "user_id": user_id,
        "memories": [],
        "deletion_history": [],
        "retention_settings": {}
    }
    
    for mem in memories:
        content = decrypt(mem.content_encrypted)
        export["memories"].append({
            "id": mem.id,
            "content": content,
            "created": mem.created_at,
            "category": mem.sensitivity_level
        })
    
    # Include deletion history (without deleted content)
    deletions = await db.query("""
        SELECT * FROM deletion_log WHERE user_id = ?
    """, user_id)
    
    for d in deletions:
        export["deletion_history"].append({
            "date": d.deleted_at,
            "type": d.deletion_type,
            "count": d.memory_count
        })
    
    return export
```

### 8.4 Cross-Border Considerations

If memories are stored in different jurisdictions:

- **EU data stays in EU** (or adequate protection)
- **Deletion must propagate** to all replicas
- **Document data flows** for compliance
- **Consider data localization** requirements

---

## Part 9: Recommendations

### 9.1 Immediate Implementation

1. **Add entity extraction** to all memory writes
2. **Implement provenance tracking** for consolidated memories
3. **Create deletion_log table** with content-free audit
4. **Build "forget entity" command** with confirmation flow
5. **Add sensitivity classification** to memory ingestion

### 9.2 Retention Policy Defaults

| Category | Default Retention | User Override |
|----------|-------------------|---------------|
| Health | 30 days | Can extend to 1 year |
| Financial | 30 days | Can extend to 1 year |
| Location | Session only | Can enable 7-day |
| Relationships | Indefinite | Can set any limit |
| Preferences | Indefinite | Can set any limit |
| Conversation context | 7 days | Can extend to 90 days |

### 9.3 Monthly Memory Review

Implement automated prompts:

```
Monthly Privacy Check:

📊 Memory Statistics:
- Total memories: 342
- Health-related: 12 (oldest: 45 days ago)
- Financial: 3 (oldest: 28 days ago)
- Expiring soon: 8 memories in next 7 days

🔒 Recommended Actions:
- 4 health memories exceed 30-day default
- Review or confirm retention?

[Review Now] [Keep All] [Apply Defaults]
```

### 9.4 Technical Debt to Avoid

1. **Don't store plaintext sensitive data** — encrypt from day one
2. **Don't skip provenance** — it's required for proper cascading
3. **Don't log deleted content** — creates compliance nightmare
4. **Don't rely on soft deletes** — GDPR requires actual erasure
5. **Don't forget backups** — deletion must propagate

---

## Part 10: Open Questions

### 10.1 Inference Deletion

If the system inferred something from deleted data, should that inference be deleted?

**Example:**
```
Deleted: "User mentioned they have diabetes"
Inference: "User interested in low-sugar recipes" 
          (derived from diabetes context)
```

**Options:**
1. Delete all downstream inferences (strictest)
2. Delete only inferences that explicitly reference source
3. Keep inferences, delete provenance link (weakest)

**Recommendation:** Option 2 — delete inferences that mention or directly derive from deleted data, but allow general behavioral patterns to persist if they're independently supportable.

### 10.2 Shared Memories

If a memory involves multiple users:

```
Memory: "User A told me that User B has diabetes"
```

If User B requests deletion:
- Must delete the memory (B's health data)
- But User A may want context preserved
- **Resolution:** Delete, notify User A that a shared context was affected

### 10.3 Fine-Tuning Concerns

If the system ever fine-tunes on user data:
- Vector deletion is insufficient
- Full model unlearning is impractical
- **Recommendation:** Never fine-tune on deletable data
- Or: Maintain the ability to retrain from scratch

---

## Conclusion

Implementing "right to be forgotten" in AI memory systems requires:

1. **Architectural forethought** — forgetting must be designed in, not bolted on
2. **Provenance tracking** — you can't delete what you can't trace
3. **Tiered retention** — not all data is equal; treat it accordingly
4. **Clear user controls** — forgetting should be easy and verifiable
5. **Audit without content** — prove compliance without creating new privacy risks

The key insight is that retrieval-based memory systems (unlike fine-tuned models) **can** truly forget — delete the records, regenerate embeddings, cascade through consolidated memories. This is achievable today with careful schema design and deletion logic.

Privacy isn't a feature; it's a constraint that shapes the entire architecture.

---

*Research completed for AI Continuity Framework, Iteration 2*
