# Memory Versioning: Git for AI Memories

*Research Document — Iteration 3*  
*Date: 2026-02-17*  
*Focus: Version control architecture for AI memory systems*

---

## Executive Summary

Should AI memory be version-controlled like code? This research explores the concept of treating AI memories as first-class versioned entities—enabling rollback, branching, temporal queries, and evolution tracking.

**Key findings:**

1. **Event sourcing** is the optimal foundation—store memory changes as immutable events rather than mutable state
2. **Full version history** is valuable but expensive; recommend **tiered retention** (detailed recent, compressed historical)
3. **Branching is powerful but confusing**—reserve for advanced users; most need simple "checkpoint and restore"
4. **Temporal queries** ("what did you know 6 months ago?") are uniquely valuable for AI systems
5. **Storage overhead** is manageable with compression; ~2-5x raw memory size for full history

**Recommendation:** Implement event-sourced memory with periodic snapshots, simple checkpoint/restore UX, and optional branching for power users.

---

## Part 1: Why Version Control for Memories?

### 1.1 The Problem with Mutable Memory

Current AI memory systems treat memory as mutable state:
- Memories are created, updated, deleted
- Previous versions are lost
- No audit trail of how understanding evolved
- Corrections obliterate history

This mirrors early file systems before version control—functional but limited.

### 1.2 Human Memory Doesn't Work This Way

Interestingly, human memory is closer to event-sourced than mutable:

- **Memories layer**—we don't "overwrite" old memories, we add new ones that override
- **Context-dependent retrieval**—we can sometimes access "old beliefs" we've updated
- **Temporal awareness**—we know that we "used to think" something different
- **Reconstruction**—each recall reconstructs from fragments, not retrieving fixed records

A versioned AI memory system could capture similar temporal awareness.

### 1.3 Use Cases That Demand Versioning

| Scenario | Why Versioning Helps |
|----------|---------------------|
| "Undo the last week of memory" | User shared something during a bad period; clean rollback |
| "What did you know about me 6 months ago?" | Temporal queries for self-reflection |
| "I was wrong about that project—forget everything since January" | Selective temporal deletion |
| "Create a fresh start without losing everything" | Branch/snapshot before major changes |
| "Something went wrong with your memory" | Debug by diffing versions |
| "Show me how your understanding of me has evolved" | Memory archaeology |
| "Export my AI state for backup" | Snapshot for portability |
| "What did I tell you about X before I corrected it?" | Access superseded information |

---

## Part 2: Technical Architectures

### 2.1 Architecture Comparison

Three primary patterns for versioning data:

#### Option A: Full Snapshot Per Version

```
v1: { full memory state }
v2: { full memory state }
v3: { full memory state }
```

**Pros:**
- Instant access to any version
- Simple implementation
- Fast temporal queries

**Cons:**
- Massive storage overhead (O(n×m) where n=versions, m=memory size)
- Redundant storage of unchanged data
- Not practical at scale

**Verdict:** Only viable for very small memory sets or infrequent snapshots.

#### Option B: Event Sourcing (Append-Only Log)

```
event_1: { type: "create", memory_id: "m1", content: "..." }
event_2: { type: "create", memory_id: "m2", content: "..." }
event_3: { type: "update", memory_id: "m1", content: "..." }
event_4: { type: "delete", memory_id: "m2" }
```

**Pros:**
- Complete audit trail
- Storage-efficient for frequent changes
- Can reconstruct any point in time
- Natural support for branching/merging
- Aligns with CQRS patterns

**Cons:**
- Replay required to get current state (mitigated by caching)
- Query complexity for "current state"
- Growing log requires compaction strategy

**Verdict:** Best foundation for full versioning. Industry-proven (banking, healthcare, event-driven systems).

#### Option C: Snapshot + Delta Chain (Git-like)

```
snapshot_v10: { full state at v10 }
delta_11: { changes from v10 → v11 }
delta_12: { changes from v11 → v12 }
snapshot_v20: { full state at v20 }
delta_21: { changes from v20 → v21 }
```

**Pros:**
- Balanced storage/performance tradeoff
- Fast access to recent versions
- Periodic snapshots limit replay cost

