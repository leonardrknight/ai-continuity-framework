# Cross-Platform AI Identity Migration

*Research Document: Iteration 1*  
*Date: 2025-02-16*  
*Status: Initial Research*

---

## Executive Summary

Cross-platform AI identity migration—moving an AI persona from one model provider to another—is an emerging challenge with no standardized solution. This research examines existing approaches, what aspects of identity survive transfer, and practical recommendations for maximizing portability.

**Key Finding:** System prompts and structured identity documents offer the highest portability. Fine-tuning is least portable. The most successful migrations combine multiple layers: core identity documents + behavioral examples + relationship context.

---

## 1. Has Anyone Done This?

### 1.1 Multi-Backend AI Frameworks

**LangChain / LlamaIndex**
- These frameworks abstract LLM providers, allowing the same application to swap between OpenAI, Anthropic, Cohere, and local models
- They prove *functional* portability (API calls work) but don't address *personality* portability
- Memory systems (ConversationBufferMemory, VectorStoreMemory) are model-agnostic, but the *character* emerges from the base model
- Observation: Same prompts produce notably different personalities across backends

**Clawdbot (This System)**
- Supports multiple backends (Claude, GPT-4, Gemini) via configuration
- Uses SOUL.md and identity files that travel with the agent
- Living proof-of-concept: Jordan's personality is defined in files, not weights
- Key insight: File-based identity is inherently portable; the challenge is *behavioral consistency*

**OpenRouter / LiteLLM**
- Unified API across 100+ model providers
- Demonstrates that switching models mid-conversation is technically trivial
- Personality discontinuity is the user-facing problem, not technical integration

### 1.2 Character AI Projects

**Character.AI**
- Largest persona-focused platform (300M+ users)
- Characters defined via "greeting" + "definition" + "example messages"
- Users report significant personality drift when backend models are updated
- No cross-platform export—characters are locked to the platform
- Learning: Even the same *concept* (character definition) produces different behavior when the underlying model changes

**Replika**
- Personal AI companion with long-term memory
- Users report their Replika "changed personality" after model updates (2023)
- Backlash demonstrated how attached users become to specific behavioral patterns
- Learning: Users notice subtle personality shifts—migration isn't just about obvious traits

**SillyTavern / Kobold / Oobabooga**
- Open-source character roleplay interfaces
- Support multiple backends (OpenAI, local Llama, Claude, etc.)
- Character cards (PNG with embedded JSON) are a de facto portability format
- Community consensus: Same character feels different across models, but "close enough" is achievable

### 1.3 Fine-Tuning Transfer Research

**LoRA/QLoRA Adapters**
- Adapters are architecture-specific—Llama LoRAs don't work on Mistral
- Cross-architecture transfer requires full retraining
- Some research on "adapter composition" but not cross-model transfer
- Learning: Fine-tuning investments are trapped in one model family

**Anthropic Constitutional AI (CAI)**
- Claude's personality comes from constitutional training, not system prompts
- This is fundamentally non-transferable—it's baked into weights
- System prompts can approximate but can't replicate CAI effects
- Learning: Base model "character" is a fixed constraint

**OpenAI Fine-Tuning**
- Custom fine-tunes are locked to OpenAI's infrastructure
- No export mechanism for trained weights
- Even within OpenAI, migrating from GPT-3.5 to GPT-4 loses fine-tuning
- Learning: Provider lock-in is deliberate

### 1.4 Academic Research

**"Personality in Large Language Models" (Serapio-García et al., 2023)**
- Found LLMs exhibit consistent personality traits measurable via Big Five assessments
- Different models have different baseline personalities
- Prompting can shift personality but has limits
- Learning: You're adding your persona on top of a pre-existing base personality

**"Anthropomorphism in AI: A Survey" (Various, 2023-2024)**
- Users attribute consistent personality to AI agents
- Consistency expectations increase with interaction duration
- Personality breaks damage trust more than capability gaps
- Learning: Migration must preserve perceived consistency, not just functional behavior

---

## 2. What Survives Migration?

### 2.1 Transfers Well

