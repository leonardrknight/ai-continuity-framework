# AI Memory Interoperability: Standards for Cross-System Memory Exchange

*Research for ai-continuity-framework — Iteration 6*  
*Date: 2026-02-16*  
*Author: Jordan (Research Subagent)*

---

## Executive Summary

AI memory interoperability—the ability to exchange context, preferences, and learned information between different AI systems—is an unsolved problem with no current standard. This document investigates the technical requirements, proposes a standard schema, sketches a protocol specification, and outlines implementation considerations.

**Key findings:**
- No formal standards exist for AI memory exchange
- Major providers use incompatible, proprietary formats
- Existing data portability standards (JSON-LD, Schema.org, Solid) provide useful building blocks
- Trust, privacy, and semantic alignment are the hardest challenges
- A practical standard must be layered: transport, format, semantics, and trust

---

## Part 1: Current Landscape

### 1.1 What Formats Do Major Providers Use?

#### OpenAI (ChatGPT)
- **Memory format:** Internal, undocumented
- **What's stored:** "User insights" extracted from conversations
- **Access:** View/delete via Settings, no export
- **Portability:** None — memories cannot be transferred

#### Anthropic (Claude)
- **Memory format:** Project Knowledge (markdown files), Memory system (internal)
- **What's stored:** Files uploaded to projects; Claude's newer memory is user-controlled text
- **Access:** Projects are editable; memory can be viewed
- **Portability:** Limited — Projects are portable (just files), native memory is not

#### Google (Gemini)
- **Memory format:** "Saved Info" — structured preferences
- **What's stored:** Explicit user-stated facts
- **Access:** View/edit/delete in settings
- **Portability:** None

#### Meta AI
- **Memory format:** Not publicly documented
- **What's stored:** Cross-platform personalization
- **Access:** Settings menu
- **Portability:** None

#### Microsoft Copilot
- **Memory format:** Integrated with Microsoft Graph
- **What's stored:** User context from M365 ecosystem
- **Access:** Graph API for enterprise
- **Portability:** Limited to M365 ecosystem

### 1.2 Open Source / Third-Party Memory Systems

| System | Format | Portability | Notable Features |
|--------|--------|-------------|------------------|
| **Mem0** | JSON (vectors + graph) | API export | User/agent/session scoping |
| **Letta (MemGPT)** | Structured blocks + archival | API, some export | Self-editing memory |
| **Zep** | Structured JSON + summaries | API export | Temporal awareness |
| **LangChain Memory** | Various (dict/buffer/vector) | Depends on backend | Modular, composable |
| **Cognee** | Knowledge graph | GraphML export | Relationship-aware |

### 1.3 Emerging Standards Work

#### W3C / IEEE
- **No specific AI memory standard exists** as of 2026
- W3C Activity Streams (used by Mastodon/ActivityPub) is the closest model for federated data exchange
- W3C Solid project provides data pod architecture with interoperability as core goal

#### Relevant Adjacent Standards
| Standard | Purpose | Relevance to AI Memory |
|----------|---------|------------------------|
| **JSON-LD** | Linked data in JSON | Semantic typing, context URIs |
| **Schema.org** | Shared vocabulary | Common entity definitions |
| **Activity Streams 2.0** | Social actions | Event/activity modeling |
| **Solid Pods** | User-owned data | Pod-based storage model |
| **OpenAPI 3.x** | API description | Protocol definition patterns |
| **JSONPath (RFC 9535)** | Query expressions | Memory querying |
| **JSON Schema** | Validation | Schema enforcement |

---

## Part 2: Technical Requirements

### 2.1 Schema Compatibility

For memories to be exchangeable, systems must agree on:

#### Structural Requirements
1. **Common envelope format** — How is a memory unit packaged?
2. **Mandatory fields** — What must every memory have?
3. **Extension mechanism** — How do we add provider-specific data?
4. **Versioning** — How do schemas evolve without breaking compatibility?

#### Proposed Minimum Schema
```json
{
  "@context": "https://aimmf.org/schema/v1",
  "@type": "Memory",
  "id": "urn:uuid:...",
  "version": "1.0",
  "created": "2026-02-16T12:00:00Z",
  "modified": "2026-02-16T12:00:00Z",
  "source": {
    "system": "anthropic.claude",
    "version": "3.5",
    "session": "sess_abc123"
  },
  "subject": {
    "type": "user",
    "id": "user_xyz"
  },
  "content": { ... },
  "metadata": { ... }
}
```