**Cons:**
- More complex implementation
- Need to decide snapshot frequency
- Deltas can accumulate between snapshots

**Verdict:** Excellent hybrid. Git uses reverse deltas (current state is always fast); we'd use forward deltas (older states require replay).

### 2.2 Recommended Architecture: Event Sourcing + Snapshots

```
┌──────────────────────────────────────────────────────────────┐
│                    MEMORY VERSION STORE                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────────────────────────────┐  │
│  │  SNAPSHOTS  │    │           EVENT LOG                 │  │
│  │             │    │                                     │  │
│  │  snap_1000  │    │  e1: create(m1, "Leo likes...")     │  │
│  │  snap_2000  │    │  e2: create(m2, "Meeting on...")    │  │
│  │  snap_3000  │    │  e3: update(m1, "Leo prefers...")   │  │
│  │             │    │  e4: delete(m2, reason="user")      │  │
│  │  (every N   │    │  e5: merge(m1+m3 → m4)              │  │
│  │   events)   │    │  e6: consolidate(m1, strength+0.1)  │  │
│  └─────────────┘    │  ...                                │  │
│         │           └─────────────────────────────────────┘  │
│         │                          │                         │
│         ▼                          ▼                         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              CURRENT STATE CACHE                        │ │
│  │  (materialized view of latest state for fast queries)   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Event Schema

```typescript
interface MemoryEvent {
  id: string;                    // Unique event ID
  timestamp: Date;               // When event occurred
  version: number;               // Sequential version number
  
  type: MemoryEventType;         // create | update | delete | merge | consolidate | branch | checkpoint
  memoryId: string;              // Which memory affected
  
  payload: {
    content?: string;            // For create/update
    metadata?: object;           // For any event
    previousContent?: string;    // For update (enables undo without replay)
    reason?: string;             // Why this change
    source?: string;             // What triggered this (conversation ID, user action, system)
  };
  
  context: {
    sessionId?: string;          // Which session
    conversationId?: string;     // Which conversation
    triggeredBy?: string;        // user | system | consolidation
  };
  
  checksum?: string;             // For integrity verification
}

type MemoryEventType = 
  | 'create'           // New memory
  | 'update'           // Content changed
  | 'delete'           // Memory removed (soft or hard)
  | 'restore'          // Previously deleted memory restored
  | 'merge'            // Multiple memories combined
  | 'split'            // Memory divided into multiple
  | 'consolidate'      // Strength/metadata updated
  | 'reinforce'        // Accessed/recalled (strength boost)
  | 'decay'            // Periodic decay event
  | 'checkpoint'       // User-initiated save point
  | 'branch'           // Branching point
  | 'tag'              // Label attached
  | 'move'             // Category/hierarchy change
```

### 2.4 Snapshot Strategy

**When to snapshot:**
1. Every N events (e.g., every 1000 events)
2. Before user-initiated checkpoints
3. Before major operations (bulk delete, consolidation run)
4. Periodically (daily/weekly regardless of event count)

**What's in a snapshot:**
```typescript
interface MemorySnapshot {
  id: string;
  createdAt: Date;
  atEventVersion: number;        // Event version at snapshot time
  
  memories: Memory[];            // Full memory state
  
  metadata: {
    memoryCount: number;
    totalTokens: number;
    topCategories: string[];
    compressionRatio?: number;
  };
  
  // Optional: compressed representations
  compressed?: Buffer;           // gzip/zstd compressed
}
```

**Storage estimate:**
- 10,000 memories × 500 tokens avg = 5M tokens ≈ 20MB raw
- Compressed: ~4MB per snapshot
- 52 weekly snapshots/year: ~200MB
- With tiered retention: ~50MB/year (monthly after 3 months, yearly after 2 years)

---

## Part 3: Core Operations

### 3.1 Temporal Query: "What did you know on date X?"

```python
def get_memory_state_at(target_date: datetime) -> MemoryState:
    # Find nearest snapshot before target
    snapshot = db.snapshots.find_one({
        "createdAt": {"$lte": target_date}
    }, sort=[("createdAt", -1)])
    
    if not snapshot:
        return empty_state()
    
    # Replay events from snapshot to target
    state = snapshot.memories.copy()
    events = db.events.find({
        "version": {"$gt": snapshot.atEventVersion},
        "timestamp": {"$lte": target_date}
    }).sort("version")
    
    for event in events:
        state = apply_event(state, event)
    
    return state

