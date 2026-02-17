# User Memory Override: Correction, Deletion, and Control Patterns

*Research Document — Iteration 2*  
*Date: 2026-02-17*  
*Focus: UX patterns and technical implementation for user memory management*

---

## Executive Summary

User control over AI memory is not optional—it's a core requirement for trust, legal compliance (GDPR Article 17), and genuine personalization. This document analyzes how users naturally express memory corrections, deletion requests, and review desires, then proposes implementation patterns.

**Key findings:**
- Natural language memory management is essential; explicit UI is supplementary
- Corrections require confidence-scored memory identification
- Deletions should be soft by default with user-controlled hard delete
- Memory dashboards improve trust but aren't frequently used
- Undo/recovery is a trust-building feature users rarely use but expect to exist

---

## 1. Existing System Analysis

### 1.1 ChatGPT Memory Management

OpenAI's approach (as of early 2026) provides the most mature reference implementation:

**Two-layer memory:**
- **Saved Memories:** Explicit facts user asked to remember
- **Chat History Reference:** Implicit learning from past conversations

**User controls:**
1. **In-conversation management:**
   - "Remember that I prefer X"
   - "Forget that I said Y"
   - "What do you remember about me?"

2. **Settings UI (Settings > Personalization > Manage Memories):**
   - List view of all saved memories
   - Per-memory delete button
   - "Delete all" option
   - Search and sort capabilities
   - **NEW:** Version history with restore

3. **Key UX patterns:**
   - "Memory updated" notification appears in chat
   - Hover → "Manage memories" link for quick access
   - Temporary Chat mode bypasses memory entirely
   - Deleted memories retained 30 days for safety/debugging

**What works well:**
- Natural language commands are intuitive
- Inline notifications build transparency
- Temporary Chat is a clear escape hatch

**What's problematic:**
- No category-based deletion ("forget work stuff")
- Hard to trace *where* a memory came from
- "Chat History Reference" is opaque—can't see what it inferred
- Deletion from memory doesn't delete the source chat

### 1.2 GDPR Right to Erasure Framework

Article 17 provides legal backbone for memory deletion:

**When users can request erasure:**
- Personal data no longer necessary
- User withdraws consent
- User objects to processing
- Data was unlawfully processed

**When organizations can refuse:**
- Legal obligations require retention
- Public interest purposes
- Establishment of legal claims

**Implementation requirements:**
- Response within 30 days
- Verify identity before acting
- "Reasonable steps" to erase from downstream systems
- Document deletion for compliance

**Key insight for AI:** GDPR contemplates *derived data*—if you infer "user is a Python developer" from conversations, that inference is also personal data that can be subject to erasure requests.

### 1.3 Other Systems (Observed Patterns)

**Replika:**
- Memory diary visible to users
- Tap to delete individual memories
- No bulk operations
- No undo

**Character.AI:**
- Memory settings per character
- Global "clear all memories" option
- No granular management

**Pi (Inflection):**
- Implicit memory only
- Limited user visibility
- "I'd prefer not to discuss X" respected as soft boundary

**Common gaps across systems:**
- Category-based deletion
- Source tracing
- Propagation to derived memories
- Recovery mechanisms

---

## 2. Natural Language Commands to Recognize

### 2.1 Explicit Correction Patterns

Users express corrections in varied ways. System must recognize all of these:

**Direct corrections:**
- "That's wrong, I actually meant X"
- "No, I said Y, not Z"
- "Correct that—my name is..."
- "Update my preference to..."
- "I changed my mind about..."
- "Actually, I'm not X anymore, I'm now Y"

**Implicit corrections (context-dependent):**
- "It's X, not Y" (after AI uses wrong value)
- "My NEW address is..." (implies old address should update)
- "I've started doing X instead of Y now"
- "That was the old one, the new one is..."

**Preference overrides:**
- "From now on, always..."
- "Stop assuming I..."
- "I'd prefer if you..."
- "Don't ever say/do X again"

**Implementation:**
```python
CORRECTION_TRIGGERS = [
    r"that's (wrong|incorrect|not right)",
    r"(actually|no,?|wait,?) I (meant|said|am|have|live)",
    r"correct (that|this|the)",
    r"update my (preference|info|name|address)",
    r"I (changed my mind|don't .* anymore|now prefer)",
    r"my new .* is",
    r"from now on",
    r"stop (thinking|assuming|saying)",
    r"don't ever .* again",
]
```

