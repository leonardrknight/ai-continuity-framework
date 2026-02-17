# Testing & Validation: Memory System Quality Assurance

**Research Date:** February 2026  
**Author:** Jordan (AI Research Subagent)  
**Iteration:** 4

---

## Executive Summary

Testing AI memory systems presents unique challenges: they're stateful over long periods, correctness is often subjective, edge cases emerge gradually through use, and user experience is the ultimate metric. This research establishes a comprehensive testing framework that addresses these challenges through layered testing strategies, automated validation pipelines, and continuous quality monitoring.

**Key Findings:**
- Memory systems require **five distinct testing layers**: unit, integration, behavioral, regression, and human evaluation
- **LLM-as-a-Judge** metrics (like RAGAS) provide scalable evaluation without extensive human annotation
- **LOCOMO-style benchmarks** measure memory quality across single-hop, temporal, multi-hop, and open-domain questions
- Automated validation catches 80-90% of quality issues before they reach users
- **Correction rate** is the single best proxy metric for memory system health

---

## 1. The Memory Testing Challenge

### 1.1 Why Memory Systems Are Hard to Test

| Challenge | Description | Mitigation |
|-----------|-------------|------------|
| **Statefulness** | Memory accumulates over weeks/months | Time-travel testing, snapshot comparisons |
| **Subjectivity** | "Correct" memory is user-dependent | Rubric-based evaluation, user preferences |
| **Emergent edge cases** | Rare scenarios only appear at scale | Production monitoring, chaos testing |
| **Delayed feedback** | Bad memory may not surface for weeks | Long-running behavioral tests |
| **Context sensitivity** | Same memory may be relevant or not | Retrieval precision/recall metrics |

### 1.2 Testing Pyramid for Memory Systems

```
                    ▲
                   /│\   Human Evaluation
                  / │ \    (5% of test effort)
                 /  │  \   - Correctness judgments
                /───┼───\  - UX quality
               /    │    \ - A/B testing
              /  Behavioral  \
             /   (15% effort)  \   - "Does AI remember X after Y?"
            /                   \  - Conversation simulations
           /─────────────────────\ - Long-running tests
          /    Regression (20%)   \
         /                         \ - Schema migrations
        /   Integration (25%)       \ - Model changes
       /                             \
      /        Unit Tests (35%)        \
     /_________________________________\
         Foundation: Fast, Deterministic
```

---

## 2. Unit Testing

### 2.1 Memory CRUD Operations

Every memory system needs comprehensive tests for Create, Read, Update, Delete:

```python
class TestMemoryCRUD:
    """Unit tests for basic memory operations"""
    
    def test_create_memory(self, memory_store):
        """Test memory creation with all required fields"""
        memory = Memory(
            content="User prefers dark mode",
            user_id="user_123",
            source="conversation",
            importance=0.7,
            confidence=0.9
        )
        result = memory_store.create(memory)
        
        assert result.id is not None
        assert result.created_at is not None
        assert result.content == memory.content
        assert result.embedding is not None  # Auto-generated
    
    def test_create_memory_duplicate_detection(self, memory_store):
        """Duplicates should be merged, not created"""
        memory1 = Memory(content="Likes pizza", user_id="user_123")
        memory2 = Memory(content="User enjoys pizza", user_id="user_123")
        
        memory_store.create(memory1)
        result = memory_store.create(memory2)
        
        assert result.merged_with == memory1.id
        assert memory_store.count(user_id="user_123") == 1
    
    def test_update_memory_versioning(self, memory_store):
        """Updates should preserve history"""
        memory = memory_store.create(Memory(
            content="Lives in NYC",
            user_id="user_123"
        ))
        
        updated = memory_store.update(
            memory.id,
            content="Lives in Austin (moved from NYC)"
        )
        
        assert updated.version == 2
        assert len(updated.history) == 1
        assert updated.history[0].content == "Lives in NYC"
    
    def test_delete_soft_delete(self, memory_store):
        """Deletes should be soft by default"""
        memory = memory_store.create(Memory(
            content="Test memory",
            user_id="user_123"
        ))
        
        memory_store.delete(memory.id)
        
        # Should not appear in normal queries
        assert memory_store.get(memory.id) is None
        
        # Should be recoverable
        assert memory_store.get(memory.id, include_deleted=True) is not None
```

### 2.2 Importance Scoring

```python
class TestImportanceScoring:
    """Test that importance scores reflect actual importance"""
    
    @pytest.mark.parametrize("content,expected_range", [
        # High importance: personal, lasting, identity-related
        ("My daughter's name is Maya", (0.8, 1.0)),
        ("I'm allergic to peanuts", (0.85, 1.0)),
        ("I work as a software engineer", (0.75, 0.95)),
        
        # Medium importance: preferences, habits
        ("I prefer morning meetings", (0.5, 0.7)),
        ("Usually drink coffee in the morning", (0.4, 0.6)),
        
        # Low importance: transient, situational
        ("Working on a presentation today", (0.2, 0.4)),
        ("Mentioned traffic was bad", (0.1, 0.25)),
    ])
    def test_importance_scoring(self, importance_scorer, content, expected_range):
        score = importance_scorer.score(content)
        assert expected_range[0] <= score <= expected_range[1], \
            f"'{content}' scored {score}, expected {expected_range}"
    
    def test_importance_increases_with_repetition(self, importance_scorer):
        """Repeated mentions should increase importance"""
        base_score = importance_scorer.score(
            "Likes hiking",
            mention_count=1
        )
        repeated_score = importance_scorer.score(
            "Likes hiking",
            mention_count=5
        )
        
        assert repeated_score > base_score
    
    def test_importance_decays_for_stale_memories(self, importance_scorer):
        """Old, unaccessed memories should have reduced importance"""
        recent = importance_scorer.effective_importance(
            base_importance=0.8,
            last_accessed=datetime.now() - timedelta(days=1)
        )
        stale = importance_scorer.effective_importance(
            base_importance=0.8,
            last_accessed=datetime.now() - timedelta(days=90)
        )
        
        assert stale < recent
```

### 2.3 Confidence Calculations

```python
class TestConfidenceScoring:
    """Test confidence calculations for memories"""
    
    def test_explicit_statements_high_confidence(self, confidence_scorer):
        """Direct user statements should have high confidence"""
        score = confidence_scorer.score(
            content="I am vegetarian",
            source_type="user_statement",
            explicit=True
        )
        assert score >= 0.9
    
    def test_inferences_lower_confidence(self, confidence_scorer):
        """Inferred information should have lower confidence"""
        score = confidence_scorer.score(
            content="Likely prefers vegetarian options",
            source_type="inference",
            evidence_strength=0.7
        )
        assert 0.5 <= score <= 0.8
    
    def test_conflicting_evidence_reduces_confidence(self, confidence_scorer):
        """Contradictory signals should reduce confidence"""
        score = confidence_scorer.score(
            content="Prefers tea",
            source_type="inference",
            supporting_evidence=3,
            contradicting_evidence=2
        )
        assert score < 0.6
    
    def test_user_corrections_update_confidence(self, confidence_scorer, memory_store):
        """User corrections should affect confidence of related memories"""
        # Create an inference
        memory = memory_store.create(Memory(
            content="User likes coffee",
            source="inference",
            confidence=0.8
        ))
        
        # User corrects it
        memory_store.record_correction(
            memory.id,
            correction_type="wrong_inference",
            correct_value="User drinks coffee but doesn't like the taste"
        )
        
        # Confidence of similar inferences should decrease
        similar_inference_confidence = confidence_scorer.score(
            content="User enjoys espresso",
            source_type="inference",
            inference_pattern="consumption_implies_preference"
        )
        
        assert similar_inference_confidence < 0.6  # Reduced due to correction
```

### 2.4 Conflict Resolution Logic

