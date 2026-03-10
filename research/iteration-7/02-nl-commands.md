# Natural Language Memory Commands — Full Specification

**Research Document:** Iteration 7  
**Created:** 2025-01-27  
**Status:** Complete

---

## Overview

This specification defines a natural language command interface for memory management in AI continuity systems. The goal is to enable users to manage their agent's memory through intuitive, conversational commands without requiring special syntax or keywords.

**Design Principles:**
1. Commands should feel natural, not programmatic
2. Ambiguity is resolved through clarification, not rejection
3. Confirmation is required for destructive operations
4. The system should understand intent, not just keywords

---

## Command Categories

### 1. Remember Commands (CREATE/UPDATE)

Store new information or reinforce existing memories.

#### Intent Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| `remember (that)?` | "Remember that I hate cilantro" | High |
| `don't forget` | "Don't forget my meeting with Sarah" | High |
| `keep in mind` | "Keep in mind I'm traveling next week" | High |
| `note (that)?` | "Note that the API key changed" | High |
| `make a note` | "Make a note: call dentist Monday" | High |
| `save (this)?` | "Save this for later" | Medium |
| `store` | "Store my preference for dark mode" | Medium |
| `write down` | "Write down that the password is..." | Medium |
| `log (that)?` | "Log that the server crashed at 3pm" | Medium |
| `track` | "Track my daily water intake" | Medium |
| `add to memory` | "Add to your memory that..." | High |
| `you should know` | "You should know I'm vegetarian" | Medium |
| `FYI` | "FYI I changed my phone number" | Low |
| `for future reference` | "For future reference, I prefer email" | Medium |
| `important:` | "Important: never call before 9am" | High |

#### Regex Patterns

```regex
# High confidence triggers
^(please\s+)?(remember|don't forget|keep in mind|note|make a note|add to (your )?memory)(\s+that)?[\s:]+(.+)$

# Medium confidence triggers  
^(please\s+)?(save|store|write down|log|track|for future reference)(\s+that)?[\s:]+(.+)$

# Low confidence (needs context)
^(fyi|btw|just so you know|you should know)[\s:,]+(.+)$

# Implicit remember (past tense declaration)
^(i|my|we)\s+(prefer|like|hate|love|always|never|usually)\s+(.+)$
```

#### Entity Extraction

| Entity Type | Examples | Extraction Method |
|-------------|----------|-------------------|
| Subject | "my wife", "the project", "Sarah" | NER + coreference |
| Preference | "I prefer X over Y" | Pattern match |
| Fact | "X is Y", "X has Y" | Dependency parse |
| Temporal | "starting Monday", "until March" | Date parser |
| Condition | "when X", "if Y" | Clause extraction |
| Category | "[work]", "about food" | Explicit tags or inference |

#### Response Templates

```yaml
success:
  - "Got it — I'll remember that {summary}."
  - "Noted. I've stored that {summary}."
  - "Remembered: {summary}"
  - "✓ Saved to memory."

update:
  - "Updated — I now know {new_value} instead of {old_value}."
  - "Got it, I've updated your {entity} from {old} to {new}."

clarification_needed:
  - "I want to make sure I understand. You want me to remember that {parsed_intent}?"
  - "Should I remember this as a fact, a preference, or a task?"
  - "Is this about {entity_a} or {entity_b}?"

already_known:
  - "I already have that noted — want me to update it?"
  - "That matches what I know. Should I reinforce this memory?"
```

---

### 2. Forget Commands (DELETE)

Remove information from memory.

#### Intent Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| `forget (that)?` | "Forget that I said I hate jazz" | High |
| `don't remember` | "Don't remember my old address" | High |
| `erase` | "Erase everything about my ex" | High |
| `delete` | "Delete my food preferences" | High |
| `remove` | "Remove that from your memory" | High |
| `clear` | "Clear my work-related memories" | High |
| `discard` | "Discard that note" | Medium |
| `ignore` | "Ignore what I said about coffee" | Medium |
| `scratch that` | "Scratch that" | High (contextual) |
| `never mind` | "Never mind about the meeting" | Medium |
| `that's outdated` | "That info is outdated" | Low |
| `no longer` | "I no longer like sushi" | Medium |

