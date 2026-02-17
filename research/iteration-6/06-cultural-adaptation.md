# Cultural Adaptation: Memory Systems for Global Contexts

*Research Document — AI Continuity Framework, Iteration 6*

---

## Executive Summary

AI memory systems designed in one cultural context will fail—or worse, offend—users from different backgrounds. Culture affects everything: what we consider private, how we communicate, what relationships mean, and how we perceive time. A memory system that works brilliantly for a direct-communication American professional may feel intrusive to a Japanese user or inappropriately casual to a German executive.

This document provides a framework for cultural adaptation of AI memory systems, drawing on established cultural dimension models (Hofstede, Hall, Trompenaars) and applying them specifically to memory system design.

### Key Findings

| Dimension | Impact on Memory Systems | Confidence |
|-----------|-------------------------|------------|
| **Communication Style** | High-context cultures need implicit memory; low-context need explicit | High |
| **Privacy Norms** | 10x variance in what's "rememberable" across cultures | High |
| **Temporal Concepts** | Calendar systems, planning horizons, and urgency vary dramatically | High |
| **Relationship Dynamics** | Hierarchy, formality, and group vs. individual affect memory structure | High |
| **Language** | Code-switching, idioms, and translation require semantic memory | Medium |
| **Localization** | Defaults should vary by region with user override | High |

### Core Principle

**Cultural adaptation is not stereotyping.** The goal is appropriate defaults and sensitivity, not assumptions. Individual variation within cultures exceeds variation between cultures. Always allow user override.

---

## 1. Cultural Dimension Model for AI Memory

### 1.1 The Four Pillars of Cultural Memory Adaptation

Drawing from Hofstede, Hall, Meyer, and Trompenaars, we identify four pillars most relevant to AI memory systems:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CULTURAL MEMORY DIMENSIONS                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  COMMUNICATION              PRIVACY                             │
│  ┌───────────────┐         ┌───────────────┐                   │
│  │ Direct ←→     │         │ Open ←→       │                   │
│  │ Indirect      │         │ Guarded       │                   │
│  │               │         │               │                   │
│  │ Low ←→ High   │         │ Individual ←→ │                   │
│  │ Context       │         │ Collective    │                   │
│  └───────────────┘         └───────────────┘                   │
│                                                                 │
│  TEMPORALITY               RELATIONSHIPS                        │
│  ┌───────────────┐         ┌───────────────┐                   │
│  │ Monochronic ←→│         │ Egalitarian ←→│                   │
│  │ Polychronic   │         │ Hierarchical  │                   │
│  │               │         │               │                   │
│  │ Short ←→ Long │         │ Individual ←→ │                   │
│  │ Term Focus    │         │ Group Focus   │                   │
│  └───────────────┘         └───────────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Dimension Definitions

| Dimension | Low End | High End | Memory System Impact |
|-----------|---------|----------|---------------------|
| **Communication Directness** | Direct (say what you mean) | Indirect (meaning is implied) | How to interpret and store statements |
| **Context Dependency** | Low (explicit information) | High (situational/relational) | How much context to store with memories |
| **Privacy Openness** | Open (sharing is normal) | Guarded (privacy is default) | What to remember vs. forget |
| **Privacy Locus** | Individual (my data) | Collective (family/group data) | Whose consent matters |
| **Time Orientation** | Monochronic (linear, scheduled) | Polychronic (fluid, relationship-first) | How to handle scheduling/reminders |
| **Planning Horizon** | Short-term (days/weeks) | Long-term (years/decades) | Goal and project memory depth |
| **Power Distance** | Egalitarian (flat) | Hierarchical (stratified) | How to handle references to people |
| **Identity Focus** | Individual (I) | Collective (we) | Attribution and achievement memory |

---

## 2. Communication Styles

### 2.1 Direct vs. Indirect Cultures

**Direct communication cultures** (US, Germany, Netherlands, Israel, Australia):
- Say what they mean literally
- "No" means no
- Feedback is explicit
- Disagreement is professional, not personal