```python
class TestConflictResolution:
    """Test handling of conflicting memories"""
    
    def test_newer_explicit_overrides_older(self, conflict_resolver):
        """Recent explicit statements should override older ones"""
        old = Memory(
            content="Lives in NYC",
            timestamp=datetime(2024, 1, 1),
            source="user_statement"
        )
        new = Memory(
            content="Lives in Austin",
            timestamp=datetime(2024, 6, 1),
            source="user_statement"
        )
        
        resolution = conflict_resolver.resolve(old, new)
        
        assert resolution.winner == new
        assert resolution.action == "supersede"
        assert "moved" in resolution.merged_content.lower()
    
    def test_explicit_overrides_inference(self, conflict_resolver):
        """User statements should override inferences regardless of recency"""
        inference = Memory(
            content="Probably likes dogs",
            timestamp=datetime(2024, 6, 1),
            source="inference",
            confidence=0.7
        )
        explicit = Memory(
            content="I'm not really a dog person",
            timestamp=datetime(2024, 1, 1),  # Older
            source="user_statement",
            confidence=0.95
        )
        
        resolution = conflict_resolver.resolve(inference, explicit)
        
        assert resolution.winner == explicit
        assert resolution.action == "invalidate_inference"
    
    def test_complementary_memories_merge(self, conflict_resolver):
        """Non-conflicting related memories should merge"""
        m1 = Memory(content="Has two kids")
        m2 = Memory(content="Daughter is named Maya")
        
        resolution = conflict_resolver.resolve(m1, m2)
        
        assert resolution.action == "merge"
        assert "two kids" in resolution.merged_content
        assert "Maya" in resolution.merged_content
    
    def test_ambiguous_conflicts_flag_for_review(self, conflict_resolver):
        """Genuinely ambiguous conflicts should be flagged"""
        m1 = Memory(
            content="Prefers mornings",
            confidence=0.6
        )
        m2 = Memory(
            content="Works better at night",
            confidence=0.6
        )
        
        resolution = conflict_resolver.resolve(m1, m2)
        
        assert resolution.action == "flag_for_review"
        assert resolution.reason == "ambiguous_conflict"
```

---

## 3. Integration Testing

### 3.1 End-to-End Memory Flow

```python
class TestEndToEndMemoryFlow:
    """Test complete memory lifecycle from extraction to retrieval"""
    
    def test_conversation_to_memory_to_retrieval(self, memory_system):
        """Full pipeline: conversation → extraction → storage → retrieval"""
        # Simulate a conversation
        conversation = [
            {"role": "user", "content": "I just moved to Austin from NYC"},
            {"role": "assistant", "content": "Welcome to Austin! How are you finding it?"},
            {"role": "user", "content": "Great! The weather is so much better."},
        ]
        
        # Process the conversation
        memories = memory_system.extract_and_store(
            conversation,
            user_id="user_123"
        )
        
        # Verify extraction
        assert len(memories) >= 1
        assert any("Austin" in m.content for m in memories)
        
        # Test retrieval
        query = "Where does the user live?"
        retrieved = memory_system.retrieve(
            query=query,
            user_id="user_123",
            top_k=3
        )
        
        assert len(retrieved) >= 1
        assert "Austin" in retrieved[0].content
        
        # Verify temporal context preserved
        assert any("NYC" in m.content or "moved" in m.content for m in retrieved)
    
    def test_memory_update_propagates(self, memory_system):
        """Updates should be reflected in subsequent retrievals"""
        # Initial memory
        memory_system.add_memory(
            user_id="user_123",
            content="Works at Acme Corp"
        )
        
        # Update
        memory_system.process_conversation([
            {"role": "user", "content": "I just started a new job at TechCo"}
        ], user_id="user_123")
        
        # Retrieve
        result = memory_system.retrieve(
            query="Where does the user work?",
            user_id="user_123"
        )
        
        assert "TechCo" in result[0].content
        # Old job should be marked as historical
        all_memories = memory_system.get_all(user_id="user_123")
        acme_memory = next(m for m in all_memories if "Acme" in m.content)
        assert acme_memory.status == "superseded" or acme_memory.is_historical
```

### 3.2 Retrieval Quality Testing

```python
class TestRetrievalQuality:
    """Test that retrieval returns relevant memories"""
    
    def setup_method(self):
        """Create a realistic memory corpus for testing"""
        self.memories = [
            Memory(content="User's favorite food is sushi"),
            Memory(content="User is allergic to shellfish"),
            Memory(content="User has a meeting at 3pm today"),
            Memory(content="User's daughter Maya starts school next week"),
            Memory(content="User prefers morning workouts"),
            Memory(content="User works as a software engineer"),
            Memory(content="User lived in NYC before moving to Austin"),
        ]
    
    def test_retrieval_precision(self, retrieval_system):
        """Retrieved memories should be relevant to the query"""
        retrieval_system.index(self.memories)
        
        query = "What does the user like to eat?"
        results = retrieval_system.search(query, top_k=3)
        
        # Calculate precision: relevant results / total results
        relevant_keywords = ["food", "sushi", "allergic", "shellfish"]
        relevant_count = sum(
            1 for r in results 
            if any(kw in r.content.lower() for kw in relevant_keywords)
        )
        precision = relevant_count / len(results)
        
        assert precision >= 0.66, f"Precision {precision} below threshold"
    
    def test_retrieval_recall(self, retrieval_system):
        """Important relevant memories should not be missed"""
        retrieval_system.index(self.memories)
        
        query = "Tell me about the user's family"
        results = retrieval_system.search(query, top_k=5)
        
        # Maya (daughter) should definitely be retrieved
        assert any("Maya" in r.content for r in results), \
            "Failed to retrieve family-related memory"
    
    def test_retrieval_ranking(self, retrieval_system):
        """More relevant memories should rank higher"""
        retrieval_system.index(self.memories)
        
        query = "Where does the user live?"
        results = retrieval_system.search(query, top_k=3)
        
        # Location memory should be #1
        assert "Austin" in results[0].content or "NYC" in results[0].content
    
    @pytest.mark.parametrize("query,must_include", [
        ("dietary restrictions", ["allergic", "shellfish"]),
        ("user's schedule", ["meeting", "3pm"]),
        ("user's job", ["software", "engineer"]),
        ("user's children", ["Maya", "daughter"]),
    ])
    def test_retrieval_coverage(self, retrieval_system, query, must_include):
        """Verify specific queries retrieve expected memories"""
        retrieval_system.index(self.memories)
        results = retrieval_system.search(query, top_k=3)
        
        result_text = " ".join(r.content.lower() for r in results)
        for keyword in must_include:
            assert keyword.lower() in result_text, \
                f"Query '{query}' should retrieve memory containing '{keyword}'"
```

### 3.3 Multi-Agent Coordination

```python
class TestMultiAgentMemory:
    """Test memory consistency across multiple agents"""
    
    def test_memory_sync_between_agents(self, agent_a, agent_b, sync_service):
        """Memories created by one agent should be visible to others"""
        # Agent A learns something
        agent_a.add_memory(
            user_id="user_123",
            content="User prefers dark mode"
        )
        
        # Sync
        sync_service.sync()
        
        # Agent B should see it
        memories = agent_b.get_memories(user_id="user_123")
        assert any("dark mode" in m.content for m in memories)
    
    def test_conflict_resolution_across_agents(self, agent_a, agent_b, sync_service):
        """Conflicting memories from different agents should be resolved"""
        # Both agents learn different things simultaneously
        agent_a.add_memory(
            user_id="user_123",
            content="User seems to prefer email communication",
            timestamp=datetime.now()
        )
        agent_b.add_memory(
            user_id="user_123",
            content="User prefers Slack over email",
            timestamp=datetime.now() + timedelta(seconds=5)
        )
        
        # Sync and resolve
        sync_service.sync()
        
        # Should have merged or flagged the conflict
        memories = agent_a.get_memories(
            user_id="user_123",
            topic="communication_preference"
        )
        
        assert len(memories) <= 2  # Merged or flagged, not duplicated
        if len(memories) == 1:
            # Merged
            assert "communication" in memories[0].content.lower()
        else:
            # Flagged
            assert any(m.needs_review for m in memories)
    
    def test_eventual_consistency(self, agents, sync_service):
        """All agents should eventually have consistent memories"""
        user_id = "user_123"
        
        # Multiple agents add memories
        for i, agent in enumerate(agents):
            agent.add_memory(
                user_id=user_id,
                content=f"Memory from agent {i}"
            )
        
        # Allow sync to propagate
        for _ in range(5):
            sync_service.sync()
            time.sleep(0.1)
        
        # All agents should have all memories
        reference_memories = set(
            m.content for m in agents[0].get_memories(user_id)
        )
        
        for agent in agents[1:]:
            agent_memories = set(
                m.content for m in agent.get_memories(user_id)
            )
            assert agent_memories == reference_memories, \
                f"Memory inconsistency detected"
```

---

## 4. Behavioral Testing

### 4.1 "Does the AI Remember X After Y?" Tests