def apply_event(state: MemoryState, event: MemoryEvent) -> MemoryState:
    match event.type:
        case 'create':
            state.add(Memory(id=event.memoryId, content=event.payload.content))
        case 'update':
            state.update(event.memoryId, event.payload.content)
        case 'delete':
            state.remove(event.memoryId)
        case 'merge':
            state.merge_memories(event.payload.sourceIds, event.memoryId)
        # ... handle other event types
    return state
```

**Performance considerations:**
- Cache commonly requested historical states
- Pre-compute snapshots at "interesting" points (major changes, user checkpoints)
- Limit replay depth (if > 10,000 events from snapshot, suggest taking new snapshot)

### 3.2 Rollback: "Undo the last week"

```python
def rollback_to(target_date: datetime, mode: str = "soft") -> RollbackResult:
    current_version = db.events.latest().version
    target_state = get_memory_state_at(target_date)
    current_state = get_current_state()
    
    if mode == "soft":
        # Create new events that reverse changes
        # Preserves full history
        for memory in current_state.memories:
            if memory.id not in target_state.memories:
                emit_event("delete", memory.id, reason="rollback")
            elif memory != target_state.memories[memory.id]:
                emit_event("update", memory.id, 
                          content=target_state.memories[memory.id].content,
                          reason="rollback")
        
        for memory in target_state.memories:
            if memory.id not in current_state.memories:
                emit_event("restore", memory.id)
        
        emit_event("checkpoint", f"rolled_back_from_v{current_version}")
    
    elif mode == "hard":
        # DESTRUCTIVE: Actually remove events after target
        # Use only for privacy/compliance requirements
        db.events.delete_many({"timestamp": {"$gt": target_date}})
        invalidate_snapshots_after(target_date)
        rebuild_cache()
    
    return RollbackResult(
        events_affected=current_version - target_state.version,
        memories_restored=len(target_state.memories - current_state.memories),
        memories_removed=len(current_state.memories - target_state.memories)
    )
```

### 3.3 Diff: "What changed between X and Y?"

```python
def diff_states(from_date: datetime, to_date: datetime) -> MemoryDiff:
    from_state = get_memory_state_at(from_date)
    to_state = get_memory_state_at(to_date)
    
    return MemoryDiff(
        created=[m for m in to_state.memories if m.id not in from_state.memories],
        deleted=[m for m in from_state.memories if m.id not in to_state.memories],
        modified=[
            ModifiedMemory(
                id=m.id,
                before=from_state.memories[m.id].content,
                after=m.content,
                changes=compute_text_diff(from_state.memories[m.id].content, m.content)
            )
            for m in to_state.memories 
            if m.id in from_state.memories and m != from_state.memories[m.id]
        ],
        unchanged_count=len([
            m for m in to_state.memories 
            if m.id in from_state.memories and m == from_state.memories[m.id]
        ])
    )
```

### 3.4 Checkpoint: "Save this state"

```python
def create_checkpoint(name: str, description: str = "") -> Checkpoint:
    current_version = db.events.latest().version
    
    # Create snapshot
    snapshot = create_snapshot(current_version)
    
    # Create checkpoint event
    checkpoint = emit_event("checkpoint", payload={
        "name": name,
        "description": description,
        "snapshotId": snapshot.id
    })
    
    return Checkpoint(
        id=checkpoint.id,
        name=name,
        version=current_version,
        snapshotId=snapshot.id,
        createdAt=datetime.now()
    )
