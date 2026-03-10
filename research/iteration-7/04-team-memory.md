# Team Memory: Shared Memory for Groups and Organizations

*Iteration 7 Research — Question 4*  
*Author: Jordan 🧭*  
*Date: 2026-02-16*  
*Status: Complete*

---

## Executive Summary

Team memory extends individual AI memory to serve groups — project teams, departments, and organizations. This document explores architectures for shared memory that maintain appropriate boundaries while enabling collective intelligence.

### Key Findings

| Challenge | Recommended Solution |
|-----------|---------------------|
| Shared vs. private | Tri-layer model: Personal / Team / Organization |
| Contribution attribution | Provenance tracking with opt-out anonymity |
| Access control | Role × Topic × Time matrix with inheritance |
| Consensus and conflict | Authority hierarchy + democratic signals + explicit override |
| Team AI architecture | Hybrid: Individual AIs + shared memory substrate |
| Onboarding | Progressive context loading + mentorship pairing |

---

## 1. The Problem Space

### Team Memory Scenarios

**Scenario A: Project Team**

A development team of 5 working on the Amigo prototype:
- Leo (CEO/Product)
- Carlos (Backend Lead)
- Jeff (Architecture)
- Sarah (Frontend)
- Mike (DevOps)

Each interacts with their own AI (or shared team AI). What should be remembered collectively?

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT TEAM MEMORY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SHARED:                           INDIVIDUAL:                   │
│  ┌─────────────────────┐          ┌─────────────────────┐       │
│  │ • Tech decisions    │          │ • Personal opinions │       │
│  │ • Architecture      │          │ • Private concerns  │       │
│  │ • Deadlines         │          │ • Working style     │       │
│  │ • Action items      │          │ • Frustrations      │       │
│  │ • Meeting outcomes  │          │ • Career goals      │       │
│  │ • Blockers          │          │ • Salary info       │       │
│  └─────────────────────┘          └─────────────────────┘       │
│                                                                  │
│  THE CHALLENGE: Where's the line?                                │
│  • "We should use PostgreSQL" (shared)                          │
│  • "I think the timeline is unrealistic" (private? shared?)     │
│  • "Jeff's code needs review" (shared? sensitive?)              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Scenario B: Organization**

Knight Ventures with 20 employees:
- Executive team (3)
- Engineering (8)
- Operations (5)
- Sales (4)

Company-wide knowledge that should persist:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORGANIZATIONAL MEMORY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INSTITUTIONAL KNOWLEDGE:                                        │
│  ├─ Company policies and procedures                             │
│  ├─ Decision history and rationale                              │
│  ├─ Client/customer context                                     │
│  ├─ Vendor relationships                                        │
│  ├─ Technical infrastructure                                    │
│  ├─ Project archives                                            │
│  └─ Cultural norms                                              │
│                                                                  │
│  THE CHALLENGE:                                                  │
│  • New hire needs context without drowning                      │
│  • Departed employee's knowledge shouldn't vanish               │
│  • Sensitive info (HR, finances) needs protection               │
│  • Historical decisions need to remain accessible               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Scenario C: Handoffs**

When people transition:
- New team member joins
- Employee leaves
- Role changes
- Project transitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    HANDOFF SCENARIOS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NEW MEMBER ONBOARDING:                                          │
│  ├─ What context do they need immediately?                      │
│  ├─ What can wait?                                              │
│  ├─ What shouldn't they see (yet)?                              │
│  └─ How do they build their own context?                        │
│                                                                  │
│  DEPARTURE:                                                      │
│  ├─ What knowledge transfers to team?                           │
│  ├─ What personal context stays private?                        │
│  ├─ What gets archived?                                         │
│  └─ What disappears (appropriately)?                            │
│                                                                  │
│  ROLE TRANSITION:                                                │
│  ├─ Access level changes                                        │
│  ├─ Context scope changes                                       │
│  ├─ Handoff to successor                                        │
│  └─ Historical access questions                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Team Memory Architecture

### The Three-Layer Model

Building on the Iteration 4 collaborative memory research, team memory uses three distinct layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    THREE-LAYER ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   LAYER 3: ORGANIZATION                    │  │
│  │                                                            │  │
│  │  • Company policies      • Institutional history          │  │
│  │  • Org structure         • Vendor/client knowledge        │  │
│  │  • Cross-team decisions  • Cultural norms                 │  │
│  │                                                            │  │
│  │  Visibility: All authenticated members                    │  │
│  │  Governance: Executive + designated admins                │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                 LAYER 2: TEAM                        │  │  │
│  │  │                                                      │  │  │
│  │  │  • Project context    • Sprint goals                 │  │  │
│  │  │  • Team decisions     • Technical context            │  │  │
│  │  │  • Action items       • Meeting outcomes             │  │  │
│  │  │                                                      │  │  │
│  │  │  Visibility: Team members only                       │  │  │
│  │  │  Governance: Team lead + contributors                │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌─────────────────────────────────────────────┐    │  │  │
│  │  │  │             LAYER 1: PERSONAL               │    │  │  │
│  │  │  │                                             │    │  │  │
│  │  │  │  • Individual preferences                   │    │  │  │
│  │  │  │  • Private opinions                         │    │  │  │
│  │  │  │  • Personal working style                   │    │  │  │
│  │  │  │  • Private conversations                    │    │  │  │
│  │  │  │                                             │    │  │  │
│  │  │  │  Visibility: Individual only                │    │  │  │
│  │  │  │  Governance: Self                           │    │  │  │
│  │  │  │                                             │    │  │  │
│  │  │  └─────────────────────────────────────────────┘    │  │  │
│  │  │                                                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Layer Definitions

