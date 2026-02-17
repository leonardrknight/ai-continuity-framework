# Memory Summarization: When and How to Compress

*Research for ai-continuity-framework | Iteration 6*  
*Date: 2026-02-16*

---

## Executive Summary

Memory summarization is the critical bridge between infinite experience and finite context. The challenge isn't just *how* to compress—it's knowing *when* to compress, *what* to preserve, and *how* to maintain retrievability. This document explores summarization triggers, techniques, quality metrics, and implementation patterns for AI memory systems.

**Key insight:** Summarization isn't about losing information—it's about changing its *resolution*. Like zooming out on a map, details become neighborhoods, neighborhoods become districts, districts become cities. The information is preserved at a different level of abstraction.

---

## 1. The Compression Challenge

### Why Summarization Matters

AI memory faces fundamental constraints:

| Constraint | Impact |
|------------|--------|
| **Context window limits** | Can't load all memories at once |
| **Storage costs** | Unbounded growth is expensive |
| **Retrieval latency** | Searching millions of records is slow |
| **Attention dilution** | More context ≠ better responses |
| **Token economics** | Every token costs money and time |

### The Information Loss Paradox

**Problem:** Every summary loses something.

- "We had a 2-hour meeting about Q4 strategy" loses *what* was decided
- "User prefers dark mode" loses *why* (eye strain? aesthetics? low-light work?)
- "Project was delayed" loses *how long* and *root cause*

**But:** Not summarizing also loses information—through context overflow, retrieval failures, and attention competition.

The goal isn't zero loss—it's *strategic* loss that preserves what matters.

---

## 2. When to Summarize: Trigger Systems

### 2.1 Age-Based Triggers

**Principle:** Older memories progressively compress as they age.

```
Age 0-7 days:    Full detail (raw messages)
Age 7-30 days:   Session summaries (compress to ~20% of original)
Age 30-90 days:  Weekly digests (compress to ~5%)
Age 90+ days:    Monthly/quarterly highlights (compress to ~1%)
```

**Human analogy:** This mirrors how human memory works—yesterday is vivid, last week is summarized, last year is highlights.

**Implementation pattern:**
```python
def calculate_compression_level(memory_age_days: int) -> str:
    if memory_age_days <= 7:
        return "full"
    elif memory_age_days <= 30:
        return "session_summary"
    elif memory_age_days <= 90:
        return "weekly_digest"
    else:
        return "quarterly_highlights"
```

**Pros:**
- Predictable, simple to implement
- Matches human cognitive patterns
- Natural tiered storage

**Cons:**
- Important recent memories compress too slowly
- Trivial old memories may be kept too long
- Doesn't account for actual importance

### 2.2 Access-Frequency Triggers

**Principle:** Frequently-accessed memories stay detailed; rarely-accessed memories compress.

```
Access Pattern          | Compression Action
------------------------|---------------------
Accessed 3x this week   | Never compress (hot)
Accessed 1x this month  | Compress after 30 days
Never accessed          | Compress after 7 days
```

**Learning from caching:** This is the LRU (Least Recently Used) principle from computer science. Hot data stays accessible; cold data moves to compressed storage.

**Implementation pattern:**
```python
def should_compress(memory: Memory) -> bool:
    days_since_access = (now() - memory.last_accessed).days
    access_count = memory.access_count_30d
    
    if access_count >= 3:
        return False  # Hot memory, keep detailed
    elif access_count >= 1:
        return days_since_access > 30
    else:
        return days_since_access > 7  # Cold, compress quickly
```

**Pros:**
- Self-organizing based on actual utility
- Important memories naturally preserved
- Efficient storage use

**Cons:**
- Chicken-and-egg: can't access what's already compressed
- Gaming risk: importance ≠ access frequency
- Cold start: new memories have no access history

### 2.3 Quality-Based Triggers

**Principle:** Compress low-quality memories aggressively; preserve high-quality ones.

**Quality signals:**
- **Information density:** "User's name is Bob" (high) vs. "Um, well, maybe" (low)
- **Specificity:** Concrete decisions vs. vague discussions
- **Uniqueness:** First-time information vs. repeated content
- **Actionability:** Commitments and deadlines vs. musings