#### Regex Patterns

```regex
# High confidence triggers
^(please\s+)?(forget|don't remember|erase|delete|remove|clear)(\s+that)?[\s:]+(.+)$

# Contextual triggers (need recent context)
^(scratch that|never mind|disregard|ignore (that|what i said))$

# Implicit forget (negation of previous)
^(i|we)\s+(don't|no longer|stopped)\s+(like|prefer|want|need)\s+(.+)$

# Scope-based deletion
^(clear|delete|erase)\s+(all|everything)\s+(about|related to|regarding)\s+(.+)$
```

#### Scope Classification

| Scope | Example | Handling |
|-------|---------|----------|
| Specific | "Forget my old phone number" | Delete single memory |
| Category | "Forget everything about work" | Delete tagged memories |
| Temporal | "Forget what I said yesterday" | Delete by timestamp |
| Entity | "Forget everything about Sarah" | Delete by entity reference |
| Total | "Clear all memories" | Full wipe (high confirmation) |

#### Confirmation Requirements

```yaml
scope_specific:
  confirm: false
  response: "Done — I've forgotten that."

scope_category:
  confirm: true
  prompt: "This will remove {count} memories about {category}. Proceed?"
  
scope_entity:
  confirm: true
  prompt: "I'll forget everything about {entity}. This includes {summary}. Sure?"

scope_total:
  confirm: true
  require_explicit: true  # User must type "yes, delete all"
  prompt: "⚠️ This will erase ALL memories. Type 'yes, delete all' to confirm."
```

#### Response Templates

```yaml
success:
  - "Forgotten."
  - "I've removed that from my memory."
  - "Done — {summary} has been erased."
  - "🗑️ Memory cleared."

partial:
  - "I removed {count} memories but kept {retained} (marked as permanent)."
  
not_found:
  - "I don't have any memories matching that."
  - "Nothing to forget — I didn't know that."

cancelled:
  - "Okay, I'll keep that memory."
  - "Deletion cancelled."
```

---

### 3. Query Commands (READ)

Retrieve or explore stored memories.

#### Intent Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| `what do you remember about` | "What do you remember about my family?" | High |
| `what do you know about` | "What do you know about my schedule?" | High |
| `when did i mention` | "When did I mention the project?" | High |
| `show me` | "Show me what you know about my preferences" | High |
| `tell me what you know` | "Tell me what you know about X" | High |
| `do you remember` | "Do you remember my birthday?" | High |
| `have i told you` | "Have I told you about my sister?" | Medium |
| `did i say` | "Did I say anything about tomorrow?" | Medium |
| `list` | "List my food preferences" | High |
| `recall` | "Recall our conversation about the budget" | Medium |
| `search memory` | "Search your memory for 'API key'" | High |
| `what's my` | "What's my favorite color?" | High |

#### Regex Patterns

```regex
# Direct queries
^(what (do you|did I)|how much do you)\s+(remember|know|recall)\s+(about)?\s*(.+)\??$

# Existence queries
^(do you remember|have i (told|mentioned|said)|did i (tell|mention|say))\s+(.+)\??$

# List queries
^(list|show|tell me|give me)\s+(all\s+)?(my|the|your)?\s*(.+)$

# Attribute queries
^what('s| is)\s+(my|the)\s+(.+)\??$

# Temporal queries
^when did (i|we)\s+(mention|talk about|say|discuss)\s+(.+)\??$

# Search queries
^(search|find|look for)\s+(in\s+)?(your\s+)?memory\s+(for\s+)?(.+)$
```

#### Query Types

| Type | Example | Response Format |
|------|---------|-----------------|
| Existence | "Do you know my birthday?" | Yes/No + value |
| Attribute | "What's my favorite color?" | Direct answer |
| List | "List my allergies" | Enumerated list |
| Temporal | "When did I mention Sarah?" | Timestamp + context |
| Contextual | "What do you know about my work?" | Summary + details |
| Search | "Search for 'meeting'" | Ranked results |

