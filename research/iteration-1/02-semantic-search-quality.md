# Semantic Search Quality for AI Memory Retrieval

Research findings on why vector embeddings sometimes fail to find obvious matches, and techniques that improve retrieval quality.

---

## The Problem: Why Semantic Search Fails

Vector embeddings compress the "meaning" of text into fixed-dimensional vectors (typically 768-1536 dimensions). This compression inevitably loses information. Common failure modes:

1. **Keyword blindness** — Semantic search may overlook specific keywords like names, rare terms, or jargon
2. **Context collapse** — Short queries lack enough context to find relevant matches
3. **Vocabulary mismatch** — User queries and stored documents may describe the same concept differently
4. **Chunking artifacts** — Relevant information split across chunks becomes unfindable
5. **Embedding model limits** — Models trained on general text may miss domain-specific meanings

**Key insight from Pinecone research:** For text search, a hybrid approach (keyword + semantic) provides more relevant results than either alone. Out-of-domain queries especially suffer with pure semantic search.

---

## 1. Hybrid Search (BM25 + Vector)

### How It Works

Combines two retrieval methods:
- **Sparse vectors (BM25/TF-IDF):** Keyword matching based on term frequency. Excels at exact matches, rare words, proper nouns.
- **Dense vectors (embeddings):** Semantic understanding. Excels at synonyms, paraphrasing, conceptual similarity.

Results are combined using fusion algorithms (typically weighted linear combination or Reciprocal Rank Fusion).

### Implementation

```python
# Pinecone hybrid search example
query = {
    "topK": 10,
    "vector": dense_embedding,           # Semantic
    "sparseVector": {"indices": [...], "values": [...]},  # Keywords
    "alpha": 0.5  # 0 = pure keyword, 1 = pure semantic
}
```

**Alpha tuning:**
- Out-of-domain models: Use lower alpha (0.3-0.6) — lean keyword
- Fine-tuned/in-domain models: Use higher alpha (0.7-1.0) — lean semantic

### When to Use

- Queries containing proper nouns, product codes, technical terms
- Domain-specific jargon the embedding model wasn't trained on
- When users expect exact phrase matching
- E-commerce, legal, medical search

### Implementation Complexity

**Low-Medium.** Most vector databases now support hybrid search natively:
- Pinecone: Native hybrid index (s1h)
- Weaviate: Built-in BM25F + vector fusion
- Qdrant: Sparse vector support + Query API fusion

### Performance Impact

- **Latency:** ~10-20% increase (two searches + fusion)
- **Accuracy:** Significant improvement, especially out-of-domain. Weaviate research shows hybrid consistently outperforms either method alone across NDCG@1000 benchmarks.

---

## 2. Chunking Strategies

### How It Works

Text must be split into chunks before embedding. The chunk size directly impacts retrieval quality:

| Chunk Size | Pros | Cons |
|------------|------|------|
| Small (128 tokens) | Granular, precise matches | May miss context; relevant info scattered |
| Medium (256-512) | Good balance | Standard choice |
| Large (1024-2048) | Full context preserved | Slower; may dilute specific information |

### Key Strategies

**Fixed-size chunking:**
- Simple, predictable
- Risk: Cuts mid-sentence, splits related ideas

**Semantic chunking:**
- Split at natural boundaries (paragraphs, sections, topics)
- Preserves meaning but variable sizes

**Sentence windowing:**
- Embed sentences, but return surrounding context
- Best of both: precise retrieval, full context for LLM

**Parent document retrieval:**
- Embed summaries or chunks
- Return full parent document for synthesis
- LangChain's Multi-Vector Retriever implements this

### LlamaIndex Findings

Testing chunk sizes on Uber 10K filings:

| Chunk Size | Response Time | Faithfulness | Relevancy |
|------------|--------------|--------------|-----------|
| 128 | Fastest | Lower | Lower |
| 512 | Moderate | Good | Good |
| 1024 | Slower | **Highest** | **Highest** |
| 2048 | Slowest | High | High |

**Optimal:** 1024 tokens struck the best balance in their evaluation.

### When to Use