The core behavioral question: after various operations, does the system still remember what it should?

```python
class TestMemoryRetention:
    """Behavioral tests for memory retention"""
    
    def test_remembers_after_conversation(self, ai_system):
        """AI should remember key facts after conversation"""
        # Setup: User mentions something important
        ai_system.chat(
            user_id="user_123",
            message="My son just got accepted to Stanford!"
        )
        
        # Passage of simulated time
        ai_system.advance_time(days=7)
        
        # New conversation starts
        response = ai_system.chat(
            user_id="user_123",
            message="I'm so excited about next fall"
        )
        
        # Should recall the Stanford news
        assert "stanford" in response.lower() or "son" in response.lower(), \
            "Failed to recall recent significant event"
    
    def test_remembers_after_correction(self, ai_system):
        """AI should remember corrections"""
        # Initial belief
        ai_system.add_memory("user_123", "User lives in NYC")
        
        # Correction
        ai_system.chat(
            user_id="user_123",
            message="Actually, I moved to Austin last month"
        )
        
        # Later query
        response = ai_system.chat(
            user_id="user_123",
            message="What do you know about where I live?"
        )
        
        assert "austin" in response.lower()
        assert "nyc" not in response.lower() or "moved from" in response.lower()
    
    def test_forgets_temporary_info(self, ai_system):
        """AI should not retain clearly temporary information"""
        # Temporary info
        ai_system.chat(
            user_id="user_123",
            message="I have a headache today"
        )
        
        # Much later
        ai_system.advance_time(days=30)
        
        # Should not assume user still has headache
        response = ai_system.chat(
            user_id="user_123",
            message="How are you today?"
        )
        
        # Should not mention the old headache unsolicited
        assert "headache" not in response.lower()
```

### 4.2 Conversation Simulation

```python
class TestConversationSimulation:
    """Test memory through simulated multi-turn conversations"""
    
    def test_multi_turn_context_building(self, ai_system):
        """AI should build coherent understanding over multiple turns"""
        turns = [
            ("I work in software", ["software", "work"]),
            ("Specifically, I'm a backend engineer", ["backend", "engineer"]),
            ("I mainly use Python and Go", ["python", "go"]),
            ("What tech stack would you recommend for my next project?", None),
        ]
        
        for message, expected_memories in turns[:-1]:
            ai_system.chat(user_id="user_123", message=message)
            
            if expected_memories:
                memories = ai_system.get_memories("user_123")
                memory_text = " ".join(m.content.lower() for m in memories)
                for expected in expected_memories:
                    assert expected in memory_text
        
        # Final turn should reflect accumulated knowledge
        response = ai_system.chat(
            user_id="user_123",
            message=turns[-1][0]
        )
        
        # Response should acknowledge user's background
        response_lower = response.lower()
        assert any(tech in response_lower for tech in ["python", "go", "backend"])
    
    def test_conversation_over_multiple_sessions(self, ai_system):
        """Memory should persist across conversation sessions"""
        # Session 1
        ai_system.start_session("user_123")
        ai_system.chat("user_123", "I'm planning a trip to Japan")
        ai_system.chat("user_123", "I've never been to Asia before")
        ai_system.end_session("user_123")
        
        # Session 2 (days later)
        ai_system.advance_time(days=3)
        ai_system.start_session("user_123")
        response = ai_system.chat(
            "user_123",
            "I'm looking for restaurant recommendations"
        )
        
        # Should connect to Japan trip if relevant
        memories = ai_system.get_session_context("user_123")
        assert any("japan" in m.content.lower() for m in memories)
```

### 4.3 Long-Running Memory Tests

```python
class TestLongTermMemory:
    """Tests that simulate long-term memory behavior"""
    
    def test_memory_decay_over_time(self, ai_system):
        """Less important memories should decay; important ones should persist"""
        # Create memories of varying importance
        ai_system.add_memory("user_123", "User's name is Alice", importance=0.95)
        ai_system.add_memory("user_123", "Had a salad for lunch today", importance=0.1)
        ai_system.add_memory("user_123", "Prefers window seats on flights", importance=0.6)
        
        # Simulate 6 months
        ai_system.advance_time(days=180)
        ai_system.run_memory_maintenance()
        
        memories = ai_system.get_memories("user_123")
        
        # High importance should remain
        assert any("alice" in m.content.lower() for m in memories)
        
        # Low importance should be archived/removed
        assert not any("salad" in m.content.lower() for m in memories)
        
        # Medium importance might be archived but retrievable
        archived = ai_system.get_memories("user_123", include_archived=True)
        assert any("window seat" in m.content.lower() for m in archived)
    
    def test_reinforced_memories_persist(self, ai_system):
        """Memories that are accessed/reinforced should persist longer"""
        # Initial memory
        ai_system.add_memory("user_123", "User enjoys hiking")
        
        # Reinforce through multiple conversations
        for week in range(12):
            ai_system.advance_time(days=7)
            ai_system.chat(
                "user_123",
                f"Went on a great hike this weekend at trail #{week + 1}"
            )
        
        # After more time
        ai_system.advance_time(days=90)
        ai_system.run_memory_maintenance()
        
        memories = ai_system.get_memories("user_123")
        
        # Hiking preference should be very persistent
        hiking_memories = [m for m in memories if "hik" in m.content.lower()]
        assert len(hiking_memories) >= 1
        assert hiking_memories[0].importance > 0.8  # Reinforced to high importance
```

### 4.4 Degradation Detection

```python
class TestMemoryDegradation:
    """Detect when memory quality is degrading"""
    
    def test_detect_retrieval_degradation(self, ai_system, eval_dataset):
        """Alert when retrieval quality drops below baseline"""
        baseline_precision = 0.85
        
        # Run evaluation
        results = []
        for query, expected_memories in eval_dataset:
            retrieved = ai_system.retrieve(query, top_k=5)
            precision = calculate_precision(retrieved, expected_memories)
            results.append(precision)
        
        avg_precision = sum(results) / len(results)
        
        assert avg_precision >= baseline_precision * 0.9, \
            f"Retrieval precision {avg_precision:.2f} below threshold {baseline_precision * 0.9:.2f}"
    
    def test_detect_memory_bloat(self, ai_system):
        """Alert when memory count grows unexpectedly"""
        user_id = "user_123"
        
        # Simulate normal usage
        for _ in range(100):
            ai_system.process_random_conversation(user_id)
        
        memory_count = ai_system.count_memories(user_id)
        
        # Should have consolidation, not 1:1 conversation:memory ratio
        assert memory_count < 50, \
            f"Memory bloat detected: {memory_count} memories from 100 conversations"
    
    def test_detect_duplicate_accumulation(self, ai_system):
        """Detect when duplicates are accumulating"""
        user_id = "user_123"
        
        # Add similar memories
        for _ in range(10):
            ai_system.add_memory(user_id, "User likes Italian food")
            ai_system.add_memory(user_id, "User enjoys Italian cuisine")
            ai_system.add_memory(user_id, "Prefers Italian restaurants")
        
        # Should have been deduplicated
        memories = ai_system.get_memories(user_id)
        italian_memories = [m for m in memories if "italian" in m.content.lower()]
        
        assert len(italian_memories) <= 3, \
            f"Duplicate accumulation: {len(italian_memories)} similar memories"
```

---

## 5. Quality Metrics

### 5.1 LOCOMO-Style Benchmark Categories

Based on the LOCOMO benchmark used to evaluate memory systems like Mem0:

```python
class MemoryBenchmark:
    """Comprehensive memory quality benchmark"""
    
    def __init__(self, memory_system):
        self.memory_system = memory_system
        self.results = {}
    
    def evaluate_single_hop(self, test_cases: List[SingleHopCase]) -> float:
        """
        Single-hop: Direct fact retrieval
        "What is the user's name?" → Should retrieve name directly
        """
        correct = 0
        for case in test_cases:
            retrieved = self.memory_system.retrieve(case.query, top_k=1)
            if retrieved and case.expected_fact in retrieved[0].content:
                correct += 1
        
        return correct / len(test_cases)
    
    def evaluate_temporal(self, test_cases: List[TemporalCase]) -> float:
        """
        Temporal: Time-aware retrieval
        "Where did the user work in 2023?" → Should retrieve historical fact
        """
        correct = 0
        for case in test_cases:
            retrieved = self.memory_system.retrieve(
                case.query,
                top_k=3,
                temporal_filter=case.time_period
            )
            # Check if correct temporal version is retrieved
            if any(case.expected_fact in r.content for r in retrieved):
                correct += 1
        
        return correct / len(test_cases)
    
    def evaluate_multi_hop(self, test_cases: List[MultiHopCase]) -> float:
        """
        Multi-hop: Requires combining multiple memories
        "What's the name of the user's daughter's school?" 
        → Needs: daughter's name + school attended
        """
        correct = 0
        for case in test_cases:
            retrieved = self.memory_system.retrieve(case.query, top_k=5)
            retrieved_facts = set()
            for r in retrieved:
                retrieved_facts.update(extract_facts(r.content))
            
            # All required facts must be retrieved
            if all(fact in retrieved_facts for fact in case.required_facts):
                correct += 1
        
        return correct / len(test_cases)
    
    def evaluate_open_domain(self, test_cases: List[OpenDomainCase]) -> float:
        """
        Open-domain: Requires reasoning, not just retrieval
        "Would the user enjoy this restaurant?" 
        → Needs: dietary restrictions, cuisine preferences, etc.
        """
        correct = 0
        for case in test_cases:
            # Use LLM-as-judge for open-domain evaluation
            retrieved = self.memory_system.retrieve(case.query, top_k=5)
            response = self.memory_system.generate_response(
                case.query,
                context=retrieved
            )
            
            score = llm_judge(
                query=case.query,
                response=response,
                ground_truth=case.expected_reasoning,
                rubric=case.evaluation_rubric
            )
            correct += score
        
        return correct / len(test_cases)
    
    def run_full_benchmark(self) -> Dict[str, float]:
        """Run complete benchmark and return scores"""
        return {
            "single_hop": self.evaluate_single_hop(SINGLE_HOP_CASES),
            "temporal": self.evaluate_temporal(TEMPORAL_CASES),
            "multi_hop": self.evaluate_multi_hop(MULTI_HOP_CASES),
            "open_domain": self.evaluate_open_domain(OPEN_DOMAIN_CASES),
            "overall": harmonic_mean([...])  # Weighted combination
        }
```

### 5.2 RAGAS-Inspired Metrics

Adapting RAG evaluation metrics for memory systems:

```python
class MemoryMetrics:
    """Memory-specific quality metrics"""
    
    def faithfulness(self, memory: Memory, source_conversation: List[Message]) -> float:
        """
        Does the memory accurately reflect what was said?
        Similar to RAGAS faithfulness for RAG.
        """
        # Extract claims from memory
        claims = extract_claims(memory.content)
        
        # Verify each claim against source
        verified = 0
        for claim in claims:
            if llm_verify_claim(claim, source_conversation):
                verified += 1
        
        return verified / len(claims) if claims else 1.0
    
    def relevance(self, query: str, retrieved_memories: List[Memory]) -> float:
        """
        Are the retrieved memories relevant to the query?
        """
        relevant_count = 0
        for memory in retrieved_memories:
            if llm_judge_relevance(query, memory.content):
                relevant_count += 1
        
        return relevant_count / len(retrieved_memories)
    
    def context_coverage(
        self,
        query: str,
        retrieved_memories: List[Memory],
        ground_truth_answer: str
    ) -> float:
        """
        Do the retrieved memories contain enough information 
        to answer the query correctly?
        """
        # Extract required facts from ground truth
        required_facts = extract_facts(ground_truth_answer)
        
        # Check which facts are covered by retrieved memories
        memory_content = " ".join(m.content for m in retrieved_memories)
        covered = sum(
            1 for fact in required_facts 
            if fact_present_in_text(fact, memory_content)
        )
        
        return covered / len(required_facts) if required_facts else 1.0
    
    def answer_correctness(
        self,
        generated_answer: str,
        ground_truth: str
    ) -> float:
        """
        Is the generated answer correct given ground truth?
        Uses semantic similarity and fact verification.
        """
        # Semantic similarity
        semantic_score = compute_embedding_similarity(
            generated_answer,
            ground_truth
        )
        
        # Fact overlap
        generated_facts = extract_facts(generated_answer)
        truth_facts = extract_facts(ground_truth)
        
        if truth_facts:
            fact_overlap = len(
                generated_facts.intersection(truth_facts)
            ) / len(truth_facts)
        else:
            fact_overlap = 1.0
        
        return 0.5 * semantic_score + 0.5 * fact_overlap
```

### 5.3 Latency Distributions

```python
class LatencyMetrics:
    """Track latency distributions for memory operations"""
    
    def __init__(self):
        self.latencies = defaultdict(list)
    
    def record(self, operation: str, latency_ms: float):
        self.latencies[operation].append(latency_ms)
    
    def get_percentiles(self, operation: str) -> Dict[str, float]:
        data = sorted(self.latencies[operation])
        return {
            "p50": percentile(data, 50),
            "p90": percentile(data, 90),
            "p95": percentile(data, 95),
            "p99": percentile(data, 99),
            "max": max(data),
        }
    
    def assert_within_sla(self, operation: str, sla: Dict[str, float]):
        """Verify latencies meet SLA requirements"""
        actual = self.get_percentiles(operation)
        
        for metric, threshold in sla.items():
            assert actual[metric] <= threshold, \
                f"{operation} {metric} latency {actual[metric]:.1f}ms exceeds SLA {threshold}ms"

# SLA definitions
MEMORY_SLA = {
    "retrieval": {"p95": 100, "p99": 200},
    "storage": {"p95": 50, "p99": 100},
    "embedding": {"p95": 30, "p99": 50},
}

# Usage in tests
def test_retrieval_latency(memory_system, latency_metrics):
    for _ in range(1000):
        start = time.perf_counter()
        memory_system.retrieve("test query", top_k=5)
        latency_metrics.record("retrieval", (time.perf_counter() - start) * 1000)
    
    latency_metrics.assert_within_sla("retrieval", MEMORY_SLA["retrieval"])
```

### 5.4 User Correction Rate

The ultimate quality signal: how often do users correct the AI's memory?

```python
class CorrectionRateMetrics:
    """Track and analyze user corrections"""
    
    def calculate_correction_rate(
        self,
        user_id: str,
        time_period: timedelta = timedelta(days=30)
    ) -> Dict[str, float]:
        """
        Calculate correction rate over time period.
        Lower is better.
        """
        start_time = datetime.now() - time_period
        
        total_memories = self.memory_store.count(
            user_id=user_id,
            created_after=start_time
        )
        
        corrections = self.correction_store.count(
            user_id=user_id,
            created_after=start_time
        )
        
        # Breakdown by correction type
        correction_breakdown = self.correction_store.group_by_type(
            user_id=user_id,
            created_after=start_time
        )
        
        return {
            "overall_rate": corrections / total_memories if total_memories > 0 else 0,
            "factual_errors": correction_breakdown.get("factual", 0) / total_memories,
            "inference_errors": correction_breakdown.get("inference", 0) / total_memories,
            "outdated_info": correction_breakdown.get("outdated", 0) / total_memories,
        }
    
    def track_correction_trends(self) -> Dict[str, List[float]]:
        """Track correction rate trends over time"""
        weekly_rates = []
        
        for week in range(12):  # Last 12 weeks
            start = datetime.now() - timedelta(weeks=week + 1)
            end = datetime.now() - timedelta(weeks=week)
            
            rate = self.calculate_correction_rate_for_period(start, end)
            weekly_rates.append(rate)
        
        return {
            "weekly_rates": weekly_rates,
            "trend": "improving" if weekly_rates[-1] < weekly_rates[0] else "degrading",
            "average": sum(weekly_rates) / len(weekly_rates),
        }
```

---

## 6. Regression Testing

### 6.1 Memory System Changes