### 2.2 Deletion Request Patterns

**Explicit forget commands:**
- "Forget that I said X"
- "Don't remember our conversation about Y"
- "Delete what you know about Z"
- "Erase my [topic] information"
- "Never mention X again"
- "Pretend I never told you about..."

**Scope indicators:**
- "Forget EVERYTHING about X" (topic-scoped)
- "Forget what I said TODAY/this week" (time-scoped)
- "Start fresh" / "Clean slate" (full reset)
- "Forget that last thing" (recency-based)

**Soft boundaries (not deletion, but suppression):**
- "Let's not talk about X"
- "I'd rather you didn't bring up Y"
- "Skip anything about Z"

**Implementation:**
```python
DELETION_TRIGGERS = [
    r"forget (that|what|everything)",
    r"don't remember",
    r"delete (what|my|that)",
    r"erase (my|that|the)",
    r"never mention .* again",
    r"pretend I never",
    r"start fresh|clean slate|wipe",
    r"forget (that last|the last)",
]

SOFT_BOUNDARY_TRIGGERS = [
    r"let's not talk about",
    r"(I'd rather|prefer) you didn't (bring up|mention)",
    r"skip (anything|everything) about",
    r"avoid (mentioning|discussing)",
]
```

### 2.3 Memory Review Patterns

**Full review requests:**
- "What do you remember about me?"
- "What have you learned about me?"
- "Show me my memories"
- "List what you know about me"

**Scoped queries:**
- "What do you know about my work?"
- "Do you remember my [specific thing]?"
- "What preferences have I told you?"
- "What did we discuss about X?"

**Verification queries:**
- "Do you still remember X?"
- "Is X still correct?"
- "Check my preferences"

**Implementation:**
```python
REVIEW_TRIGGERS = [
    r"what do you (remember|know) about me",
    r"what have you learned",
    r"show me (my|the) memor",
    r"list what you know",
    r"do you remember (my|that|when)",
    r"is .* still (correct|right|true)",
    r"check my (preferences|info)",
    r"what preferences",
]
```

### 2.4 Bulk Operation Patterns

**Time-based:**
- "Forget everything from last week"
- "Clear memories before [date]"
- "Only remember things from this year"

**Category-based:**
- "Forget all work-related memories"
- "Delete my health information"
- "Clear everything about [project name]"

**Selective retention:**
- "Only keep memories about X"
- "Keep just my preferences, forget conversations"

**Implementation:**
```python
BULK_TRIGGERS = [
    r"forget (everything|all|all memories) from",
    r"clear memories (before|after|from)",
    r"forget all (\w+)-related",
    r"delete (my|all) (\w+) (info|information|memories)",
    r"only (keep|remember)",
    r"keep just (my|the)",
]
```

### 2.5 Recovery Patterns

**Undo requests:**
- "Actually, restore what you forgot"
- "I didn't mean to delete that"
- "Undo the last forget"
- "Bring back my [topic] memories"

**Version queries:**
- "What was my preference before I changed it?"
- "What did you used to know about X?"
- "Show me deleted memories"

---

## 3. Technical Implementation

### 3.1 Memory Identification Problem

**Challenge:** When user says "forget what I told you about work," how do we identify which memories match?

**Proposed solution: Multi-signal scoring**

```python
def identify_memories_to_modify(user_request: str, memories: List[Memory]) -> List[ScoredMemory]:
    """
    Returns memories ranked by likelihood of being the target.
    """
    results = []
    
    # Extract target from request
    target = extract_target_entity(user_request)  # e.g., "work", "my address"
    
    for memory in memories:
        score = 0.0
        
        # Semantic similarity
        semantic_sim = cosine_similarity(
            embed(target), 
            embed(memory.content)
        )
        score += semantic_sim * 0.4
        
        # Keyword match
        if target.lower() in memory.content.lower():
            score += 0.3
        
        # Recency (recent mentions more likely targets)
        recency_weight = 0.99 ** hours_since_last_access(memory)
        score += recency_weight * 0.2
        
        # Category match (if categorized)
        if memory.category and target.lower() in memory.category.lower():
            score += 0.1
        
        results.append(ScoredMemory(memory, score))
    
    return sorted(results, key=lambda x: x.score, reverse=True)
```