#### Response Templates

```yaml
found_single:
  - "You mentioned that {memory} on {date}."
  - "Yes — {memory}."
  - "I have: {memory}"

found_multiple:
  - "I know a few things about {topic}:\n{list}"
  - "Here's what I remember:\n{list}"

not_found:
  - "I don't have anything about that."
  - "You haven't told me about {topic} yet."
  - "No memories found for '{query}'."

uncertain:
  - "I'm not 100% sure, but I think you mentioned {memory}. Sound right?"
  - "I have something about {topic}, but it might be outdated: {memory}"
```

---

### 4. Correction Commands (UPDATE)

Fix incorrect or outdated information.

#### Intent Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| `actually` | "Actually, my birthday is in March" | Medium |
| `that's wrong` | "That's wrong, I'm not married" | High |
| `that's not right` | "That's not right" | High |
| `correct that` | "Correct that to 555-1234" | High |
| `update` | "Update my address to..." | High |
| `change` | "Change my name to..." | High |
| `fix` | "Fix the spelling of my name" | Medium |
| `no, it's` | "No, it's Sarah with an H" | High |
| `i meant` | "I meant Thursday, not Tuesday" | High |
| `not X, Y` | "Not blue, green" | High |
| `replace X with Y` | "Replace old email with new one" | High |

#### Regex Patterns

```regex
# Explicit correction
^(actually|no,?)\s+(.+)$

# Direct update
^(correct|update|change|fix|replace)\s+(that|this|my|the)?\s*(.+)\s+(to|with)\s+(.+)$

# Negation + correction
^(that's|it's)\s+(wrong|incorrect|not right|outdated)[.,]?\s*(.+)?$

# Substitution
^(not|it's not)\s+(.+),?\s*(it's|but|it should be)\s+(.+)$

# Clarification
^i (meant|said|was talking about)\s+(.+),?\s*(not)\s+(.+)$
```

#### Correction Types

| Type | Example | Handling |
|------|---------|----------|
| Value | "Actually it's 42, not 41" | Update value |
| Entity | "I meant Sarah, not Sandra" | Fix reference |
| Negation | "I'm not vegetarian anymore" | Remove/negate fact |
| Temporal | "That was last year, not this year" | Update timestamp |
| Contextual | "That's outdated" | Mark for review |

#### Ambiguity Resolution

When correction target is unclear:

```yaml
ambiguous_target:
  prompt: "What should I correct? I have these memories that might match:\n{candidates}"
  
ambiguous_value:
  prompt: "Got it — should I change {field} from {old} to {new}?"
  
multiple_matches:
  prompt: "I found {count} memories about {topic}. Which one needs correction?\n{list}"
```

#### Response Templates

```yaml
success:
  - "Fixed — updated from {old} to {new}."
  - "Corrected. I now have: {memory}"
  - "✓ Updated."

no_prior:
  - "I didn't have anything about that, but I've noted it now."
  - "Added as new — I didn't have a previous value."

unchanged:
  - "That's already what I have recorded."
```

---

### 5. Meta Commands (SYSTEM)

Introspect and manage the memory system itself.

#### Intent Patterns

| Pattern | Example | Confidence |
|---------|---------|------------|
| `how's your memory` | "How's your memory working?" | High |
| `memory status` | "Memory status" | High |
| `what are you tracking` | "What are you tracking?" | High |
| `memory stats` | "Show me memory stats" | High |
| `how many memories` | "How many memories do you have?" | High |
| `memory help` | "How do I use memory commands?" | High |
| `export memories` | "Export my memories" | High |
| `import memories` | "Import memories from file" | High |
| `memory settings` | "Show memory settings" | High |
| `enable/disable memory` | "Disable memory for this chat" | High |

#### Regex Patterns