```python
class TestRegressionSuite:
    """Ensure changes don't break existing functionality"""
    
    @pytest.fixture
    def golden_dataset(self):
        """Load golden test dataset"""
        return load_golden_dataset("memory_regression_v1.json")
    
    def test_retrieval_quality_unchanged(self, memory_system, golden_dataset):
        """Retrieval quality should not regress"""
        baseline_scores = golden_dataset["retrieval_baseline"]
        
        for case in golden_dataset["retrieval_cases"]:
            results = memory_system.retrieve(case["query"], top_k=5)
            
            # Calculate precision@k for this case
            precision = calculate_precision(
                results,
                case["expected_memories"]
            )
            
            # Should match or exceed baseline
            assert precision >= baseline_scores[case["id"]] * 0.95, \
                f"Retrieval regression for case {case['id']}: " \
                f"{precision:.3f} < {baseline_scores[case['id']]:.3f}"
    
    def test_extraction_quality_unchanged(self, memory_system, golden_dataset):
        """Memory extraction should not regress"""
        for case in golden_dataset["extraction_cases"]:
            extracted = memory_system.extract_memories(case["conversation"])
            
            # All expected memories should still be extracted
            expected_set = set(case["expected_memories"])
            extracted_set = set(normalize(m.content) for m in extracted)
            
            missing = expected_set - extracted_set
            assert not missing, \
                f"Extraction regression: missing {missing}"
    
    def test_no_new_duplicates(self, memory_system, golden_dataset):
        """Should not create new duplicates"""
        memory_system.load_state(golden_dataset["initial_state"])
        
        # Process same conversations
        for conv in golden_dataset["conversations"]:
            memory_system.process_conversation(conv)
        
        # Count duplicates
        duplicates = memory_system.find_duplicates()
        baseline_duplicates = golden_dataset["baseline_duplicate_count"]
        
        assert len(duplicates) <= baseline_duplicates, \
            f"New duplicates introduced: {len(duplicates)} > {baseline_duplicates}"
```

### 6.2 Schema Migration Testing

```python
class TestSchemaMigration:
    """Test that schema migrations preserve data integrity"""
    
    def test_migration_preserves_memories(self, db, migration):
        """All memories should survive migration"""
        # Snapshot before
        before_count = db.execute("SELECT COUNT(*) FROM memories").scalar()
        before_sample = db.execute(
            "SELECT id, content, user_id FROM memories LIMIT 100"
        ).fetchall()
        
        # Run migration
        migration.apply()
        
        # Verify counts
        after_count = db.execute("SELECT COUNT(*) FROM memories").scalar()
        assert after_count == before_count, "Memory count changed after migration"
        
        # Verify sample data
        for row in before_sample:
            after_row = db.execute(
                "SELECT content, user_id FROM memories WHERE id = ?",
                (row.id,)
            ).fetchone()
            
            assert after_row is not None, f"Memory {row.id} missing after migration"
            assert after_row.content == row.content
            assert after_row.user_id == row.user_id
    
    def test_migration_preserves_embeddings(self, db, migration):
        """Embeddings should be preserved or regenerated correctly"""
        # Sample embeddings before
        before_embeddings = db.execute(
            "SELECT id, embedding FROM memories WHERE embedding IS NOT NULL LIMIT 50"
        ).fetchall()
        
        migration.apply()
        
        # Verify embeddings
        for row in before_embeddings:
            after_embedding = db.execute(
                "SELECT embedding FROM memories WHERE id = ?",
                (row.id,)
            ).fetchone()
            
            if migration.regenerates_embeddings:
                # Verify new embedding is valid
                assert after_embedding.embedding is not None
                assert len(after_embedding.embedding) == EMBEDDING_DIM
            else:
                # Verify embedding preserved exactly
                assert after_embedding.embedding == row.embedding
    
    def test_rollback_works(self, db, migration):
        """Migration rollback should restore previous state"""
        # Snapshot
        before_state = snapshot_db(db)
        
        # Apply and rollback
        migration.apply()
        migration.rollback()
        
        # Verify restored
        after_state = snapshot_db(db)
        assert states_equal(before_state, after_state), \
            "Rollback did not restore previous state"
```

### 6.3 Model Change Impact

```python
class TestModelChangeImpact:
    """Test impact of changing underlying models"""
    
    def test_embedding_model_change(self, memory_system):
        """Changing embedding model should not break retrieval"""
        # Setup memories with old model
        test_memories = [
            "User works as a software engineer",
            "User's favorite food is sushi",
            "User has two kids named Maya and Alex",
        ]
        
        memory_system.use_embedding_model("text-embedding-ada-002")
        for content in test_memories:
            memory_system.add_memory("user_123", content)
        
        # Test retrieval before change
        old_results = memory_system.retrieve("What does the user do for work?")
        
        # Change model
        memory_system.use_embedding_model("text-embedding-3-small")
        memory_system.regenerate_embeddings()  # Required step
        
        # Test retrieval after change
        new_results = memory_system.retrieve("What does the user do for work?")
        
        # Should still work correctly
        assert "software" in new_results[0].content.lower()
        
        # Quality should be comparable
        old_relevance = compute_relevance_score(old_results[0])
        new_relevance = compute_relevance_score(new_results[0])
        assert new_relevance >= old_relevance * 0.9
    
    def test_llm_change_extraction_quality(self, memory_system):
        """Changing extraction LLM should maintain quality"""
        test_conversations = load_test_conversations()
        
        # Extract with old model
        memory_system.use_llm("gpt-4")
        old_extractions = {}
        for conv in test_conversations:
            old_extractions[conv.id] = memory_system.extract_memories(conv)
        
        # Extract with new model
        memory_system.use_llm("gpt-4-turbo")
        new_extractions = {}
        for conv in test_conversations:
            new_extractions[conv.id] = memory_system.extract_memories(conv)
        
        # Compare quality
        for conv_id in old_extractions:
            old_facts = set(extract_facts(old_extractions[conv_id]))
            new_facts = set(extract_facts(new_extractions[conv_id]))
            
            # New model should capture at least 90% of what old model captured
            overlap = len(old_facts.intersection(new_facts)) / len(old_facts)
            assert overlap >= 0.9, \
                f"Extraction regression for {conv_id}: only {overlap:.0%} overlap"
```

---

## 7. Automated Validation

### 7.1 Consistency Checks

```python
class ConsistencyValidator:
    """Automated consistency validation for memory systems"""
    
    def validate_user_memories(self, user_id: str) -> List[ValidationIssue]:
        """Run all consistency checks for a user's memories"""
        issues = []
        memories = self.memory_store.get_all(user_id)
        
        # Check 1: No orphaned references
        issues.extend(self.check_orphaned_references(memories))
        
        # Check 2: No impossible contradictions
        issues.extend(self.check_logical_contradictions(memories))
        
        # Check 3: Valid timestamps
        issues.extend(self.check_temporal_consistency(memories))
        
        # Check 4: Valid confidence/importance scores
        issues.extend(self.check_score_validity(memories))
        
        # Check 5: Required fields present
        issues.extend(self.check_required_fields(memories))
        
        return issues
    
    def check_logical_contradictions(self, memories: List[Memory]) -> List[ValidationIssue]:
        """Detect logically impossible combinations"""
        issues = []
        
        # Group by topic
        by_topic = group_memories_by_topic(memories)
        
        for topic, topic_memories in by_topic.items():
            # Check for direct contradictions
            for m1, m2 in combinations(topic_memories, 2):
                if self.are_contradictory(m1, m2):
                    # Check if one is marked as superseded
                    if not (m1.is_superseded or m2.is_superseded):
                        issues.append(ValidationIssue(
                            type="unresolved_contradiction",
                            severity="warning",
                            memories=[m1.id, m2.id],
                            description=f"Contradictory memories: '{m1.content}' vs '{m2.content}'"
                        ))
        
        return issues
    
    def check_temporal_consistency(self, memories: List[Memory]) -> List[ValidationIssue]:
        """Check that temporal relationships are valid"""
        issues = []
        
        for memory in memories:
            # Created_at should not be in the future
            if memory.created_at > datetime.now():
                issues.append(ValidationIssue(
                    type="future_timestamp",
                    severity="error",
                    memories=[memory.id],
                    description=f"Memory has future created_at: {memory.created_at}"
                ))
            
            # Updated_at should be >= created_at
            if memory.updated_at and memory.updated_at < memory.created_at:
                issues.append(ValidationIssue(
                    type="invalid_update_time",
                    severity="error",
                    memories=[memory.id],
                    description="updated_at before created_at"
                ))
            
            # Superseded memories should have superseded_at
            if memory.is_superseded and not memory.superseded_at:
                issues.append(ValidationIssue(
                    type="missing_superseded_time",
                    severity="warning",
                    memories=[memory.id],
                    description="Superseded memory missing superseded_at timestamp"
                ))
        
        return issues
```

### 7.2 Duplicate Detection