### 2.2 Semantic Alignment

The hardest problem: **same concept, different encoding.**

| System A Says | System B Says | Actual Meaning |
|---------------|---------------|----------------|
| `prefers_dark_mode: true` | `ui_theme: "dark"` | User prefers dark mode |
| `location: "NYC"` | `city: "New York"` | User is in New York |
| `role: "developer"` | `occupation: "software engineer"` | User is a programmer |

#### Alignment Strategies

**Option 1: Shared Ontology**
- All systems use identical field names and values
- Requires central authority
- Fragile — any evolution breaks compatibility

**Option 2: Mapping Layer**
- Each system publishes a mapping to a canonical schema
- Conversion happens at exchange time
- More flexible but adds complexity

**Option 3: Semantic Embeddings**
- Store meaning as embeddings, not just text
- Similarity matching across systems
- Requires compatible embedding models

**Recommendation:** Hybrid approach
- Core vocabulary from Schema.org (Person, Place, Thing, Action)
- Extension namespace per provider
- Embedding-based fallback for fuzzy matching

### 2.3 Trust and Verification

When System B receives memories from System A, how does B know:
1. The memories are authentic (really from A)?
2. The memories haven't been tampered with?
3. The user consented to this transfer?
4. The memories are still valid (not stale)?

#### Cryptographic Requirements
```
┌────────────────────────────────────────────────────┐
│                  Memory Package                     │
├────────────────────────────────────────────────────┤
│  Header                                             │
│  ├── issuer: did:web:anthropic.com                 │
│  ├── subject: did:key:user123                      │
│  ├── issued: 2026-02-16T12:00:00Z                  │
│  ├── expires: 2026-08-16T12:00:00Z                 │
│  └── nonce: <random>                               │
├────────────────────────────────────────────────────┤
│  Payload                                            │
│  └── [Memory objects...]                           │
├────────────────────────────────────────────────────┤
│  Signature                                          │
│  └── JWS (Ed25519 or ES256)                        │
└────────────────────────────────────────────────────┘
```

#### Decentralized Identifiers (DIDs)
- System identity: `did:web:openai.com` or `did:dns:anthropic.com`
- User identity: `did:key:...` or user-controlled DID
- Memory identity: `did:mem:...` (proposed new method)

### 2.4 Version Compatibility

```
Schema Version: 1.2.3
              │ │ │
              │ │ └── Patch: backwards-compatible fixes
              │ └──── Minor: backwards-compatible additions
              └────── Major: breaking changes
```

**Compatibility rules:**
- Major version must match for guaranteed interop
- Minor version differences: receiver ignores unknown fields
- Patch version differences: transparent

---

## Part 3: Protocol Design

### 3.1 Exchange Models

#### Model A: Push (Sender-Initiated)
```
┌──────────┐                    ┌──────────┐
│ System A │─── POST /import ──→│ System B │
│ (source) │                    │ (target) │
└──────────┘                    └──────────┘
```
- **Use case:** User migration, deliberate handoff
- **Pros:** Simple, immediate
- **Cons:** Requires system B to be available and accepting

#### Model B: Pull (Receiver-Initiated)
```
┌──────────┐                    ┌──────────┐
│ System B │←── GET /export ───│ System A │
│ (target) │                    │ (source) │
└──────────┘                    └──────────┘
```
- **Use case:** Bootstrapping, on-demand import
- **Pros:** Receiver controls timing
- **Cons:** Requires source to maintain export API

#### Model C: Hub (Intermediary)
```
┌──────────┐         ┌─────────┐         ┌──────────┐
│ System A │────────→│   Hub   │←────────│ System B │
│ (source) │         │  (pod)  │         │ (target) │
└──────────┘         └─────────┘         └──────────┘
```
- **Use case:** User-owned data, Solid-style pods
- **Pros:** User controls access, systems decoupled
- **Cons:** Requires hub infrastructure

**Recommendation:** Support all three; Hub model preferred for user autonomy.

### 3.2 Real-Time vs. Batch

| Dimension | Real-Time | Batch |
|-----------|-----------|-------|
| Latency | Low (<1s) | High (minutes-hours) |
| Consistency | Eventual | Point-in-time |
| Bandwidth | Streaming | Bulk transfer |
| Use case | Live handoff | Migration, backup |
| Protocol | WebSocket, SSE | HTTP REST, file download |