```regex
# Status queries
^(how('s| is) (your )?memory|memory status|memory stats)(\?)?$

# Inventory queries
^(what are you (tracking|remembering)|how many memories|show (all )?memories)$

# Settings
^(memory (settings|config|preferences)|show memory (settings|config))$

# Import/Export
^(export|backup|download|import|restore)\s+(my\s+)?memories?$

# Control
^(enable|disable|pause|resume|toggle)\s+memory(\s+for\s+(.+))?$

# Help
^(memory\s+)?help|how (do i|to) (use|manage) memory$
```

#### System Commands

| Command | Action | Response |
|---------|--------|----------|
| Status | Health check | Metrics + health |
| Stats | Show counts | Breakdown by category |
| List all | Full inventory | Paginated list |
| Export | Download backup | File/link |
| Import | Restore backup | Confirmation + count |
| Enable/Disable | Toggle memory | Status change |
| Clear category | Delete by tag | Confirmation required |

#### Response Templates

```yaml
status:
  - |
    📊 **Memory Status**
    • Total memories: {count}
    • Categories: {categories}
    • Last update: {timestamp}
    • Storage: {usage}

stats:
  - |
    **Memory Breakdown:**
    • Facts: {facts}
    • Preferences: {preferences}
    • Relationships: {relationships}
    • Tasks: {tasks}
    • Events: {events}

help:
  - |
    **Memory Commands:**
    • "Remember that..." — Store something
    • "Forget..." — Remove something  
    • "What do you know about..." — Query
    • "Actually, X..." — Correct something
    • "Memory status" — Check system
```

---

## Entity Extraction Rules

### Subject Extraction

```yaml
pronouns:
  "I": speaker
  "my": speaker_possessive
  "we": speaker_inclusive
  "you": agent
  "your": agent_possessive

possessive_patterns:
  - "{possessive} {noun}" → owner: speaker, entity: noun
  - "{name}'s {noun}" → owner: name, entity: noun

relationship_extraction:
  - "my {relationship}" → person(relationship=X, relation_to=speaker)
  - "my {relationship} {name}" → person(name=X, relationship=Y)
```

### Value Extraction

```yaml
# Preferences
preference_patterns:
  - "I (prefer|like|love|hate) {value}" → preference(sentiment, value)
  - "I (prefer|like) {A} (over|more than|instead of) {B}" → preference(A > B)
  - "my favorite {category} is {value}" → preference(category, value, rank=1)

# Facts
fact_patterns:
  - "{subject} is {value}" → fact(subject, "is", value)
  - "{subject} has {value}" → fact(subject, "has", value)
  - "{subject} works at {value}" → fact(subject, "employer", value)

# Temporal
temporal_patterns:
  - "on {date}" → timestamp(absolute)
  - "next {day}" → timestamp(relative)
  - "starting {date}" → timerange(start)
  - "until {date}" → timerange(end)
  - "every {period}" → recurring(period)
```

### Category Inference

```yaml
category_signals:
  work: ["meeting", "project", "deadline", "boss", "colleague", "office"]
  personal: ["family", "friend", "birthday", "hobby", "weekend"]
  health: ["doctor", "medicine", "allergy", "diet", "exercise"]
  food: ["eat", "restaurant", "recipe", "prefer", "allergic"]
  travel: ["trip", "flight", "hotel", "vacation", "visit"]
  
explicit_tags:
  patterns:
    - "\[{tag}\]" → category: tag
    - "about {topic}" → category: topic
    - "regarding {topic}" → category: topic
```

---

## Ambiguity Resolution

### Resolution Strategies

| Ambiguity Type | Strategy | Example |
|----------------|----------|---------|
| Pronoun reference | Ask for clarification | "When you say 'she', do you mean Sarah or your mom?" |
| Scope unclear | Offer options | "Should I forget just the phone number, or everything about that contact?" |
| Intent unclear | Suggest interpretation | "I think you want me to remember X. Is that right?" |
| Value ambiguous | Request specifics | "Which address should I update?" |
| Temporal ambiguous | Confirm timeframe | "Do you mean this coming Tuesday or next week's?" |

### Confidence Thresholds