**Implementation pattern:**
```python
def calculate_quality_score(memory: Memory) -> float:
    score = 0.0
    
    # Information density (entities, facts per token)
    score += memory.entity_count / memory.token_count * 10
    
    # Specificity (numbers, dates, proper nouns)
    score += memory.specificity_markers / memory.token_count * 10
    
    # Uniqueness (similarity to existing memories)
    score += (1 - memory.max_similarity_to_existing) * 5
    
    # Actionability (commitments, deadlines, decisions)
    score += memory.actionable_count * 2
    
    return min(score, 10.0)
```

**Pros:**
- Preserves highest-value content
- Can be combined with other triggers
- Objective (not just recency/frequency)

**Cons:**
- Quality metrics are imperfect
- LLM-based quality assessment adds cost
- Novel information might score low on existing metrics

### 2.4 Capacity-Based Triggers

**Principle:** Compress when storage/context budgets are exceeded.

**Budget types:**
- **Token budget:** Total tokens across all memories
- **Count budget:** Maximum number of memory records
- **Context budget:** What fits in working memory for a query
- **Cost budget:** Monthly storage/retrieval costs

**Implementation pattern:**
```python
def enforce_capacity_budget(memories: List[Memory], budget: Budget) -> List[Memory]:
    current_tokens = sum(m.token_count for m in memories)
    
    if current_tokens <= budget.max_tokens:
        return memories  # Within budget
    
    # Sort by importance (combine age, access, quality)
    ranked = sorted(memories, key=lambda m: m.importance_score, reverse=True)
    
    # Keep high-importance, compress low-importance
    kept, to_compress = [], []
    running_tokens = 0
    
    for memory in ranked:
        if running_tokens + memory.token_count <= budget.max_tokens * 0.7:
            kept.append(memory)
            running_tokens += memory.token_count
        else:
            to_compress.append(memory)
    
    # Summarize to_compress into fewer, compressed memories
    compressed = summarize_batch(to_compress)
    
    return kept + compressed
```

**Pros:**
- Hard guarantee on resource usage
- Forces prioritization decisions
- Clear triggers (budget exceeded)

**Cons:**
- Reactive, not proactive
- May compress important memories under pressure
- Sudden compression can lose context

### 2.5 Hybrid Trigger System (Recommended)

**Best practice:** Combine multiple trigger types with weights.

```python
class CompressionDecision:
    def should_compress(self, memory: Memory) -> bool:
        # Never compress protected categories
        if memory.category in PROTECTED_CATEGORIES:
            return False
        
        # Calculate multi-factor score
        age_factor = self.age_score(memory)           # 0-1
        access_factor = self.access_score(memory)     # 0-1
        quality_factor = self.quality_score(memory)   # 0-1 (inverted: low quality = high compress need)
        
        # Weighted combination
        compress_score = (
            age_factor * 0.3 +
            access_factor * 0.3 +
            quality_factor * 0.4
        )
        
        return compress_score > 0.6
    
    def age_score(self, memory: Memory) -> float:
        days = (now() - memory.created_at).days
        return min(days / 30, 1.0)  # Max at 30 days
    
    def access_score(self, memory: Memory) -> float:
        days_since_access = (now() - memory.last_accessed).days
        return min(days_since_access / 14, 1.0)  # Max at 14 days
    
    def quality_score(self, memory: Memory) -> float:
        return 1 - memory.quality_score  # Invert: low quality = compress
```

---

## 3. What to Preserve: The Immortal Categories

Some information should *never* be summarized away. Define these categories explicitly.

### 3.1 Decisions and Commitments

**Why preserve:** Commitments are promises. Summarizing "agreed to 10% discount for VIP customers" to "discussed pricing" breaks the promise.

**Examples:**
- "User said never call before 10am"
- "Agreed to deadline of March 15"
- "User prefers email over phone"
- "Decision: go with Option B"

**Preservation strategy:** Extract to dedicated `decisions` table; never compress; full audit trail.

### 3.2 Emotional Moments

**Why preserve:** Emotional context shapes relationships. "User was upset about the billing error" shouldn't become "discussed billing."

**Examples:**
- Expressions of frustration, gratitude, excitement
- Personal disclosures ("my mother passed away")
- Breakthrough moments in problem-solving
- Celebrations and milestones