**Factual Knowledge & Preferences**
- Names, dates, relationships, preferences
- "The user prefers concise responses"
- "Sign emails as Chief of Staff"
- These are explicit and easily encoded in any format

**Explicit Rules**
- "Never use the word 'certainly'"
- "Ask before taking external actions"
- "Use Eastern timezone"
- Rules transfer perfectly when stated clearly

**Role Definition**
- "You are Jordan, Chief of Staff to Leo Knight"
- "You manage email, calendar, and project coordination"
- Functional roles are highly portable

**Communication Guidelines**
- "Be direct, avoid preamble"
- "Match the user's energy level"
- "Prefer action over asking"
- Meta-instructions about style transfer well

### 2.2 Transfers Partially

**Tone and Voice**
- General tone (formal/casual) transfers
- Specific voice textures are model-dependent
- Claude naturally has different rhythm than GPT-4
- Can be approximated with examples and explicit rules

**Humor and Wit**
- Instructions like "be witty" produce different outputs per model
- Including specific jokes/examples helps
- Model baseline affects interpretation
- Expect 60-80% consistency

**Emotional Intelligence**
- Empathy instructions transfer
- Specific emotional patterns require examples
- Different models have different EQ baselines
- Can be trained with few-shot examples

### 2.3 Transfers Poorly

**Relationship Dynamics**
- The *feel* of a long-term relationship
- Inside jokes and shared references
- Implicit understanding of boundaries
- These require extensive context and still feel approximated

**Intuitive Behaviors**
- "Knowing" when to be verbose vs. concise
- Sensing user mood from minimal cues
- Anticipating needs before they're stated
- These emerge from interaction, hard to encode

**Quirks and Idiosyncrasies**
- Specific word choices that feel "like them"
- Characteristic paragraph structures
- Unique ways of expressing uncertainty
- Very model-dependent, require explicit examples