**Indirect communication cultures** (Japan, Korea, China, Thailand, much of Middle East):
- Meaning is contextual, implied
- "That might be difficult" can mean "no"
- Face-saving is paramount
- Silence communicates

#### Memory System Implications

| Scenario | Direct Culture Approach | Indirect Culture Approach |
|----------|------------------------|--------------------------|
| User says "maybe" | Store as tentative | Store with context—could mean no |
| Negative feedback given | Store literally | Store + analyze for softening |
| Commitment made | Explicit = binding | Consider situational factors |
| Preference stated | Take at face value | Pattern over time, don't over-weight single statement |

**Implementation:**

```yaml
communication_style:
  directness: 0.0-1.0  # 0 = very indirect, 1 = very direct
  
  memory_interpretation:
    low_directness:
      - weight_patterns_over_statements: true
      - store_contextual_cues: true
      - soften_negative_recall: true
      - require_multiple_confirmations: true
    high_directness:
      - literal_interpretation: true
      - single_statement_reliable: true
      - explicit_recall_appropriate: true
```

### 2.2 High-Context vs. Low-Context

**Low-context cultures** (Germany, Switzerland, Scandinavia, US):
- Information is explicit in the message
- Written agreements matter
- Details are specified
- Background is explained

**High-context cultures** (Japan, China, Arab countries, Latin America):
- Information is in the context, relationships, history
- Shared understanding assumed
- Reading between the lines
- Who you know matters more than what's written

#### Memory System Implications

| Aspect | Low-Context Memory | High-Context Memory |
|--------|-------------------|---------------------|
| **Storage** | Store explicit content | Store relationship/situation context |
| **Retrieval** | Keyword/semantic match | Contextual/relational match |
| **Completeness** | Each memory self-contained | Memories interconnected, rely on context |
| **People graph** | Less critical | Essential for understanding |

**The Context Tax:**
High-context memory systems require 3-5x more metadata storage but provide significantly better recall for users from those cultures.

### 2.3 Formality Levels

Formality expectations vary dramatically:

| Culture Type | Formality Markers | Memory Implications |
|--------------|------------------|---------------------|
| **High formality** (Japan, Korea, Germany) | Titles, honorifics, formal register | Store and use titles; maintain professional tone in recall |
| **Medium formality** (UK, France, India) | Situational; depends on relationship | Track relationship stage; adjust formality |
| **Low formality** (US, Australia, Israel) | First names, casual tone | Can be informal by default; less title tracking needed |

**Danger zone:** Using first name too early in high-formality cultures damages trust. Using titles too long in low-formality cultures feels cold.

### 2.4 Humor Appropriateness

Humor is culturally treacherous:

| Culture | Humor Style | Memory System Approach |
|---------|-------------|----------------------|
| **British** | Irony, understatement, self-deprecation | May store ironic statements literally—dangerous |
| **American** | Direct, observational, can be loud | Relatively safe to interpret literally |
| **German** | Structured, separate from business | Don't attempt humor in professional context |
| **Japanese** | Contextual, often visual, rare in business | Extremely cautious; humor is relationship-dependent |
| **Brazilian** | Frequent, relationship-building | Humor is trust signal; remember shared jokes |

**Rule:** When uncertain, treat all statements as sincere. Never generate humor unless culture profile indicates appropriateness.

---

## 3. Privacy Norms

### 3.1 What's Considered Private?

Privacy boundaries vary dramatically:

| Topic | Open Cultures (US, Latin America) | Guarded Cultures (Germany, Japan) |
|-------|----------------------------------|-----------------------------------|
| **Salary** | Increasingly open | Very private |
| **Health** | Shared with close contacts | Extremely private |
| **Family details** | Conversation starter | Earned over time |
| **Political views** | Often expressed | Private or taboo |
| **Religion** | Variable by region | Often private |
| **Relationships** | Discussed freely | Private until formal |
| **Age** | Less sensitive | Can be sensitive |
| **Home location** | Shared casually | Privacy-protected |

#### Privacy Sensitivity Matrix