**Preservation strategy:** Tag with emotion type; preserve full context; reference in summaries.

### 3.3 User Corrections

**Why preserve:** Corrections are ground truth. If the user says "No, it's Smith, not Smyth," that correction is more valuable than any inference.

**Examples:**
- Name/spelling corrections
- Preference updates ("Actually, I prefer dark mode now")
- Fact corrections ("I have 3 kids, not 2")
- "Don't remember it that way"

**Preservation strategy:** Store as correction pairs (old → new); maintain full context; update base facts.

### 3.4 Unique/Unusual Events

**Why preserve:** Rare events provide asymmetric information value. The one time something unusual happened is worth a thousand routine interactions.

**Examples:**
- First-time events ("first sale to enterprise customer")
- Anomalies ("server crashed during demo")
- Edge cases ("user asked about cryptocurrency")
- Turning points ("decided to pivot the product")

**Preservation strategy:** Flag based on novelty score; preserve full detail; cross-reference in summaries.

### 3.5 Explicit "Remember This"

**Why preserve:** User explicitly flagged as important.

**Examples:**
- "Remember that I'm allergic to shellfish"
- "This is important: the password is..."
- "Don't forget: meeting with John on Friday"

**Preservation strategy:** Never compress; store in protected category; surface proactively.

---

## 4. Summarization Techniques

### 4.1 Extractive Summarization

**How it works:** Select the most important sentences/facts from the original without modification.

```
Original (10 messages):
- "Let's discuss the Q4 roadmap"
- "I think we should focus on mobile"
- "Good point, mobile is 60% of traffic"
- "What about the API work?"
- ...

Extractive Summary:
- "Focus on mobile (60% of traffic)"
- "API work: TBD, depends on resources"
- "Decision: mobile-first for Q4"
```

**Strengths:**
- Faithful to original (no hallucination risk)
- Preserves exact wording
- Simple to implement

**Weaknesses:**
- May miss implied information
- Can be choppy/disconnected
- Limited compression ratio

**Best for:** Preserving exact quotes, decisions, commitments.

### 4.2 Abstractive Summarization

**How it works:** Generate new text that captures the meaning of the original.

```
Original (10 messages):
[Same as above]

Abstractive Summary:
"The team decided to prioritize mobile development for Q4, 
citing that mobile represents 60% of current traffic. API 
work was deferred pending resource availability."
```

**Strengths:**
- Higher compression ratio
- More coherent output
- Can synthesize across messages

**Weaknesses:**
- Hallucination risk
- May lose nuance
- Harder to verify accuracy

**Best for:** General context, background information, non-critical details.

### 4.3 Hierarchical Summarization

**How it works:** Create multiple levels of summary, each more compressed than the last.

```
Level 0 (Original):     Full message history (10,000 tokens)
Level 1 (Session):      Session summaries (2,000 tokens)
Level 2 (Daily):        Daily digests (400 tokens)
Level 3 (Weekly):       Weekly highlights (100 tokens)
Level 4 (Monthly):      Monthly overview (25 tokens)
```

**Implementation:**
```python
class HierarchicalSummarizer:
    def summarize(self, memories: List[Memory], target_level: int) -> Memory:
        current_level = min(m.compression_level for m in memories)
        
        while current_level < target_level:
            # Summarize to next level
            memories = self.compress_to_level(memories, current_level + 1)
            current_level += 1
        
        return memories
    
    def compress_to_level(self, memories: List[Memory], level: int) -> List[Memory]:
        # Group by time period for this level
        groups = self.group_by_period(memories, level)
        
        compressed = []
        for group in groups:
            summary = self.generate_summary(group, level)
            summary.compression_level = level
            summary.source_ids = [m.id for m in group]  # Preserve lineage
            compressed.append(summary)
        
        return compressed
```

**Strengths:**
- Multiple resolution options
- Can zoom in/out as needed
- Natural organization by time

**Weaknesses:**
- Complex to manage
- Redundancy across levels
- Must maintain consistency

**Best for:** Systems with variable context needs, long-term archival.

### 4.4 Incremental Summarization

**How it works:** Update summaries progressively as new information arrives, rather than re-summarizing from scratch.