```

**Auto-checkpointing triggers:**
- Before bulk operations
- Before user requests "forget X"
- Weekly automatic checkpoint
- Before migration/upgrade

---

## Part 4: Branching and Merging

### 4.1 When Branching Makes Sense

Branching is powerful but complex. Recommended use cases:

1. **"What if" exploration** — Try a different memory configuration without committing
2. **A/B testing** — Run parallel memory strategies
3. **Clean start with fallback** — Branch, start fresh, optionally merge back
4. **Multi-context personas** — Different memory branches for work/personal
5. **Recovery staging** — Test rollback on a branch before applying

### 4.2 Branching Implementation

```python
def create_branch(name: str, from_version: int = None) -> Branch:
    """Create a new branch from current or specified version."""
    if from_version is None:
        from_version = db.events.latest().version
    
    # Ensure snapshot exists at branch point
    ensure_snapshot_at(from_version)
    
    branch = Branch(
        id=generate_id(),
        name=name,
        parentBranch=get_current_branch(),
        branchPoint=from_version,
        createdAt=datetime.now()
    )
    
    db.branches.insert(branch)
    return branch

def switch_branch(branch_id: str):
    """Switch active memory context to different branch."""
    branch = db.branches.find_one({"id": branch_id})
    set_current_branch(branch)
    rebuild_cache_for_branch(branch)

def get_events_for_branch(branch: Branch) -> List[MemoryEvent]:
    """Get events visible to a branch (includes parent events up to branch point)."""
    events = []
    
    # Get events from parent branches up to branch point
    current = branch
    while current:
        parent_events = db.events.find({
            "branchId": current.parentBranch,
            "version": {"$lte": current.branchPoint}
        })
        events.extend(parent_events)
        current = get_branch(current.parentBranch)
    
    # Get events on this branch
    branch_events = db.events.find({"branchId": branch.id})
    events.extend(branch_events)
    
    return sorted(events, key=lambda e: e.version)
```

### 4.3 Merging Branches

```python
def merge_branch(source_branch: str, target_branch: str = "main") -> MergeResult:
    """Merge memories from source branch into target."""
    source_state = get_branch_state(source_branch)
    target_state = get_branch_state(target_branch)
    common_ancestor = find_common_ancestor(source_branch, target_branch)
    ancestor_state = get_state_at_version(common_ancestor)
    
    # Three-way merge
    conflicts = []
    merged_memories = {}
    
    for memory_id in set(source_state.keys()) | set(target_state.keys()):
        source_mem = source_state.get(memory_id)
        target_mem = target_state.get(memory_id)
        ancestor_mem = ancestor_state.get(memory_id)
        
        if source_mem == target_mem:
            # No conflict
            merged_memories[memory_id] = source_mem
        elif source_mem == ancestor_mem:
            # Only target changed
            merged_memories[memory_id] = target_mem
        elif target_mem == ancestor_mem:
            # Only source changed
            merged_memories[memory_id] = source_mem
        else:
            # Both changed - conflict
            conflicts.append(MergeConflict(
                memoryId=memory_id,
                source=source_mem,
                target=target_mem,
                ancestor=ancestor_mem
            ))
    
    if conflicts:
        return MergeResult(status="conflict", conflicts=conflicts)
    
    # Apply merge
    switch_branch(target_branch)
    for memory_id, memory in merged_memories.items():
        current = target_state.get(memory_id)
        if memory != current:
            emit_event("update" if current else "create", memory_id, 
                      content=memory.content, 
                      reason=f"merge from {source_branch}")
    
    emit_event("merge_complete", payload={
        "sourceBranch": source_branch,
        "targetBranch": target_branch
    })
    
    return MergeResult(status="success", memoriesMerged=len(merged_memories))
```

### 4.4 Conflict Resolution

When memories conflict during merge:

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Source wins** | Take the source branch version | Source is "correct" context |
| **Target wins** | Keep the target branch version | Target has more recent corrections |
| **Recency wins** | Take most recently modified | Default for most cases |
| **Keep both** | Create two separate memories | Both perspectives valid |
| **User decides** | Present conflict for manual resolution | Important/sensitive memories |
| **LLM merge** | Use LLM to synthesize combined version | Complex content that can be merged |

---

## Part 5: User Experience Patterns

### 5.1 Simplicity First: The 90% Case

Most users don't need full version control. Provide simple primitives:

**Checkpoint & Restore:**
```
User: "Save my current memory state"
AI: "✓ Checkpoint created: 'Feb 17, 2026 state'. You can restore to this point anytime."