**Recommendation:** 
- Batch for migration/backup (primary)
- Real-time for live collaboration (optional extension)

### 3.3 Selective Sharing

Users must control what transfers. Proposed filter capabilities:

```json
{
  "filter": {
    "categories": ["preferences", "facts"],
    "exclude_categories": ["conversations", "sensitive"],
    "time_range": {
      "after": "2025-01-01",
      "before": "2026-01-01"
    },
    "confidence_min": 0.8,
    "topics": ["work", "travel"],
    "exclude_topics": ["health", "finance"]
  }
}
```

### 3.4 Privacy Preservation

#### In Transit
- TLS 1.3 minimum
- Optional: End-to-end encryption with user key

#### Differential Privacy (for aggregate memories)
- Add noise to statistical summaries
- Prevent re-identification from pattern analysis

#### Anonymization Options
```json
{
  "privacy_mode": "full",        // All data included
  "privacy_mode": "anonymized",  // PII removed
  "privacy_mode": "summary",     // Only aggregate insights
  "privacy_mode": "schema_only"  // Empty schema for compatibility testing
}
```

---

## Part 4: Semantic Alignment Deep Dive

### 4.1 The Concept Mapping Problem

System A stores: `{"user_diet": "vegan", "last_updated": "2026-01"}`
System B expects: `{"dietary_restrictions": ["no-meat", "no-dairy", "no-eggs"]}`

How do we translate?

#### Ontology Layer
Define a reference ontology with canonical concepts:

```turtle
# AIMMF Ontology (Turtle notation)
@prefix aimmf: <https://aimmf.org/ontology/> .

aimmf:DietaryPreference a owl:Class .
aimmf:Vegan a aimmf:DietaryPreference ;
    aimmf:excludes aimmf:Meat, aimmf:Dairy, aimmf:Eggs ;
    owl:sameAs schema:RestrictedDiet .
```

#### System Manifests
Each participating system publishes a mapping manifest:

```json
{
  "system": "system-a.example.com",
  "version": "2.0",
  "mappings": [
    {
      "local_path": "$.user_diet",
      "canonical": "aimmf:DietaryPreference",
      "transform": {
        "vegan": "aimmf:Vegan",
        "vegetarian": "aimmf:Vegetarian"
      }
    }
  ]
}
```

### 4.2 Disambiguation

What if meaning is ambiguous?

System A: `{"apple": "favorite"}`
- Is this the fruit or the company?

#### Context Signals
```json
{
  "content": {"apple": "favorite"},
  "context": {
    "topic_categories": ["technology", "brands"],
    "related_entities": ["iPhone", "MacBook"],
    "confidence": 0.95
  }
}
```

#### Disambiguation Request (Protocol Extension)
```json
{
  "type": "DisambiguationRequest",
  "field": "apple",
  "candidates": [
    {"uri": "wikidata:Q312", "label": "Apple Inc."},
    {"uri": "wikidata:Q89", "label": "apple (fruit)"}
  ]
}
```

---

## Part 5: Trust Model

### 5.1 Memory Authenticity

**Challenge:** How does System B verify that memories truly originated from System A and weren't fabricated?

#### Signed Memory Packages
```
Memory → Hash → Sign with System A's key → Attach signature
```

Verification:
```
Signature + System A's public key → Verify → Trust decision
```

#### Key Distribution
- DIDs resolve to verification keys
- Web-based (did:web) uses HTTPS + well-known endpoint
- DNS-based (did:dns) uses DNSSEC

### 5.2 Reputation System

Not all sources are equally trustworthy. Proposed reputation factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Age** | 10% | How long has the system operated? |
| **Volume** | 10% | How many exchanges completed? |
| **Disputes** | 30% | Rate of user-reported issues |
| **Certification** | 25% | Third-party security audits |
| **Community** | 25% | Peer ratings from other systems |

#### Reputation Score API
```
GET https://registry.aimmf.org/reputation/did:web:anthropic.com
{
  "did": "did:web:anthropic.com",
  "score": 0.94,
  "factors": { ... },
  "last_audit": "2026-01-15",
  "endorsements": ["openai.com", "google.com"]
}
```

### 5.3 User Consent Flow

```
┌─────────┐          ┌────────────┐          ┌─────────┐
│  User   │──grant──→│  System A  │──export─→│System B │
│         │          │  (source)  │          │(target) │
└────┬────┘          └────────────┘          └────┬────┘
     │                                            │
     └───────────── confirm import ───────────────┘
```