**Confidence thresholds:**
- Score > 0.8: Auto-modify with confirmation
- Score 0.5-0.8: Ask user to confirm ("Did you mean X?")
- Score < 0.5: Ask for clarification ("I'm not sure which memory you mean...")

### 3.2 Soft Delete vs. Hard Delete

**Recommendation: Soft delete by default, hard delete on request**

```python
@dataclass
class Memory:
    id: str
    content: str
    # ... other fields
    
    # Deletion state
    deleted_at: Optional[datetime] = None
    deletion_type: str = "active"  # "active", "soft_deleted", "hard_deleted"
    deletion_reason: Optional[str] = None
    deletion_scope: Optional[str] = None  # "user_request", "system_cleanup", "gdpr"
    
    # Recovery
    recoverable_until: Optional[datetime] = None  # soft delete expiry
    pre_deletion_snapshot: Optional[str] = None  # for recovery

def soft_delete(memory: Memory, reason: str, retention_days: int = 30):
    """Mark memory as deleted but retain for recovery period."""
    memory.deleted_at = datetime.utcnow()
    memory.deletion_type = "soft_deleted"
    memory.deletion_reason = reason
    memory.recoverable_until = datetime.utcnow() + timedelta(days=retention_days)
    memory.pre_deletion_snapshot = memory.content

def hard_delete(memory: Memory, reason: str):
    """Permanently remove memory content."""
    # Log deletion for compliance (without content)
    log_deletion_event(memory.id, reason)
    
    # Clear content
    memory.content = "[DELETED]"
    memory.deletion_type = "hard_deleted"
    memory.deleted_at = datetime.utcnow()
    memory.pre_deletion_snapshot = None

def recover_memory(memory: Memory) -> bool:
    """Attempt to recover a soft-deleted memory."""
    if memory.deletion_type != "soft_deleted":
        return False
    if memory.recoverable_until and datetime.utcnow() > memory.recoverable_until:
        return False
    
    memory.content = memory.pre_deletion_snapshot
    memory.deleted_at = None
    memory.deletion_type = "active"
    memory.pre_deletion_snapshot = None
    return True
```

**User-facing distinction:**
- "Forget X" → Soft delete (recoverable)
- "Permanently delete X" / "Delete and don't keep a copy" → Hard delete
- "Delete under GDPR" → Hard delete with compliance logging

### 3.3 Correction Propagation

**Problem:** If user says "I live in Austin, not Dallas," and we have:
1. Memory: "User lives in Dallas"
2. Derived memory: "User is in Texas (central timezone)"
3. Preference: "Coffee shops → filter by Dallas"

**Which should update?**

**Proposed approach: Dependency tracking**

```python
@dataclass
class Memory:
    id: str
    content: str
    # ... other fields
    
    # Dependency tracking
    source_memory_ids: List[str] = field(default_factory=list)  # What this was derived from
    derived_memory_ids: List[str] = field(default_factory=list)  # What was derived from this

def correct_memory_with_propagation(
    memory_id: str, 
    correction: str, 
    propagation_mode: str = "ask"  # "none", "ask", "auto"
) -> CorrectionResult:
    """
    Apply correction and optionally propagate to derived memories.
    """
    memory = get_memory(memory_id)
    old_value = memory.content
    
    # Apply correction to source
    memory.content = apply_correction(old_value, correction)
    memory.last_modified = datetime.utcnow()
    memory.version += 1
    save_version_history(memory_id, old_value)
    
    result = CorrectionResult(corrected=[memory_id], propagated=[])
    
    # Handle derived memories
    if propagation_mode == "none":
        return result
    
    derived = get_derived_memories(memory_id)
    if not derived:
        return result
    
    if propagation_mode == "auto":
        # Automatically update derived memories that reference old value
        for dm in derived:
            if references_value(dm.content, old_value):
                dm.content = update_reference(dm.content, old_value, correction)
                result.propagated.append(dm.id)
    
    elif propagation_mode == "ask":
        # Flag for user confirmation
        result.needs_confirmation = [
            PropagationCandidate(dm.id, dm.content, proposed_update)
            for dm in derived
            if references_value(dm.content, old_value)
        ]
    
    return result
```

