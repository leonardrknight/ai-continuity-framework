# Memory Export/Import: Portable Memory Format

*Research Document for AI Continuity Framework*  
*Iteration 4, Document 03*  
*Status: Complete*

---

## Executive Summary

AI memory portability is an unsolved problem. As users invest months or years building context with AI assistants, they become locked into providers—not by switching costs, but by **memory loss**. This research proposes a standardized format for exporting, importing, and exchanging AI memories between systems.

**The Core Challenge:**
- Memory systems use incompatible schemas
- Embeddings are model-specific (OpenAI vectors ≠ Anthropic vectors)
- No industry standard exists for AI memory interchange
- Current exports (if available) are conversation dumps, not structured memory

**Key Proposal:** A layered export format that separates:
1. **Human-readable memories** (always portable)
2. **Structural metadata** (relationships, confidence, provenance)
3. **Model-specific artifacts** (embeddings—must be regenerated)

---

## 1. Use Cases for Memory Portability

### 1.1 Use Case Matrix

| Use Case | Requirements | Complexity |
|----------|-------------|------------|
| **Provider Migration** | Full export/import, re-embedding | High |
| **Backup & Restore** | Exact fidelity, same system | Low |
| **Forking** | Create new AI from subset | Medium |
| **Merging** | Combine memories, resolve conflicts | High |
| **Selective Export** | Filter by topic/date, privacy-aware | Medium |
| **Sharing** | Give another person/system subset | Medium |

### 1.2 Provider Migration (OpenAI → Anthropic)

The holy grail: moving your AI's "knowledge of you" between providers.

**What transfers:**
- Stated facts ("User prefers morning meetings")
- Preferences and constraints
- Relationship information
- Behavioral patterns

**What doesn't transfer:**
- Vector embeddings (incompatible embedding spaces)
- Model-specific personality nuances
- Fine-tuned behaviors

**Migration workflow:**
```
1. Export human-readable memories + metadata
2. Discard old embeddings
3. Import into new system
4. Re-embed using new model's embedding function
5. Rebuild vector indices
```

### 1.3 Backup & Restore

Simplest case—same system, disaster recovery.

**Requirements:**
- Exact binary fidelity
- Include all artifacts (embeddings, indices)
- Cryptographic integrity verification
- Point-in-time recovery

**Format:** Native format is fine. Portability not required.

### 1.4 Forking (Create New AI from Existing)

Use cases:
- Create work AI from personal AI (without personal details)
- Create project-specific AI with domain knowledge
- Share "trained" AI template with others

**Requirements:**
- Selective memory inclusion
- Privacy-aware filtering
- Source attribution
- Independence after fork (no sync)

### 1.5 Merging (Combine Memories)

Use cases:
- Consolidate memories from multiple devices
- Merge test and production AI
- Combine team member's AI learnings

**Requirements:**
- Duplicate detection
- Conflict resolution
- Source tracking
- Merge audit trail

### 1.6 Selective Export (Sharing)

Use cases:
- Share work context with colleague's AI
- Export domain knowledge to public repository
- Create anonymized training data

**Requirements:**
- Topic/tag filtering
- Date range selection
- PII detection and redaction
- Recipient consent/approval

---

## 2. Existing Formats & Prior Art

### 2.1 Current Landscape

| System | Export Format | Portable? | Includes Embeddings? |
|--------|---------------|-----------|---------------------|
| **ChatGPT** | JSON conversation export | Partial | No |
| **Mem0** | No export API | ❌ | N/A |
| **Zep** | PostgreSQL dump | ❌ | Yes (useless cross-model) |
| **LangChain** | Various (framework-dependent) | Varies | Sometimes |
| **Character.AI** | None | ❌ | N/A |
| **SillyTavern** | PNG character cards | ✅ | No |
| **Replika** | None | ❌ | N/A |

**Key insight:** No major AI memory provider offers portable export.

### 2.2 Conversation Export (ChatGPT)

OpenAI's export format:

```json
{
  "conversations": [
    {
      "title": "Project Planning",
      "create_time": 1706000000,
      "messages": [
        {
          "author": {"role": "user"},
          "content": {"content_type": "text", "parts": ["..."]}
        },
        {
          "author": {"role": "assistant"},
          "content": {"content_type": "text", "parts": ["..."]}
        }
      ]
    }
  ]
}
```

**Limitations:**
- Raw conversations, not extracted memories
- No semantic structure
- Requires re-processing to extract facts
- Huge data volume (every message, not distilled)