- **Small chunks:** FAQ, specific facts, Q&A pairs
- **Large chunks:** Long-form analysis, documents requiring full context
- **Parent document:** When you need precision retrieval + comprehensive answers

### Implementation Complexity

**Low.** Most frameworks support configurable chunking. Semantic chunking requires additional processing but libraries exist.

### Performance Impact

- **Latency:** Larger chunks = more tokens = slower embedding/retrieval
- **Accuracy:** Domain-dependent. Must test empirically for your data.

---

## 3. Reranking

### How It Works

Two-stage retrieval:
1. **Stage 1 (Retriever):** Fast, broad search returns top-K candidates (e.g., 50-100)
2. **Stage 2 (Reranker):** Slower, accurate model re-scores and reorders top-N results

Rerankers (cross-encoders) are more accurate than bi-encoders because:
- They process query + document together (no information compression)
- They can model fine-grained interactions between query and document tokens

### Available Models

**Cohere Rerank:**
- `rerank-v4.0-pro`: State-of-the-art quality, multilingual
- `rerank-v4.0-fast`: Lower latency, slightly reduced quality
- `rerank-v3.5`: 4096 token context, good balance

**Open Source:**
- BGE Reranker v2 M3 (via Pinecone Inference)
- ColBERT (late interaction model)
- Cross-encoder models from Sentence Transformers

**ColBERT (Late Interaction):**
- Creates embeddings per token, not per document
- Scores via token-level interaction at query time
- Faster than cross-encoders, more accurate than bi-encoders
- Document embeddings can be precomputed

### Implementation

```python
# Pinecone reranking
rerank_docs = pc.inference.rerank(
    model="bge-reranker-v2-m3",
    query=query,
    documents=docs,
    top_n=10,
    return_documents=True
)
```

### When to Use

- When top-K vector results include irrelevant items
- High-stakes retrieval (legal, medical, compliance)
- When you can afford 50-100ms additional latency
- RAG pipelines where answer quality is critical

### Implementation Complexity

**Low.** API call to Cohere or similar. Self-hosted requires GPU but straightforward.

### Performance Impact

- **Latency:** +50-200ms depending on document count and model
- **Accuracy:** Dramatic improvement. Pinecone's evaluation showed reranking surfaced highly relevant content that was ranked lower (positions 10-25) up to top-3.

**Example:** For query "why use RLHF?", reranking promoted documents from positions 14 and 23 to positions 1 and 2, dramatically improving answer quality.

---

## 4. Query Expansion & HyDE

### How It Works

**Query Expansion:** Generate multiple query variations to increase recall.

**HyDE (Hypothetical Document Embedding):**
1. LLM generates a hypothetical answer document for the query
2. Embed the hypothetical document (not the query)
3. Search for real documents similar to the hypothetical

The hypothetical document captures relevance patterns better than short queries, grounding retrieval in expected answer format.

### HyDE Example

```
Query: "What is the capital of France?"

Hypothetical Document (LLM-generated):
"Paris is the capital and most populous city of France. 
Located on the Seine River, Paris has been a major European 
city for centuries..."

→ Embed this, search for similar real documents
```

### Research Results (arXiv 2212.10496)

HyDE significantly outperformed unsupervised dense retrievers (Contriever) and showed performance comparable to fine-tuned retrievers across:
- Web search
- Question answering
- Fact verification
- Multiple languages (including Korean, Japanese, Swahili)

### When to Use

- Zero-shot retrieval (no training data)
- Short, ambiguous queries
- Cross-domain search
- When query and document vocabularies differ significantly

### Implementation Complexity

**Medium.** Requires LLM call before retrieval. Additional latency and cost.

### Performance Impact

- **Latency:** +500-2000ms (LLM generation)
- **Accuracy:** Strong improvement for zero-shot, diminishing returns for fine-tuned systems

---

## 5. Metadata Filtering

### How It Works

Combine vector search with structured filters:

```python
results = index.query(
    vector=query_embedding,
    filter={
        "date": {"$gte": "2024-01-01"},
        "category": "conversation",
        "user_id": "leo"
    },
    top_k=10
)
```

### Common Metadata for Memory Systems

