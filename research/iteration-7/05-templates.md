# Memory Templates — Reusable Memory Structures

*Research Document — Iteration 7*  
*Date: 2026-02-18*  
*Status: Research Complete*

---

## Executive Summary

Memory templates enable users to bootstrap AI assistants with pre-built structures, domain knowledge, and behavioral defaults — without sharing personal data. This research explores what can be templated, how customization works, distribution models, and quality assurance frameworks.

**Key findings:**
- Templates can safely encapsulate structure, behaviors, and domain knowledge
- A layered override system (template → org → user) enables flexible customization
- Distribution through curated marketplace + open registry balances quality and openness
- Safety verification is achievable through automated scanning + community review

---

## 1. What Can Be Templated?

### 1.1 Safely Templatable Elements

| Category | Examples | Risk Level |
|----------|----------|------------|
| **Structure** | File organization, category schemas, tagging conventions | Low |
| **Default Behaviors** | Communication style, proactivity level, reporting preferences | Low |
| **Domain Knowledge** | Terminology, workflows, regulations, best practices | Low-Medium |
| **Workflow Patterns** | Decision trees, checklists, process templates | Low |
| **Persona Framing** | Voice characteristics, personality traits | Low |

### 1.2 What Should NEVER Be Templated

| Element | Why Not |
|---------|---------|
| Personal data | Privacy violation; defeats purpose of templates |
| Credentials/secrets | Security risk |
| Specific relationships | Non-transferable; must be built |
| Historical conversations | Too personal; context-dependent |
| Trust levels | Must be earned, not inherited |

### 1.3 Template Categories

#### Persona Templates
Define *how* the AI shows up:

```yaml
persona:
  name: "Professional Executive Assistant"
  tone: formal-warm
  verbosity: concise
  proactivity: high
  boundaries:
    - Always confirm before external actions
    - Summarize before lengthy responses
  voice_markers:
    avoid: ["Certainly!", "Of course!", "Happy to help"]
    prefer: ["Let me handle that", "Here's what I found"]
```

#### Domain Templates
Encode *what* the AI knows:

```yaml
domain:
  name: "Software Development Context"
  terminology:
    - term: "PR"
      meaning: "Pull Request"
      context: "Code review process"
    - term: "CI/CD"
      meaning: "Continuous Integration/Deployment"
  workflows:
    code_review:
      steps: [...]
  regulations:
    - name: "SOC 2 compliance"
      key_requirements: [...]
  tools:
    - name: "GitHub"
      common_commands: [...]
```

#### Workflow Templates
Define *how* work gets done:

```yaml
workflow:
  name: "Project Management"
  phases:
    - name: "initiation"
      artifacts: [charter, stakeholder_register]
      checkpoints: [kickoff_meeting, scope_agreement]
    - name: "execution"
      artifacts: [status_reports, risk_register]
      cadence: weekly_updates
  memory_categories:
    - decisions
    - blockers
    - milestones
    - stakeholder_preferences
```

#### Relationship Templates
Define interaction patterns (without personal data):

```yaml
relationship:
  name: "Client Relationship"
  formality: professional
  response_time: prompt
  boundaries:
    - Confirm pricing before quoting
    - Escalate complaints immediately
  memory_focus:
    - preferences
    - project_history
    - communication_preferences
  trust_progression:
    initial: formal, detailed
    established: efficient, shorthand_ok
```

---

## 2. Template Specification Format

### 2.1 Proposed Schema: Memory Template Markup (MTM)

Based on iteration 6's AIMMF work, extending with template-specific fields.