### 2.3 Character Cards (SillyTavern/Chub)

Community standard for persona portability:

```json
{
  "name": "Jordan",
  "description": "AI Chief of Staff...",
  "personality": "Direct, efficient, witty...",
  "scenario": "You are assisting Leo Knight...",
  "first_mes": "Good morning! What's on the agenda?",
  "mes_example": "<START>\n{{user}}: Schedule a meeting\n{{char}}: Done. I've sent invites for...",
  "creator_notes": "Works best with Claude 3",
  "tags": ["assistant", "professional"],
  "creator": "leo",
  "character_version": "1.2"
}
```

**Strengths:**
- Human-readable personality spec
- Portable across multiple backends
- Includes behavioral examples
- Community-proven format

**Limitations:**
- No episodic memory (what happened)
- No user-specific facts
- No relationship data
- Static definition, not learning

### 2.4 Knowledge Graphs (RDF/JSON-LD)

Semantic web standards for structured knowledge:

```json
{
  "@context": "https://schema.org/",
  "@type": "Person",
  "@id": "user:leo",
  "name": "Leo Knight",
  "knows": {"@id": "person:carlos"},
  "worksFor": {"@id": "org:knight-ventures"},
  "email": "leo@leonardknight.com"
}
```

**Strengths:**
- Industry standard for knowledge exchange
- Rich relationship modeling
- Schema.org provides common vocabulary
- Tools ecosystem exists

**Limitations:**
- Verbose for AI memory use cases
- No native support for confidence/uncertainty
- No temporal evolution tracking
- Overkill for simple preference storage

### 2.5 YAML Memory (This Framework's Approach)

Our current informal format:

```yaml
memory:
  id: "mem_12345"
  content: "Leo prefers morning meetings before 10 AM"
  type: "preference"
  confidence: 0.92
  source:
    type: "stated"
    conversation_id: "conv_abc"
    timestamp: "2025-02-15T09:30:00Z"
  metadata:
    last_accessed: "2025-02-16T14:00:00Z"
    access_count: 7
    tags: ["scheduling", "preferences"]
```

**Strengths:**
- Human-readable
- Flexible schema
- Easy to edit manually
- Version-control friendly

**Limitations:**
- No formal schema validation
- Informal, not standardized
- No relationship modeling
- No embedding portability addressed

---

## 3. Proposed Memory Export Format (MEF)

### 3.1 Design Principles

1. **Human-readable core:** Text memories always readable without tools
2. **Layered complexity:** Simple exports for simple use cases
3. **Embedding-agnostic:** Vectors are transient artifacts, not core data
4. **Provenance-tracked:** Every memory knows where it came from
5. **Privacy-aware:** Built-in redaction and encryption support
6. **Extensible:** Custom metadata without breaking compatibility

### 3.2 Format Overview

```
memory-export/
├── manifest.json           # Export metadata
├── memories/
│   ├── semantic.jsonl      # Core memories (one per line)
│   ├── episodic.jsonl      # Events/conversations
│   └── procedural.jsonl    # How-to knowledge
├── relationships/
│   └── graph.json          # Entity relationships
├── embeddings/             # Optional, model-specific
│   ├── manifest.json       # Which model, dimensions
│   └── vectors.bin         # Binary vectors (optional)
├── assets/                 # Referenced files
│   └── ...
└── signatures/             # Integrity verification
    └── sha256.json
```

### 3.3 Manifest Schema

```json
{
  "$schema": "https://aiportability.org/mef/v1/manifest.schema.json",
  "version": "1.0.0",
  "export_id": "exp_a1b2c3d4",
  "created_at": "2025-02-16T20:30:00Z",
  "source": {
    "system": "clawdbot",
    "version": "2.1.0",
    "identity": "jordan",
    "user_id": "leo"
  },
  "contents": {
    "memory_count": 1547,
    "relationship_count": 234,
    "date_range": {
      "earliest": "2024-06-01T00:00:00Z",
      "latest": "2025-02-16T20:30:00Z"
    },
    "types": ["semantic", "episodic", "procedural"]
  },
  "embeddings": {
    "included": false,
    "model": null,
    "note": "Re-embed on import for compatibility"
  },
  "encryption": {
    "enabled": false,
    "method": null
  },
  "filters_applied": {
    "redacted_pii": false,
    "topic_filter": null,
    "date_filter": null
  },
  "checksums": {
    "algorithm": "sha256",
    "manifest": "abc123...",
    "memories": "def456..."
  }
}
```