- **Timestamp:** Filter by time range, recency
- **Category:** Conversation, task, preference, fact
- **Source:** Where the memory came from
- **Importance:** Priority/weight for retrieval
- **Entity mentions:** People, places, topics
- **Session ID:** Group related memories

### LangChain Self-Query Retriever

Automatically extracts filters from natural language:

```
Query: "What did Leo say about AI projects last month?"
→ filter: {user: "leo", topic: "AI", date: {$gte: "2024-01-01"}}
```

### When to Use

- Time-sensitive retrieval ("last week's conversations")
- Multi-user systems (filter by user)
- Category-based memory ("find all preferences")
- Reducing search space for faster retrieval

### Implementation Complexity

**Low.** Most vector databases support metadata filtering. Self-query requires LLM parsing.

### Performance Impact

- **Latency:** Faster (smaller search space)
- **Accuracy:** Depends on metadata quality. Well-structured metadata dramatically improves precision.

---

## 6. Embedding Model Comparison

### Benchmark: MTEB (Massive Text Embedding Benchmark)

56 datasets, 8 task types, 2000+ evaluated models.

### Key Models

| Model | MTEB Avg | MIRACL (Multilingual) | Dimensions | Speed |
|-------|----------|----------------------|------------|-------|
| text-embedding-ada-002 | 61.0 | 31.4 | 1536 | Fast |
| text-embedding-3-small | 62.3 | 44.0 | 1536 | Fast |
| text-embedding-3-large | 64.6 | 54.9 | 3072 | Moderate |
| all-mpnet-base-v2 | ~63 | - | 768 | Fast |
| all-MiniLM-L6-v2 | ~58 | - | 384 | Very Fast |
| Cohere embed-v3 | ~64 | High | 1024 | Fast |

### OpenAI text-embedding-3 Features

- **Matryoshka embeddings:** Truncate dimensions without retraining
- **Shortened dimensions:** 256-dim text-embedding-3-large outperforms full ada-002
- **Multilingual:** Significant improvement on MIRACL (31% → 55%)

### Open Source Options

**Sentence Transformers:**
- `multi-qa-mpnet-base-cos-v1`: Best for semantic search (57.6 on 6 datasets)
- `all-MiniLM-L6-v2`: 5x faster, good quality
- `msmarco-distilbert-base-tas-b`: Trained on real search queries

**INSTRUCTOR models:**
- Accept task instructions: "Represent this for retrieval..."
- Can specialize embeddings per task

### When to Use What

- **Production, cost-sensitive:** text-embedding-3-small (5x cheaper than ada-002)
- **Maximum quality:** text-embedding-3-large or Cohere embed-v3
- **Self-hosted:** all-mpnet-base-v2 or fine-tuned model
- **Speed-critical:** all-MiniLM-L6-v2 (18k queries/sec GPU)
- **Multilingual:** text-embedding-3-large or LaBSE

### Implementation Complexity

**Low.** API swap. Consider dimension requirements for vector storage.

### Performance Impact

- **Latency:** Larger models = slower
- **Accuracy:** Up to 5-10% improvement between model generations

---

## 7. Reciprocal Rank Fusion (RRF)

### How It Works

Combines ranked results from multiple retrieval methods:

```
RRF_score(d) = Σ 1 / (k + rank(d))
```

Where `k` is a constant (typically 60) and `rank(d)` is the document's position in each list.

### Example

| Document | BM25 Rank | Vector Rank | RRF Score |
|----------|-----------|-------------|-----------|
| A | 1 | 3 | 1/1 + 1/3 = 1.33 |
| B | 2 | 1 | 1/2 + 1/1 = 1.50 ✓ |
| C | 3 | 2 | 1/3 + 1/2 = 0.83 |

**Result:** Document B wins despite not being #1 in either list.

### Why Not Linear Combination?

Qdrant research showed that BM25 + cosine similarity scores are **not linearly separable**. Relevant and non-relevant documents overlap when plotted in 2D score space. No linear formula can distinguish them.

RRF works because it uses **ranks**, not scores — making it robust to different score distributions.

### When to Use

- Combining any multiple retrieval methods
- When score distributions differ between methods
- Ensemble retrieval systems