```
Day 1 Summary: "Started project discussion"
Day 2 Update:  "Started project discussion. Identified three risks."
Day 3 Update:  "Started project discussion. Identified three risks. 
                Risk mitigation plan approved."
```

**Implementation:**
```python
class IncrementalSummarizer:
    def update_summary(self, existing_summary: str, new_content: str) -> str:
        prompt = f"""
        Existing summary: {existing_summary}
        
        New information: {new_content}
        
        Update the summary to incorporate the new information.
        - Add important new facts
        - Update any changed information
        - Keep total length under {MAX_SUMMARY_TOKENS} tokens
        - Preserve key decisions and commitments exactly
        """
        return llm.complete(prompt)
```

**Strengths:**
- Efficient (no re-processing old content)
- Real-time updates
- Maintains continuity

**Weaknesses:**
- Drift risk over many updates
- Can accumulate errors
- Needs periodic full refresh

**Best for:** High-volume systems, real-time applications, cost optimization.

### 4.5 Technique Comparison Matrix

| Technique | Compression | Faithfulness | Cost | Complexity | Best For |
|-----------|-------------|--------------|------|------------|----------|
| **Extractive** | Low (2-3x) | Very High | Low | Low | Critical facts, quotes |
| **Abstractive** | High (10-20x) | Medium | Medium | Medium | Context, background |
| **Hierarchical** | Variable | High | High | High | Multi-resolution needs |
| **Incremental** | Medium (5-10x) | Medium-High | Low | Medium | Real-time, high volume |

**Recommendation:** Use extractive for protected categories, abstractive for general context, and hierarchical for long-term archival.

---

## 5. Summary Quality Metrics

How do you know if a summary is good?

### 5.1 Faithfulness Metrics

**Definition:** Does the summary accurately represent the original?

**Measurement approaches:**

1. **Entailment scoring:** Can the original be inferred from the summary?
   ```python
   def faithfulness_score(original: str, summary: str) -> float:
       # Use NLI model to check entailment
       return nli_model.entailment_probability(premise=summary, hypothesis=original)
   ```

2. **Fact verification:** Extract facts from both; check overlap.
   ```python
   def fact_overlap(original: str, summary: str) -> float:
       original_facts = extract_facts(original)
       summary_facts = extract_facts(summary)
       
       verified = 0
       for fact in summary_facts:
           if any(entails(of, fact) for of in original_facts):
               verified += 1
       
       return verified / len(summary_facts)
   ```

3. **LLM-as-judge:** Ask an LLM to evaluate faithfulness.
   ```python
   def llm_faithfulness(original: str, summary: str) -> float:
       prompt = f"""
       Original: {original}
       Summary: {summary}
       
       Rate the faithfulness of the summary from 0-10.
       Does the summary accurately represent the original?
       Does it add any information not in the original?
       """
       return llm.complete(prompt).score / 10
   ```

### 5.2 Information Preservation Metrics

**Definition:** What percentage of important information is retained?

**Key measurements:**

1. **Entity recall:** What percentage of named entities are preserved?
   ```python
   def entity_recall(original: str, summary: str) -> float:
       original_entities = extract_entities(original)
       summary_entities = extract_entities(summary)
       return len(summary_entities & original_entities) / len(original_entities)
   ```

2. **Key fact recall:** What percentage of key facts are preserved?
   - Extract top-N facts by importance
   - Check if each appears in summary
   - Report recall rate

3. **Decision preservation:** Are all decisions maintained verbatim?
   - Extract decisions from original
   - Verify exact match in summary
   - Binary pass/fail

4. **Compression ratio vs. information retention:**
   ```
   Ideal: 10x compression with 90% information retention
   Acceptable: 20x compression with 70% retention
   Poor: 5x compression with 50% retention
   ```

### 5.3 Hallucination Prevention

**Definition:** Does the summary add false information?

**Detection methods:**

1. **Novelty detection:** Flag information in summary not traceable to original.
   ```python
   def detect_hallucinations(original: str, summary: str) -> List[str]:
       summary_claims = extract_claims(summary)
       original_claims = extract_claims(original)
       
       hallucinations = []
       for claim in summary_claims:
           if not any(supports(oc, claim) for oc in original_claims):
               hallucinations.append(claim)
       
       return hallucinations
   ```