### 3.4 Memory Record Schema

Each memory in `memories/*.jsonl`:

```json
{
  "id": "mem_a1b2c3d4",
  "version": 3,
  "content": "Leo prefers morning meetings, ideally before 10 AM Eastern",
  "content_hash": "sha256:abc123...",
  
  "classification": {
    "type": "semantic",
    "category": "preference",
    "subcategory": "scheduling"
  },
  
  "confidence": {
    "score": 0.92,
    "source_type": "stated",
    "evidence_count": 5,
    "last_reinforced": "2025-02-15T09:30:00Z"
  },
  
  "provenance": {
    "created_at": "2024-08-15T10:00:00Z",
    "created_from": "conversation",
    "conversation_id": "conv_xyz",
    "message_id": "msg_123",
    "extraction_method": "llm_extraction",
    "extraction_model": "claude-3-opus"
  },
  
  "evolution": [
    {
      "version": 1,
      "timestamp": "2024-08-15T10:00:00Z",
      "content": "Leo prefers morning meetings",
      "change_type": "created"
    },
    {
      "version": 2,
      "timestamp": "2024-11-20T14:00:00Z",
      "content": "Leo prefers morning meetings before 10 AM",
      "change_type": "refined",
      "trigger": "user_clarification"
    },
    {
      "version": 3,
      "timestamp": "2025-01-05T09:00:00Z",
      "content": "Leo prefers morning meetings, ideally before 10 AM Eastern",
      "change_type": "refined",
      "trigger": "context_inference"
    }
  ],
  
  "metadata": {
    "tags": ["scheduling", "preferences", "work"],
    "entities": ["Leo"],
    "importance": 0.75,
    "access_count": 23,
    "last_accessed": "2025-02-16T08:00:00Z"
  },
  
  "relationships": [
    {"target": "mem_e5f6g7h8", "type": "related_to"},
    {"target": "entity:leo", "type": "about"}
  ],
  
  "flags": {
    "user_verified": true,
    "superseded": false,
    "superseded_by": null,
    "private": false,
    "do_not_export": false
  }
}
```

### 3.5 Relationship Graph Schema

`relationships/graph.json`:

```json
{
  "entities": [
    {
      "id": "entity:leo",
      "type": "person",
      "name": "Leo Knight",
      "attributes": {
        "role": "founder",
        "organization": "Knight Ventures",
        "timezone": "America/New_York"
      }
    },
    {
      "id": "entity:carlos",
      "type": "person", 
      "name": "Carlos",
      "attributes": {
        "relationship_to_primary": "business partner"
      }
    },
    {
      "id": "entity:knight-ventures",
      "type": "organization",
      "name": "Knight Ventures, Inc.",
      "attributes": {}
    }
  ],
  
  "relationships": [
    {
      "source": "entity:leo",
      "target": "entity:knight-ventures",
      "type": "founder_of",
      "confidence": 1.0,
      "source_memory": "mem_abc123"
    },
    {
      "source": "entity:leo",
      "target": "entity:carlos",
      "type": "works_with",
      "confidence": 0.95,
      "attributes": {
        "context": "Amigo AI project"
      }
    }
  ]
}
```

---

## 4. Embedding Portability Challenge

### 4.1 The Fundamental Problem

Different embedding models produce incompatible vector spaces:

| Model | Dimensions | Trained On | Space |
|-------|------------|------------|-------|
| OpenAI text-embedding-3-large | 3072 | Proprietary | Space A |
| Anthropic (via Voyage) | 1024 | Proprietary | Space B |
| Sentence-Transformers all-MiniLM | 384 | Open | Space C |
| Cohere embed-v3 | 1024 | Proprietary | Space D |

**Key insight:** Vectors are coordinates in a learned semantic space. Moving between spaces requires translation, not transfer.

### 4.2 Strategies for Embedding Portability

**Strategy 1: Don't Export Embeddings (Recommended)**

```
Export: Human-readable memories only
Import: Re-embed everything using target system's model
Cost: One-time embedding cost on import
Benefit: Full compatibility, optimal retrieval
```

This is the pragmatic choice. Embeddings are cheap to regenerate.

**Strategy 2: Include Source Embeddings + Re-embed**

