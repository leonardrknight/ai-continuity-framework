# Verbatim Archive — Perfect Conversation Storage

**Created:** 2026-03-23
**Priority:** High
**Requested By:** Leo Knight
**Context:** Guardian must maintain complete verbatim records of all conversations, documents, and artifacts.

---

## The Problem

Currently, memories are semantic extractions — useful for recall, but the exact words are lost. Leo needs:

1. **Verbatim conversation logs** — Exactly what was said, by whom, when
2. **Document storage** — PDFs, signed agreements, images stored as-is
3. **Linkage** — Semantic memories point back to source documents
4. **Auditability** — "Show me exactly what Leo said on March 15th about the RecallTech timeline"

## The Vision

Two-tier memory architecture:

### Tier 1: Verbatim Archive (Audit Log)
- Complete conversation transcripts
- Original documents (stored in object storage)
- Immutable — never modified after creation
- Per-human separation (private conversations stay private)

### Tier 2: Semantic Memory (Current System)
- Extracted facts, decisions, preferences
- Searchable via embeddings
- **Links back to Tier 1 sources**

## Proposed Schema

```sql
-- Tier 1: Verbatim conversations
CREATE TABLE conversation_logs (
  id UUID PRIMARY KEY,
  human_id UUID REFERENCES humans(id),
  session_key TEXT,
  timestamp TIMESTAMPTZ,
  role TEXT, -- 'human' or 'assistant'
  content TEXT, -- exact message
  content_hash TEXT, -- for integrity verification
  metadata JSONB -- channel, attachments, etc.
);

-- Tier 1: Document storage references
CREATE TABLE document_archive (
  id UUID PRIMARY KEY,
  human_id UUID, -- who provided it
  storage_path TEXT, -- Supabase Storage path
  original_filename TEXT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ,
  checksum TEXT,
  metadata JSONB -- OCR text, processing status, etc.
);

-- Link semantic memories to sources
ALTER TABLE memories ADD COLUMN source_conversation_id UUID REFERENCES conversation_logs(id);
ALTER TABLE memories ADD COLUMN source_document_id UUID REFERENCES document_archive(id);
```

## Implementation Components

1. **Conversation Logger** — Captures every message before/after Scribe processing
2. **Document Ingester** — Stores documents to object storage, extracts text for memories
3. **Source Linker** — Attaches source references to semantic memories
4. **Recall Enhancement** — When retrieving memories, can fetch original context

## Privacy Considerations

- Verbatim logs inherit the same `knowledge_plane` as semantic memories
- Private conversations NEVER visible to other humans
- Company conversations visible per role/permissions
- Document access respects same boundaries

## Success Criteria

- [ ] Database schema designed
- [ ] Storage bucket structure defined
- [ ] Conversation logging integrated into message flow
- [ ] Document ingestion pipeline designed
- [ ] Source linking mechanism defined
- [ ] Recall queries can fetch original context

---

## Implementation Notes

This requires:
- Database migration for new tables
- Supabase Storage bucket setup
- Integration with existing Guardian agents
- May need Clawdbot plugin updates for conversation capture