2. **Source citation:** Require every summary claim to cite source message.
   ```python
   def validate_citations(summary_with_citations: str, sources: List[str]) -> bool:
       for claim in extract_cited_claims(summary_with_citations):
           source_id = claim.citation
           if not source_contains(sources[source_id], claim.text):
               return False
       return True
   ```

3. **Round-trip verification:** Can we reconstruct key facts from summary?
   ```python
   def round_trip_verify(original: str, summary: str) -> float:
       # Ask: "Based on this summary, what do we know about X?"
       # Compare to original facts about X
       key_questions = generate_questions(original)
       
       correct = 0
       for question in key_questions:
           answer_from_original = answer_question(question, original)
           answer_from_summary = answer_question(question, summary)
           
           if semantically_equivalent(answer_from_original, answer_from_summary):
               correct += 1
       
       return correct / len(key_questions)
   ```

### 5.4 Quality Scorecard

```python
class SummaryQualityScore:
    faithfulness: float      # 0-1, how accurately it represents original
    entity_recall: float     # 0-1, percentage of entities preserved
    decision_preserved: bool # Binary: all decisions intact?
    hallucination_free: bool # Binary: no added false info?
    compression_ratio: float # e.g., 10.0 = 10x smaller
    
    @property
    def overall_quality(self) -> float:
        if not self.decision_preserved:
            return 0.0  # Critical failure
        if not self.hallucination_free:
            return 0.3  # Severe penalty
        
        return (
            self.faithfulness * 0.4 +
            self.entity_recall * 0.3 +
            min(self.compression_ratio / 20, 0.3)  # Cap at 20x
        )
```

---

## 6. Retrieval from Summaries

Compressed content must remain findable.

### 6.1 The Retrieval Challenge

**Problem:** Searching "What did we decide about the API?" may not match a summary that says "Backend priorities were set."

**Solutions:**

1. **Expanded embedding:** Embed summaries with additional context.
   ```python
   def embed_summary(summary: Summary) -> Vector:
       # Include keywords from original
       keywords = summary.source_keywords
       # Include time context
       time_context = f"From {summary.period_start} to {summary.period_end}"
       # Include topic tags
       topics = ", ".join(summary.topics)
       
       expanded = f"{summary.text}\n\nKeywords: {keywords}\nPeriod: {time_context}\nTopics: {topics}"
       return embedder.embed(expanded)
   ```

2. **Multi-level search:** Search across compression levels.
   ```python
   def search_memories(query: str, levels: List[int] = [0, 1, 2]) -> List[Memory]:
       results = []
       for level in levels:
           level_results = vector_search(query, filter={"level": level})
           results.extend(level_results)
       
       # Deduplicate (summary + its sources)
       return deduplicate_by_lineage(results)
   ```

3. **Summary expansion on demand:** When summary matches, optionally expand.

### 6.2 Summary + Original Hybrid Retrieval

**Strategy:** Return summaries for context, but expand to originals when relevance is high.

```python
def hybrid_retrieve(query: str, top_k: int = 5) -> List[Memory]:
    # Search summaries first (faster, higher-level)
    summary_hits = search_summaries(query, top_k * 2)
    
    results = []
    for hit in summary_hits:
        if hit.relevance_score > 0.9:
            # High relevance: expand to original sources
            originals = get_source_memories(hit.source_ids)
            results.extend(originals)
        else:
            # Medium relevance: use summary
            results.append(hit)
    
    # Re-rank by relevance to query
    return rerank(results, query)[:top_k]
```

### 6.3 Progressive Disclosure Pattern

**Concept:** Start with summaries, drill down on request.

```
Query: "What happened with Project Alpha?"

Response (Level 2 - Monthly):
"Project Alpha had three major phases in Q3: planning (July), 
development (August), and launch (September). Launch was delayed 
by two weeks due to integration issues."

User: "Tell me more about the integration issues"

Response (Level 1 - Weekly):
"Week of Sept 5-9: Integration testing revealed API compatibility 
issues with the payment provider. Team decided to implement a 
compatibility layer rather than wait for provider update."

User: "What exactly was the API issue?"

Response (Level 0 - Original):
[Full conversation transcript from Sept 6 meeting]
```

---

## 7. Reversibility and Audit Trails

Can we "un-summarize"? Should we keep originals?