```
Export: Memories + source embeddings + embedding metadata
Import: Re-embed, but use source embeddings for:
  - Relative similarity preservation hints
  - Debugging retrieval issues
  - Research/analysis
```

**Strategy 3: Universal Embedding Layer (Future)**

Hypothetical cross-model embedding space:

```python
# Concept only - not production-ready
def translate_embedding(vector, source_model, target_model):
    # Learn projection matrix from parallel corpus
    projection = load_projection_matrix(source_model, target_model)
    return project(vector, projection)
```

Research exists (e.g., multilingual embedding alignment) but no production solution for cross-provider AI embeddings.

### 4.3 Practical Recommendation

```yaml
embedding_strategy:
  export: "omit"  # Don't include raw vectors
  metadata:
    model: "openai:text-embedding-3-large"
    dimensions: 3072
    created_at: "2025-02-16"
  import_guidance:
    action: "re_embed_all"
    estimated_cost: "$0.13 per 1M tokens"
    estimated_time: "~10 minutes for 10K memories"
```

---

## 5. Privacy & Security

### 5.1 Export Classification Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| **Full** | All memories, no redaction | Personal backup |
| **Work** | Filter personal, keep professional | Share with team |
| **Public** | Aggressive PII removal | Research dataset |
| **Encrypted** | Full export, encrypted at rest | Secure transfer |

### 5.2 PII Detection & Redaction

Pre-export processing:

```python
pii_patterns = {
    "email": r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
    "phone": r"\+?[\d\s\-\(\)]{10,}",
    "ssn": r"\d{3}-\d{2}-\d{4}",
    "credit_card": r"\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}",
    "address": "NER-based detection",
    "names": "NER-based detection"
}

redaction_strategies = {
    "mask": "Replace with [REDACTED]",
    "hash": "Replace with deterministic hash",
    "generalize": "Replace '123 Main St' with '[ADDRESS]'",
    "remove": "Delete memory entirely"
}
```

### 5.3 Encryption

For sensitive exports:

```json
{
  "encryption": {
    "enabled": true,
    "method": "AES-256-GCM",
    "key_derivation": "Argon2id",
    "key_hint": "Use master passphrase from password manager"
  }
}
```

### 5.4 Export Audit Trail

Every export creates audit record:

```json
{
  "export_id": "exp_a1b2c3d4",
  "timestamp": "2025-02-16T20:30:00Z",
  "requested_by": "leo",
  "filter": "work",
  "memory_count": 847,
  "excluded_count": 700,
  "destination": "anthropic_import",
  "checksum": "sha256:xyz789..."
}
```

---

## 6. Import Workflow

### 6.1 Import Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    IMPORT PIPELINE                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │  UNPACK  │ →  │ VALIDATE │ →  │  DEDUPE  │          │
│  │ & VERIFY │    │  SCHEMA  │    │  CHECK   │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│       │                │                │               │
│       ▼                ▼                ▼               │
│  Verify checksums   JSON Schema    Semantic hash        │
│  Decrypt if needed  validation     comparison           │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │ CONFLICT │ →  │   EMBED  │ →  │  INDEX   │          │
│  │  RESOLVE │    │   (NEW)  │    │  BUILD   │          │
│  └──────────┘    └──────────┘    └──────────┘          │
│       │                │                │               │
│       ▼                ▼                ▼               │
│  User review or    Batch embed     Vector index         │
│  auto-merge        new content     + graph update       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Schema Validation

```python
def validate_import(export_path: str) -> ValidationResult:
    """
    Validate exported memory package.
    """
    # 1. Check manifest
    manifest = load_json(export_path / "manifest.json")
    validate_against_schema(manifest, MANIFEST_SCHEMA)
    
    # 2. Verify checksums
    for file, expected_hash in manifest["checksums"].items():
        actual_hash = sha256(export_path / file)
        if actual_hash != expected_hash:
            raise IntegrityError(f"Checksum mismatch: {file}")
    
    # 3. Validate memories
    for memory in load_jsonl(export_path / "memories/semantic.jsonl"):
        validate_against_schema(memory, MEMORY_SCHEMA)
        check_required_fields(memory)
    
    # 4. Check version compatibility
    if not is_compatible_version(manifest["version"]):
        raise VersionError(f"Incompatible version: {manifest['version']}")
    
    return ValidationResult(valid=True, warnings=[])
```

### 6.3 Duplicate Detection

Three strategies:

**1. Content Hash Match**
```python
def exact_duplicate(memory, existing_memories):
    return memory["content_hash"] in existing_hashes
```