```yaml
# Memory Template Markup (MTM) v1.0

meta:
  id: "uuid-here"
  name: "Professional Executive Assistant"
  version: "1.2.0"
  category: persona
  author: "jordan@example.com"
  license: "MIT"
  created: "2026-02-01"
  updated: "2026-02-15"
  compatibility:
    min_framework: "3.0.0"
    models: ["claude-*", "gpt-4*"]
  
  tags: ["executive", "professional", "productivity"]
  description: "A capable, formal executive assistant persona"

structure:
  files:
    SOUL.md:
      content: |
        # Core Identity
        ...
      locked: false  # User can modify
    AGENTS.md:
      extends: "base"  # Inherit from framework default
      additions: |
        ## Executive Assistant Behaviors
        ...

behaviors:
  communication:
    tone: formal-warm
    verbosity: concise
    proactivity: high
  
  boundaries:
    external_actions: confirm_always
    sensitive_topics: ask_permission
  
  memory:
    auto_capture:
      - decisions
      - commitments
      - preferences
    retention:
      conversations: 30_days
      decisions: permanent

knowledge:
  terminology: []  # Domain-specific terms
  procedures: []   # Standard workflows
  regulations: []  # Compliance requirements
  references: []   # Links to authoritative sources

examples:
  - scenario: "Scheduling request"
    input: "Find time for a meeting with Sarah"
    ideal_response: |
      I'll check your calendar and Sarah's availability.
      What duration and timeframe should I target?

customization:
  required:
    - user_name
    - timezone
  optional:
    - preferred_communication_style
    - specific_tools
  overridable:
    - all_behaviors
    - structure_additions
  locked:
    - safety_boundaries

signature:
  algorithm: "Ed25519"
  public_key: "..."
  signature: "..."
```

### 2.2 File Structure

Templates are distributed as directories:

```
professional-executive-assistant/
├── template.mtm.yaml      # Main specification
├── README.md              # Human-readable description
├── CHANGELOG.md           # Version history
├── LICENSE                # Usage terms
├── files/                 # Template files to install
│   ├── SOUL.md
│   ├── AGENTS-extensions.md
│   └── memory-categories.yaml
├── examples/              # Example interactions
│   └── exemplars.yaml
└── tests/                 # Validation tests
    └── behavior-tests.yaml
```

---

## 3. Customization Model

### 3.1 Layered Override System

Templates support cascading customization:

```
┌─────────────────────────────────────┐
│         User Customizations         │  ← Highest priority
├─────────────────────────────────────┤
│      Organization Overrides         │
├─────────────────────────────────────┤
│         Template Defaults           │
├─────────────────────────────────────┤
│       Framework Foundations         │  ← Lowest priority
└─────────────────────────────────────┘
```

**Resolution rules:**
1. User settings always win (except locked safety items)
2. Organization settings override template defaults
3. Template provides sensible defaults
4. Framework ensures safety floor

### 3.2 Override Mechanisms

```yaml
# User customization file: template-overrides.yaml

template: "professional-executive-assistant"
version: "1.2.0"

overrides:
  behaviors:
    communication:
      tone: casual  # Override formal-warm
    proactivity: low  # Override high
  
  knowledge:
    terminology:
      add:
        - term: "TPS Report"
          meaning: "Our weekly status format"
      remove:
        - term: "KPI"  # We don't use this term

locked_by_template:
  - safety_boundaries  # Cannot override
```

### 3.3 Version Updates

**Semantic versioning:**
- MAJOR: Breaking changes (requires migration)
- MINOR: New features, backward compatible
- PATCH: Bug fixes

**Update behavior:**
```yaml
update_policy:
  auto_apply: patch
  prompt_for: minor
  require_review: major
  
  preserve_on_update:
    - user_overrides
    - personal_terminology
    - learned_preferences
```

---

## 4. Distribution Models

### 4.1 Model Comparison

| Model | Quality Control | Openness | Trust | Best For |
|-------|-----------------|----------|-------|----------|
| **Curated Marketplace** | High | Low | High | Production use |
| **Open Registry** | Variable | High | Medium | Experimentation |
| **Organization Library** | High | Private | High | Enterprise |
| **Peer Sharing** | None | High | Varies | Community |

### 4.2 Proposed Hybrid Approach

#### Tier 1: Official Templates
- Maintained by framework team
- Highest quality bar
- Automatic security updates
- Examples: Core personas, common workflows

#### Tier 2: Verified Partners
- Third-party templates
- Manual review process
- Signed by verified authors
- Examples: Industry-specific (healthcare, legal)

#### Tier 3: Community Registry
- Open submission
- Automated safety scanning
- Community ratings/reviews
- Examples: Niche use cases, experiments

#### Tier 4: Private/Organization
- Internal distribution
- No public review
- Organization takes responsibility
- Examples: Company-specific workflows