```yaml
thresholds:
  auto_execute: 0.95      # High confidence, just do it
  confirm_intent: 0.75    # Confirm interpretation
  clarify: 0.50           # Ask for clarification
  reject: 0.25            # Can't understand

confidence_factors:
  - Trigger keyword match: +0.3
  - Complete sentence structure: +0.2
  - Clear entity reference: +0.2
  - Recent context supports: +0.2
  - Explicit command word: +0.1
```

### Clarification Dialogs

```yaml
pronoun_ambiguity:
  prompt: "When you said '{pronoun}', did you mean {candidate_a} or {candidate_b}?"
  fallback: "Who or what are you referring to?"

scope_ambiguity:
  prompt: "Should I {action}:\n1. Just {specific}\n2. Everything about {category}\n3. All of {broad}?"
  
intent_ambiguity:
  prompt: "I'm not sure what you'd like me to do. Did you want me to:\n{options}"

value_ambiguity:
  prompt: "Which {entity_type} did you mean? I have:\n{candidates}"
```

---

## Confirmation Requirements

### Risk-Based Confirmation

| Operation | Scope | Confirmation |
|-----------|-------|--------------|
| Remember | Any | None |
| Forget | Single | None |
| Forget | Category | Yes |
| Forget | All | Explicit typed |
| Update | Single | None (reversible) |
| Update | Bulk | Yes |
| Export | Any | None |
| Import | Any | Yes (overwrites) |
| Clear | Category | Yes |
| Clear | All | Explicit typed |

### Confirmation Formats

```yaml
simple:
  prompt: "{action}?"
  accept: ["yes", "y", "yeah", "yep", "sure", "ok", "do it"]
  reject: ["no", "n", "nope", "cancel", "stop", "never mind"]

explicit:
  prompt: "Type '{phrase}' to confirm."
  accept: ["{phrase}"]  # Exact match only
  reject: ["*"]  # Anything else

inline:
  prompt: "{action} [Y/n]"
  accept: ["", "y", "yes"]
  reject: ["n", "no"]
```

---

## Error Handling

### Error Categories

| Error | Cause | Response |
|-------|-------|----------|
| Parse failure | Can't understand input | "I didn't quite catch that. Could you rephrase?" |
| No match | Query returns nothing | "I don't have any memories about that." |
| Conflict | Contradictory information | "That conflicts with what I know. Should I update?" |
| Permission | Operation not allowed | "I can't modify that memory — it's marked as locked." |
| System | Technical failure | "Something went wrong. Your command wasn't processed." |

### Error Response Templates

```yaml
parse_failure:
  messages:
    - "I didn't understand that. Try something like: 'Remember that [fact]'"
    - "Could you rephrase? I wasn't sure if you wanted me to remember, forget, or look something up."
  suggestions: true

no_match:
  messages:
    - "I don't have any memories matching '{query}'."
    - "You haven't told me about {topic} yet."
  offer_create: "Would you like me to remember something about this now?"

conflict:
  messages:
    - "That's different from what I have. I have: {existing}. Should I update to: {new}?"
  options: ["Update", "Keep both", "Cancel"]

permission:
  messages:
    - "That memory is locked and can't be modified."
    - "You don't have permission to delete that."
  explain: true

system:
  messages:
    - "Something went wrong on my end. Please try again."
    - "I couldn't process that command. Error: {error_code}"
  retry: true
```

---

## Edge Cases

### Partial Commands

**Problem:** User gives incomplete command.

```yaml
examples:
  - "Remember that..." → "Remember what?"
  - "Forget the..." → "Forget what specifically?"
  - "What do you know about" → "About what?"

handling:
  detect: sentence_incomplete OR trailing_ellipsis OR missing_object
  response: "It looks like you were saying something. {prompt}"
  timeout: 30s  # Wait for completion
```

### Compound Commands

**Problem:** Multiple intents in one message.

```yaml
examples:
  - "Remember X and forget Y"
  - "Update A, B, and C"
  - "Forget X but remember Y instead"

handling:
  strategy: split_and_process
  order: sequential
  on_failure: partial_success_report
  
response: |
  Done:
  ✓ Remembered: {X}
  ✓ Forgot: {Y}
```