### 7.1 The Irreversibility Problem

**Fact:** Abstractive summarization is lossy. You cannot perfectly reconstruct the original from a summary.

**Implications:**
- Some information is permanently lost
- Legal/compliance may require originals
- User may ask about details that were compressed away

### 7.2 Retention Strategies

**Strategy 1: Keep Everything (Reference Architecture)**
```
Hot Tier:      Recent full content (7 days)
Warm Tier:     Summaries + source references (30 days)
Cold Tier:     Summaries + archived originals (1+ years)
Frozen Tier:   Summaries only, originals deleted (compliance limit)
```

- Summaries are primary access path
- Originals retrievable but stored cheaply
- Clear retention policies per tier

**Strategy 2: Selective Retention**
- Keep originals for protected categories only
- Delete originals for routine content after summarization
- Store summary lineage (which sources were compressed)

**Strategy 3: Progressive Deletion**
```
Phase 1 (0-30 days):    Full content
Phase 2 (30-90 days):   Summary + compressed original
Phase 3 (90-365 days):  Summary + metadata only
Phase 4 (365+ days):    Summary only (or deleted)
```

### 7.3 Audit Trail Requirements

**What to track:**
- When was the summary created?
- What sources were included?
- What compression technique was used?
- What was the quality score?
- Has the summary been updated since creation?

```python
class SummaryAudit:
    summary_id: str
    created_at: datetime
    source_ids: List[str]
    technique: str  # "extractive", "abstractive", etc.
    compression_ratio: float
    quality_score: float
    model_version: str
    updated_at: Optional[datetime]
    update_history: List[AuditEntry]
```

### 7.4 "Un-summarization" Patterns

**When originals exist:** Simply retrieve and return them.

**When originals are deleted:**
1. Acknowledge the limitation: "I have a summary but not the full details."
2. Offer what's available: "The summary indicates X, but I don't have the specific wording."
3. Suggest alternatives: "Would you like me to note this for future reference?"

**Reconstruction attempts (risky):**
```python
def attempt_reconstruction(summary: Summary, query: str) -> str:
    """
    WARNING: This generates plausible content, not actual history.
    Must be clearly labeled as reconstruction, not memory.
    """
    prompt = f"""
    Based on this summary of past events: {summary.text}
    
    The user is asking about: {query}
    
    Generate a plausible reconstruction of what might have been 
    discussed, but clearly label this as a RECONSTRUCTION, not 
    actual memory. Do not present this as fact.
    """
    return llm.complete(prompt)
```

---

## 8. Implementation Architecture

### 8.1 Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Memory Ingestion                          │
│  [Raw Messages] → [Quality Scorer] → [Category Tagger]      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Compression Engine                        │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ Trigger        │  │ Summarizer     │  │ Quality      │  │
│  │ Evaluator      │→ │ (Multi-mode)   │→ │ Validator    │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
│                                                              │
│  Modes: Extractive | Abstractive | Hierarchical             │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Hot         │  │ Warm        │  │ Cold                │ │
│  │ (Full)      │  │ (Summaries) │  │ (Archive/Summaries) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│  All tiers: Vector-indexed for semantic search              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Retrieval Layer                           │
│                                                              │
│  [Query] → [Multi-Level Search] → [Expansion] → [Rerank]   │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Compression Pipeline

```python
class CompressionPipeline:
    def __init__(self):
        self.trigger_evaluator = TriggerEvaluator()
        self.summarizers = {
            "extractive": ExtractiveSummarizer(),
            "abstractive": AbstractiveSummarizer(),
            "hierarchical": HierarchicalSummarizer(),
        }
        self.quality_validator = QualityValidator()
    
    def process(self, memories: List[Memory]) -> CompressionResult:
        # 1. Evaluate which memories need compression
        to_compress = [m for m in memories if self.trigger_evaluator.should_compress(m)]
        
        # 2. Separate protected categories
        protected = [m for m in to_compress if m.category in PROTECTED_CATEGORIES]
        compressible = [m for m in to_compress if m.category not in PROTECTED_CATEGORIES]
        
        # 3. Choose technique based on content
        summaries = []
        for batch in self.group_by_period(compressible):
            technique = self.select_technique(batch)
            summary = self.summarizers[technique].summarize(batch)
            
            # 4. Validate quality
            quality = self.quality_validator.validate(batch, summary)
            if quality.overall_quality < MIN_QUALITY_THRESHOLD:
                # Retry with more conservative technique
                summary = self.summarizers["extractive"].summarize(batch)
                quality = self.quality_validator.validate(batch, summary)
            
            summary.quality_score = quality
            summary.source_ids = [m.id for m in batch]
            summaries.append(summary)
        
        # 5. Protected categories: extract key facts but don't summarize
        for memory in protected:
            memory.protected = True
            memory.never_compress = True
        
        return CompressionResult(
            summaries=summaries,
            protected=protected,
            original_count=len(to_compress),
            compressed_count=len(summaries),
        )
```