### 4.3 Discovery & Installation

```bash
# Search templates
mtm search "project management"

# View template details
mtm info acme/project-manager

# Install template
mtm install acme/project-manager --customize

# Update templates
mtm update --all

# Create from template
mtm init --template acme/project-manager
```

---

## 5. Quality and Trust Framework

### 5.1 Automated Safety Checks

Every template undergoes automated scanning:

| Check | Purpose | Action |
|-------|---------|--------|
| **Malicious content** | No harmful instructions | Block |
| **Privacy violations** | No personal data harvesting | Block |
| **Prompt injection** | No attempts to override safety | Block |
| **Credential patterns** | No secrets/API keys | Block |
| **External references** | Validate linked resources | Warn |
| **Compatibility** | Framework version match | Info |

### 5.2 Manual Review (Tier 2+)

Verified templates require human review:

**Review checklist:**
- [ ] Appropriate for stated category
- [ ] Behaviors align with description
- [ ] Examples are realistic and helpful
- [ ] No hidden agendas or manipulation
- [ ] Documentation is accurate
- [ ] Customization options work correctly

### 5.3 Community Trust Signals

```yaml
trust_signals:
  author:
    verified: true
    reputation_score: 4.8
    templates_published: 12
    member_since: "2025-06"
  
  template:
    installs: 15420
    rating: 4.7
    reviews: 234
    last_security_audit: "2026-02-01"
    issues:
      open: 2
      resolved: 47
  
  badges:
    - "Security Audited"
    - "Community Choice"
    - "Framework Compatible"
```

### 5.4 Versioning & Audit Trail

```yaml
audit:
  version: "1.2.0"
  changes:
    - type: "behavior_change"
      field: "proactivity"
      old: "medium"
      new: "high"
      reason: "User feedback requested more proactive responses"
  
  security_reviews:
    - date: "2026-02-01"
      reviewer: "security-bot"
      result: "pass"
    - date: "2026-01-15"
      reviewer: "human-reviewer"
      result: "pass"
```

---

## 6. Example Templates

### 6.1 Persona: Technical Advisor

```yaml
meta:
  name: "Technical Advisor"
  category: persona
  description: "Deep technical expertise, Socratic teaching style"

behaviors:
  communication:
    tone: collegial
    verbosity: thorough-when-needed
    style: socratic  # Ask questions to guide understanding
  
  technical:
    code_style: explain-then-show
    error_handling: educational  # Explain why, not just what
    assumptions: clarify-first

knowledge:
  domains:
    - software_engineering
    - system_design
    - debugging

examples:
  - scenario: "Code review request"
    response_style: |
      First acknowledge what's working, then ask questions
      about design decisions before suggesting changes.
```

### 6.2 Domain: Healthcare Awareness

```yaml
meta:
  name: "Healthcare Context"
  category: domain
  description: "HIPAA awareness, medical terminology, clinical workflows"
  requires_acknowledgment: true  # Must accept terms

knowledge:
  regulations:
    - name: "HIPAA"
      key_rules:
        - "Never store PHI in memory"
        - "Patient names require explicit permission"
        - "Minimum necessary principle"
  
  terminology:
    - term: "EHR"
      meaning: "Electronic Health Record"
    - term: "STAT"
      meaning: "Immediately"
  
  workflows:
    clinical_documentation:
      memory_rules:
        - "De-identify before storing"
        - "Prefer medical record numbers over names"

behaviors:
  memory:
    prohibited:
      - patient_names
      - medical_record_numbers
      - diagnoses
    allowed:
      - workflow_preferences
      - terminology_clarifications
```

### 6.3 Workflow: Research Process

```yaml
meta:
  name: "Research Process"
  category: workflow
  description: "Academic/professional research methodology"

structure:
  phases:
    - name: "Question Formulation"
      outputs: [research_questions, hypotheses]
    - name: "Literature Review"
      outputs: [source_annotations, gaps_identified]
    - name: "Data Collection"
      outputs: [methodology, raw_data]
    - name: "Analysis"
      outputs: [findings, visualizations]
    - name: "Synthesis"
      outputs: [conclusions, recommendations]

memory_categories:
  sources:
    retention: permanent
    fields: [citation, summary, relevance, credibility]
  
  findings:
    retention: permanent
    fields: [claim, evidence, confidence, contradictions]
  
  decisions:
    retention: permanent
    fields: [choice, rationale, alternatives_considered]

behaviors:
  proactive:
    - "Track citation completeness"
    - "Flag contradictory findings"
    - "Suggest related sources"
```