| Layer | Scope | Contents | Owner | Lifecycle |
|-------|-------|----------|-------|-----------|
| **Personal** | Individual | Preferences, private thoughts, individual context | User | Moves with user |
| **Team** | Project/Team | Shared work, decisions, context | Team collectively | Project lifecycle |
| **Organization** | Company | Policies, institutional knowledge, history | Organization | Indefinite |

### Memory Classification Algorithm

```python
def classify_memory_layer(memory: Memory, context: TeamContext) -> Layer:
    """
    Determine which layer a memory belongs to
    """
    
    # Explicit markers override
    if memory.explicit_scope:
        return memory.explicit_scope
    
    # Personal indicators
    if is_personal_opinion(memory):
        return Layer.PERSONAL
    
    if is_emotional_content(memory):
        return Layer.PERSONAL
    
    if references_salary_or_hr(memory):
        return Layer.PERSONAL  # Unless from HR system
    
    # Organizational indicators
    if is_company_policy(memory):
        return Layer.ORGANIZATION
    
    if affects_multiple_teams(memory, context):
        return Layer.ORGANIZATION
    
    if is_executive_decision(memory):
        return Layer.ORGANIZATION
    
    # Team indicators (default for shared work)
    if involves_shared_project(memory, context):
        return Layer.TEAM
    
    if is_team_decision(memory):
        return Layer.TEAM
    
    if is_action_item(memory):
        return Layer.TEAM
    
    # Default to personal (safest)
    return Layer.PERSONAL


def is_personal_opinion(memory: Memory) -> bool:
    """Detect personal opinion markers"""
    personal_markers = [
        "I think", "I feel", "I believe", "In my opinion",
        "I'm frustrated", "I'm concerned", "I wish",
        "privately", "between us", "don't share this"
    ]
    return any(marker in memory.content.lower() for marker in personal_markers)
```

---

## 3. What's Shared vs. Private

### The Boundary Problem

The hardest question in team memory: where does personal end and shared begin?

```
┌─────────────────────────────────────────────────────────────────┐
│                    THE BOUNDARY SPECTRUM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLEARLY PERSONAL          GREY ZONE          CLEARLY SHARED    │
│  ◄────────────────────────────────────────────────────────────► │
│                                                                  │
│  • Salary                 • Opinion about    • Tech decisions   │
│  • Health                   a decision       • Project status   │
│  • Personal life          • Feedback on      • Meeting outcomes │
│  • Private frustrations     colleague        • Action items     │
│  • Career aspirations     • Concerns about   • Deadlines        │
│                             timeline         • Architecture     │
│                           • Working style                       │
│                             preferences                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Classification Matrix

| Memory Type | Default Layer | Can Promote | Can Demote | Example |
|-------------|---------------|-------------|------------|---------|
| **Facts about shared work** | Team | → Org | ✗ | "API uses REST" |
| **Team decisions** | Team | → Org | ✗ | "We chose PostgreSQL" |
| **Action items** | Team | ✗ | → Personal | "Carlos will fix auth" |
| **Meeting summaries** | Team | → Org | ✗ | "Sprint planning outcome" |
| **Individual opinions** | Personal | → Team | ✗ | "I prefer TypeScript" |
| **Feedback on work** | Personal | → Team | ✗ | "The API design is clean" |
| **Feedback on person** | Personal | ✗ | ✗ | "Jeff's code needs review" |
| **Concerns/worries** | Personal | → Team | ✗ | "Timeline seems tight" |
| **Company policies** | Org | ✗ | ✗ | "Two-week sprints" |
| **Strategic decisions** | Org | ✗ | ✗ | "Q2 priorities" |

### Promotion and Demotion

Users can explicitly change memory visibility:

```python
class MemoryVisibilityManager:
    def promote_to_team(self, memory_id: str, user: User) -> bool:
        """User explicitly shares personal memory with team"""
        memory = self.get_memory(memory_id)
        
        # Must be owner
        if memory.owner != user.id:
            raise PermissionError("Only owner can share")
        
        # Must be personal
        if memory.layer != Layer.PERSONAL:
            raise InvalidOperation("Memory already shared")
        
        # Record the promotion
        memory.layer = Layer.TEAM
        memory.promoted_by = user.id
        memory.promoted_at = now()
        memory.original_layer = Layer.PERSONAL
        
        # Notify team of new shared context
        self.notify_team(memory.team_id, f"New shared context from {user.name}")
        
        return True
    
    def promote_to_org(self, memory_id: str, user: User) -> bool:
        """Promote team memory to organization level"""
        memory = self.get_memory(memory_id)
        
        # Requires elevated permission
        if not user.can_promote_to_org:
            raise PermissionError("Requires org-level promotion rights")
        
        memory.layer = Layer.ORGANIZATION
        memory.promoted_by = user.id
        memory.promoted_at = now()
        
        return True