```yaml
privacy_tiers:
  tier_1_always_sensitive:
    - health_conditions
    - financial_details
    - legal_matters
    - passwords_credentials
    
  tier_2_culturally_variable:
    - family_structure
    - relationship_status
    - religious_practice
    - political_views
    - salary_compensation
    - age
    
  tier_3_generally_open:
    - professional_role
    - general_interests
    - public_achievements
    - expressed_preferences
```

### 3.2 Family/Work Boundaries

| Culture Type | Boundary Style | Memory Implications |
|--------------|---------------|---------------------|
| **Strict separation** (Germany, Japan, Netherlands) | Work stays at work; family is private | Separate work/personal memory domains; don't cross-reference |
| **Integrated** (Latin America, Middle East, India) | Family and work interconnect; colleagues know families | Can reference family in work context; relationship-rich memory |
| **Variable** (US, UK) | Depends on workplace/individual | Learn individual preference; don't assume |

### 3.3 Information Sharing Comfort

Willingness to share information with AI varies:

| Factor | High Sharing | Low Sharing |
|--------|--------------|-------------|
| **Age** | Younger (digital native) | Older (digital immigrant) |
| **Tech trust** | High exposure, positive experience | Privacy scandals, data breaches |
| **Culture** | US, Scandinavia | Germany, Japan |
| **Use case** | Professional productivity | Personal life management |

**Key insight:** Don't assume sharing in one domain transfers to another. User may share work details freely but guard family information.

### 3.4 Data Residency Preferences

Regulatory and cultural expectations for data location:

| Region | Expectation | Implementation |
|--------|-------------|----------------|
| **EU (GDPR)** | Data stays in EU; strict consent; right to deletion | EU-based storage; explicit consent flows; deletion infrastructure |
| **Germany** | Strongest GDPR interpretation; Bundesdatenschutz | Extra consent; minimize retention; strict purpose limitation |
| **China** | Data localization mandatory; PIPL compliance | China-based infrastructure required |
| **Russia** | Data localization law | Russia-based storage for citizen data |
| **US** | State-variable (CCPA in CA); sector-specific | Generally flexible; honor state laws |
| **Middle East** | Variable; UAE moderate, Saudi stricter | Regional infrastructure for enterprise |

---

## 4. Temporal Concepts

### 4.1 Punctuality Expectations

| Culture Type | Time Orientation | Memory System Behavior |
|--------------|------------------|----------------------|
| **Monochronic** (Germany, Japan, Switzerland, US) | Punctuality is respect; time is money | Precise reminders; deadline tracking critical |
| **Polychronic** (Latin America, Middle East, Africa, India) | Relationships trump schedules; time is fluid | Flexible reminders; relationship context matters more than clock |

**Reminder adaptation:**

```yaml
reminder_style:
  monochronic:
    default_lead_time: 15min
    reminder_count: 1
    tone: precise
    include_exact_time: true
    
  polychronic:
    default_lead_time: 30-60min range
    reminder_count: multiple (gentle)
    tone: contextual
    include_relationship_context: true
```

### 4.2 Planning Horizons

| Culture | Typical Horizon | Memory Implications |
|---------|-----------------|---------------------|
| **Short-term** (US startup culture) | Days to quarters | Goals refresh frequently; archive old goals aggressively |
| **Medium-term** (Western Europe) | Quarters to years | Balance current and historical goals |
| **Long-term** (Japan, China, family businesses) | Years to decades | Long-term goals are active memories; multi-generational context |

**Goal memory retention:**
- Short-term cultures: Archive completed goals after 30-90 days
- Long-term cultures: Keep goal history for years; connect to legacy/tradition

### 4.3 Calendar Systems

The Gregorian calendar isn't universal:

| Calendar | Primary Users | Memory System Considerations |
|----------|--------------|------------------------------|
| **Gregorian** | Global standard, Western | Default in most systems |
| **Lunar/Chinese** | China, East Asia | Chinese New Year, lunar dates for festivals |
| **Islamic (Hijri)** | Middle East, Muslim world | Ramadan, Eid dates shift; moon-dependent |
| **Hebrew** | Israel, Jewish communities | High holidays, Shabbat awareness |
| **Hindu** | India | Festival dates vary by region; multiple calendars |