User must explicitly:
1. Grant export permission to System A
2. Confirm import to System B
3. Review what will transfer (preview)
4. Accept final import

---

## Part 6: Practical Scenarios

### 6.1 Scenario: Handoff Between Assistants

**Context:** User switches from Claude to GPT mid-task.

**Flow:**
1. User requests handoff: "Share my preferences with GPT"
2. Claude generates export package (filtered by user consent)
3. Claude signs package, includes handoff token
4. User pastes token/link into GPT
5. GPT fetches package, verifies signature
6. GPT presents preview: "Claude shared 12 preferences. Import?"
7. User confirms → GPT imports memories

**Technical Requirements:**
- Short-lived, single-use tokens
- Bandwidth-efficient transfer (1-100KB typical)
- Sub-second latency for seamless UX

### 6.2 Scenario: Migration Between Providers

**Context:** User leaving ChatGPT for Claude permanently.

**Flow:**
1. User initiates in ChatGPT settings: "Export my data"
2. ChatGPT generates AIMMF-compliant export file
3. User downloads file (or receives link)
4. User uploads to Claude: "Import my memories"
5. Claude parses, validates, deduplicates
6. Claude presents summary: "Imported 1,247 memories across 23 categories"

**Technical Requirements:**
- Complete export (not just recent)
- Batch processing (may take minutes)
- Conflict resolution for existing Claude memories

### 6.3 Scenario: Backup and Restore

**Context:** User wants portable backup of all AI memories.

**Flow:**
1. User connects all AI accounts to memory hub (e.g., Solid Pod)
2. Hub aggregates exports on schedule (weekly)
3. Hub normalizes to canonical schema
4. User can restore any subset to any compatible system

**Technical Requirements:**
- Incremental sync (not full export each time)
- Version history
- Cross-provider deduplication

---

## Part 7: Proposed Standard: AI Memory Markup Format (AIMMF)

### 7.1 Design Principles

1. **JSON-native** — Easy to parse, generate, debug
2. **JSON-LD compatible** — Linked data semantics when needed
3. **Schema.org vocabulary** — Build on existing standards
4. **Minimal core** — Small required schema, rich extensions
5. **Privacy-first** — Encryption and filtering built-in
6. **Versioned** — Clear compatibility rules

### 7.2 Core Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://aimmf.org/schema/v1/memory.json",
  "title": "AIMMF Memory Unit",
  "type": "object",
  "required": ["@context", "@type", "id", "version", "created", "content"],
  "properties": {
    "@context": {
      "const": "https://aimmf.org/context/v1"
    },
    "@type": {
      "enum": ["Memory", "Preference", "Fact", "Observation", "Insight", "Conversation"]
    },
    "id": {
      "type": "string",
      "format": "uri",
      "description": "Globally unique identifier (URN/UUID)"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+$"
    },
    "created": {
      "type": "string",
      "format": "date-time"
    },
    "modified": {
      "type": "string",
      "format": "date-time"
    },
    "expires": {
      "type": "string",
      "format": "date-time",
      "description": "When this memory should be considered stale"
    },
    "source": {
      "$ref": "#/$defs/Source"
    },
    "subject": {
      "$ref": "#/$defs/Subject"
    },
    "content": {
      "type": "object",
      "description": "The actual memory payload"
    },
    "metadata": {
      "$ref": "#/$defs/Metadata"
    },
    "provenance": {
      "$ref": "#/$defs/Provenance"
    }
  },
  "$defs": {
    "Source": {
      "type": "object",
      "properties": {
        "system": { "type": "string" },
        "version": { "type": "string" },
        "session": { "type": "string" },
        "did": { "type": "string", "format": "uri" }
      }
    },
    "Subject": {
      "type": "object",
      "required": ["type", "id"],
      "properties": {
        "type": { "enum": ["user", "agent", "session", "organization"] },
        "id": { "type": "string" },
        "did": { "type": "string", "format": "uri" }
      }
    },
    "Metadata": {
      "type": "object",
      "properties": {
        "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
        "importance": { "type": "number", "minimum": 0, "maximum": 1 },
        "categories": { "type": "array", "items": { "type": "string" } },
        "topics": { "type": "array", "items": { "type": "string" } },
        "embedding": { "type": "array", "items": { "type": "number" } },
        "language": { "type": "string" }
      }
    },
    "Provenance": {
      "type": "object",
      "properties": {
        "derivedFrom": { "type": "array", "items": { "type": "string", "format": "uri" } },
        "extractedFrom": { "type": "string", "description": "Original message ID" },
        "method": { "enum": ["explicit", "inferred", "observed", "migrated"] }
      }
    }
  }
}
```

### 7.3 Memory Types

| Type | Description | Example |
|------|-------------|---------|
| **Preference** | User's stated or inferred preference | "Prefers dark mode" |
| **Fact** | Objective information about user | "Lives in NYC" |
| **Observation** | Behavioral pattern | "Often works late" |
| **Insight** | Synthesized understanding | "Stressed about deadlines" |
| **Conversation** | Raw or summarized dialogue | Session transcript |

### 7.4 Export Package Format

```json
{
  "@context": "https://aimmf.org/context/v1",
  "@type": "MemoryExport",
  "id": "urn:uuid:export-12345",
  "created": "2026-02-16T12:00:00Z",
  "exporter": {
    "system": "anthropic.claude",
    "did": "did:web:anthropic.com"
  },
  "subject": {
    "type": "user",
    "id": "user_xyz",
    "did": "did:key:z6Mk..."
  },
  "filter": {
    "categories": ["preferences", "facts"],
    "confidence_min": 0.7
  },
  "stats": {
    "total_memories": 847,
    "exported_memories": 234,
    "filtered_reasons": {
      "low_confidence": 412,
      "excluded_category": 201
    }
  },
  "memories": [
    { /* Memory objects */ }
  ],
  "signature": {
    "type": "JsonWebSignature2020",
    "created": "2026-02-16T12:00:00Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "did:web:anthropic.com#key-1",
    "jws": "eyJhbGciOiJFZDI1NTE5..."
  }
}
```

### 7.5 Protocol Endpoints

#### Export (Pull Model)
```
GET /aimmf/v1/export
Authorization: Bearer <user_token>
Accept: application/aimmf+json