```

### Who Decides?

| Scenario | Decision Maker | Mechanism |
|----------|----------------|-----------|
| My thought → Team | Individual | Explicit promotion |
| Team decision → Org | Team lead or consensus | Lead approves or vote |
| External info → Org | Designated admin | Admin review |
| Sensitive → more restricted | Owner or admin | Explicit demotion |
| Disputed classification | Escalate to lead/admin | Review process |

---

## 4. Contribution and Attribution

### The Attribution Problem

When memories come from multiple sources, who gets credit?

```
┌─────────────────────────────────────────────────────────────────┐
│                    ATTRIBUTION SCENARIOS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCENARIO 1: DIRECT STATEMENT                                    │
│  Carlos: "Let's use PostgreSQL for the memory backend"          │
│  Attribution: Carlos (stated)                                    │
│                                                                  │
│  SCENARIO 2: COLLABORATIVE DECISION                             │
│  Team meeting: "After discussion, we chose PostgreSQL"          │
│  Attribution: Team (collective decision)                        │
│  Contributors: Leo (proposed), Carlos (seconded), Jeff (agreed) │
│                                                                  │
│  SCENARIO 3: INFERRED FROM BEHAVIOR                             │
│  AI observes: "The team prefers async standups"                 │
│  Attribution: AI (inferred from patterns)                       │
│  Evidence: 5 team members chose async over 3 weeks              │
│                                                                  │
│  SCENARIO 4: ANONYMOUS CONTRIBUTION                              │
│  Feedback box: "The deadline is unrealistic"                    │
│  Attribution: Anonymous team member                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Provenance Model

```python
class TeamMemoryProvenance:
    memory_id: str
    
    # Who contributed
    contributors: List[Contributor]
    
    # How it was contributed
    source_type: Literal[
        "stated",        # Direct statement
        "decision",      # Collective decision
        "inferred",      # AI inference
        "imported",      # External source
        "anonymous"      # Anonymous contribution
    ]
    
    # Decision metadata (for collective decisions)
    decision_process: Optional[DecisionProcess]
    
    # Timestamps
    created_at: datetime
    created_by: str
    last_modified_at: datetime
    last_modified_by: str

class Contributor:
    user_id: str
    role: Literal["author", "co-author", "reviewer", "approver", "voter"]
    contribution_type: Literal["create", "modify", "approve", "vote"]
    timestamp: datetime
    anonymous: bool = False

class DecisionProcess:
    process_type: Literal["consensus", "vote", "authority", "lazy_consensus"]
    participants: List[str]
    outcome: str
    dissents: List[str]  # Who disagreed (for transparency)
    rationale: Optional[str]
```

### Anonymous Contributions

When should anonymity be allowed?

| Context | Allow Anonymous | Rationale |
|---------|-----------------|-----------|
| **Feedback on process** | ✓ Yes | Encourages honesty |
| **Concerns/issues** | ✓ Yes | Psychological safety |
| **Factual contributions** | ✗ No | Need accountability |
| **Decisions** | ✗ No | Need ownership |
| **Technical knowledge** | Depends | Allow but track source |

Implementation:

```python
class AnonymousContribution:
    def submit_anonymous(
        self, 
        content: str, 
        category: str,
        user: User
    ) -> Memory:
        """Submit anonymous contribution with safeguards"""
        
        # Only certain categories allow anonymous
        if category not in ["feedback", "concern", "suggestion"]:
            raise InvalidOperation(f"Category {category} doesn't allow anonymous")
        
        # Create memory with anonymous attribution
        memory = Memory(
            content=content,
            layer=Layer.TEAM,
            provenance=TeamMemoryProvenance(
                contributors=[Contributor(
                    user_id="anonymous",
                    role="author",
                    anonymous=True
                )],
                source_type="anonymous"
            )
        )
        
        # Store real author privately (for abuse prevention)
        self.store_private_attribution(memory.id, user.id)
        
        return memory
    
    def reveal_author(self, memory_id: str, requester: User) -> Optional[str]:
        """Reveal anonymous author (admin only, logged)"""
        
        if not requester.is_admin:
            raise PermissionError("Only admins can reveal")
        
        # Log the reveal
        self.audit_log.record(
            action="reveal_anonymous",
            memory_id=memory_id,
            requester=requester.id,
            timestamp=now()
        )
        
        return self.get_private_attribution(memory_id)
```

### Credit and Visibility

How contributions surface:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONTRIBUTION VISIBILITY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WHEN MEMORY IS RETRIEVED:                                       │
│                                                                  │
│  "We decided to use PostgreSQL for the memory backend"          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📝 Source: Team Decision (Sprint 14 Planning)           │    │
│  │ 👤 Contributors: Carlos (proposed), Jeff (approved)     │    │
│  │ 📅 Date: Feb 10, 2026                                   │    │
│  │ ✓ Status: Active                                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ATTRIBUTION DISPLAY OPTIONS:                                    │
│  • Full: Show all contributors and process                      │
│  • Summary: "Team decision (Feb 10)"                            │
│  • Minimal: No attribution                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Access Control Design

### The Access Matrix

Access control for team memory combines three dimensions:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCESS CONTROL DIMENSIONS                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DIMENSION 1: ROLE                                               │
│  ├─ Admin (full access, can modify permissions)                 │
│  ├─ Member (read/write team content)                            │
│  ├─ Guest (read-only, limited scope)                            │
│  └─ External (specific memory grants only)                      │
│                                                                  │
│  DIMENSION 2: TOPIC                                              │
│  ├─ Engineering (technical decisions, code context)             │
│  ├─ Finance (budgets, costs) — restricted                       │
│  ├─ HR (personnel, salaries) — highly restricted                │
│  ├─ Strategy (roadmap, priorities)                              │
│  └─ Operations (processes, vendors)                             │
│                                                                  │
│  DIMENSION 3: TIME                                               │
│  ├─ Current (active memories)                                   │
│  ├─ Historical (archived but accessible)                        │
│  ├─ Tenure-gated (unlocks after X time in role)                │
│  └─ Sunset (expires after role ends)                            │
│                                                                  │
│  ACCESS = f(ROLE) × f(TOPIC) × f(TIME)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Role-Based Access Control (RBAC)