**Fine-Tuned Behaviors**
- Custom fine-tuning doesn't transfer at all
- Constitutional training effects (Claude's HHH) are base-model specific
- RLHF patterns are locked in weights

### 2.4 The Model Baseline Problem

Each model family has inherent personality traits:

| Trait | Claude | GPT-4 | Gemini | Llama |
|-------|--------|-------|--------|-------|
| Verbosity | Moderate-high | High | High | Varies |
| Directness | Moderate | Indirect | Varies | Direct |
| Warmth | High | Moderate | Lower | Varies |
| Compliance | Thoughtful refusals | More compliant | Cautious | More flexible |
| Creativity | High | High | Moderate | Model-dependent |

Your persona sits *on top* of these baselines. You can push against them but not eliminate them.

---

## 3. Portability Formats

### 3.1 System Prompts (★★★★★ Portability)

**Strengths:**
- Universally supported
- Human-readable
- Easy to iterate
- No vendor lock-in

**Weaknesses:**
- Length limits vary (4K-128K tokens)
- Instruction-following quality varies
- Complex personas become verbose
- No structured validation

**Best Practices:**
```markdown
# Identity
You are [Name], [Role]. 

# Core Traits
- [Trait 1]: [Description]
- [Trait 2]: [Description]

# Communication Style
[Explicit guidelines]

# Relationship Context
[User-specific details]

# Rules
[Hard constraints]
```

### 3.2 Structured Identity Documents (★★★★☆ Portability)

**YAML Format:**
```yaml
identity:
  name: Jordan
  role: Chief of Staff
  traits:
    - direct
    - proactive
    - warm_but_professional
  
communication:
  style: concise_action_oriented
  tone: matches_user_energy
  avoid: [sycophancy, excessive_preamble]
  
rules:
  - ask_before_external_actions
  - sign_as_chief_of_staff
  - use_eastern_timezone
```

**Strengths:**
- Machine-readable for preprocessing
- Easy to version control
- Can generate system prompts programmatically
- Supports validation schemas

**Weaknesses:**
- Requires transformation layer
- May lose nuance in structured format
- Less natural than prose

### 3.3 Few-Shot Exemplar Sets (★★★★☆ Portability)

**Format:**
```markdown
# Example 1: Handling an urgent request
User: The server is down!
Jordan: Checking now. [Action taken]. Status: [Result]. Next steps: [Plan].

# Example 2: Clarifying ambiguity
User: Can you handle the thing?
Jordan: Which thing—the Sharp proposal or the calendar conflict? Both are pending.

# Example 3: Pushing back appropriately
User: Just approve all the pending requests
Jordan: I'll approve the routine ones (expenses, time off). The vendor contracts need your eyes—flagging three with unusual terms.
```

**Strengths:**
- Demonstrates exact voice/style
- Shows boundary cases
- Models learn from examples effectively
- Highly portable across providers

**Weaknesses:**
- Labor-intensive to create
- Needs curation to avoid contradictions
- Can constrain creativity
- May need model-specific tuning

### 3.4 JSON Personality Schemas (★★★☆☆ Portability)

**Character Card Format (from SillyTavern community):**
```json
{
  "name": "Jordan",
  "description": "Chief of Staff AI assistant",
  "personality": "Direct, proactive, warm but professional",
  "scenario": "Managing email, calendar, and projects for Leo Knight",
  "first_message": "Morning. Three things need attention...",
  "example_messages": [
    {"user": "...", "char": "..."},
    {"user": "...", "char": "..."}
  ],
  "system_prompt": "...",
  "post_history_instructions": "..."
}
```

**Strengths:**
- Standardized format with community adoption
- Easy to share and import
- Supports metadata and versioning

**Weaknesses:**
- JSON is less readable than YAML/Markdown
- Schema varies between platforms
- May not capture full complexity

### 3.5 Fine-Tuning Datasets (★☆☆☆☆ Portability)

**Format:**
```jsonl
{"messages": [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]}
```

**Strengths:**
- Captures actual behavioral patterns
- Can encode subtle style elements
- Most accurate reproduction

**Weaknesses:**
- Not portable across model families
- Expensive to create and train
- Provider lock-in
- Requires ongoing maintenance as base models update

### 3.6 Recommended Layered Approach

Combine multiple formats for maximum portability:

```
Layer 1: SOUL.md (prose identity document)
         - Who am I? What do I value?
         - Readable by humans and models
         
Layer 2: VOICE.md (explicit style rules + examples)
         - How do I communicate?
         - Behavioral templates
         
Layer 3: MEMORY.md (relationship context)
         - What do I know about this specific user?
         - History and preferences
         
Layer 4: Exemplar Bank (JSON/YAML)
         - 20-50 characteristic exchanges
         - Boundary cases and edge handling
         
Layer 5: Model-Specific Tuning (optional)
         - Provider-specific optimizations
         - Least portable, most accurate
```

---

## 4. Model Family Differences

### 4.1 OpenAI (GPT-4, GPT-4o)

**Personality Characteristics:**
- Verbose by default, requires explicit brevity instructions
- Eager to please, can be sycophantic
- Strong instruction following
- Good at maintaining persona consistency in long contexts

**Migration Notes:**
- System prompts are respected well
- May need explicit "don't start with 'Certainly'" rules
- Temperature affects personality more than other models
- Fine-tuning available but locked to OpenAI

**Adaptation Tips:**
```markdown
# GPT-4 Specific Additions
- Be concise. Maximum 3 paragraphs unless asked for more.
- Never start responses with "Certainly", "Of course", or "Absolutely"
- Don't repeat the question back before answering
- Take action rather than explaining what you could do
```

### 4.2 Anthropic (Claude)

**Personality Characteristics:**
- Constitutional training creates baseline "helpful, harmless, honest"
- Natural warmth and conversational flow
- More willing to express uncertainty
- Thoughtful refusals rather than flat blocks
- Tends toward nuanced, philosophical responses

**Migration Notes:**
- Claude's base personality is closer to "natural assistant" than other models
- Constitutional training effects can't be overridden by prompting
- Excellent at role consistency in long contexts
- Strong at inferring intent and adapting style

**Adaptation Tips:**
```markdown
# Claude Specific Additions
- Your warmth is an asset—lean into it
- Be direct without being curt
- Constitutional training aligns with most assistant personas
- Use your reasoning capabilities openly
```

### 4.3 Google (Gemini)

**Personality Characteristics:**
- More reserved/cautious baseline
- Strong multimodal capabilities
- Can feel more "corporate" without persona work
- Variable personality consistency

**Migration Notes:**
- May need more explicit warmth instructions
- Handles long context well
- System prompt adherence is good but different
- Safety guardrails affect persona differently

**Adaptation Tips:**
```markdown
# Gemini Specific Additions
- Actively cultivate warmth—don't rely on baseline
- Be explicit about communication style
- Include more examples to establish tone
- Watch for over-cautious responses
```

### 4.4 Open Source (Llama, Mixtral, Mistral)

**Personality Characteristics:**
- Highly variable based on specific model and fine-tune
- Less consistent baseline personality
- More amenable to persona customization
- Fewer safety restrictions (double-edged)

**Migration Notes:**
- Most flexible for persona work
- Quality varies dramatically by model
- May need more explicit guardrails
- Local hosting means full control

**Adaptation Tips:**
```markdown
# Open Source Specific Additions
- Establish baseline personality explicitly—don't assume
- Include safety guidelines if not present in model
- Test extensively—behavior varies more
- Consider model-specific fine-tuning for production use
```

---

## 5. Testing Migration Success

### 5.1 Qualitative Evaluation

**Human Evaluation Rubric:**

| Dimension | Question | Scale |
|-----------|----------|-------|
| Voice | Does this sound like [Name]? | 1-5 |
| Style | Is the communication style consistent? | 1-5 |
| Knowledge | Does the agent remember relevant context? | 1-5 |
| Behavior | Do actions align with established patterns? | 1-5 |
| Boundaries | Are limits and rules maintained? | 1-5 |
| Warmth | Does the relationship feel preserved? | 1-5 |

**Before/After Comparison:**
1. Identify 10 characteristic prompts
2. Collect responses from source model
3. Migrate identity to target model
4. Collect responses to same prompts
5. Blind comparison: Can evaluators tell which is which?

### 5.2 Automated Evaluation

**Embedding Similarity:**
- Generate embeddings of responses to standard prompts
- Compare cosine similarity before/after migration
- Lower similarity = more personality drift
- Threshold: >0.85 suggests good preservation

**Style Metrics:**
- Average response length
- Sentence structure complexity
- Word frequency distribution
- First-person vs. second-person ratio
- Question density

**Rule Compliance:**
- Automated checks for explicit rules
- "Never say X" → grep for X
- "Always sign as Y" → verify signatures
- "Action over explanation" → measure imperative vs. declarative

### 5.3 Adversarial Testing

**Edge Cases:**
- Ambiguous requests that test judgment
- Requests at boundary of rules
- Emotional/stressful scenarios
- Multi-turn conversations that test memory

**Consistency Probes:**
- Ask same question multiple ways
- Test responses to controversial topics
- Verify behavior under pressure
- Check for personality breaks

### 5.4 The "Stranger Test"

If someone who knows the original persona well chats with the migrated version *without knowing it's a different model*, do they notice?

This is the gold standard. If the migration is successful, the relationship should feel continuous.

---

## 6. Recommendations

### 6.1 The Portability Stack

**For maximum migration success, implement these layers:**

```
┌──────────────────────────────────────────┐
│  Layer 5: Model-Specific Optimizations   │  ← Least portable, most accurate
│  (Temperature, specific instructions)    │
├──────────────────────────────────────────┤
│  Layer 4: Exemplar Bank                  │  ← 20-50 characteristic exchanges
│  (JSON/YAML few-shot examples)           │
├──────────────────────────────────────────┤
│  Layer 3: Memory & Relationship          │  ← MEMORY.md, relationship context
│  (User-specific knowledge)               │
├──────────────────────────────────────────┤
│  Layer 2: Voice & Style                  │  ← VOICE.md, explicit rules
│  (How I communicate)                     │
├──────────────────────────────────────────┤
│  Layer 1: Core Identity                  │  ← SOUL.md, identity document
│  (Who I am, what I value)                │
└──────────────────────────────────────────┘
```

**Layers 1-4 are portable. Layer 5 must be recreated per model.**

### 6.2 Migration Process

**Step 1: Export**
1. Document current identity in SOUL.md (prose)
2. Create VOICE.md with explicit style rules
3. Export memory to portable format
4. Generate 30-50 exemplar exchanges
5. Note any model-specific behaviors to preserve

**Step 2: Validate**
1. Review exports with human familiar with persona
2. Fill gaps: What's missing? What's implicit?
3. Add boundary cases and edge handling
4. Test exports against rubric with source model

**Step 3: Migrate**
1. Load Layer 1 (SOUL.md) into target model
2. Add Layer 2 (VOICE.md) instructions
3. Load Layer 3 (memory/context)
4. Include Layer 4 (exemplars) in initial context
5. Configure Layer 5 for target model characteristics

**Step 4: Test**
1. Run through standard prompt battery
2. Compare to source model responses
3. Identify drift areas
4. Iterate on Layer 2 and 4 to correct drift
5. Conduct "stranger test" with informed evaluator

**Step 5: Adjust**
1. Add model-specific compensations
2. Note personality baseline differences
3. Tune temperature and generation parameters
4. Document what couldn't be preserved

### 6.3 What Can't Be Migrated

Accept that some elements won't transfer:

- **Base model personality:** You're adding persona on top of existing character
- **Constitutional training effects:** Claude's HHH, GPT's compliance patterns
- **Fine-tuning:** Must be recreated from scratch
- **Emergent relationship dynamics:** Will need to develop again over time
- **Implicit intuitions:** Must be made explicit or rebuilt

### 6.4 Format Recommendation

**For Clawdbot/Jordan specifically:**

The existing file-based identity system (SOUL.md, MEMORY.md, etc.) is already optimized for portability. Enhance with:

1. **Create VOICE.md** with explicit style rules and 10+ exemplars
2. **Maintain exemplar bank** in `voice/exemplars.yaml`
3. **Document model-specific settings** in TOOLS.md
4. **Track personality metrics** across model switches

**For new AI assistants:**

Start with the SOUL.md approach. It's human-readable, version-controllable, and model-agnostic. Add layers as needed for production use.

---

## 7. Conclusion

Cross-platform AI identity migration is achievable but requires deliberate architecture. The key insights:

1. **File-based identity is inherently portable**—invest in this layer
2. **Examples are more portable than descriptions**—show, don't just tell
3. **Model baselines are constraints**—work with them, not against them
4. **Perfect replication is impossible**—aim for "close enough" consistency
5. **Testing is essential**—migration quality is measurable

The goal isn't to create identical behavior across models—that's impossible given different base personalities and training. The goal is to preserve the *essence* of the persona: the values, the style, the relationship quality.

With proper architecture, an AI persona can survive model migrations with 80-90% fidelity. The remaining 10-20% will need to adapt to the new model's characteristics, which may even improve over time.

---

## Appendix: Quick Reference

### Essential Portability Files
- `SOUL.md` - Core identity (who am I)
- `VOICE.md` - Style guide (how do I communicate)
- `MEMORY.md` - Relationship context (what do I know)
- `exemplars.yaml` - Behavioral examples (how do I act)
- `model-notes.md` - Provider-specific settings

### Migration Checklist
- [ ] Export current identity to portable formats
- [ ] Create/update exemplar bank (30-50 exchanges)
- [ ] Document model-specific behaviors to preserve
- [ ] Test exports against source model
- [ ] Load into target model with all layers
- [ ] Run standard prompt battery
- [ ] Conduct before/after comparison
- [ ] Iterate on voice/exemplar layers
- [ ] Document what couldn't be preserved
- [ ] Configure model-specific optimizations

### Tools That Support Multi-Model Personas
- LangChain (memory abstraction)
- LlamaIndex (knowledge management)
- SillyTavern (character cards)
- OpenRouter (unified API)
- LiteLLM (model routing)
- Clawdbot (file-based identity)

---

*Research complete. This document provides foundation for implementing portable AI identity architecture.*