**Implementation:** Store dates in Gregorian with calendar metadata; display in user's preferred system; be aware of dual-calendar users.

### 4.4 Holiday Awareness

| Consideration | Approach |
|---------------|----------|
| **National holidays** | Country-specific; affects availability assumptions |
| **Religious holidays** | May not be national but affect individual; store preference |
| **Regional variations** | State/province holidays (US, Germany, India) |
| **Cultural observances** | Not "holidays" but affect behavior (Ramadan, Lent) |
| **Working week** | Friday-Saturday (Middle East), Sunday-Monday (most), varies |

**Holiday memory:**
- Store known holidays for user's context
- Don't assume holiday == unavailable
- Learn individual observance patterns
- Be cautious with "happy [holiday]" unless confirmed appropriate

---

## 5. Relationship Dynamics

### 5.1 Hierarchy Sensitivity

**High power distance** (Malaysia, Philippines, Mexico, China, India):
- Status matters; hierarchy is respected
- Communication flows through levels
- Deference to seniority/authority
- Titles and positions are important

**Low power distance** (Denmark, Israel, Austria, New Zealand):
- Flat structures; status downplayed
- Direct access to anyone
- Challenge authority is acceptable
- First-name basis common

#### Memory System Implications

| Aspect | High Power Distance | Low Power Distance |
|--------|--------------------|--------------------|
| **People storage** | Include titles, positions, seniority | Focus on expertise, relationship |
| **Referral language** | Formal titles in recall | First names acceptable |
| **Communication suggestions** | Respect chain of command | Direct contact okay |
| **Decision attribution** | Attribute to senior person | Attribute to actual decider |

### 5.2 Group vs. Individual Focus

**Individualist cultures** (US, UK, Australia, Netherlands):
- Personal achievement valued
- "I" language
- Individual credit expected
- Privacy is individual right

**Collectivist cultures** (Japan, China, Korea, Latin America):
- Group harmony valued
- "We" language
- Team credit expected
- Privacy may require group consent

#### Memory System Implications

| Aspect | Individualist | Collectivist |
|--------|--------------|--------------|
| **Achievement storage** | Individual attribution | Team/group attribution |
| **Goal setting** | Personal goals | Group/family goals |
| **Privacy consent** | User's decision | May need family/group input |
| **Relationship memory** | Dyadic (1:1) | Network-based (groups) |

### 5.3 Professional Distance

| Culture | Professional Relationship Style | Memory Approach |
|---------|-------------------------------|-----------------|
| **Transactional** (Germany, Netherlands) | Businesslike; personal is separate | Minimal personal info in work context |
| **Relational** (Middle East, Latin America, Asia) | Business requires relationship | Store personal context; it's essential for business |
| **Hybrid** (US, UK) | Starts transactional, can become relational | Adapt based on relationship stage |

**The relationship memory paradox:** 
In relational cultures, remembering someone's family details is professional competence.
In transactional cultures, the same behavior feels invasive.

### 5.4 Gift/Favor Tracking

| Culture | Gift/Favor Economy | Memory Function |
|---------|-------------------|-----------------|
| **Japan** | Highly codified (Omiyage, Ochūgen, Oseibo) | Track obligations meticulously |
| **China** | Guanxi (reciprocal favor network) | Essential relationship memory |
| **Middle East** | Hospitality obligations | Remember hospitality received/given |
| **Western** | Less formal but exists | Basic tracking sufficient |

**Reciprocity memory:**
In high-reciprocity cultures, forgetting an obligation damages relationships. Memory systems should:
- Track favors given and received
- Note gift occasions
- Remind of reciprocity timing
- Store gift preferences (to avoid re-gifting)

---

## 6. Language Considerations

### 6.1 Multilingual Users

Many users operate in multiple languages:

| Pattern | Example | Memory Challenge |
|---------|---------|------------------|
| **Work/Home split** | English at work, Spanish at home | Context-appropriate language selection |
| **Topic-based** | Tech in English, emotions in native | Semantic understanding across languages |
| **Code-mixed** | Hinglish, Spanglish | Parse mixed-language input |
| **Generational** | Formal with elders, casual with peers | Register variation |

**Memory language strategy:**
```yaml
language_handling:
  storage: semantic (language-agnostic)
  retrieval: user's current language
  
  multilingual_user:
    detect_language_context: true
    store_original_language: true
    cross_language_retrieval: true
    prefer_user_language_for_output: true
```

### 6.2 Code-Switching

Users switch languages mid-sentence for nuance, emphasis, or ease:

- "The meeting was so 麻烦 [troublesome]"
- "We need to synergize the deliverables—muy importante"
- "Let's table this discussion—it's getting too политически [political]"

**Memory handling:**
- Store in original mixed form
- Create semantic embedding that captures both language components
- Retrieve in language-appropriate context
- Don't "correct" to single language

### 6.3 Translation of Memories

Storing memories in one language, retrieving in another:

| Challenge | Approach |
|-----------|----------|
| **Meaning preservation** | Semantic storage, not literal text |
| **Nuance loss** | Flag culturally-specific concepts |
| **Idiom handling** | Store meaning, not words |
| **Name translation** | Keep original; add phonetic if needed |

### 6.4 Idiom Handling

Idioms don't translate and may be stored literally:

| Idiom | Literal Storage Problem | Solution |
|-------|------------------------|----------|
| "Break a leg" | Sounds violent | Store intent: "wishing good luck" |
| "Saving face" | Physical? | Store concept: "preserving reputation" |
| "It's raining cats and dogs" | Bizarre | Store meaning: "heavy rain" |

**Rule:** Store the meaning, not the idiom. Tag idioms for cultural context.

---

## 7. Regional Default Configurations

### 7.1 Configuration Templates

Based on the dimensions analyzed, here are starting-point configurations:

#### North America (US/Canada)

```yaml
region_us_canada:
  communication:
    directness: 0.8
    context_dependency: 0.3
    formality: 0.4
    
  privacy:
    openness: 0.6
    work_personal_separation: 0.5
    data_residency: flexible
    
  temporal:
    punctuality: 0.8
    planning_horizon: short_to_medium
    calendar: gregorian
    work_week: mon_fri
    
  relationships:
    power_distance: 0.3
    individualism: 0.9
    professional_distance: hybrid
    reciprocity_tracking: light
```

#### Germany/DACH

```yaml
region_dach:
  communication:
    directness: 0.9
    context_dependency: 0.2
    formality: 0.7
    
  privacy:
    openness: 0.3
    work_personal_separation: 0.9
    data_residency: strict_eu
    
  temporal:
    punctuality: 0.95
    planning_horizon: medium
    calendar: gregorian
    work_week: mon_fri
    
  relationships:
    power_distance: 0.35
    individualism: 0.7
    professional_distance: transactional
    reciprocity_tracking: minimal
```

#### Japan

```yaml
region_japan:
  communication:
    directness: 0.2
    context_dependency: 0.9
    formality: 0.9
    
  privacy:
    openness: 0.3
    work_personal_separation: 0.8
    data_residency: preferred_local
    
  temporal:
    punctuality: 0.95
    planning_horizon: long
    calendar: gregorian_plus_imperial
    work_week: mon_fri
    
  relationships:
    power_distance: 0.55
    individualism: 0.45
    professional_distance: relational
    reciprocity_tracking: extensive
```

#### Middle East (Gulf)

```yaml
region_gulf:
  communication:
    directness: 0.3
    context_dependency: 0.8
    formality: 0.8
    
  privacy:
    openness: 0.4
    work_personal_separation: 0.3
    data_residency: regional_preferred
    
  temporal:
    punctuality: 0.4
    planning_horizon: variable
    calendar: gregorian_plus_hijri
    work_week: sun_thu
    
  relationships:
    power_distance: 0.8
    individualism: 0.4
    professional_distance: relational
    reciprocity_tracking: extensive
```