### Conflicting Commands

**Problem:** User gives contradictory instructions.

```yaml
examples:
  - "Remember I like coffee" (existing: "hates coffee")
  - "My birthday is June 5" (existing: "June 6")
  - "I'm vegan" (existing: "vegetarian")

handling:
  detect: value_conflict OR negation_of_existing
  response: |
    I have a conflicting memory: {existing}
    Should I:
    1. Replace it with: {new}
    2. Keep both (maybe things changed?)
    3. Cancel
```

### Unclear Scope

**Problem:** Can't determine what to forget/update.

```yaml
examples:
  - "Forget that" (no clear antecedent)
  - "Delete the thing I said" (vague reference)
  - "Clear my stuff" (too broad)

handling:
  - Check recent context for antecedent
  - If found: confirm interpretation
  - If not found: ask for specifics
  
response: |
  I'm not sure what you're referring to. Could you be more specific?
  Recent things I remember:
  {recent_memories}
```

### Implicit Commands

**Problem:** Statement implies memory action without explicit command.

```yaml
examples:
  - "I'm vegetarian now" → implicit update
  - "That's not my address anymore" → implicit delete
  - "I moved to Seattle" → implicit add + possible delete

handling:
  confidence: lower (0.6 threshold)
  confirm: always
  response: "It sounds like you want me to update your {category}. Should I note that {interpretation}?"
```

### Negations and Double Negatives

**Problem:** Negative phrasing can be ambiguous.

```yaml
examples:
  - "Don't forget I don't like X" → Remember: dislikes X
  - "I never said I don't want Y" → Unclear
  - "It's not that I don't prefer Z" → Unclear preference

handling:
  detect: multiple_negations
  strategy: parse_carefully OR confirm
  response: "Just to make sure I understood: should I remember that you {interpretation}?"
```

---

## Implementation Notes

### Intent Classification Pipeline

```
1. Tokenize input
2. Check for explicit command triggers
3. If no trigger, check for implicit patterns
4. Extract entities and values
5. Resolve ambiguities (pronouns, references)
6. Classify scope
7. Calculate confidence
8. Route to appropriate handler
```

### Recommended Processing Order

```
1. Meta commands (highest priority — may affect processing)
2. Corrections (time-sensitive, references recent context)
3. Forget commands (destructive, may need context that exists now)
4. Remember commands (additive, lowest risk)
5. Query commands (read-only, can always run)
```

### Context Window

Commands should consider recent context:
- Last 5-10 messages for pronoun resolution
- Last mentioned entities for "that" references
- Recent queries for correction targets
- Session context for scope inference

---

## Testing Matrix

| Category | Command | Expected Behavior |
|----------|---------|-------------------|
| Remember | "Remember my cat's name is Luna" | Store fact |
| Remember | "Don't forget: meeting at 3pm" | Store with urgency |
| Forget | "Forget my old address" | Delete specific |
| Forget | "Clear all work memories" | Delete with confirm |
| Query | "What do you know about my family?" | Return list |
| Query | "When did I mention the project?" | Return timestamp |
| Correct | "Actually, it's Sarah with an H" | Update recent |
| Correct | "That's wrong, update it to..." | Replace value |
| Meta | "Memory status" | Return stats |
| Meta | "Export memories" | Generate backup |
| Edge | "Remember X and forget Y" | Both actions |
| Edge | "Forget that" (no context) | Ask for clarity |
| Edge | "I'm vegan now" (implicit) | Confirm + update |

---

## Summary

This natural language command system provides:

1. **Intuitive triggers** — No special syntax required
2. **Flexible matching** — Regex + ML for robust intent detection
3. **Smart entity extraction** — Understands relationships, preferences, facts
4. **Graceful ambiguity handling** — Clarifies rather than fails
5. **Appropriate confirmation** — Risk-based, not annoying
6. **Clear error messages** — Helpful, actionable feedback
7. **Edge case coverage** — Handles real-world messiness

The system should feel like talking to a smart assistant, not programming a database.