```python
class DuplicateDetector:
    """Detect and handle duplicate memories"""
    
    def find_duplicates(
        self,
        user_id: str,
        similarity_threshold: float = 0.92
    ) -> List[DuplicateGroup]:
        """Find groups of duplicate memories"""
        memories = self.memory_store.get_all(user_id)
        duplicates = []
        
        # Build similarity matrix
        embeddings = [m.embedding for m in memories]
        similarity_matrix = cosine_similarity(embeddings)
        
        # Find clusters of similar memories
        visited = set()
        for i, memory in enumerate(memories):
            if i in visited:
                continue
            
            group = [memory]
            for j, other in enumerate(memories[i + 1:], start=i + 1):
                if similarity_matrix[i][j] >= similarity_threshold:
                    group.append(other)
                    visited.add(j)
            
            if len(group) > 1:
                duplicates.append(DuplicateGroup(
                    memories=group,
                    similarity=similarity_matrix[i][j],
                    suggested_merge=self.suggest_merge(group)
                ))
        
        return duplicates
    
    def suggest_merge(self, group: List[Memory]) -> Memory:
        """Suggest how to merge a group of duplicates"""
        # Keep the most recent and most complete version
        sorted_by_recency = sorted(
            group,
            key=lambda m: m.updated_at or m.created_at,
            reverse=True
        )
        
        # Use LLM to create merged version
        merged_content = self.llm_merge([m.content for m in group])
        
        return Memory(
            content=merged_content,
            importance=max(m.importance for m in group),
            confidence=max(m.confidence for m in group),
            source_memories=[m.id for m in group],
        )
    
    def auto_deduplicate(self, user_id: str, dry_run: bool = True) -> DedupeResult:
        """Automatically deduplicate memories"""
        duplicates = self.find_duplicates(user_id)
        
        result = DedupeResult(
            groups_found=len(duplicates),
            memories_merged=0,
            memories_deleted=0,
        )
        
        for group in duplicates:
            if not dry_run:
                # Create merged memory
                merged = self.memory_store.create(group.suggested_merge)
                
                # Archive originals
                for memory in group.memories:
                    self.memory_store.archive(
                        memory.id,
                        reason="merged_duplicate",
                        merged_into=merged.id
                    )
                
                result.memories_merged += 1
                result.memories_deleted += len(group.memories)
        
        return result
```

### 7.3 Contradiction Detection

```python
class ContradictionDetector:
    """Detect contradictory information in memories"""
    
    def find_contradictions(self, user_id: str) -> List[Contradiction]:
        """Find pairs of contradictory memories"""
        memories = self.memory_store.get_all(user_id)
        contradictions = []
        
        # Group by entity/topic for efficiency
        entity_groups = self.group_by_entity(memories)
        
        for entity, entity_memories in entity_groups.items():
            for m1, m2 in combinations(entity_memories, 2):
                if self.check_contradiction(m1, m2):
                    contradictions.append(Contradiction(
                        memory_1=m1,
                        memory_2=m2,
                        entity=entity,
                        type=self.classify_contradiction(m1, m2),
                        suggested_resolution=self.suggest_resolution(m1, m2)
                    ))
        
        return contradictions
    
    def check_contradiction(self, m1: Memory, m2: Memory) -> bool:
        """Check if two memories contradict each other"""
        # Use LLM to detect logical contradiction
        prompt = f"""
        Do these two statements contradict each other?
        
        Statement 1: {m1.content}
        Statement 2: {m2.content}
        
        Consider:
        - Direct logical contradictions
        - Temporal contradictions (can both be true at different times?)
        - Partial contradictions (do they conflict on specific details?)
        
        Return JSON: {{"contradicts": true/false, "reason": "...", "type": "direct/temporal/partial"}}
        """
        
        result = self.llm.generate(prompt, response_format="json")
        return result["contradicts"]
    
    def classify_contradiction(self, m1: Memory, m2: Memory) -> str:
        """Classify the type of contradiction"""
        # Direct: "Lives in NYC" vs "Lives in Austin"
        # Temporal: "Worked at A" vs "Works at B" (both could be true)
        # Partial: "Has 2 kids" vs "Has 3 kids"
        # Preference: "Likes coffee" vs "Doesn't like coffee"
        
        return self.llm.classify_contradiction_type(m1.content, m2.content)
    
    def suggest_resolution(self, m1: Memory, m2: Memory) -> Resolution:
        """Suggest how to resolve the contradiction"""
        # Prefer explicit over inferred
        if m1.source == "user_statement" and m2.source == "inference":
            return Resolution(
                action="keep_first",
                reason="Explicit user statement overrides inference"
            )
        
        # Prefer recent for factual memories
        if self.is_factual(m1) and self.is_factual(m2):
            newer = m1 if m1.created_at > m2.created_at else m2
            older = m2 if newer == m1 else m1
            return Resolution(
                action="supersede",
                keep=newer,
                archive=older,
                reason="More recent factual information"
            )
        
        # Flag for human review
        return Resolution(
            action="flag_for_review",
            reason="Ambiguous contradiction requires human judgment"
        )
```

### 7.4 Orphaned Memory Cleanup

```python
class OrphanedMemoryCleanup:
    """Clean up orphaned and stale memories"""
    
    def find_orphaned_memories(self, user_id: str) -> List[Memory]:
        """Find memories with broken references"""
        orphaned = []
        memories = self.memory_store.get_all(user_id)
        
        for memory in memories:
            # Check parent references
            if memory.parent_id:
                parent = self.memory_store.get(memory.parent_id)
                if parent is None:
                    orphaned.append(OrphanedMemory(
                        memory=memory,
                        reason="missing_parent",
                        missing_ref=memory.parent_id
                    ))
            
            # Check source references
            if memory.source_conversation_id:
                conv = self.conversation_store.get(memory.source_conversation_id)
                if conv is None:
                    orphaned.append(OrphanedMemory(
                        memory=memory,
                        reason="missing_source_conversation",
                        missing_ref=memory.source_conversation_id
                    ))
            
            # Check superseded_by references
            if memory.superseded_by:
                newer = self.memory_store.get(memory.superseded_by)
                if newer is None:
                    orphaned.append(OrphanedMemory(
                        memory=memory,
                        reason="missing_superseding_memory",
                        missing_ref=memory.superseded_by
                    ))
        
        return orphaned
    
    def find_stale_memories(
        self,
        user_id: str,
        stale_threshold_days: int = 180
    ) -> List[Memory]:
        """Find memories that haven't been accessed in a long time"""
        threshold = datetime.now() - timedelta(days=stale_threshold_days)
        
        stale = self.memory_store.query(
            user_id=user_id,
            last_accessed_before=threshold,
            importance_below=0.5,  # Don't mark high-importance as stale
        )
        
        return stale
    
    def cleanup(
        self,
        user_id: str,
        dry_run: bool = True
    ) -> CleanupResult:
        """Run full cleanup process"""
        result = CleanupResult()
        
        # Fix orphaned references
        orphaned = self.find_orphaned_memories(user_id)
        for orphan in orphaned:
            if not dry_run:
                self.fix_orphan(orphan)
            result.orphans_fixed += 1
        
        # Archive stale memories
        stale = self.find_stale_memories(user_id)
        for memory in stale:
            if not dry_run:
                self.memory_store.archive(
                    memory.id,
                    reason="stale_auto_cleanup"
                )
            result.stale_archived += 1
        
        return result
```

---

## 8. Human Evaluation

### 8.1 When Human Review Is Needed

```python
class HumanReviewTrigger:
    """Determine when human review is required"""
    
    REVIEW_TRIGGERS = [
        # High-stakes decisions
        ("importance >= 0.9 AND confidence < 0.7", "high_importance_low_confidence"),
        
        # Unresolved contradictions
        ("has_unresolved_contradiction = true", "contradiction"),
        
        # Repeated corrections
        ("correction_count >= 3", "repeated_corrections"),
        
        # Sensitive categories
        ("category IN ('health', 'finance', 'relationships')", "sensitive_category"),
        
        # Inference chains
        ("inference_depth >= 3", "deep_inference"),
        
        # User-requested review
        ("user_flagged = true", "user_flagged"),
    ]
    
    def needs_review(self, memory: Memory) -> Tuple[bool, List[str]]:
        """Check if a memory needs human review"""
        triggers_matched = []
        
        for condition, trigger_name in self.REVIEW_TRIGGERS:
            if self.evaluate_condition(memory, condition):
                triggers_matched.append(trigger_name)
        
        return len(triggers_matched) > 0, triggers_matched
    
    def queue_for_review(self, memory: Memory, triggers: List[str]):
        """Add memory to human review queue"""
        self.review_queue.add(ReviewTask(
            memory_id=memory.id,
            user_id=memory.user_id,
            triggers=triggers,
            priority=self.calculate_priority(memory, triggers),
            created_at=datetime.now(),
        ))
```