```python
class TeamRBAC:
    roles = {
        "admin": {
            "can_read": ["*"],
            "can_write": ["*"],
            "can_promote": True,
            "can_manage_access": True
        },
        "lead": {
            "can_read": ["team.*", "org.public"],
            "can_write": ["team.*"],
            "can_promote": True,
            "can_manage_access": False
        },
        "member": {
            "can_read": ["team.public", "team.topic.{assigned}", "org.public"],
            "can_write": ["team.public", "team.topic.{assigned}"],
            "can_promote": False,
            "can_manage_access": False
        },
        "guest": {
            "can_read": ["team.public.read_only"],
            "can_write": [],
            "can_promote": False,
            "can_manage_access": False
        }
    }
    
    def check_access(
        self, 
        user: User, 
        memory: Memory, 
        action: str
    ) -> bool:
        """Check if user can perform action on memory"""
        
        role = self.get_user_role(user, memory.team_id)
        permissions = self.roles[role]
        
        # Check action permission
        if action == "read":
            return self.matches_pattern(memory.scope, permissions["can_read"])
        elif action == "write":
            return self.matches_pattern(memory.scope, permissions["can_write"])
        elif action == "promote":
            return permissions["can_promote"]
        
        return False
```

### Topic-Based Access

```python
class TopicAccessControl:
    topic_permissions = {
        "engineering": {
            "default_access": "team_members",
            "sensitive_subtopics": ["infrastructure_credentials"]
        },
        "finance": {
            "default_access": "finance_team",
            "read_access": ["executives", "leads"]
        },
        "hr": {
            "default_access": "hr_team",
            "manager_access": ["direct_reports_only"]
        },
        "strategy": {
            "default_access": "executives",
            "read_access": ["leads"]
        }
    }
    
    def can_access_topic(
        self, 
        user: User, 
        topic: str,
        action: str
    ) -> bool:
        """Check topic-level access"""
        
        permissions = self.topic_permissions.get(topic, {})
        default = permissions.get("default_access", "team_members")
        
        # Check user's groups against required access
        user_groups = self.get_user_groups(user)
        
        if action == "read":
            allowed = permissions.get("read_access", []) + [default]
        else:
            allowed = [default]
        
        return any(group in allowed for group in user_groups)
```

### Time-Based Access

Access that changes based on time:

```python
class TemporalAccessControl:
    def check_temporal_access(
        self, 
        user: User, 
        memory: Memory
    ) -> bool:
        """Time-based access restrictions"""
        
        # Tenure gating: some memories unlock after time in role
        if memory.tenure_requirement:
            user_tenure = self.get_tenure(user, memory.team_id)
            if user_tenure < memory.tenure_requirement:
                return False
        
        # Sunset access: access expires after role ends
        if memory.sunset_policy:
            if not self.is_active_member(user, memory.team_id):
                grace_period = memory.sunset_policy.grace_period
                departure_date = self.get_departure_date(user, memory.team_id)
                if now() > departure_date + grace_period:
                    return False
        
        # Historical access: some old memories restricted
        if memory.historical_restriction:
            if memory.created_at < memory.historical_restriction.cutoff:
                if not user.has_historical_access:
                    return False
        
        return True
```

### Access Inheritance

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCESS INHERITANCE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ORGANIZATION (Knight Ventures)                                  │
│  └─ All authenticated users can read org-level public          │
│      │                                                           │
│      ├─ TEAM: Engineering                                        │
│      │   └─ Engineering members inherit org access              │
│      │   └─ Plus: engineering topic access                      │
│      │       │                                                   │
│      │       ├─ PROJECT: Amigo                                   │
│      │       │   └─ Amigo members inherit engineering access    │
│      │       │   └─ Plus: amigo project access                  │
│      │       │                                                   │
│      │       └─ PROJECT: Sharp App                               │
│      │           └─ Sharp members inherit engineering access    │
│      │           └─ Plus: sharp project access                  │
│      │                                                           │
│      └─ TEAM: Operations                                         │
│          └─ Different access scope                               │
│                                                                  │
│  INHERITANCE RULE:                                               │
│  Child context inherits parent access (additive)                │
│  Child can restrict further but not expand beyond parent        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Consensus and Conflict

### Conflicting Team Memories

What happens when team members have different beliefs?

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFLICT SCENARIOS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  SCENARIO 1: DIFFERENT RECOLLECTIONS                             │
│  Carlos: "We agreed on REST"                                    │
│  Jeff: "I thought we were still evaluating GraphQL"             │
│                                                                  │
│  SCENARIO 2: UPDATED INFORMATION                                 │
│  Old: "Deadline is March 15"                                    │
│  New: "Deadline moved to March 22"                              │
│                                                                  │
│  SCENARIO 3: AUTHORITY CONFLICT                                  │
│  Leo (CEO): "Priority is performance"                           │
│  Carlos (Lead): "Priority is features"                          │
│                                                                  │
│  SCENARIO 4: GENUINE DISAGREEMENT                                │
│  Team is actually split on direction                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Resolution Strategies

**Strategy 1: Authority Hierarchy**