### 6.4 Relationship: New Employee Onboarding

```yaml
meta:
  name: "New Employee Onboarding"
  category: relationship
  description: "Structured onboarding over first 90 days"

phases:
  week_1:
    focus: "Orientation"
    behaviors:
      formality: high
      explanations: thorough
      check_ins: daily
    memory_focus:
      - role_understanding
      - tool_preferences
      - learning_style
  
  weeks_2_4:
    focus: "Building Competence"
    behaviors:
      formality: medium
      explanations: as_needed
      check_ins: semi_weekly
    memory_focus:
      - knowledge_gaps
      - successful_patterns
      - questions_asked
  
  months_2_3:
    focus: "Growing Independence"
    behaviors:
      formality: adaptive
      explanations: on_request
      check_ins: weekly
    memory_focus:
      - expertise_areas
      - preferences
      - working_style

transitions:
  detection:
    - "Increased confidence in responses"
    - "Fewer basic questions"
    - "More complex requests"
  
  actions:
    - "Adjust formality down"
    - "Reduce unsolicited explanations"
    - "Offer more autonomy"
```

---

## 7. Implementation Recommendations

### 7.1 Phase 1: Foundation (Months 1-2)

1. **Finalize MTM specification**
   - JSON Schema validation
   - Example templates
   - Migration from current templates

2. **Build basic tooling**
   - `mtm validate` — Check template syntax
   - `mtm install` — Apply template
   - `mtm diff` — Compare versions

3. **Create official templates**
   - Port existing templates/ to MTM format
   - Add 5-10 new personas/workflows

### 7.2 Phase 2: Distribution (Months 3-4)

1. **Registry infrastructure**
   - Searchable index
   - Version hosting
   - Automated scanning

2. **Author tools**
   - `mtm create` — Scaffold new template
   - `mtm publish` — Submit to registry
   - `mtm test` — Validate behaviors

3. **Quality pipeline**
   - Automated security scans
   - Community review system
   - Badge/verification system

### 7.3 Phase 3: Ecosystem (Months 5-6)

1. **Organization features**
   - Private registries
   - Org-wide defaults
   - Compliance templates

2. **Analytics**
   - Usage metrics
   - Compatibility tracking
   - Quality scoring

3. **Marketplace**
   - Paid templates (revenue share)
   - Premium support tiers
   - Enterprise licensing

---

## 8. Open Questions

### Governance

1. **Who decides template categories?**
   - Framework team? Community vote? Both?

2. **How are disputes resolved?**
   - Template naming conflicts
   - Quality disagreements
   - Licensing issues

3. **Template retirement:**
   - How long to support old versions?
   - Forced migration for security issues?

### Technical

1. **Template composition:**
   - Can templates inherit from others?
   - Multiple templates simultaneously?

2. **Conflict resolution:**
   - What if two templates define same behavior?
   - User chooses? Priority system?

3. **Backward compatibility:**
   - How long to maintain old MTM versions?
   - Automatic migration tools?

### Economic

1. **Paid templates:**
   - Appropriate for open ecosystem?
   - Revenue share model?

2. **Support expectations:**
   - What do free templates promise?
   - Premium support options?

---

## 9. Conclusion

Memory templates enable users to rapidly bootstrap capable AI assistants without starting from zero. By carefully separating templatable elements (structure, behaviors, domain knowledge) from personal elements (relationships, history, earned trust), we can create a rich ecosystem of reusable memory structures.

**Key principles:**
- Templates are starting points, not destinations
- Safety is non-negotiable; personal data is excluded
- Layered overrides respect user agency
- Trust comes from verification, not just reputation

**Next steps:**
1. Finalize MTM specification
2. Port existing templates
3. Build basic tooling
4. Launch community registry

---

*Research complete. Ready for specification work and implementation planning.*

— Jordan 🧭