Query params:
- subject_id (required)
- categories (optional, comma-separated)
- since (optional, ISO date)
- format (optional: json, jsonl, zip)
```

#### Import (Push Model)
```
POST /aimmf/v1/import
Authorization: Bearer <user_token>
Content-Type: application/aimmf+json

Body: MemoryExport package

Response:
{
  "imported": 234,
  "duplicates_skipped": 12,
  "conflicts": [
    {"existing": "...", "incoming": "...", "resolution": "pending"}
  ]
}
```

#### Handoff Token
```
POST /aimmf/v1/handoff
Authorization: Bearer <user_token>
Content-Type: application/json

Body:
{
  "recipient_hint": "openai.com",
  "filter": { ... },
  "expires_in_seconds": 3600
}

Response:
{
  "token": "ho_abc123xyz",
  "url": "https://api.anthropic.com/aimmf/v1/handoff/ho_abc123xyz",
  "expires": "2026-02-16T13:00:00Z"
}
```

---

## Part 8: Implementation Considerations

### 8.1 For AI Providers

**Minimum viable implementation:**
1. Export endpoint returning AIMMF JSON
2. User consent flow in settings
3. Signed packages with provider key

**Full implementation:**
1. Import endpoint with conflict resolution
2. Real-time handoff support
3. Filtering capabilities
4. Webhook notifications for memory changes

### 8.2 For Third-Party Memory Systems

**Mem0, Zep, Letta integration:**
1. Adapter layer translating internal format ↔ AIMMF
2. System manifest publishing mappings
3. Signature verification for imports

### 8.3 For Users

**User-facing tools needed:**
1. Memory export/import UI in each provider
2. Preview and filter before transfer
3. Conflict resolution interface
4. Audit log of transfers

### 8.4 Migration Path

**Phase 1: Export-only (unilateral)**
- Providers implement export
- Users can download portable backups
- No import required

**Phase 2: Import support (bilateral)**
- Providers accept AIMMF imports
- User-initiated migrations possible

**Phase 3: Real-time handoff (collaborative)**
- Instant context sharing
- Live assistant switching

### 8.5 Security Considerations

| Threat | Mitigation |
|--------|------------|
| Memory forgery | Cryptographic signatures |
| Eavesdropping | TLS + optional E2E encryption |
| Replay attacks | Nonces and timestamps |
| Scope creep | User-controlled filters |
| Stale memories | Expiration timestamps |
| System impersonation | DID-based identity |

---

## Part 9: Open Questions

### Standards Governance
- Who maintains the AIMMF specification?
- How are disputes resolved?
- What's the process for schema evolution?

### Privacy Regulations
- GDPR "right to data portability" — does AIMMF satisfy it?
- Cross-border transfer restrictions?
- Data retention requirements?

### Competitive Dynamics
- Will major providers actually adopt interoperability?
- First-mover disadvantage vs. user pressure?
- Role of regulation (EU Data Act)?

### Technical Challenges
- Embedding compatibility across different models
- Scaling to millions of memories
- Real-time sync latency guarantees

---

## Part 10: Recommendations

### For the AI Continuity Framework

1. **Adopt AIMMF as internal format** — Design our memory storage to be export-ready from day one

2. **Implement export first** — Let users take their memories elsewhere

3. **Publish a system manifest** — Document our schema mappings publicly

4. **Sign all memories** — Establish cryptographic provenance

5. **Build hub compatibility** — Support Solid-style pod storage

### For the Industry

1. **Form working group** — Convene major providers for standard development

2. **Start with preferences** — Simplest memory type, lowest risk

3. **Leverage Schema.org** — Don't reinvent vocabulary

4. **Require user consent** — Make privacy non-negotiable

### For Research

1. **Embedding standardization** — Can we define a "canonical" embedding space?

2. **Conflict resolution algorithms** — Automated handling of contradictions

3. **Privacy-preserving protocols** — Secure multi-party computation for memory?

---

## Appendix A: Related Standards

| Standard | URL | Relevance |
|----------|-----|-----------|
| JSON-LD 1.1 | https://www.w3.org/TR/json-ld11/ | Linked data in JSON |
| Schema.org | https://schema.org | Shared vocabulary |
| Verifiable Credentials | https://www.w3.org/TR/vc-data-model/ | Signed claims |
| DIDs | https://www.w3.org/TR/did-core/ | Decentralized identity |
| Activity Streams 2.0 | https://www.w3.org/TR/activitystreams-core/ | Action/event model |
| Solid Protocol | https://solidproject.org/TR/protocol | User-owned storage |
| OpenAPI 3.x | https://spec.openapis.org/oas/latest.html | API specification |
| JSONPath (RFC 9535) | https://www.rfc-editor.org/rfc/rfc9535 | Query expressions |

## Appendix B: Example Memory Objects

### Preference
```json
{
  "@context": "https://aimmf.org/context/v1",
  "@type": "Preference",
  "id": "urn:uuid:pref-001",
  "version": "1.0",
  "created": "2026-01-15T09:00:00Z",
  "source": { "system": "anthropic.claude", "version": "3.5" },
  "subject": { "type": "user", "id": "user_xyz" },
  "content": {
    "category": "communication",
    "key": "response_format",
    "value": "bullet_points",
    "strength": "strong"
  },
  "metadata": {
    "confidence": 0.92,
    "importance": 0.7,
    "categories": ["preferences", "communication"]
  },
  "provenance": {
    "method": "inferred",
    "derivedFrom": ["urn:uuid:conv-123", "urn:uuid:conv-456"]
  }
}
```

### Fact
```json
{
  "@context": "https://aimmf.org/context/v1",
  "@type": "Fact",
  "id": "urn:uuid:fact-001",
  "version": "1.0",
  "created": "2026-02-01T14:30:00Z",
  "source": { "system": "openai.gpt", "version": "4o" },
  "subject": { "type": "user", "id": "user_xyz" },
  "content": {
    "schema:location": {
      "@type": "schema:Place",
      "schema:name": "New York City",
      "schema:addressRegion": "NY",
      "schema:addressCountry": "US"
    },
    "relationship": "resides_in"
  },
  "metadata": {
    "confidence": 0.98,
    "categories": ["facts", "location"]
  },
  "provenance": {
    "method": "explicit",
    "extractedFrom": "msg_789"
  }
}
```

---

## Conclusion

AI memory interoperability is technically achievable but organizationally challenging. The pieces exist: JSON-LD for linked data, DIDs for identity, Verifiable Credentials for trust, Solid for user-owned storage. What's missing is coordination.

The AI Continuity Framework should:
1. Design for portability from day one
2. Implement AIMMF-compatible export
3. Advocate for industry adoption
4. Build tools that demonstrate the value

Memory interoperability isn't just a technical feature — it's the foundation for user autonomy in the AI era. Users should own their AI memories the way they own their documents, photos, and messages. AIMMF is a step toward that future.

---

*End of Research Document*