User: "Restore to last checkpoint"
AI: "This will undo 47 memory changes since Feb 17. Continue? [Yes/No]"
```

**Quick Undo:**
```
User: "Undo that last memory you just saved"
AI: "✓ Undone. The memory about your coffee preference has been removed."
```

**Temporal Questions:**
```
User: "What did you know about my job 6 months ago?"
AI: "In August 2025, I knew you were a software engineer at TechCorp. 
     Since then, I've learned you were promoted to Senior Engineer in October 
     and switched to the Platform team in January."
```

### 5.2 Memory Timeline UI

For visual interfaces:

```
┌────────────────────────────────────────────────────────────┐
│  MEMORY TIMELINE                               [Settings]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Today ─────●───────────────────────────── 1,247 memories  │
│             │                                              │
│  Feb 10 ────●─ Checkpoint: "Before project cleanup"        │
│             │                                              │
│  Feb 1 ─────●─ 42 memories added                          │
│             │                                              │
│  Jan 15 ────●─ Major update: Job change recorded          │
│             │                                              │
│  Jan 1 ─────●─ Auto-checkpoint: New Year                  │
│             │                                              │
│             ▼                                              │
│  [Load more...]                                            │
│                                                            │
│  ─────────────────────────────────────────────────────────│
│  ◀──────────────●────────────────────────────────────────▶│
│  Aug 2025                                      Feb 2026    │
│                                                            │
│  [View state at selected date]  [Compare two dates]        │
└────────────────────────────────────────────────────────────┘
```

### 5.3 Branching UI (Advanced Users)

Only surface for users who need it:

```
┌────────────────────────────────────────────────────────────┐
│  MEMORY BRANCHES                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ● main (active)                                           │
│  │ └── 1,247 memories, last updated today                 │
│  │                                                         │
│  ├──● work-persona                                         │
│  │   └── 423 memories, branched Jan 15                    │
│  │   └── [Switch] [Merge into main] [Delete]              │
│  │                                                         │
│  └──● fresh-start-test                                     │
│      └── 12 memories, branched Feb 10                     │
│      └── [Switch] [Merge into main] [Delete]              │
│                                                            │
│  [+ Create new branch]                                     │
└────────────────────────────────────────────────────────────┘
```

### 5.4 Natural Language Interface

Support common requests naturally:

| User Says | System Action |
|-----------|---------------|
| "Remember this" | create event |
| "Forget that" | delete event |
| "Actually, I was wrong about X" | update event with correction |
| "What did you know last month?" | temporal query |
| "Undo the last few memories" | rollback recent events |
| "Save my current state" | create checkpoint |
| "Start fresh but keep a backup" | create branch + checkpoint |
| "Go back to how things were in January" | rollback to date |
| "Show me how your understanding has changed" | diff query |
| "Merge my work memories back in" | branch merge |

---

## Part 6: Storage and Performance

### 6.1 Storage Analysis

**Assumptions:**
- Average memory: 500 tokens (~2KB text)
- Active user: 10,000 memories after 1 year
- Events per memory: ~3 average (create + updates)
- 30,000 events/year for active user

**Event log size:**
```
Event overhead: ~200 bytes metadata + content
Average event: 2KB content + 200B = 2.2KB
30,000 events × 2.2KB = 66MB/year raw

With compression (gzip ~60%):
66MB × 0.4 = 26MB/year
```

**Snapshot size:**
```
Full snapshot: 10,000 memories × 2KB = 20MB raw
Compressed: ~8MB per snapshot

With tiered retention:
- Weekly for 3 months: 12 × 8MB = 96MB
- Monthly for 1 year: 12 × 8MB = 96MB  
- Yearly thereafter: 8MB/year

First year: ~200MB snapshots
Subsequent years: ~100MB/year
```

**Total storage per user:**
```
Year 1: 26MB events + 200MB snapshots = ~230MB
Year 2+: 26MB events + 100MB snapshots = ~130MB/year