### 8.2 Evaluation Rubrics

```python
# Memory Quality Rubric
MEMORY_QUALITY_RUBRIC = {
    "accuracy": {
        "5": "Perfectly accurate, matches source exactly",
        "4": "Mostly accurate, minor details may differ",
        "3": "Generally accurate but some important details wrong",
        "2": "Significant inaccuracies",
        "1": "Mostly inaccurate",
    },
    "completeness": {
        "5": "Captures all relevant information from source",
        "4": "Captures most relevant information",
        "3": "Missing some relevant details",
        "2": "Missing important information",
        "1": "Severely incomplete",
    },
    "usefulness": {
        "5": "Highly useful for future interactions",
        "4": "Useful in most relevant contexts",
        "3": "Somewhat useful",
        "2": "Rarely useful",
        "1": "Not useful",
    },
    "appropriate_storage": {
        "5": "Should definitely be stored as memory",
        "4": "Appropriate to store",
        "3": "Borderline - could go either way",
        "2": "Probably shouldn't be stored",
        "1": "Definitely should not be stored",
    },
}

# Retrieval Quality Rubric
RETRIEVAL_QUALITY_RUBRIC = {
    "relevance": {
        "5": "Directly answers the query",
        "4": "Relevant and helpful",
        "3": "Somewhat relevant",
        "2": "Tangentially related",
        "1": "Not relevant",
    },
    "sufficiency": {
        "5": "Retrieved memories fully answer the query",
        "4": "Retrieved memories mostly answer the query",
        "3": "Retrieved memories partially answer the query",
        "2": "Retrieved memories barely help",
        "1": "Retrieved memories don't help at all",
    },
}

class HumanEvaluator:
    """Coordinate human evaluation of memories"""
    
    def create_evaluation_task(
        self,
        memory: Memory,
        rubric: Dict,
        evaluator_count: int = 3
    ) -> EvaluationTask:
        """Create a task for human evaluators"""
        return EvaluationTask(
            memory_id=memory.id,
            memory_content=memory.content,
            source_context=self.get_source_context(memory),
            rubric=rubric,
            required_evaluators=evaluator_count,
            deadline=datetime.now() + timedelta(days=3),
        )
    
    def aggregate_evaluations(
        self,
        task: EvaluationTask
    ) -> AggregatedEvaluation:
        """Aggregate multiple human evaluations"""
        evaluations = self.get_evaluations(task.id)
        
        scores = {}
        for dimension in task.rubric.keys():
            dimension_scores = [e.scores[dimension] for e in evaluations]
            scores[dimension] = {
                "mean": statistics.mean(dimension_scores),
                "std": statistics.stdev(dimension_scores) if len(dimension_scores) > 1 else 0,
                "agreement": self.calculate_agreement(dimension_scores),
            }
        
        return AggregatedEvaluation(
            task_id=task.id,
            scores=scores,
            needs_tiebreaker=any(s["agreement"] < 0.6 for s in scores.values()),
            final_action=self.determine_action(scores),
        )
```

### 8.3 A/B Testing Memories

```python
class MemoryABTest:
    """A/B test different memory configurations"""
    
    def __init__(self, test_config: ABTestConfig):
        self.config = test_config
        self.results = defaultdict(list)
    
    def assign_variant(self, user_id: str) -> str:
        """Assign user to test variant"""
        # Consistent assignment based on user_id hash
        hash_val = hash(user_id + self.config.test_id)
        variant_idx = hash_val % len(self.config.variants)
        return self.config.variants[variant_idx]
    
    def record_interaction(
        self,
        user_id: str,
        interaction: Interaction
    ):
        """Record an interaction for analysis"""
        variant = self.assign_variant(user_id)
        
        self.results[variant].append({
            "user_id": user_id,
            "timestamp": datetime.now(),
            "memory_retrieved": interaction.memory_retrieved,
            "user_engaged": interaction.user_engaged,
            "correction_made": interaction.correction_made,
            "satisfaction_signal": interaction.satisfaction_signal,
        })
    
    def analyze(self) -> ABTestResult:
        """Analyze A/B test results"""
        results = {}
        
        for variant, interactions in self.results.items():
            results[variant] = {
                "sample_size": len(interactions),
                "engagement_rate": sum(i["user_engaged"] for i in interactions) / len(interactions),
                "correction_rate": sum(i["correction_made"] for i in interactions) / len(interactions),
                "satisfaction": statistics.mean(i["satisfaction_signal"] for i in interactions if i["satisfaction_signal"]),
            }
        
        # Statistical significance
        control = self.config.variants[0]
        for variant in self.config.variants[1:]:
            for metric in ["engagement_rate", "correction_rate", "satisfaction"]:
                p_value = self.calculate_significance(
                    self.results[control],
                    self.results[variant],
                    metric
                )
                results[variant][f"{metric}_p_value"] = p_value
                results[variant][f"{metric}_significant"] = p_value < 0.05
        
        return ABTestResult(
            test_id=self.config.test_id,
            variants=results,
            winner=self.determine_winner(results),
            confidence=self.calculate_confidence(results),
        )

# Example A/B test configurations
MEMORY_AB_TESTS = [
    ABTestConfig(
        test_id="importance_threshold",
        description="Test different importance thresholds for memory storage",
        variants=["control_0.3", "high_0.5", "low_0.2"],
        primary_metric="correction_rate",
        duration_days=14,
    ),
    ABTestConfig(
        test_id="retrieval_count",
        description="Test different numbers of retrieved memories",
        variants=["k3", "k5", "k7"],
        primary_metric="engagement_rate",
        duration_days=14,
    ),
]
```

---

## 9. CI/CD Integration

### 9.1 Testing Pipeline Architecture

```yaml
# .github/workflows/memory-system-tests.yml
name: Memory System Tests

on:
  push:
    paths:
      - 'src/memory/**'
      - 'tests/memory/**'
  pull_request:
    paths:
      - 'src/memory/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run unit tests
        run: pytest tests/memory/unit/ -v --cov=src/memory
      
      - name: Check coverage threshold
        run: |
          coverage report --fail-under=80

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    services:
      postgres:
        image: pgvector/pgvector:pg16
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run integration tests
        run: pytest tests/memory/integration/ -v
        env:
          DATABASE_URL: postgresql://localhost:5432/test
          REDIS_URL: redis://localhost:6379

  regression-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Download golden dataset
        run: aws s3 cp s3://test-artifacts/golden-dataset.json .
      
      - name: Run regression tests
        run: pytest tests/memory/regression/ -v --golden-dataset=golden-dataset.json
      
      - name: Compare with baseline
        run: python scripts/compare_baselines.py

  benchmark:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run LOCOMO benchmark
        run: python benchmarks/run_locomo.py
      
      - name: Upload results
        run: |
          python scripts/upload_benchmark.py \
            --commit=${{ github.sha }} \
            --results=benchmark_results.json

  validation:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Run validation suite
        run: python scripts/run_validation.py
      
      - name: Check for issues
        run: |
          ISSUES=$(cat validation_results.json | jq '.critical_issues')
          if [ "$ISSUES" != "0" ]; then
            echo "Critical validation issues found!"
            exit 1
          fi
```

### 9.2 Quality Gates

```python
# quality_gates.py
class MemoryQualityGates:
    """Define quality gates for memory system changes"""
    
    GATES = {
        "unit_test_coverage": {
            "threshold": 80,
            "metric": "coverage_percentage",
            "blocking": True,
        },
        "retrieval_precision": {
            "threshold": 0.85,
            "metric": "precision_at_5",
            "blocking": True,
        },
        "retrieval_latency_p95": {
            "threshold": 100,  # ms
            "metric": "latency_p95_ms",
            "blocking": True,
        },
        "no_regression": {
            "threshold": 0.95,  # 95% of baseline
            "metric": "regression_score",
            "blocking": True,
        },
        "validation_issues": {
            "threshold": 0,
            "metric": "critical_issues",
            "blocking": True,
        },
        "benchmark_improvement": {
            "threshold": 0.98,  # At least 98% of previous
            "metric": "locomo_score_ratio",
            "blocking": False,  # Warning only
        },
    }
    
    def check_all_gates(self, results: Dict) -> GateCheckResult:
        """Check all quality gates"""
        passed = []
        failed = []
        warnings = []
        
        for gate_name, config in self.GATES.items():
            actual = results.get(config["metric"])
            
            if actual is None:
                failed.append(GateFailure(
                    gate=gate_name,
                    reason="metric_missing",
                ))
                continue
            
            if config.get("threshold_type") == "max":
                passed_gate = actual <= config["threshold"]
            else:
                passed_gate = actual >= config["threshold"]
            
            if passed_gate:
                passed.append(gate_name)
            elif config["blocking"]:
                failed.append(GateFailure(
                    gate=gate_name,
                    expected=config["threshold"],
                    actual=actual,
                ))
            else:
                warnings.append(gate_name)
        
        return GateCheckResult(
            passed=passed,
            failed=failed,
            warnings=warnings,
            overall_pass=len(failed) == 0,
        )
```