```python
authority_levels = {
    "ceo": 100,
    "executive": 80,
    "director": 70,
    "lead": 60,
    "senior": 50,
    "member": 40,
    "guest": 20
}

def resolve_by_authority(memory_a: Memory, memory_b: Memory) -> Memory:
    """Higher authority wins"""
    auth_a = authority_levels.get(memory_a.author_role, 40)
    auth_b = authority_levels.get(memory_b.author_role, 40)
    
    if auth_a > auth_b:
        return memory_a
    elif auth_b > auth_a:
        return memory_b
    else:
        # Same authority, fall back to temporal
        return resolve_by_recency(memory_a, memory_b)
```

**Strategy 2: Democratic Signals**

```python
class DemocraticResolution:
    def resolve_by_consensus(
        self, 
        memory_a: Memory, 
        memory_b: Memory,
        team: Team
    ) -> Resolution:
        """Gather team input for disputed memories"""
        
        # Count explicit agreements
        votes_a = self.count_corroborations(memory_a)
        votes_b = self.count_corroborations(memory_b)
        
        if votes_a > votes_b * 1.5:  # Clear majority
            return Resolution(
                winner=memory_a,
                method="consensus",
                confidence=votes_a / (votes_a + votes_b)
            )
        
        # No clear winner - flag for explicit vote
        return Resolution(
            winner=None,
            method="pending_vote",
            prompt="Team should explicitly decide"
        )
    
    def request_explicit_vote(
        self, 
        memory_a: Memory, 
        memory_b: Memory,
        team: Team
    ) -> Vote:
        """Create explicit vote for disputed memory"""
        return Vote(
            question=f"Which is accurate: '{memory_a.summary}' or '{memory_b.summary}'?",
            options=[memory_a.id, memory_b.id, "both_true_different_context", "neither"],
            voters=team.members,
            deadline=now() + timedelta(hours=24),
            quorum=0.5  # 50% must vote
        )
```

**Strategy 3: Explicit Override**

```python
class AuthoritativeOverride:
    def override_memory(
        self, 
        memory_id: str, 
        new_content: str,
        authority: User,
        reason: str
    ) -> Memory:
        """Authoritative correction of disputed memory"""
        
        # Must have override permission
        if not authority.can_override_memories:
            raise PermissionError("Requires override permission")
        
        old_memory = self.get_memory(memory_id)
        
        # Create superseded record
        old_memory.status = "superseded"
        old_memory.superseded_by = new_memory_id
        old_memory.superseded_at = now()
        old_memory.supersede_reason = reason
        
        # Create authoritative memory
        new_memory = Memory(
            content=new_content,
            source_type="authoritative_override",
            authority=authority.id,
            override_reason=reason,
            supersedes=memory_id
        )
        
        # Notify affected parties
        self.notify_contributors(old_memory, "Memory overridden", new_memory)
        
        return new_memory
```

### Representing Disagreement

Sometimes disagreement is the truth:

```python
class DisagreementMemory:
    def record_disagreement(
        self, 
        topic: str,
        positions: List[Position],
        context: str
    ) -> Memory:
        """Record that team has unresolved disagreement"""
        
        return Memory(
            content=f"Team has differing views on {topic}",
            memory_type="disagreement",
            positions=[
                {
                    "view": p.view,
                    "supporters": p.supporters,
                    "rationale": p.rationale
                }
                for p in positions
            ],
            status="unresolved",
            context=context,
            next_review=now() + timedelta(days=7)
        )
```

```
┌─────────────────────────────────────────────────────────────────┐
│                    DISAGREEMENT REPRESENTATION                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Topic: API Design Pattern                                       │
│                                                                  │
│  Position A (Leo, Sarah):                                        │
│  "Should use REST for simplicity and client compatibility"      │
│                                                                  │
│  Position B (Carlos, Jeff):                                      │
│  "Should use GraphQL for flexibility and efficiency"            │
│                                                                  │
│  Status: Under discussion                                        │
│  Next review: March 1, 2026                                     │
│  Decision owner: Carlos (Lead)                                   │
│                                                                  │
│  When AI retrieves: "There's ongoing discussion about           │
│  API design. Leo prefers REST, Carlos prefers GraphQL.          │
│  No final decision yet."                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Team AI Architecture

### The Core Question

Should teams use:
- **Option A:** One AI for the entire team?
- **Option B:** Individual AIs that share memories?
- **Option C:** Hybrid model?

### Option A: One Team AI

```
┌─────────────────────────────────────────────────────────────────┐
│                    SINGLE TEAM AI                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌───────────────┐                            │
│                    │   TEAM AI     │                            │
│                    │               │                            │
│                    │  Knows all    │                            │
│                    │  team context │                            │
│                    └───────┬───────┘                            │
│                            │                                     │
│          ┌─────────────────┼─────────────────┐                  │
│          │                 │                 │                  │
│          ▼                 ▼                 ▼                  │
│     ┌────────┐        ┌────────┐        ┌────────┐             │
│     │  Leo   │        │ Carlos │        │  Jeff  │             │
│     └────────┘        └────────┘        └────────┘             │
│                                                                  │
│  PROS:                            CONS:                         │
│  • Perfect consistency            • No personal context         │
│  • Simple architecture            • One size fits all           │
│  • Single memory store            • Privacy concerns            │
│  • Easy team context              • Harder personalization      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Option B: Individual AIs with Shared Memory