### Implementation Complexity

**Low.** Simple formula. Built into Weaviate, Qdrant, and easily implemented manually.

### Performance Impact

- **Latency:** Negligible (simple computation)
- **Accuracy:** Consistently improves over single methods. Weaviate default alpha of 0.75 reflects this.

---

## Real-World Examples

### Pinecone's Hybrid Index

Built unified hybrid index (dense + sparse vectors) to eliminate managing multiple search systems. Research showed hybrid consistently outperformed standalone semantic or keyword search across in-domain and out-of-domain evaluations.

### Cohere's RAG System

Uses Rerank as a core component. Their documentation emphasizes: "Rerank provides a semantic boost to search quality" — critical for enterprise knowledge retrieval where precision matters.

### LangChain's Multi-Vector Retriever

Solves the "chunking problem" by:
1. Embedding summaries (optimized for search)
2. Returning full documents (optimized for LLM synthesis)

Used successfully for RAG on tables, images, and semi-structured documents.

### Weaviate's Production Guidance

Default hybrid search with alpha=0.75 (favor vector, but include keyword). Recommendation: Always use hybrid unless you have specific reasons not to.

---

## RECOMMENDATION: Natural Memory Retrieval

For an AI assistant's memory system that needs to feel "natural" (not forced retrieval), I recommend this architecture:

### Core Stack

1. **Embedding Model:** `text-embedding-3-small`
   - Good quality, 5x cheaper than ada-002
   - Sufficient for conversational memory
   - Consider `text-embedding-3-large` if multilingual critical

2. **Hybrid Search:** BM25 + Vector (alpha=0.6)
   - Catches proper nouns, dates, specific phrases
   - Semantic handles paraphrasing
   - Lower alpha because memory queries often contain specific terms

3. **Chunking:** Semantic boundaries, ~512 tokens
   - Conversations naturally chunk at topic shifts
   - Store original context as metadata for full retrieval

4. **Metadata Filtering:**
   - Timestamp (always filter by relevant time window)
   - Category (conversation, fact, preference, task)
   - Importance score (surface high-priority memories first)

5. **Lightweight Reranking:** Optional, trigger on low-confidence
   - Don't rerank every query (latency cost)
   - Rerank when top results have low/similar scores
   - Use `bge-reranker-v2-m3` (fast, good quality)

### "Natural" Feel Optimizations

- **Don't over-retrieve:** Return 3-5 highly relevant memories, not 10 mediocre ones
- **Recency bias:** Weight recent memories higher for conversational context
- **Confidence threshold:** Only surface memories above a relevance threshold
- **Graceful degradation:** If nothing matches well, don't force irrelevant content
- **Background indexing:** Update memory embeddings asynchronously, not in conversation flow

### Architecture Summary

```
Query → Hybrid Search (BM25 + Vector, α=0.6)
      → Metadata filter (time, category)
      → Top-K candidates (20-50)
      → [Optional] Rerank if confidence low
      → Return top 3-5 relevant memories
      → Threshold check (skip if all scores < 0.7)
```

### Estimated Performance

- **Latency:** 50-150ms typical (no rerank), +100ms with rerank
- **Accuracy:** High — hybrid catches both semantic and exact matches
- **Natural feel:** Threshold + limited results prevent memory "spam"

### Future Enhancements

- **HyDE for ambiguous queries:** When user query is vague, generate hypothetical memory first
- **ColBERT reranking:** If precision becomes critical, late interaction provides accuracy boost without cross-encoder latency
- **Query expansion:** For "find similar" use cases, generate query variations

---

## Sources

- Pinecone: Hybrid Search, Rerankers documentation
- Weaviate: Hybrid Search Explained
- Qdrant: Hybrid Search with Query API
- Cohere: Rerank documentation
- LlamaIndex: Evaluating Chunk Size for RAG
- LangChain: Multi-Vector Retriever
- arXiv 2212.10496: HyDE - Precise Zero-Shot Dense Retrieval
- Hugging Face: MTEB Benchmark
- OpenAI: text-embedding-3 announcement
- Sentence Transformers: Pretrained Models documentation