**UX for propagation:**
```
User: "I live in Austin, not Dallas"

AI: "Got it, I've updated your location to Austin. I also have a note 
that you prefer coffee shops in Dallas—should I update that to Austin too?"

User: "Yes, update everything"

AI: "Done. I've updated 3 related memories to reflect Austin."
```

### 3.4 Versioning and Rollback

**Every memory modification creates a version:**

```python
@dataclass
class MemoryVersion:
    memory_id: str
    version: int
    content: str
    timestamp: datetime
    change_type: str  # "created", "updated", "corrected", "soft_deleted", "restored"
    change_reason: Optional[str] = None

def get_memory_history(memory_id: str) -> List[MemoryVersion]:
    """Return all versions of a memory, newest first."""
    return db.query(MemoryVersion).filter_by(memory_id=memory_id).order_by(desc("version")).all()

def restore_to_version(memory_id: str, target_version: int) -> bool:
    """Restore a memory to a previous version."""
    memory = get_memory(memory_id)
    version = get_version(memory_id, target_version)
    
    if not version:
        return False
    
    # Save current as new version before restoring
    save_version(memory, change_type="pre_restore")
    
    # Restore
    memory.content = version.content
    memory.version += 1
    save_version(memory, change_type="restored", change_reason=f"Restored to v{target_version}")
    
    return True
```

**UX for version history:**
```
User: "What did you used to know about my job?"

AI: "Here's the history of your job information:
• Current: Software Engineer at Acme Corp (since Jan 15)
• Previous: Freelance Developer (Dec 3 - Jan 15)  
• Original: Junior Developer at Startup Inc (first saved Oct 10)

Would you like me to restore any previous version?"
```

### 3.5 Bulk Operations Implementation

```python
def bulk_delete_memories(
    scope: BulkScope,
    confirm: bool = True
) -> BulkDeleteResult:
    """
    Delete memories matching a scope definition.
    """
    # Build query based on scope type
    if scope.type == "time_range":
        memories = get_memories_in_range(scope.start_date, scope.end_date)
    elif scope.type == "category":
        memories = get_memories_by_category(scope.category)
    elif scope.type == "topic":
        memories = search_memories_by_topic(scope.topic, threshold=0.7)
    elif scope.type == "all":
        memories = get_all_memories()
    
    if confirm:
        return BulkDeleteResult(
            preview=True,
            count=len(memories),
            sample=memories[:5],
            confirmation_required=True
        )
    
    # Actually delete
    deleted_ids = []
    for memory in memories:
        soft_delete(memory, reason=f"bulk_delete:{scope.type}")
        deleted_ids.append(memory.id)
    
    return BulkDeleteResult(
        preview=False,
        count=len(deleted_ids),
        deleted_ids=deleted_ids
    )
```

**Confirmation flow:**
```
User: "Forget everything about my old job at Startup Inc"

AI: "I found 12 memories related to 'Startup Inc':
• 5 about daily work tasks
• 3 about projects you worked on
• 2 about coworkers
• 2 about company events

This will soft-delete them (recoverable for 30 days). Proceed?"

User: "Yes"

AI: "Done. 12 memories about Startup Inc have been removed."
```

---

## 4. Memory Dashboard Features

### 4.1 Core Views

**Memory List View:**
- All memories in reverse chronological order
- Search bar with semantic + keyword search
- Category/topic filters
- Date range filter
- Show/hide deleted memories toggle

**Memory Detail View:**
- Full memory content
- Source: which conversation/event created this
- Derived from: parent memories (if any)
- Used by: derived memories (if any)
- Version history timeline
- Edit / Delete / Restore actions

**Category View:**
- Memories grouped by auto-detected category
- Category management (merge, rename, delete category)
- Per-category bulk operations

### 4.2 Dashboard Mockup