### 8.3 Configuration Schema

```yaml
summarization:
  triggers:
    age_based:
      enabled: true
      thresholds:
        - age_days: 7
          action: session_summary
        - age_days: 30
          action: weekly_digest
        - age_days: 90
          action: monthly_overview
    
    access_based:
      enabled: true
      hot_threshold: 3  # accesses per week
      cold_threshold: 7  # days without access
    
    capacity_based:
      enabled: true
      max_tokens: 1000000
      target_tokens: 700000  # Compress when exceeding max, target this

  protected_categories:
    - decisions
    - commitments
    - user_corrections
    - explicit_remember
    - emotional_moments

  techniques:
    default: abstractive
    protected: extractive
    hierarchical_levels: 4

  quality:
    min_faithfulness: 0.85
    min_entity_recall: 0.70
    require_decision_preservation: true
    require_hallucination_free: true

  retention:
    hot_days: 7
    warm_days: 30
    cold_days: 365
    archive_originals: true
    delete_after_years: 7
```

---

## 9. Practical Recommendations

### 9.1 Start Simple

**Phase 1:** Basic time-based compression
- Summarize sessions older than 7 days
- Use abstractive summarization with quality checks
- Keep all originals in cold storage

**Phase 2:** Add access-frequency awareness
- Track memory access patterns
- Preserve frequently-accessed content
- Compress rarely-accessed content faster

**Phase 3:** Implement protected categories
- Define what should never be compressed
- Add extractive summarization for edge cases
- Build audit trail system

**Phase 4:** Full hierarchical system
- Multiple compression levels
- Progressive disclosure in retrieval
- Sophisticated hybrid search

### 9.2 Key Principles

1. **Err on the side of preservation** — Storage is cheap; lost memories are expensive.

2. **Make compression visible** — Users should know when they're getting a summary vs. original.

3. **Protect what matters** — Define protected categories explicitly and never compress them.

4. **Validate quality** — Every summary should pass quality checks before replacing originals.

5. **Maintain lineage** — Always track what sources were used to create a summary.

6. **Plan for retrieval** — Design compression with search in mind; expand keywords, maintain context.

7. **Allow manual override** — Users can mark memories as "keep full" or "compress now."

### 9.3 Anti-Patterns to Avoid

**❌ Compress everything uniformly** — Different content needs different treatment.

**❌ Delete originals immediately** — Keep them in cold storage until compliance requires deletion.

**❌ Trust summaries blindly** — Validate quality; hallucinations happen.

**❌ Optimize only for storage** — Retrieval quality matters more than compression ratio.

**❌ Summarize without context** — Include temporal, topical, and relational context.

---

## 10. Open Questions

1. **User control:** How much control should users have over compression decisions?

2. **Personalization:** Should compression strategies adapt to individual user patterns?

3. **Cross-reference maintenance:** When summarizing, how do we maintain links to other memories?

4. **Multi-agent consistency:** In shared memory systems, how do we ensure consistent compression?

5. **Emotional memory:** Should emotionally significant memories have different compression rules?

6. **Correction propagation:** When a correction is made, should we update all summaries that reference the incorrect information?

---

## References

- Generative Agents: Interactive Simulacra of Human Behavior (Park et al., 2023)
- MemGPT: Towards LLMs as Operating Systems (Packer et al., 2023)
- Mem0: Memory Layer for AI Applications
- Zep: Long-term Memory for AI Assistants
- LLM Powered Autonomous Agents (Lilian Weng, 2023)

---

*Summarization is not about forgetting—it's about remembering wisely.*