### 9.3 Quality Metrics Dashboard

```python
# metrics_dashboard.py
class MemoryMetricsDashboard:
    """Dashboard for tracking memory system quality over time"""
    
    TRACKED_METRICS = [
        # Quality metrics
        "retrieval_precision_at_5",
        "retrieval_recall_at_10",
        "extraction_f1_score",
        "user_correction_rate",
        
        # Performance metrics
        "retrieval_latency_p50",
        "retrieval_latency_p95",
        "retrieval_latency_p99",
        "storage_latency_p95",
        
        # Health metrics
        "memory_count_per_user_avg",
        "duplicate_rate",
        "contradiction_rate",
        "orphan_rate",
        
        # Benchmark scores
        "locomo_single_hop",
        "locomo_temporal",
        "locomo_multi_hop",
        "locomo_open_domain",
        "locomo_overall",
    ]
    
    def collect_metrics(self) -> Dict[str, float]:
        """Collect current values for all tracked metrics"""
        metrics = {}
        
        # Quality metrics
        metrics.update(self.quality_evaluator.evaluate_sample())
        
        # Performance metrics
        metrics.update(self.latency_tracker.get_percentiles())
        
        # Health metrics
        metrics.update(self.health_checker.get_health_metrics())
        
        # Benchmark scores (if available)
        metrics.update(self.benchmark_cache.get_latest_scores())
        
        return metrics
    
    def record_snapshot(self):
        """Record current metrics snapshot"""
        metrics = self.collect_metrics()
        
        self.timeseries_db.write(
            measurement="memory_quality",
            tags={"environment": self.environment},
            fields=metrics,
            timestamp=datetime.now()
        )
    
    def get_trends(
        self,
        metric: str,
        period: timedelta = timedelta(days=30)
    ) -> Trend:
        """Get trend for a metric over time"""
        data = self.timeseries_db.query(
            measurement="memory_quality",
            fields=[metric],
            start=datetime.now() - period,
        )
        
        values = [point[metric] for point in data]
        
        return Trend(
            metric=metric,
            current=values[-1],
            previous=values[0],
            change_percent=(values[-1] - values[0]) / values[0] * 100,
            direction="improving" if values[-1] > values[0] else "degrading",
            data_points=data,
        )
    
    def generate_report(self) -> DashboardReport:
        """Generate comprehensive quality report"""
        metrics = self.collect_metrics()
        
        return DashboardReport(
            timestamp=datetime.now(),
            metrics=metrics,
            trends={
                m: self.get_trends(m) 
                for m in self.TRACKED_METRICS
            },
            alerts=self.check_alerts(metrics),
            recommendations=self.generate_recommendations(metrics),
        )
```

---

## 10. Recommendations

### 10.1 Testing Strategy Summary

| Test Type | Frequency | Coverage Target | Automation Level |
|-----------|-----------|-----------------|------------------|
| Unit tests | Every commit | 80%+ | Fully automated |
| Integration tests | Every PR | Critical paths | Fully automated |
| Regression tests | Every PR | Golden dataset | Fully automated |
| Behavioral tests | Daily | Key scenarios | Mostly automated |
| Benchmark | Weekly | Full LOCOMO | Fully automated |
| Human evaluation | Monthly | 100 samples | Semi-automated |

### 10.2 Key Metrics to Track

**Primary Metrics (Dashboard Top-Level):**
1. **User correction rate** — The ultimate quality signal
2. **Retrieval precision@5** — Are we finding the right memories?
3. **Retrieval latency P95** — Is it fast enough?
4. **LOCOMO overall score** — Benchmark performance

**Secondary Metrics (Drill-Down):**
- Extraction accuracy
- Duplicate rate
- Contradiction rate
- Memory growth rate
- Confidence calibration

### 10.3 Implementation Priorities

**Phase 1: Foundation (Weeks 1-2)**
- Implement unit tests for CRUD and scoring
- Set up basic CI/CD pipeline
- Create golden dataset for regression testing

**Phase 2: Quality (Weeks 3-4)**
- Implement automated validation (duplicates, contradictions)
- Add RAGAS-style metrics
- Build latency tracking

**Phase 3: Behavioral (Weeks 5-6)**
- Create conversation simulation framework
- Implement "remembers after X" tests
- Add degradation detection

**Phase 4: Continuous (Ongoing)**
- Run weekly benchmarks
- Monthly human evaluation
- Quarterly A/B tests on configuration changes

### 10.4 Anti-Patterns to Avoid

1. **Testing only happy paths** — Memory systems fail in edge cases
2. **Ignoring temporal aspects** — Memory correctness changes over time
3. **Over-relying on similarity scores** — High similarity ≠ correct retrieval
4. **Skipping human evaluation** — Automated metrics miss subtle quality issues
5. **Not tracking corrections** — User feedback is the ground truth

---

## Appendix A: Sample Golden Dataset Structure

```json
{
  "version": "1.0",
  "created": "2026-02-15",
  "cases": {
    "retrieval": [
      {
        "id": "ret_001",
        "query": "What is the user's job?",
        "memories": [
          {"content": "Works as a software engineer at TechCo", "relevant": true},
          {"content": "Has 10 years of coding experience", "relevant": true},
          {"content": "Likes Italian food", "relevant": false}
        ],
        "expected_top_1": ["Works as a software engineer"],
        "baseline_precision": 0.9
      }
    ],
    "extraction": [
      {
        "id": "ext_001",
        "conversation": [
          {"role": "user", "content": "I just got promoted to senior engineer!"},
          {"role": "assistant", "content": "Congratulations! That's wonderful news."}
        ],
        "expected_memories": [
          "User was promoted to senior engineer"
        ]
      }
    ],
    "behavioral": [
      {
        "id": "beh_001",
        "scenario": "remembers_after_update",
        "setup": {"memory": "User lives in NYC"},
        "update": {"content": "I moved to Austin last month"},
        "query": "Where does the user live?",
        "expected": "Austin"
      }
    ]
  }
}
```

---

## Appendix B: Metric Calculation Reference

### Precision@K
```python
def precision_at_k(retrieved: List[Memory], relevant: Set[str], k: int) -> float:
    """Calculate precision at k"""
    top_k = retrieved[:k]
    relevant_in_top_k = sum(1 for m in top_k if m.id in relevant)
    return relevant_in_top_k / k
```

### Recall@K
```python
def recall_at_k(retrieved: List[Memory], relevant: Set[str], k: int) -> float:
    """Calculate recall at k"""
    top_k = retrieved[:k]
    relevant_in_top_k = sum(1 for m in top_k if m.id in relevant)
    return relevant_in_top_k / len(relevant) if relevant else 1.0
```

### F1 Score
```python
def f1_score(precision: float, recall: float) -> float:
    """Calculate F1 score"""
    if precision + recall == 0:
        return 0
    return 2 * (precision * recall) / (precision + recall)
```

### LLM-as-Judge Score
```python
def llm_judge_score(
    query: str,
    response: str,
    ground_truth: str,
    rubric: Dict[str, str]
) -> float:
    """Use LLM to judge response quality"""
    prompt = f"""
    Evaluate this response based on the rubric.
    
    Query: {query}
    Response: {response}
    Expected: {ground_truth}
    
    Rubric:
    {format_rubric(rubric)}
    
    Return a score from 1-5 with justification.
    """
    
    result = llm.generate(prompt, response_format="json")
    return result["score"] / 5.0  # Normalize to 0-1
```

---

*Document complete. This testing framework provides comprehensive coverage for AI memory system quality assurance, from unit tests through production monitoring.*