**2. Semantic Similarity**
```python
def semantic_duplicate(memory, existing_memories, threshold=0.95):
    embedding = embed(memory["content"])
    similar = vector_search(embedding, existing_memories, top_k=1)
    return similar[0].score > threshold
```

**3. ID Match**
```python
def id_collision(memory, existing_memories):
    return memory["id"] in existing_ids
```

### 6.4 Conflict Resolution

When importing memory conflicts with existing:

| Conflict Type | Resolution Strategy | User Action |
|---------------|---------------------|-------------|
| **Same fact, same value** | Skip (duplicate) | None |
| **Same fact, different value** | Keep newer OR ask user | Optional review |
| **Same fact, contradictory** | Flag for review | Required review |
| **ID collision** | Assign new ID | None |
| **Relationship conflict** | Merge both edges | None |

**Auto-merge heuristics:**

```python
def resolve_conflict(existing, imported):
    # Newer wins (unless user explicitly set existing)
    if existing.flags.user_verified:
        return existing
    
    if imported.provenance.created_at > existing.provenance.created_at:
        # Create supersession chain
        existing.flags.superseded = True
        existing.flags.superseded_by = imported.id
        return imported
    
    return existing
```

### 6.5 Import Modes

```python
class ImportMode(Enum):
    MERGE = "merge"       # Add new, skip duplicates
    REPLACE = "replace"   # Delete existing, import fresh
    APPEND = "append"     # Add all, allow duplicates (with new IDs)
    REVIEW = "review"     # Manual approval for each conflict
```

---

## 7. Reference Implementation

### 7.1 Export Implementation (Python)

```python
from dataclasses import dataclass
from datetime import datetime
import json
import hashlib
from pathlib import Path

@dataclass
class ExportConfig:
    include_episodic: bool = True
    include_relationships: bool = True
    redact_pii: bool = False
    encrypt: bool = False
    filter_tags: list[str] | None = None
    date_range: tuple[datetime, datetime] | None = None

class MemoryExporter:
    """Export AI memories to portable format."""
    
    def __init__(self, memory_store, config: ExportConfig):
        self.store = memory_store
        self.config = config
    
    def export(self, output_path: Path) -> str:
        """Create memory export package."""
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Gather memories
        memories = self._gather_memories()
        
        # Apply filters
        if self.config.filter_tags:
            memories = self._filter_by_tags(memories)
        if self.config.date_range:
            memories = self._filter_by_date(memories)
        if self.config.redact_pii:
            memories = self._redact_pii(memories)
        
        # Write memories
        checksums = {}
        
        semantic = [m for m in memories if m["classification"]["type"] == "semantic"]
        checksums["memories/semantic.jsonl"] = self._write_jsonl(
            output_path / "memories" / "semantic.jsonl", semantic
        )
        
        if self.config.include_episodic:
            episodic = [m for m in memories if m["classification"]["type"] == "episodic"]
            checksums["memories/episodic.jsonl"] = self._write_jsonl(
                output_path / "memories" / "episodic.jsonl", episodic
            )
        
        # Write relationships
        if self.config.include_relationships:
            graph = self._build_relationship_graph(memories)
            checksums["relationships/graph.json"] = self._write_json(
                output_path / "relationships" / "graph.json", graph
            )
        
        # Create manifest
        manifest = self._create_manifest(memories, checksums)
        self._write_json(output_path / "manifest.json", manifest)
        
        # Optional encryption
        if self.config.encrypt:
            return self._encrypt_package(output_path)
        
        return str(output_path)
    
    def _write_jsonl(self, path: Path, records: list) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        content = "\n".join(json.dumps(r) for r in records)
        path.write_text(content)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _write_json(self, path: Path, data: dict) -> str:
        path.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(data, indent=2)
        path.write_text(content)
        return hashlib.sha256(content.encode()).hexdigest()
```

### 7.2 Import Implementation (Python)