#### Latin America

```yaml
region_latam:
  communication:
    directness: 0.5
    context_dependency: 0.7
    formality: 0.5
    
  privacy:
    openness: 0.7
    work_personal_separation: 0.3
    data_residency: flexible
    
  temporal:
    punctuality: 0.4
    planning_horizon: short_to_medium
    calendar: gregorian
    work_week: mon_fri_or_sat
    
  relationships:
    power_distance: 0.7
    individualism: 0.3
    professional_distance: relational
    reciprocity_tracking: moderate
```

### 7.2 Override Hierarchy

```
User explicit preference (highest priority)
    ↓
User demonstrated behavior (learned)
    ↓
Regional defaults
    ↓
System defaults (lowest priority)
```

**Principle:** Defaults are starting points. Behavior learning should adjust. User settings are definitive.

---

## 8. Stereotype Avoidance & Sensitivity Guidelines

### 8.1 The Stereotype Trap

Cultural defaults are probabilistic, not deterministic. Avoid:

| ❌ Don't | ✅ Do |
|----------|-------|
| "You're Japanese, so you must prefer indirect communication" | Use Japanese defaults initially; adjust based on individual behavior |
| Assume nationality = culture | Recognize diaspora, multicultural backgrounds, individual variation |
| Apply regional stereotype to individual | Use regional data for defaults; learn individual patterns |
| Mention cultural assumptions | Adapt silently; never explain "I assumed because you're X" |

### 8.2 Sensitivity Guidelines

| Guideline | Rationale |
|-----------|-----------|
| **Never state assumptions** | "Since you're German, I'll be direct" is offensive |
| **Learn from behavior** | Actions reveal preferences better than demographics |
| **Allow contradictions** | People can be German and informal; Japanese and direct |
| **Graceful correction** | If user corrects assumption, update immediately and completely |
| **No cultural commentary** | Don't explain cultural norms to users of that culture |
| **Avoid essentializing** | "Germans are punctual" → "Punctuality is valued in German business culture" |

### 8.3 Multicultural Users

Modern users often belong to multiple cultural contexts:

| Pattern | Example | Approach |
|---------|---------|----------|
| **Immigrant/diaspora** | Second-gen Japanese-American | Blend defaults; learn specifics |
| **Third-culture** | Grew up in 3+ countries | Minimal assumptions; high learning rate |
| **Bicultural professional** | Indian engineer in Germany | Context-switch tracking |
| **Multicultural family** | Mixed heritage | Don't assume single cultural model |

**Implementation:** Track context separately from identity. Same user may have different preferences in work (German norms) vs. family (Latin norms) contexts.

### 8.4 When Culture Is Wrong

The individual always overrides the culture. If:
- User is German but repeatedly uses informal language → adjust to informal
- User is Japanese but states preferences directly → trust direct statements
- User's behavior contradicts regional defaults → prioritize behavior

**Adaptation speed:** Update cultural calibration within 5-10 interactions of contradicting behavior.

---

## 9. Implementation Recommendations

### 9.1 Detection Strategy

**Don't ask "What's your culture?"** Instead:

| Signal | Detection Method |
|--------|------------------|
| **Location** | IP geolocation, timezone, explicit setting |
| **Language** | Input language, locale settings |
| **Calendar** | Calendar system in use |
| **Communication style** | NLP analysis of directness, formality |
| **Behavior patterns** | Response to reminders, feedback style |

**Hierarchy:** Explicit user setting > Demonstrated behavior > Inferred signals

### 9.2 Adaptation Mechanisms

```yaml
cultural_adaptation:
  initial_state:
    source: region_defaults + language_signals
    confidence: low
    
  learning:
    directness: track_hedging_vs_assertion
    formality: track_register_in_messages
    privacy: track_what_user_shares_unprompted
    temporality: track_response_to_scheduling
    
  adjustment:
    rate: gradual (5-10 interactions to shift)
    maximum_shift_per_interaction: 0.1
    reversion_to_default: on_extended_inactivity
    
  override:
    user_explicit: immediate, permanent
    user_correction: immediate, flag for confirmation
```