```
┌──────────────────────────────────────────────────────────────────┐
│  🧠 Memory Dashboard                           [Search...    🔍] │
├──────────────────────────────────────────────────────────────────┤
│  Filters: [All ▼]  [Date range ▼]  [☐ Show deleted]             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📁 Preferences (12)                                    [⋯ menu]│
│  ├─ 🏠 Lives in Austin, TX                      Jan 15  [✏️ 🗑️]│
│  ├─ ☕ Prefers dark roast coffee                 Jan 10  [✏️ 🗑️]│
│  ├─ 🖥️ Uses VS Code for development              Dec 22  [✏️ 🗑️]│
│  └─ ... 9 more                                                   │
│                                                                  │
│  📁 Work (8)                                            [⋯ menu]│
│  ├─ 💼 Software Engineer at Acme Corp           Jan 15  [✏️ 🗑️]│
│  ├─ 📊 Working on Project Phoenix               Jan 12  [✏️ 🗑️]│
│  └─ ... 6 more                                                   │
│                                                                  │
│  📁 Personal (15)                                       [⋯ menu]│
│  └─ ...                                                          │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Recently Deleted (3)                    [Restore All] [Purge]   │
│  └─ 🗑️ [Startup Inc job details]          deleted Jan 15         │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  [Export All]  [Import]  [Delete All Memories]                   │
└──────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Dashboard Interactions

**Inline editing:**
- Click on memory text to edit directly
- Auto-save with version created
- Undo button appears briefly after edit

**Bulk selection:**
- Checkboxes for multi-select
- "Select all in category"
- Bulk delete / bulk export

**Search with context:**
- When searching, show snippet of source conversation
- "Jump to source" button

**Recovery view:**
- Recently deleted items with countdown to permanent deletion
- One-click restore
- Option to permanently purge immediately

### 4.4 Privacy Controls Panel

```
┌──────────────────────────────────────────────────────────────────┐
│  🔒 Memory Privacy Controls                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Memory Collection                                               │
│  ○ Full memory (recommended)                                     │
│  ○ Explicit only (only what I ask you to remember)              │
│  ○ Disabled (temporary chats only)                               │
│                                                                  │
│  Sensitive Topics                                                │
│  ☑ Never remember health information                             │
│  ☑ Never remember financial details                              │
│  ☐ Never remember work information                               │
│  [+ Add custom topic to exclude]                                 │
│                                                                  │
│  Data Retention                                                  │
│  Deleted memory retention: [30 days ▼]                           │
│  Auto-forget threshold: [90 days inactive ▼]                     │
│                                                                  │
│  Export & Portability                                            │
│  [Download All Memories (JSON)]                                  │
│  [Request Data Deletion (GDPR)]                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Failure Modes and Mitigations

### 5.1 Wrong Memory Modified

**Scenario:** User says "forget my address" but system deletes phone number.

**Causes:**
- Ambiguous reference
- Low confidence match selected anyway
- Multiple memories with similar content

**Mitigations:**
- Always confirm before modifying when confidence < 0.8
- Show preview: "I'm about to delete: [memory]. Is that right?"
- Undo prominently offered after modification
- Use version history for recovery

### 5.2 Incomplete Deletion

**Scenario:** User says "forget everything about X" but some memories remain.

**Causes:**
- Indirect references not detected
- Derived memories not linked
- Semantic search misses edge cases

**Mitigations:**
- Multi-pass search (semantic + keyword + category)
- Explicit derived memory tracking
- Post-deletion verification query
- "Did I miss anything?" follow-up prompt

### 5.3 Zombie Memories

**Scenario:** Deleted memory keeps being referenced because derived facts remain.

**Causes:**
- No propagation to derived memories
- Cached embeddings still match
- Summary documents not updated

**Mitigations:**
- Dependency tracking (source → derived)
- Propagation prompts on deletion
- Periodic consistency checks
- Re-index embeddings after deletion

### 5.4 Recovery Too Late

**Scenario:** User wants to recover a memory but retention period expired.

**Causes:**
- User didn't realize deletion was permanent
- Retention period too short
- No warning before expiry

**Mitigations:**
- Email/notification before permanent deletion
- Configurable retention periods
- "Are you sure?" for hard delete
- Extended retention for important memories

### 5.5 Privacy Leakage

**Scenario:** Deleted memory content appears in AI response.