```python
class MemoryImporter:
    """Import AI memories from portable format."""
    
    def __init__(self, memory_store, embedding_model):
        self.store = memory_store
        self.embedder = embedding_model
    
    def import_package(
        self, 
        package_path: Path, 
        mode: ImportMode = ImportMode.MERGE
    ) -> ImportResult:
        """Import memory package into store."""
        
        # Validate package
        self._validate(package_path)
        
        # Load manifest
        manifest = json.loads((package_path / "manifest.json").read_text())
        
        # Load memories
        memories = []
        for mem_file in (package_path / "memories").glob("*.jsonl"):
            memories.extend(self._load_jsonl(mem_file))
        
        # Process each memory
        imported = 0
        skipped = 0
        conflicts = []
        
        for memory in memories:
            result = self._process_memory(memory, mode)
            if result == "imported":
                imported += 1
            elif result == "skipped":
                skipped += 1
            elif result == "conflict":
                conflicts.append(memory)
        
        # Re-embed all imported memories
        self._reembed_memories()
        
        # Import relationships
        if (package_path / "relationships" / "graph.json").exists():
            self._import_relationships(package_path / "relationships" / "graph.json")
        
        return ImportResult(
            imported=imported,
            skipped=skipped,
            conflicts=conflicts,
            embeddings_generated=imported
        )
    
    def _process_memory(self, memory: dict, mode: ImportMode) -> str:
        # Check for duplicates
        existing = self.store.find_by_content_hash(memory["content_hash"])
        
        if existing:
            if mode == ImportMode.MERGE:
                return "skipped"
            elif mode == ImportMode.REPLACE:
                self.store.delete(existing.id)
            elif mode == ImportMode.REVIEW:
                return "conflict"
        
        # Assign new ID if collision
        if self.store.exists(memory["id"]):
            memory["id"] = generate_new_id()
            memory["provenance"]["original_id"] = memory["id"]
        
        # Clear embedding (will re-generate)
        memory.pop("embedding", None)
        
        # Store
        self.store.insert(memory)
        return "imported"
    
    def _reembed_memories(self):
        """Re-embed all memories without embeddings."""
        memories_without_embeddings = self.store.find_without_embeddings()
        
        for batch in chunked(memories_without_embeddings, 100):
            contents = [m["content"] for m in batch]
            embeddings = self.embedder.embed_batch(contents)
            
            for memory, embedding in zip(batch, embeddings):
                self.store.update_embedding(memory["id"], embedding)
```

### 7.3 CLI Interface

```bash
# Export all memories
$ clawd memory export --output ~/backup/memories-2025-02-16/

# Export with filtering
$ clawd memory export \
    --output ~/work-export/ \
    --filter-tags work,professional \
    --redact-pii \
    --exclude-private

# Import memories
$ clawd memory import ~/backup/memories-2025-02-16/ \
    --mode merge \
    --review-conflicts

# Validate export package
$ clawd memory validate ~/backup/memories-2025-02-16/

# Diff two memory sets
$ clawd memory diff ~/old-export/ ~/new-export/
```

---

## 8. Compatibility Considerations

### 8.1 Version Compatibility Matrix

| Export Version | Compatible Import Versions | Notes |
|----------------|---------------------------|-------|
| 1.0 | 1.x, 2.x | Base format |
| 1.1 | 1.1+, 2.x | Added confidence.evidence_count |
| 2.0 | 2.x | Breaking: new provenance schema |

### 8.2 Forward/Backward Compatibility Rules

**Backward Compatible Changes:**
- Adding optional fields
- Adding new memory types
- Adding new relationship types
- Relaxing validation rules

**Breaking Changes:**
- Removing required fields
- Changing field semantics
- Restructuring core schema
- Changing ID format

### 8.3 Migration Scripts

```python
def migrate_v1_to_v2(memory: dict) -> dict:
    """Migrate v1 memory format to v2."""
    
    # Restructure provenance
    old_provenance = memory.get("source", {})
    memory["provenance"] = {
        "created_at": old_provenance.get("timestamp"),
        "created_from": old_provenance.get("type"),
        "conversation_id": old_provenance.get("conversation_id"),
        "message_id": old_provenance.get("message_id"),
        "extraction_method": "legacy_import",
        "extraction_model": "unknown"
    }
    del memory["source"]
    
    # Add missing confidence fields
    if "confidence" not in memory:
        memory["confidence"] = {
            "score": 0.7,  # Default uncertain
            "source_type": "inferred",
            "evidence_count": 1
        }
    
    return memory
```

---

## 9. Recommendations

### 9.1 For This Framework

1. **Adopt MEF as standard export format**
   - Implement export/import in Clawdbot
   - Use JSONL for scalability
   - Don't export embeddings (re-generate on import)

2. **Add export to weekly reflection ritual**
   - Automatic weekly backup
   - Encrypted, versioned storage