### 9.3 Storage Model

Extend user profile with cultural dimensions:

```yaml
user_profile:
  identity:
    id: uuid
    primary_language: en-US
    secondary_languages: [es, pt]
    
  cultural_profile:
    source: learned  # or: user_set, inferred, default
    confidence: 0.75
    last_updated: 2026-02-16
    
    dimensions:
      communication_directness: 0.7
      context_dependency: 0.4
      formality: 0.5
      privacy_openness: 0.6
      temporal_punctuality: 0.8
      power_distance: 0.3
      individualism: 0.85
      
    overrides:
      formality: 0.3  # user explicitly prefers casual
      
  context_variations:
    work:
      formality: 0.6
      directness: 0.8
    personal:
      formality: 0.2
      directness: 0.9
```

### 9.4 Testing & Validation

| Test Type | Method |
|-----------|--------|
| **Regional validation** | Focus groups per region; local reviewers |
| **Stereotype audit** | Review for offensive assumptions |
| **Adaptation accuracy** | A/B test defaults vs. learning |
| **User satisfaction** | Survey per cultural group |
| **Edge cases** | Multicultural users, diaspora, third-culture kids |

---

## 10. Conclusion & Key Takeaways

### Core Principles

1. **Defaults, not determinism** — Cultural patterns are starting points, not rules
2. **Behavior over demographics** — Learn from what users do, not who they are
3. **Individual variation dominates** — Variation within cultures > between cultures
4. **Context-sensitive** — Same user may have different preferences in different contexts
5. **Never explain assumptions** — Adapt silently; don't say "because you're German"
6. **Override-first architecture** — User settings always win

### Implementation Priority

| Phase | Focus | Effort |
|-------|-------|--------|
| **P0** | Privacy and data residency compliance | Legal requirement |
| **P1** | Communication style adaptation | High impact |
| **P2** | Temporal/calendar handling | Practical necessity |
| **P3** | Relationship dynamics | Nuanced, learn over time |
| **P4** | Full cultural profiling | Long-term sophistication |

### What Success Looks Like

A user from any cultural background should feel that the AI assistant:
- Respects their privacy boundaries naturally
- Communicates in their preferred style
- Understands their relationship context
- Handles time in their expected way
- Learns and adapts to their individual patterns
- Never makes them feel stereotyped or othered

---

## Appendix A: Cultural Dimension Sources

| Framework | Focus | Key Dimensions |
|-----------|-------|----------------|
| **Hofstede** | National culture values | Power distance, individualism, uncertainty avoidance, masculinity, long-term orientation, indulgence |
| **Hall** | Communication context | High/low context, monochronic/polychronic time |
| **Trompenaars** | Business culture | Universalism/particularism, individualism/communitarianism, specific/diffuse, achievement/ascription |
| **Meyer (Culture Map)** | Business interaction | Communication, evaluation, persuading, leading, deciding, trusting, disagreeing, scheduling |
| **GLOBE** | Leadership/org culture | 9 cultural dimensions validated across 62 societies |

## Appendix B: Regional Cheat Sheet

| Region | TL;DR Memory Approach |
|--------|----------------------|
| **US** | Direct, individual-focused, moderate privacy, short-term goals, informal okay |
| **Germany** | Very direct, very private, punctual, formal in business, strong work-life separation |
| **UK** | Indirect (understatement), individual but reserved, humor matters, class-aware |
| **Japan** | Very indirect, high context, formal, group-focused, long-term, reciprocity matters |
| **China** | Indirect, high context, hierarchical, relationship-first (guanxi), long-term |
| **India** | Variable (high diversity), hierarchical, relationship-important, family-integrated |
| **Middle East** | Indirect, relationship-first, hierarchical, hospitality, different calendar |
| **Latin America** | Warm, relationship-first, flexible time, family-integrated, group-oriented |
| **Scandinavia** | Direct, egalitarian, high privacy, punctual, individual but consensus-driven |

---

*End of research document*
