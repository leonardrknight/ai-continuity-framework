# Document & Contract Storage — Secure Ingestion + Retrieval

**Created:** 2026-03-23
**Priority:** High
**Requested By:** Leo Knight
**Context:** Guardian should handle legal documents, signed PDFs, contracts with secure storage and perfect recall.

---

## The Vision

Users should be able to:
1. **Drop a PDF** (signed contract, agreement, etc.) into Guardian
2. **Guardian secures it** — encrypted bucket, nobody can access without auth
3. **Guardian ingests it** — creates searchable vector representation
4. **User can query it** — "What did we agree to in the Smith contract?"
5. **User can retrieve original** — "Give me the exact document from March 2026"

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Document Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User drops PDF                                                  │
│        │                                                         │
│        ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Ingestion Agent                          ││
│  │                                                              ││
│  │  1. Receive document                                         ││
│  │  2. Generate checksum (SHA-256)                              ││
│  │  3. Upload to secure storage bucket                          ││
│  │  4. OCR/extract text                                         ││
│  │  5. Create document record (metadata)                        ││
│  │  6. Generate embeddings for semantic search                  ││
│  │  7. Link to human_id + timestamp                             ││
│  └─────────────────────────────────────────────────────────────┘│
│        │                                                         │
│        ├──────────────────────┬──────────────────────┐          │
│        ▼                      ▼                      ▼          │
│  ┌───────────┐         ┌───────────────┐      ┌───────────────┐ │
│  │  Secure   │         │   Document    │      │   Vector      │ │
│  │  Storage  │         │   Metadata    │      │   Store       │ │
│  │  Bucket   │         │   (Supabase)  │      │   (Supabase)  │ │
│  │           │         │               │      │               │ │
│  │ • Encrypted│        │ • Filename    │      │ • Chunks      │ │
│  │ • Versioned│        │ • Checksum    │      │ • Embeddings  │ │
│  │ • Signed  │         │ • Uploaded_at │      │ • Sections    │ │
│  │   URLs    │         │ • Human_id    │      │               │ │
│  └───────────┘         │ • Doc_type    │      └───────────────┘ │
│                        │ • Storage_path│                        │
│                        └───────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

```sql
-- Document archive (references to original files)
CREATE TABLE document_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  human_id UUID REFERENCES humans(id),
  
  -- Original file info
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,
  checksum_sha256 TEXT NOT NULL,
  
  -- Storage location
  storage_bucket TEXT NOT NULL,  -- 'legal-documents', 'contracts', etc.
  storage_path TEXT NOT NULL,    -- path within bucket
  
  -- Classification
  document_type TEXT,            -- 'contract', 'agreement', 'receipt', etc.
  parties TEXT[],                -- ['Mi Amigos AI', 'Client X']
  effective_date DATE,
  expiration_date DATE,
  
  -- Processing status
  ocr_completed BOOLEAN DEFAULT FALSE,
  embedding_completed BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  
  -- Knowledge plane (per Guardian model)
  knowledge_plane TEXT DEFAULT 'company',  -- 'company', 'role', 'private'
  
  -- Soft delete
  archived_at TIMESTAMPTZ
);

-- Document text chunks (for semantic search)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES document_archive(id) ON DELETE CASCADE,
  
  chunk_index INT NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI ada-002 or similar
  
  -- Location in original
  page_number INT,
  section_heading TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_doc_archive_human ON document_archive(human_id);
CREATE INDEX idx_doc_archive_type ON document_archive(document_type);
CREATE INDEX idx_doc_chunks_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops);
```

## Storage Security

### Supabase Storage Buckets
```sql
-- Create private bucket for legal documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-documents', 'legal-documents', false);

-- RLS policy: Only document owner can access
CREATE POLICY "Users can access own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'legal-documents' AND
  auth.uid() = (
    SELECT human_id FROM document_archive 
    WHERE storage_path = name
  )
);
```

### Signed URLs for Retrieval
```typescript
// Generate time-limited signed URL for document download
async function getDocumentUrl(documentId: string): Promise<string> {
  const doc = await supabase
    .from('document_archive')
    .select('storage_bucket, storage_path')
    .eq('id', documentId)
    .single();
    
  const { data } = await supabase.storage
    .from(doc.storage_bucket)
    .createSignedUrl(doc.storage_path, 3600); // 1 hour expiry
    
  return data.signedUrl;
}
```

## Query Flow

### Semantic Search
```
User: "What's the termination clause in the Smith contract?"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  1. Embed query                                      │
│  2. Search document_chunks by similarity             │
│  3. Get top matches + their document_ids             │
│  4. Retrieve chunk text + document metadata          │
│  5. Format response with source citations            │
└─────────────────────────────────────────────────────┘
        │
        ▼
"In the Smith contract (signed March 2026), Section 7.2 states:
'Either party may terminate with 30 days written notice...'

[View original document]"
```

### Exact Document Retrieval
```
User: "Send me the original Smith contract"
        │
        ▼
┌─────────────────────────────────────────────────────┐
│  1. Find document by name/date/type                  │
│  2. Generate signed URL                              │
│  3. Return link (expires in 1 hour)                  │
└─────────────────────────────────────────────────────┘
        │
        ▼
"Here's the Smith contract from March 15, 2026:
[Download Original PDF] (link expires in 1 hour)"
```

## Document Types to Support

| Type | Use Case |
|------|----------|
| Contracts | Client agreements, vendor contracts |
| NDAs | Confidentiality agreements |
| Invoices | Billing records |
| Receipts | Expense documentation |
| Proposals | Business proposals |
| Legal Filings | Incorporation docs, trademarks |
| Correspondence | Important emails (saved as PDF) |

## Integration Points

### With Memory System
- Documents create memories: "Signed contract with Smith Corp on March 15"
- Memories link to documents: `source_document_id`

### With Verbatim Archive
- Document upload is logged as an event
- Full audit trail of who uploaded what when

## Success Criteria

- [ ] Users can upload PDFs/documents
- [ ] Documents stored encrypted in secure bucket
- [ ] OCR extracts searchable text
- [ ] Semantic search finds relevant content
- [ ] Original documents retrievable via signed URL
- [ ] RLS ensures users only see their documents
- [ ] Checksums verify document integrity

---

## Future: Blockchain Verification

See separate packet: `2026-03-23-blockchain-contracts`