**Causes:**
- Source conversation still in history
- Memory in cached context
- Fine-tuning or training included deleted data

**Mitigations:**
- Clear distinction: delete memory ≠ delete source
- Prompt user to delete source conversation too
- Never train on explicitly deleted data
- Cache invalidation on deletion

---

## 6. Recommendations

### 6.1 Natural Language as Primary Interface

- Support rich natural language commands (see Section 2)
- Explicit UI (dashboard) is supplementary, not primary
- Proactively teach users: "You can always ask me what I remember"
- Conversational corrections feel more natural than form editing

### 6.2 Transparency Over Convenience

- Always confirm deletions (with option to "don't ask again")
- Show what will be affected before bulk operations
- Explain propagation: "This will also affect X memories"
- Provide source tracing: "I remember this from our conversation on [date]"

### 6.3 Soft Delete by Default

- All deletions recoverable for 30 days minimum
- Hard delete requires explicit confirmation
- Recovery is one-click from dashboard
- Notify before permanent expiry

### 6.4 Track Dependencies

- Link memories to their sources
- Track derived memories
- Enable propagation decisions
- Visualize memory graph if needed

### 6.5 Version Everything

- Every change creates a version
- Users can browse history
- "What did you used to think about X?" is answerable
- Easy rollback to any previous state

### 6.6 Respect Boundaries

- "Don't bring up X" creates soft suppression, not deletion
- Distinguish "forget" from "don't mention"
- Allow topic-level exclusions
- Honor sensitivity patterns (health, finance)

---

## 7. Implementation Phases

### Phase 1: Basic Override (Week 1-2)
- [ ] Implement natural language command detection
- [ ] Single memory correction and deletion
- [ ] "What do you remember?" query
- [ ] Soft delete with 30-day retention

### Phase 2: Confirmation UX (Week 2-3)
- [ ] Confidence-based confirmation prompts
- [ ] Preview before modification
- [ ] Undo capability (5 minutes after change)
- [ ] Inline "Memory updated" notifications

### Phase 3: Bulk Operations (Week 3-4)
- [ ] Time-scoped deletion
- [ ] Category-scoped deletion
- [ ] Topic-scoped deletion (semantic search)
- [ ] Preview and confirmation flow

### Phase 4: Dashboard (Week 4-5)
- [ ] Memory list view with search
- [ ] Category grouping
- [ ] Delete/restore from UI
- [ ] Recently deleted view

### Phase 5: Advanced Features (Week 5-6)
- [ ] Version history per memory
- [ ] Dependency tracking
- [ ] Propagation options
- [ ] Export/import capabilities

### Phase 6: Privacy Controls (Week 6-7)
- [ ] Sensitive topic exclusions
- [ ] Auto-forget thresholds
- [ ] GDPR deletion workflow
- [ ] Privacy settings panel

---

## 8. Summary

User memory override isn't just a feature—it's a trust mechanism. Users need to feel in control of what an AI knows about them, how that knowledge is used, and the ability to correct or remove it at will.

**Core principles:**
1. **Natural language first:** Users shouldn't need a UI to manage memories
2. **Confirm before acting:** Especially for deletions and bulk operations
3. **Soft delete by default:** Mistakes are recoverable
4. **Track everything:** Sources, derivations, versions
5. **Transparency builds trust:** Show your work, cite sources

**Key technical decisions:**
- Multi-signal scoring for memory identification
- Dependency tracking for propagation
- Version history for rollback
- Configurable retention periods
- Clear soft vs. hard delete semantics

The goal is for memory management to feel effortless—corrections happen conversationally, mistakes are fixable, and users always know what the AI knows about them.

---

## References

1. OpenAI. (2026). "Memory FAQ." OpenAI Help Center.
2. GDPR Article 17 - Right to erasure ('right to be forgotten')
3. Park, J. S., et al. (2023). "Generative Agents: Interactive Simulacra of Human Behavior."
4. Packer, C., et al. (2023). "MemGPT: Towards LLMs as Operating Systems."
5. Nielsen Norman Group. (2023). "User Control and Freedom in AI Interfaces."
6. Iteration 1 Research: Memory Consolidation Algorithms (internal)

---

*Document complete. Ready for implementation planning.*