```
┌─────────────────────────────────────────────────────────────────┐
│                    INDIVIDUAL AIs + SHARED MEMORY                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                │
│  │ Leo's AI │     │Carlos' AI│     │ Jeff's AI│                │
│  │ (Jordan) │     │          │     │          │                │
│  │          │     │          │     │          │                │
│  │ Personal │     │ Personal │     │ Personal │                │
│  │ context  │     │ context  │     │ context  │                │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                │
│       │                │                │                       │
│       └────────────────┼────────────────┘                       │
│                        │                                         │
│                        ▼                                         │
│              ┌─────────────────┐                                │
│              │  SHARED MEMORY  │                                │
│              │     LAYER       │                                │
│              │                 │                                │
│              │ Team decisions  │                                │
│              │ Project context │                                │
│              │ Org knowledge   │                                │
│              └─────────────────┘                                │
│                                                                  │
│  PROS:                            CONS:                         │
│  • Full personalization           • Sync complexity             │
│  • Privacy boundaries             • Potential inconsistency     │
│  • Individual relationships       • More infrastructure         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Option C: Hybrid (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                    HYBRID MODEL (RECOMMENDED)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    ORGANIZATION LAYER                     │   │
│  │                                                           │   │
│  │  Shared knowledge, policies, institutional memory        │   │
│  │  One authoritative source                                 │   │
│  │                                                           │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                   TEAM LAYER                         │ │   │
│  │  │                                                      │ │   │
│  │  │  Team AI for shared context (optional)              │ │   │
│  │  │  Shared memory for project/team decisions           │ │   │
│  │  │                                                      │ │   │
│  │  │  ┌─────────┐    ┌─────────┐    ┌─────────┐         │ │   │
│  │  │  │Individual│   │Individual│   │Individual│         │ │   │
│  │  │  │   AI    │   │   AI    │   │   AI    │         │ │   │
│  │  │  │         │   │         │   │         │         │ │   │
│  │  │  │Personal │   │Personal │   │Personal │         │ │   │
│  │  │  │context  │   │context  │   │context  │         │ │   │
│  │  │  └─────────┘   └─────────┘   └─────────┘         │ │   │
│  │  │                                                      │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  HOW IT WORKS:                                                   │
│  • Individual AIs for personal context and relationships        │
│  • Shared memory substrate for team/org knowledge              │
│  • Optional team AI for team-wide queries                       │
│  • Sync between layers (pull from shared, push shareable)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation: Hybrid Model

```python
class HybridTeamMemory:
    def __init__(self, user: User, team: Team, org: Organization):
        self.user = user
        self.team = team
        self.org = org
        
        # Three memory layers
        self.personal_store = PersonalMemoryStore(user.id)
        self.team_store = SharedMemoryStore(team.id, "team")
        self.org_store = SharedMemoryStore(org.id, "org")
    
    def retrieve(self, query: str, context: Context) -> List[Memory]:
        """Retrieve from all appropriate layers"""
        
        results = []
        
        # Personal always accessible
        results.extend(self.personal_store.search(query))
        
        # Team if user is member
        if self.user.is_member(self.team):
            results.extend(self.team_store.search(
                query, 
                access_filter=self.user.team_access
            ))
        
        # Org if user is member
        if self.user.is_member(self.org):
            results.extend(self.org_store.search(
                query,
                access_filter=self.user.org_access
            ))
        
        # Merge and rank
        return self.merge_results(results, context)
    
    def store(self, memory: Memory, layer: Layer) -> str:
        """Store to appropriate layer"""
        
        if layer == Layer.PERSONAL:
            return self.personal_store.create(memory)
        elif layer == Layer.TEAM:
            # Verify team write access
            if not self.user.can_write_team:
                raise PermissionError()
            return self.team_store.create(memory)
        elif layer == Layer.ORGANIZATION:
            # Verify org write access
            if not self.user.can_write_org:
                raise PermissionError()
            return self.org_store.create(memory)
    
    def sync_up(self, memory_id: str, target_layer: Layer):
        """Promote memory to higher layer"""
        memory = self.personal_store.get(memory_id)
        self.store(memory.copy(), target_layer)
        memory.synced_to = target_layer
    
    def sync_down(self):
        """Pull relevant shared memories to local cache"""
        # Get team memories relevant to user's work
        team_relevant = self.team_store.get_relevant(self.user.current_projects)
        for mem in team_relevant:
            self.personal_store.cache(mem, source="team")