Modest! Even 10 years of full history: ~1.5GB per user
```

### 6.2 Performance Characteristics

| Operation | Time Complexity | Typical Latency |
|-----------|-----------------|-----------------|
| Get current state | O(1) from cache | <10ms |
| Append event | O(1) | <20ms |
| Get state at date (with snapshot) | O(events since snapshot) | 50-200ms |
| Full history diff | O(n) events | 100-500ms |
| Create snapshot | O(memories) | 200-1000ms |
| Rollback (soft) | O(changes) | 100-500ms |
| Branch create | O(1) | <50ms |
| Branch merge | O(memories) | 200-1000ms |

### 6.3 Optimization Strategies

**Event log:**
- Partition by time (monthly/yearly tables)
- Index on (user_id, timestamp) and (user_id, memory_id)
- Archive old partitions to cold storage

**Snapshots:**
- Delta compression between consecutive snapshots
- Only store changed memories in non-baseline snapshots
- Lazy loading for historical snapshots

**Caching:**
- Current state always in hot cache
- LRU cache for recent historical states
- Pre-compute snapshots at popular query points

**Pruning (optional):**
- Consolidate trivial events (multiple reinforcements → single event)
- Compress similar events in sequence
- User-configurable history depth

---

## Part 7: Privacy and Compliance

### 7.1 Version History and Privacy

Versioning creates new privacy considerations:

| Concern | Mitigation |
|---------|------------|
| "I deleted that memory but it's in history" | Support hard delete that removes from event log |
| "I don't want you knowing what I forgot" | Option to exclude delete events from history |
| "Version history reveals too much" | User-controllable history depth |
| "Snapshots retain sensitive data" | Cascade deletion to affected snapshots |

### 7.2 GDPR Considerations

Event sourcing complicates GDPR compliance:

**Challenge:** GDPR requires ability to delete personal data, but event sourcing's value is in immutability.

**Solution: Crypto-shredding**
```python
def create_memory_event(memory_id: str, content: str):
    # Generate per-memory encryption key
    key = generate_key()
    encrypted_content = encrypt(content, key)
    
    # Store key separately
    key_store.save(memory_id, key)
    
    # Event contains only encrypted content
    emit_event("create", memory_id, encrypted_content)

def gdpr_delete(memory_id: str):
    # Delete the key - events become unreadable
    key_store.delete(memory_id)
    
    # Optionally: mark events as tombstoned
    emit_event("gdpr_delete", memory_id)
```

This preserves event log structure while making content irrecoverable.

### 7.3 The Right to Historical Deletion

Proposed policy:

1. **Soft delete (default):** Memory removed from active state, event log preserved
2. **Hard delete (user request):** Event log entries for memory removed
3. **Timeline delete:** Remove all history after/before date
4. **Complete erasure:** Remove user entirely (crypto-shred all keys)

User should control which level they want.

---

## Part 8: Comparison to Existing Systems

### 8.1 Git (Code Version Control)

| Aspect | Git | AI Memory |
|--------|-----|-----------|
| Atomic unit | File | Memory |
| Change tracking | Line-level diff | Content replacement |
| Branching | Core feature | Advanced feature |
| Merging | Complex (conflicts common) | Simpler (memories independent) |
| History size | Can be huge | More bounded |
| Primary user | Developers | Everyone |

**Learning:** Git's complexity is acceptable for developers but too much for general users. Simplify the UX while keeping the architecture.

### 8.2 Google Docs / Notion Version History

| Aspect | Docs/Notion | AI Memory |
|--------|-------------|-----------|
| Granularity | Document | Memory |
| History view | Timeline slider | Similar |
| Restore | Full document | Selective possible |
| Branching | Not supported | Supported |
| Auto-save | Continuous | Event-based |

**Learning:** Timeline visualization works well. Auto-save granularity is tricky—too fine creates noise, too coarse loses context.

### 8.3 Time Machine (Apple Backup)

| Aspect | Time Machine | AI Memory |
|--------|--------------|-----------|
| Scope | Full filesystem | Memory space |
| Browse | "Enter Time Machine" UI | Timeline view |
| Restore | File/folder | Memory/category |
| Storage | Incremental backups | Event + snapshots |

**Learning:** The "enter historical state" UX is powerful and intuitive. Consider similar immersive experience for memory archaeology.

### 8.4 Event Sourcing (Enterprise Systems)

| Aspect | Enterprise ES | AI Memory ES |
|--------|---------------|--------------|
| Append-only | Yes | Yes |
| Snapshots | Common | Recommended |
| CQRS | Often paired | Recommended |
| Scale | Millions of events | Thousands |
| Compliance | Critical | Important |

**Learning:** Proven pattern at scale. Main difference is AI memory is per-user not per-system, making sharding natural.

---

## Part 9: Recommendations

### 9.1 Implementation Tiers

**Tier 1: Essential (MVP)**
- Event sourcing foundation
- Basic checkpoint/restore
- Temporal queries (state at date)
- Soft delete with history
- Auto-checkpoints (weekly)

**Tier 2: Enhanced**
- Diff between versions
- Timeline visualization
- Category-level rollback
- Hard delete option
- Snapshot compression

**Tier 3: Advanced**
- Branching and merging
- Export/import snapshots
- Cross-platform state migration
- Selective merge
- Compliance tools (crypto-shredding)

### 9.2 Architecture Decision

**Recommended: Event Sourcing + Periodic Snapshots**

Rationale:
- Proven pattern for auditable, temporal data
- Storage-efficient for the scale of personal memory
- Enables all versioning features without over-engineering
- Natural fit with existing memory extraction pipeline

**Not recommended: Full Git-style for all users**
- Too complex for mainstream UX
- Branching/merging rarely needed
- Git concepts don't map cleanly

### 9.3 Default Settings

```yaml
versioning:
  enabled: true
  
  events:
    retention: forever  # or: 2-years, 5-years
    compression: true
    
  snapshots:
    frequency: 1000-events
    retention:
      recent: 4-weeks (weekly)
      medium: 1-year (monthly)
      long: forever (yearly)
    compression: true
    
  checkpoints:
    auto:
      enabled: true
      triggers:
        - weekly
        - before-bulk-delete
        - before-consolidation
    max_user_checkpoints: 50
    
  branches:
    enabled: false  # Enable per-user on request
    max_branches: 5
    
  ui:
    show_timeline: true
    show_branching: false  # Only if enabled
    natural_language_versioning: true