3. **Implement conflict resolution UI**
   - Surface conflicts during import
   - Default to "newer wins" with override

### 9.2 For the Broader Ecosystem

1. **Propose MEF to AI memory providers**
   - Mem0, Zep, LangChain
   - Draft RFC-style specification

2. **Lobby for export requirements**
   - Data portability laws (GDPR-style)
   - "Your memories belong to you"

3. **Build conversion tools**
   - ChatGPT export → MEF
   - Character cards → MEF
   - RAG document stores → MEF

### 9.3 Future Research

1. **Cross-model embedding alignment**
   - Can we project between embedding spaces?
   - Transfer learning for embedding translation

2. **Memory federation**
   - Sync memories across systems
   - Conflict-free replicated data types (CRDTs) for memories

3. **Standardization efforts**
   - W3C or IETF specification
   - Industry consortium for AI data portability

---

## 10. Appendix: JSON Schema Definitions

### 10.1 Manifest Schema (JSON Schema Draft 07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aiportability.org/mef/v1/manifest.schema.json",
  "title": "Memory Export Format Manifest",
  "type": "object",
  "required": ["version", "export_id", "created_at", "source", "contents"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$"
    },
    "export_id": {
      "type": "string",
      "pattern": "^exp_[a-z0-9]+$"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "source": {
      "type": "object",
      "required": ["system"],
      "properties": {
        "system": {"type": "string"},
        "version": {"type": "string"},
        "identity": {"type": "string"},
        "user_id": {"type": "string"}
      }
    },
    "contents": {
      "type": "object",
      "properties": {
        "memory_count": {"type": "integer"},
        "relationship_count": {"type": "integer"},
        "date_range": {
          "type": "object",
          "properties": {
            "earliest": {"type": "string", "format": "date-time"},
            "latest": {"type": "string", "format": "date-time"}
          }
        },
        "types": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    }
  }
}
```

### 10.2 Memory Record Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://aiportability.org/mef/v1/memory.schema.json",
  "title": "Memory Record",
  "type": "object",
  "required": ["id", "content", "classification", "confidence", "provenance"],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^mem_[a-z0-9]+$"
    },
    "version": {
      "type": "integer",
      "minimum": 1
    },
    "content": {
      "type": "string",
      "minLength": 1
    },
    "content_hash": {
      "type": "string",
      "pattern": "^sha256:[a-f0-9]{64}$"
    },
    "classification": {
      "type": "object",
      "required": ["type"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["semantic", "episodic", "procedural"]
        },
        "category": {"type": "string"},
        "subcategory": {"type": "string"}
      }
    },
    "confidence": {
      "type": "object",
      "required": ["score", "source_type"],
      "properties": {
        "score": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        },
        "source_type": {
          "type": "string",
          "enum": ["stated", "inferred", "hybrid"]
        },
        "evidence_count": {
          "type": "integer",
          "minimum": 0
        },
        "last_reinforced": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "provenance": {
      "type": "object",
      "required": ["created_at"],
      "properties": {
        "created_at": {"type": "string", "format": "date-time"},
        "created_from": {"type": "string"},
        "conversation_id": {"type": "string"},
        "message_id": {"type": "string"},
        "extraction_method": {"type": "string"},
        "extraction_model": {"type": "string"}
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "tags": {
          "type": "array",
          "items": {"type": "string"}
        },
        "entities": {
          "type": "array",
          "items": {"type": "string"}
        },
        "importance": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "flags": {
      "type": "object",
      "properties": {
        "user_verified": {"type": "boolean"},
        "superseded": {"type": "boolean"},
        "private": {"type": "boolean"},
        "do_not_export": {"type": "boolean"}
      }
    }
  }
}
```

---

## 11. Conclusion

AI memory portability is technically achievable but culturally absent. No major provider offers meaningful export. The proposed MEF format addresses:

- **Human-readability:** Plain text content, always accessible
- **Interoperability:** Standard JSON schemas, no proprietary formats
- **Embedding agnosticism:** Re-embed on import, don't transfer vectors
- **Privacy:** Built-in redaction and encryption
- **Provenance:** Full history of where memories came from

The biggest barrier isn't technical—it's incentive alignment. Providers benefit from lock-in. Change requires either:
1. User pressure for portability
2. Regulation mandating export
3. Open-source alternatives that set the standard

**This framework should implement MEF and advocate for industry adoption.**

---

*Research complete. Memory portability is achievable—the tools just don't exist yet.*