```

---

## 8. Onboarding Patterns

### New Team Member Onboarding

When someone joins, they need context without drowning:

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONBOARDING JOURNEY                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DAY 1: ESSENTIALS                                               │
│  ├─ Org basics (who we are, what we do)                         │
│  ├─ Team structure (who's who)                                  │
│  ├─ Active projects (what's happening now)                      │
│  └─ Immediate context (first task background)                   │
│                                                                  │
│  WEEK 1: FOUNDATIONS                                             │
│  ├─ Key decisions and rationale                                 │
│  ├─ Technical architecture                                      │
│  ├─ Current sprint/project status                               │
│  └─ Team working patterns                                       │
│                                                                  │
│  MONTH 1: DEPTH                                                  │
│  ├─ Historical context (why things are the way they are)        │
│  ├─ Failed experiments (what didn't work)                       │
│  ├─ Relationship dynamics (how team works together)             │
│  └─ Tribal knowledge                                            │
│                                                                  │
│  ONGOING: PROGRESSIVE DISCLOSURE                                 │
│  ├─ Context surfaces as relevant to work                        │
│  ├─ Historical decisions appear when touching that area        │
│  └─ Depth increases naturally                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Progressive Context Loading

```python
class OnboardingContextLoader:
    def __init__(self, new_member: User, team: Team):
        self.member = new_member
        self.team = team
        self.join_date = now()
        
        # Track what's been introduced
        self.introduced_contexts = set()
        self.introduction_depth = {}
    
    def get_context_for_day(self, day: int) -> List[Memory]:
        """Get appropriate context based on days since joining"""
        
        if day <= 1:
            return self.get_essentials()
        elif day <= 7:
            return self.get_foundations()
        elif day <= 30:
            return self.get_depth_context()
        else:
            return self.get_progressive_context()
    
    def get_essentials(self) -> List[Memory]:
        """Day 1 essentials"""
        return self.team_store.search(
            tags=["essential", "onboarding"],
            priority="high",
            limit=20
        )
    
    def get_relevant_context(self, task: Task) -> List[Memory]:
        """Context relevant to current work"""
        
        # Get memories related to task
        related = self.team_store.search(
            topics=task.topics,
            projects=[task.project]
        )
        
        # Filter by introduction level
        appropriate = []
        for mem in related:
            depth = mem.complexity_level  # 1=basic, 5=deep
            days_since_join = (now() - self.join_date).days
            
            # Gradually allow deeper context
            allowed_depth = min(5, 1 + days_since_join // 7)
            
            if depth <= allowed_depth:
                appropriate.append(mem)
        
        # Track introductions
        for mem in appropriate:
            if mem.id not in self.introduced_contexts:
                self.introduced_contexts.add(mem.id)
                self.introduction_depth[mem.id] = 1
        
        return appropriate
```

### Mentorship Pairing

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI-ASSISTED MENTORSHIP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  NEW MEMBER: Sarah (Frontend)                                    │
│  MENTOR: Carlos (Backend Lead)                                   │
│                                                                  │
│  SARAH'S AI CAN:                                                 │
│  • Query team memory through mentorship lens                    │
│  • Ask "Carlos' AI" for context (with permission)               │
│  • Flag questions for mentor review                             │
│  • Track onboarding progress                                    │
│                                                                  │
│  CARLOS' AI CAN:                                                 │
│  • Share relevant context with Sarah's AI                       │
│  • Suggest what to introduce next                               │
│  • Monitor Sarah's questions for gaps                           │
│  • Generate onboarding reports                                  │
│                                                                  │
│  SHARED CONTEXT:                                                 │
│  • Mentorship relationship is known                             │
│  • Some private context can flow through mentor                 │
│  • Questions surface tribal knowledge gaps                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Knowledge Handoffs

When someone leaves:

```python
class DepartureHandoff:
    def initiate_handoff(
        self, 
        departing: User,
        successor: Optional[User],
        deadline: datetime
    ) -> Handoff:
        """Initiate knowledge transfer process"""
        
        handoff = Handoff(
            departing=departing.id,
            successor=successor.id if successor else None,
            deadline=deadline,
            status="initiated"
        )
        
        # Identify unique knowledge
        unique_knowledge = self.identify_unique_knowledge(departing)
        
        # Generate transfer checklist
        handoff.checklist = self.generate_checklist(unique_knowledge)
        
        # Schedule transfer sessions
        handoff.sessions = self.schedule_sessions(
            departing, successor, unique_knowledge
        )
        
        return handoff
    
    def identify_unique_knowledge(self, user: User) -> List[Memory]:
        """Find knowledge primarily held by this user"""
        
        unique = []
        
        # Memories authored by user
        authored = self.team_store.search(author=user.id)
        
        for mem in authored:
            # Check if anyone else knows this
            corroborators = self.count_corroborators(mem, exclude=user.id)
            
            if corroborators == 0:
                # Only this user knows
                mem.transfer_priority = "critical"
                unique.append(mem)
            elif corroborators < 2:
                # Few others know
                mem.transfer_priority = "high"
                unique.append(mem)
        
        return unique
    
    def process_departure(self, user: User):
        """Handle post-departure memory processing"""
        
        # Personal memories: user takes or deletes
        personal = self.personal_store.get_all(user.id)
        # User chooses: export, delete, or (rarely) donate
        
        # Team contributions: remain with attribution
        team_authored = self.team_store.search(author=user.id)
        for mem in team_authored:
            mem.author_status = "departed"
            # Attribution preserved, content remains
        
        # Access removal
        self.revoke_access(user)
        
        # Archive user's access logs
        self.archive_access_history(user)
```

---

## 9. Implementation Recommendations

### Data Model

```python
class TeamMemory(BaseModel):
    id: str
    content: str
    summary: str
    
    # Layer and visibility
    layer: Literal["personal", "team", "organization"]
    visibility: VisibilitySettings
    
    # Attribution
    provenance: TeamMemoryProvenance
    author_id: str
    author_role: str
    contributors: List[Contributor]
    
    # Classification
    memory_type: str  # fact, decision, context, action_item, etc.
    topics: List[str]
    projects: List[str]
    
    # Team context
    team_id: Optional[str]
    org_id: str
    
    # Access control
    access_level: AccessLevel
    topic_permissions: Dict[str, str]
    
    # Lifecycle
    created_at: datetime
    updated_at: datetime
    status: Literal["active", "superseded", "archived"]
    
    # Onboarding
    complexity_level: int  # 1-5
    is_essential: bool
    onboarding_day: Optional[int]  # When to introduce

class VisibilitySettings(BaseModel):
    default_access: str
    explicit_grants: List[str]
    explicit_denies: List[str]
    anonymous: bool = False
    sunset_policy: Optional[SunsetPolicy]
```

### API Design

```python
# Team Memory API

class TeamMemoryAPI:
    # Personal layer
    def get_personal(self, user_id: str, query: str) -> List[Memory]
    def create_personal(self, user_id: str, memory: Memory) -> str
    def promote_to_team(self, memory_id: str, user_id: str) -> bool
    
    # Team layer  
    def get_team(self, team_id: str, user_id: str, query: str) -> List[Memory]
    def create_team(self, team_id: str, memory: Memory, author_id: str) -> str
    def promote_to_org(self, memory_id: str, promoter_id: str) -> bool
    
    # Organization layer
    def get_org(self, org_id: str, user_id: str, query: str) -> List[Memory]
    def create_org(self, org_id: str, memory: Memory, author_id: str) -> str
    
    # Cross-layer
    def search_all(self, user_id: str, query: str) -> List[Memory]
    def get_context(self, user_id: str, topics: List[str]) -> Context
    
    # Access control
    def check_access(self, user_id: str, memory_id: str, action: str) -> bool
    def grant_access(self, memory_id: str, grantee_id: str, level: str) -> bool
    
    # Onboarding
    def get_onboarding_context(self, user_id: str, day: int) -> List[Memory]
    def get_relevant_for_task(self, user_id: str, task: Task) -> List[Memory]
    
    # Handoffs
    def initiate_handoff(self, departing: str, successor: str) -> Handoff
    def complete_handoff(self, handoff_id: str) -> bool
```

### Migration Path

```
┌─────────────────────────────────────────────────────────────────┐
│                    MIGRATION PATH                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1: FOUNDATION                                             │
│  ├─ Implement three-layer memory model                          │
│  ├─ Add layer classification to existing memories               │
│  ├─ Basic access control (role-based)                           │
│  └─ Duration: 2-4 weeks                                         │
│                                                                  │
│  PHASE 2: COLLABORATION                                          │
│  ├─ Provenance tracking                                         │
│  ├─ Contribution attribution                                    │
│  ├─ Promotion/demotion workflows                                │
│  └─ Duration: 2-3 weeks                                         │
│                                                                  │
│  PHASE 3: ACCESS CONTROL                                         │
│  ├─ Topic-based access                                          │
│  ├─ Time-based access                                           │
│  ├─ Inheritance model                                           │
│  └─ Duration: 2-3 weeks                                         │
│                                                                  │
│  PHASE 4: ONBOARDING                                             │
│  ├─ Progressive context loading                                 │
│  ├─ Complexity levels                                           │
│  ├─ Handoff workflows                                           │
│  └─ Duration: 2-3 weeks                                         │
│                                                                  │
│  PHASE 5: CONSENSUS                                              │
│  ├─ Conflict detection                                          │
│  ├─ Resolution workflows                                        │
│  ├─ Voting mechanisms                                           │
│  └─ Duration: 2-3 weeks                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Key Insights and Principles

### Design Principles

1. **Default to Personal**
   - When uncertain about classification, personal is safest
   - Promotion is easier than damage from oversharing

2. **Explicit Over Implicit**
   - Sharing requires explicit action
   - Don't infer that something should be shared

3. **Attribution Always**
   - Even anonymous contributions have tracked provenance
   - Credit matters for trust and accountability

4. **Progressive Disclosure**
   - New members don't need everything on day one
   - Context surfaces as relevant

5. **Graceful Degradation**
   - System works if shared layer is unavailable
   - Individual AIs function independently

6. **Conflict is Normal**
   - Teams disagree; memory should reflect that
   - Resolution has clear owners and processes

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Alternative |
|--------------|--------------|-------------|
| **Everything shared** | Privacy erosion, information overload | Three-layer model with explicit promotion |
| **Full anonymity** | No accountability | Private attribution with restricted reveal |
| **Single AI for all** | No personalization | Hybrid with individual + shared |
| **Dump all context on onboard** | Overwhelming | Progressive disclosure |
| **Majority rules conflicts** | Ignores expertise | Authority + consensus hybrid |

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Consistency** | AIs give same answer to shared questions | Test queries across team AIs |
| **Privacy** | No inappropriate leakage | Audit cross-layer access |
| **Onboarding time** | Faster than manual | Time to productivity |
| **Knowledge retention** | Survives departures | Post-departure knowledge tests |
| **Conflict resolution** | < 24h to resolution | Time from detection to resolution |

---

## 11. Conclusion

Team memory extends the individual memory architecture to serve groups. The key insight is that **team memory is not just individual memory multiplied** — it requires:

1. **Clear layer boundaries** (personal / team / org)
2. **Explicit sharing mechanisms** (promotion, not assumption)
3. **Provenance and attribution** (who said what, when)
4. **Access control** (role × topic × time)
5. **Conflict resolution** (authority + consensus)
6. **Onboarding patterns** (progressive disclosure)

The recommended architecture is a **hybrid model**: individual AIs maintain personal context while connecting to a shared memory substrate for team and organizational knowledge. This preserves the benefits of personalization while enabling collective intelligence.

---

## Questions for Future Research

1. **Cross-organization memory** — How do memories work across companies (partnerships, clients)?
2. **Memory governance** — Who decides the rules for team memory?
3. **Memory analytics** — What can we learn from team memory patterns?
4. **Memory inheritance** — When teams split or merge, what happens to memory?
5. **Memory versioning** — How do we handle "that decision was different then"?

---

*Team memory complete. Ready for integration into the AI Continuity Framework.*

— Jordan 🧭