```

### 9.4 UX Guidelines

1. **Lead with simplicity:** Checkpoint/restore, not branches
2. **Make history discoverable:** "I remember differently" → show history
3. **Temporal queries should feel natural:** Answer "what did you know when" without complex UI
4. **Visualize when helpful:** Timeline for exploration, not for routine use
5. **Explain changes:** "Your understanding of X has evolved" with accessible diff
6. **Preserve trust:** Hard delete actually deletes (crypto-shred)

---

## Part 10: Open Questions

### 10.1 For Further Research

1. **Version conflict with consolidation:** When memories are consolidated/merged, how do we represent that in history? Does rolling back "un-consolidate"?

2. **Embedding versioning:** Should we version vector embeddings too, or regenerate on rollback?

3. **Branch divergence limits:** How far can branches diverge before merge becomes impractical?

4. **Collaborative memory:** If AI has memories about multiple users in a shared context, how does versioning work per-user?

5. **Model migration:** When upgrading the underlying LLM, should we re-extract memories? Is that a "version" of the memory system?

### 10.2 Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Storage costs exceed projections | Low | Tiered retention, compression |
| Users confused by versioning | Medium | Simple defaults, hide complexity |
| Rollback creates inconsistent state | Medium | Referential integrity checks |
| History reveals "forgotten" info | High | Clear hard delete path |
| Merge conflicts frustrate users | Medium | Prefer simpler strategies |

---

## Conclusion

Memory versioning is valuable and technically feasible. Event sourcing provides the right foundation—it's proven at scale, enables all desired features, and has manageable storage requirements.

**The key insight:** Most users need simple checkpoint/restore, not full version control. The architecture should support advanced features but hide them behind progressive disclosure.

**Immediate recommendations:**
1. Adopt event sourcing for all memory operations
2. Implement periodic snapshots (every 1000 events + weekly)
3. Build checkpoint/restore as primary UX
4. Add temporal queries ("what did you know when")
5. Reserve branching for power users / specific use cases

**Long-term vision:** AI memory with the power of Git but the simplicity of Time Machine—users can explore their AI's evolving understanding of them, recover from mistakes, and maintain control over their digital relationship history.

---

*Research complete. This document provides the architectural foundation for memory versioning in the AI Continuity Framework.*
