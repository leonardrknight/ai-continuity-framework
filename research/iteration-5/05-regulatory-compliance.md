# Regulatory Compliance for AI Memory Systems

## Executive Summary

AI memory systems that persist user information face a complex web of overlapping regulations. Unlike traditional databases, AI memory creates unique compliance challenges:

1. **Memory is inference-rich** — stored context enables AI to make decisions about users
2. **Boundaries are fuzzy** — what constitutes "personal data" when memories capture preferences, patterns, and personality traits?
3. **Retention creates risk** — longer memory improves UX but increases regulatory exposure
4. **Cross-border is default** — AI systems inherently serve global users

This document maps regulatory requirements to AI memory architecture decisions.

---

## Part 1: Regulatory Framework Matrix

### 1.1 Overview Grid

| Regulation | Jurisdiction | Primary Focus | AI Memory Impact | Penalty Range |
|------------|--------------|---------------|------------------|---------------|
| **GDPR** | EU/EEA | Data protection rights | High | €20M or 4% revenue |
| **CCPA/CPRA** | California | Consumer privacy rights | High | $7,500/violation |
| **HIPAA** | US Healthcare | Protected health info | Critical | $1.5M/violation |
| **SOC2** | US (voluntary) | Security controls | High | Loss of certification |
| **EU AI Act** | EU | AI system risks | Critical | €35M or 7% revenue |
| **GLBA** | US Financial | Financial privacy | High | Varies by enforcer |
| **FERPA** | US Education | Student records | High | Loss of funding |
| **COPPA** | US Children | Children's data | Critical | $50,000/violation |

### 1.2 Data Classification Requirements

#### GDPR Article 9 — Special Categories (Require Explicit Consent)
- Racial or ethnic origin
- Political opinions
- Religious or philosophical beliefs
- Trade union membership
- Genetic data
- Biometric data for identification
- Health data
- Sex life or sexual orientation

#### CCPA Sensitive Personal Information
- Government identifiers (SSN, driver's license)
- Financial account credentials
- Precise geolocation
- Contents of communications (mail, email, texts)
- Genetic/biometric data
- Health, sex life, sexual orientation
- Racial/ethnic origin, religious beliefs, union membership

#### HIPAA Protected Health Information (PHI)
Any individually identifiable health information relating to:
- Past, present, or future physical/mental health
- Healthcare provision
- Payment for healthcare

**18 HIPAA Identifiers:**
1. Names
2. Geographic subdivisions smaller than state
3. Dates (except year) related to individual
4. Phone numbers
5. Fax numbers
6. Email addresses
7. Social Security numbers
8. Medical record numbers
9. Health plan beneficiary numbers
10. Account numbers
11. Certificate/license numbers
12. Vehicle identifiers/serial numbers
13. Device identifiers/serial numbers
14. Web URLs
15. IP addresses
16. Biometric identifiers
17. Full-face photographs
18. Any other unique identifying characteristic

---

## Part 2: Key Compliance Areas

### 2.1 Consent Management

#### GDPR Consent Requirements
```
┌─────────────────────────────────────────────────────────────┐
│                    CONSENT HIERARCHY                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  EXPLICIT CONSENT (Article 9)                               │
│  ├── Special category data                                  │
│  ├── Automated decision-making with legal effects           │
│  └── International transfers to non-adequate countries      │
│                                                             │
│  STANDARD CONSENT (Article 6(1)(a))                         │
│  ├── General personal data processing                       │
│  └── Marketing and profiling                                │
│                                                             │
│  LEGITIMATE INTEREST (Article 6(1)(f))                      │
│  ├── Security purposes                                      │
│  ├── Fraud prevention                                       │
│  └── Internal analytics (with balancing test)               │
│                                                             │
│  CONTRACT NECESSITY (Article 6(1)(b))                       │
│  └── Data essential for service delivery                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### AI Memory Consent Considerations

| Memory Type | Likely Legal Basis | Documentation Required |
|-------------|-------------------|------------------------|
| User preferences | Contract necessity | Privacy policy |
| Conversation history | Legitimate interest | Balancing test |
| Inferred preferences | Consent | Explicit opt-in |
| Health mentions | Explicit consent | Signed consent form |
| Financial context | Explicit consent | Purpose limitation |
| Personality modeling | Consent | Clear explanation |

#### Consent Withdrawal Implementation

```typescript
interface ConsentRecord {
  userId: string;
  consentType: 'explicit' | 'standard' | 'legitimate_interest';
  purposes: string[];
  grantedAt: Date;
  withdrawnAt?: Date;
  version: string;
  mechanism: 'click' | 'signed' | 'verbal_recorded';
}

class ConsentManager {
  async withdrawConsent(userId: string, purposes?: string[]): Promise<void> {
    // 1. Record withdrawal
    await this.recordWithdrawal(userId, purposes);
    
    // 2. Stop processing immediately
    await this.suspendProcessing(userId, purposes);
    
    // 3. Trigger downstream actions
    await this.notifyDependentSystems(userId, purposes);
    
    // 4. Note: Does NOT require data deletion
    //    (that's separate "right to erasure" request)
  }
}
```

### 2.2 Right to Explanation (AI Transparency)

#### GDPR Article 22 Requirements

When AI makes decisions with legal or similarly significant effects:

1. **Right to human intervention**
2. **Right to express viewpoint**
3. **Right to contest the decision**
4. **Right to explanation of logic involved**

#### Implementation for AI Memory

```typescript
interface DecisionAudit {
  decisionId: string;
  timestamp: Date;
  userId: string;
  
  // What memories influenced this decision?
  memoriesUsed: {
    memoryId: string;
    content: string;  // Sanitized
    weight: number;   // How much it influenced
    retrievalReason: string;
  }[];
  
  // The decision itself
  decision: {
    type: string;
    outcome: string;
    confidence: number;
  };
  
  // Explainability
  explanation: {
    humanReadable: string;
    factors: string[];
    counterfactual: string;  // "Without X, decision would have been Y"
  };
}
```

#### EU AI Act Article 13 — Transparency for High-Risk Systems

High-risk AI systems must be designed to enable deployers to:
- Interpret output appropriately
- Understand when to override
- Access relevant logs
- Monitor performance

**For AI memory systems, this means:**
- Log which memories were retrieved for each interaction
- Explain why certain memories were prioritized
- Show how memory influenced the response
- Enable users to correct or delete influential memories

### 2.3 Data Retention Requirements

#### The Retention Paradox

Different regulations impose contradicting requirements:

| Regulation | Retention Rule | Typical Duration |
|------------|---------------|------------------|
| GDPR | Minimize, delete when purpose complete | As short as possible |
| HIPAA | Minimum 6 years from creation/last use | 6+ years |
| SOX (Financial) | 7 years for financial records | 7 years |
| IRS | 3-7 years for tax records | 3-7 years |
| GLBA | Various, typically 5-7 years | 5-7 years |
| SEC | 6 years for communications | 6 years |
| Legal Hold | Indefinite during litigation | Until resolved |

#### Resolution Strategy

```typescript
interface RetentionPolicy {
  dataCategory: string;
  regulations: string[];
  
  // Calculate effective retention
  retention: {
    minimum: Duration;      // From regulations requiring retention
    maximum: Duration;      // From privacy regulations
    effective: Duration;    // max(minimum, min(maximum, business_need))
  };
  
  // Actions at retention end
  endOfLife: {
    action: 'delete' | 'anonymize' | 'archive';
    verification: 'automatic' | 'manual_review';
    auditTrail: boolean;
  };
}
```

**Practical Resolution Matrix:**

| If Data Is... | And Regulation Requires... | Then... |
|---------------|---------------------------|---------|
| PHI | HIPAA 6yr + GDPR minimize | Keep 6 years, then delete |
| Financial | SOX 7yr + CCPA delete request | Keep 7 years (regulatory override) |
| General personal | GDPR + user delete request | Delete immediately |
| Mixed categories | Multiple | Apply most restrictive for each category |

### 2.4 Cross-Border Data Transfers

#### GDPR Transfer Mechanisms (Post-Schrems II)

1. **Adequacy Decisions** — Countries with "adequate" protection
   - Current: UK, Japan, South Korea, Canada (commercial), Argentina, Israel, Switzerland, New Zealand, Uruguay, etc.
   - US: EU-US Data Privacy Framework (2023)

2. **Standard Contractual Clauses (SCCs)**
   - Required for transfers to non-adequate countries
   - Must conduct Transfer Impact Assessment (TIA)

3. **Binding Corporate Rules (BCRs)**
   - For intra-group transfers
   - Requires supervisory authority approval

4. **Derogations (Article 49)**
   - Explicit consent for specific transfer
   - Contract necessity
   - Public interest
   - Legal claims
   - Vital interests

#### Implementation Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  CROSS-BORDER DATA ARCHITECTURE                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   EU Data    │ ◄─────► │   EU Region  │                    │
│  │   Subjects   │         │  (Primary)   │                    │
│  └──────────────┘         └──────────────┘                    │
│                                  │                            │
│                                  │ SCCs + TIA                 │
│                                  ▼                            │
│  ┌──────────────┐         ┌──────────────┐                    │
│  │   US Data    │ ◄─────► │  US Region   │                    │
│  │   Subjects   │         │  (with DPF)  │                    │
│  └──────────────┘         └──────────────┘                    │
│                                                                │
│  Data Residency Rules:                                        │
│  • EU data stays in EU region by default                      │
│  • US region handles US subjects                              │
│  • Transfers only with appropriate mechanism                  │
│  • Anonymized/aggregated data can transfer freely             │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Industry-Specific Requirements

### 3.1 Healthcare (HIPAA)

#### Covered Entities
- Health plans
- Healthcare clearinghouses
- Healthcare providers transmitting health info electronically

#### Business Associates
Any entity that:
- Creates, receives, maintains, or transmits PHI
- On behalf of a covered entity

**AI memory systems handling healthcare data are likely Business Associates.**

#### Required Safeguards

| Safeguard Type | Examples |
|----------------|----------|
| **Administrative** | Risk analysis, workforce training, security officer |
| **Physical** | Facility access controls, device security |
| **Technical** | Access controls, audit controls, integrity controls, transmission security |

#### Minimum Necessary Rule
Only access/disclose minimum PHI necessary for the purpose.

**AI Memory Implication:** Memory retrieval must be purpose-limited.

### 3.2 Financial Services (GLBA, SOX)

#### GLBA Requirements
- Privacy notices explaining data sharing
- Opt-out rights for third-party sharing
- Safeguards rule (security program)

#### SOX Section 802 — Records Retention
- 7 years for audit work papers
- Applies to any "document related to business"
- Criminal penalties for destruction

#### AI Memory for Financial Advice
If AI provides personalized financial guidance:
- May trigger SEC/FINRA registration requirements
- All communications must be retained
- Supervision requirements apply

### 3.3 Education (FERPA)

#### Protected Information
- Grades and transcripts
- Disciplinary records
- Financial aid information
- Student health records
- Directory information (unless opt-out)

#### Consent Requirements
- Written consent for disclosure
- Parents control until student turns 18 or enters postsecondary
- School official exception for legitimate educational interest

**AI Memory for EdTech:**
- Teacher/student conversations may be education records
- Platform must have "legitimate educational interest"
- Cannot use data for non-educational purposes

### 3.4 Children (COPPA)

#### Covered Operators
Websites/services directed at children under 13, or with actual knowledge of child users.

#### Requirements
- Verifiable parental consent before collection
- Clear privacy notice
- Reasonable data security
- Data minimization
- Parental access and deletion rights
- No conditioning services on excess data collection

**AI Memory Risk:**
If a child uses an AI memory system:
- All memory collection requires parental consent
- Parent can request deletion
- Cannot use data for behavioral advertising

---

## Part 4: EU AI Act Compliance

### 4.1 Risk Classification

The EU AI Act classifies AI systems by risk level:

#### Prohibited (Article 5)
- Social scoring systems
- Manipulative/deceptive AI causing harm
- Emotion recognition in workplaces/schools (exceptions exist)
- Untargeted facial recognition database scraping
- Real-time biometric ID in public (with exceptions)

#### High-Risk (Annex III) — Relevant Categories
- **Education:** Systems determining access, evaluating outcomes
- **Employment:** Recruitment, task allocation, monitoring, termination
- **Essential services:** Creditworthiness, emergency dispatch, insurance pricing
- **Administration of justice:** Researching/applying law

#### AI Memory Classification
Most AI memory systems would be **limited risk** (transparency obligations only), unless:
- Used for high-risk purposes above
- Performs profiling with significant effects
- Integrated into high-risk systems

### 4.2 High-Risk Requirements (if applicable)

| Requirement | Implementation |
|-------------|----------------|
| Risk management system | Continuous lifecycle assessment |
| Data governance | Quality, representativeness, bias testing |
| Technical documentation | Architecture, training, evaluation |
| Record-keeping | Automatic logging of events |
| Transparency | Instructions for deployers |
| Human oversight | Ability to intervene, override |
| Accuracy & robustness | Testing, validation, security |
| Quality management | Documented processes |

### 4.3 GPAI Model Requirements

If using a General Purpose AI model (like GPT-4, Claude):

**All GPAI Models Must:**
- Provide technical documentation
- Provide downstream provider documentation
- Respect Copyright Directive
- Publish training data summary

**Systemic Risk Models (>10²⁵ FLOPs) Must Also:**
- Conduct model evaluations and adversarial testing
- Assess and mitigate systemic risks
- Report serious incidents
- Ensure cybersecurity

---

## Part 5: Audit Requirements

### 5.1 What Logs to Keep

#### Minimum Audit Log Contents

```typescript
interface AuditEntry {
  // Who
  userId: string;
  userRole: string;
  authenticatedVia: string;
  
  // What
  action: 'create' | 'read' | 'update' | 'delete' | 'retrieve' | 'infer';
  resourceType: 'memory' | 'conversation' | 'profile' | 'setting';
  resourceId: string;
  dataCategories: string[];  // PII, PHI, financial, etc.
  
  // When
  timestamp: Date;
  timezone: string;
  
  // Where
  sourceIp: string;
  geoLocation?: string;
  
  // Context
  purpose: string;
  legalBasis: string;
  processingActivity: string;
  
  // Result
  outcome: 'success' | 'failure' | 'partial';
  errorDetails?: string;
}
```

#### Retention by Regulation

| Regulation | Log Retention | Notes |
|------------|--------------|-------|
| GDPR | Not specified | Reasonable period |
| HIPAA | 6 years | From creation/last use |
| SOC2 | 1 year minimum | Varies by control |
| PCI-DSS | 1 year minimum | 3 months immediately accessible |
| SOX | 7 years | Financial records |
| EU AI Act | Lifecycle + 10 years | High-risk systems |

### 5.2 SOC2 Trust Service Criteria

#### Five Categories

1. **Security** (Required)
   - Logical and physical access controls
   - System operations
   - Change management
   - Risk mitigation

2. **Availability**
   - Performance monitoring
   - Disaster recovery
   - Incident response
   - Business continuity

3. **Processing Integrity**
   - Input validation
   - Processing accuracy
   - Output completeness
   - Error handling

4. **Confidentiality**
   - Classification
   - Encryption
   - Access restrictions
   - Secure disposal

5. **Privacy**
   - Notice and consent
   - Choice and consent
   - Collection limitation
   - Use, retention, disposal
   - Access and correction
   - Disclosure
   - Quality
   - Monitoring and enforcement

### 5.3 Third-Party Audit Readiness

#### Pre-Audit Checklist

- [ ] Data flow diagrams current
- [ ] Privacy policy matches actual practices
- [ ] Consent records accessible
- [ ] Access control lists documented
- [ ] Encryption implemented and documented
- [ ] Incident response plan exists
- [ ] Employee training records available
- [ ] Vendor/processor agreements in place
- [ ] Data Processing Agreements (DPAs) signed
- [ ] Records of Processing Activities (RoPA) complete
- [ ] Data Protection Impact Assessments (DPIAs) conducted
- [ ] Penetration test results available
- [ ] Vulnerability scans current
- [ ] Change management logs accessible

---

## Part 6: Compliance Architecture

### 6.1 Data-Centric Security Model

```
┌────────────────────────────────────────────────────────────────┐
│                   COMPLIANCE ARCHITECTURE                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  LAYER 1: DATA CLASSIFICATION                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Auto-classify incoming data                              │ │
│  │  • PII detector                                           │ │
│  │  • PHI detector                                           │ │
│  │  • Financial data detector                                │ │
│  │  • Children's data detection                              │ │
│  │  • Special category (Art. 9) detection                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          ▼                                     │
│  LAYER 2: POLICY ENGINE                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Apply rules based on classification                      │ │
│  │  • Consent verification                                   │ │
│  │  • Purpose limitation check                               │ │
│  │  • Retention policy assignment                            │ │
│  │  • Access control determination                           │ │
│  │  • Geographic routing                                     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          ▼                                     │
│  LAYER 3: STORAGE & PROCESSING                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Secure, compliant storage                                │ │
│  │  • Encryption at rest (AES-256)                           │ │
│  │  • Regional data residency                                │ │
│  │  • Access logging                                         │ │
│  │  • Automated retention enforcement                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          ▼                                     │
│  LAYER 4: ACCESS & RETRIEVAL                                   │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Controlled memory access                                 │ │
│  │  • Purpose verification                                   │ │
│  │  • Minimum necessary filtering                            │ │
│  │  • Audit trail generation                                 │ │
│  │  • Decision explanation logging                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 Automated Data Detection

```typescript
interface DataClassifier {
  classify(text: string): Classification;
}

interface Classification {
  categories: {
    pii: boolean;
    phi: boolean;
    financial: boolean;
    childData: boolean;
    specialCategory: boolean;
  };
  
  detectedElements: {
    type: string;       // 'ssn', 'credit_card', 'diagnosis', etc.
    confidence: number;
    location: [number, number];  // start, end indices
    regulation: string[];  // Which regulations apply
  }[];
  
  suggestedHandling: {
    legalBasis: string;
    consentRequired: boolean;
    encryptionLevel: 'standard' | 'enhanced' | 'maximum';
    retentionCategory: string;
    geographicRestrictions: string[];
  };
}
```

### 6.3 Rights Management System

```typescript
interface DataSubjectRightsHandler {
  // GDPR Article 15 - Right of Access
  async handleAccessRequest(userId: string): Promise<DataPortabilityPackage>;
  
  // GDPR Article 16 - Right to Rectification
  async handleRectificationRequest(
    userId: string, 
    corrections: Correction[]
  ): Promise<void>;
  
  // GDPR Article 17 - Right to Erasure
  async handleErasureRequest(userId: string): Promise<ErasureReport>;
  
  // GDPR Article 18 - Right to Restriction
  async handleRestrictionRequest(
    userId: string,
    processingTypes: string[]
  ): Promise<void>;
  
  // GDPR Article 20 - Right to Data Portability
  async handlePortabilityRequest(userId: string): Promise<DataExport>;
  
  // GDPR Article 21 - Right to Object
  async handleObjectionRequest(
    userId: string,
    processingTypes: string[]
  ): Promise<void>;
  
  // GDPR Article 22 - Automated Decision Rights
  async handleAutomatedDecisionReview(
    userId: string,
    decisionId: string
  ): Promise<HumanReview>;
}
```

---

## Part 7: Implementation Checklist

### 7.1 Foundation

- [ ] **Data Mapping**
  - [ ] Identify all data collection points
  - [ ] Document data flows
  - [ ] Classify data categories
  - [ ] Map to applicable regulations

- [ ] **Legal Basis Documentation**
  - [ ] Define lawful basis for each processing activity
  - [ ] Document legitimate interest assessments
  - [ ] Create consent collection mechanisms
  - [ ] Version consent forms

- [ ] **Privacy Documentation**
  - [ ] Privacy policy (external)
  - [ ] Records of Processing Activities
  - [ ] Data Protection Impact Assessments
  - [ ] Processor/controller agreements

### 7.2 Technical Controls

- [ ] **Data Classification**
  - [ ] PII detection system
  - [ ] PHI detection (if healthcare)
  - [ ] Automated tagging
  - [ ] Classification audit

- [ ] **Access Control**
  - [ ] Role-based access control
  - [ ] Purpose-based access control
  - [ ] Minimum necessary enforcement
  - [ ] Access logging

- [ ] **Encryption**
  - [ ] At-rest encryption (AES-256)
  - [ ] In-transit encryption (TLS 1.3)
  - [ ] Key management
  - [ ] Field-level encryption for sensitive data

- [ ] **Data Residency**
  - [ ] Geographic routing logic
  - [ ] Regional storage configuration
  - [ ] Transfer mechanism implementation

### 7.3 Operational Processes

- [ ] **Rights Handling**
  - [ ] Access request workflow
  - [ ] Deletion request workflow
  - [ ] Portability export format
  - [ ] 30-day SLA tracking

- [ ] **Consent Management**
  - [ ] Collection interface
  - [ ] Withdrawal mechanism
  - [ ] Preference center
  - [ ] Consent audit trail

- [ ] **Incident Response**
  - [ ] Breach detection
  - [ ] 72-hour notification process
  - [ ] Affected individual notification
  - [ ] Post-incident review

- [ ] **Retention Management**
  - [ ] Automated retention enforcement
  - [ ] Deletion verification
  - [ ] Legal hold capability
  - [ ] Anonymization process

### 7.4 Audit & Monitoring

- [ ] **Logging**
  - [ ] Comprehensive audit logs
  - [ ] Log integrity protection
  - [ ] Log retention policy
  - [ ] Log analysis capability

- [ ] **Monitoring**
  - [ ] Access anomaly detection
  - [ ] Policy violation alerting
  - [ ] Compliance dashboard
  - [ ] Regular compliance scanning

- [ ] **Third-Party Audits**
  - [ ] Annual SOC2 Type II (if applicable)
  - [ ] Penetration testing
  - [ ] Vulnerability scanning
  - [ ] Compliance certifications

---

## Part 8: Future-Proofing

### 8.1 Emerging Regulations

| Regulation | Status | Key Requirements | Target Date |
|------------|--------|------------------|-------------|
| **EU AI Act** | In force | Risk classification, transparency | 2024-2027 |
| **Colorado AI Act** | Passed | High-risk AI disclosure | 2026 |
| **APRA (Federal US)** | Proposed | Federal privacy baseline | TBD |
| **Brazil LGPD AI** | Proposed | AI-specific amendments | TBD |
| **China AI Regs** | Various | Algorithmic recommendations, deepfakes | Active |

### 8.2 Design Principles for Regulatory Adaptability

1. **Modular Compliance Layer**
   - Separate compliance logic from business logic
   - Enable regulation-specific modules
   - Hot-swap compliance rules

2. **Comprehensive Audit Trail**
   - Log more than currently required
   - Immutable audit logs
   - Long retention periods

3. **Granular Consent**
   - Purpose-specific consent
   - Easy consent withdrawal
   - Clear consent versioning

4. **Data Minimization by Default**
   - Collect only what's needed
   - Aggregate when possible
   - Anonymize when retention not required

5. **Explainability Built-In**
   - Decision logging from day one
   - Influence tracking
   - Human-readable explanations

### 8.3 Regulatory Monitoring

Establish process to monitor:
- EU AI Act implementing acts
- State privacy law developments
- Industry guidance updates
- Enforcement actions and precedents
- International adequacy decisions

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Controller** | Entity determining purposes and means of processing |
| **Processor** | Entity processing data on behalf of controller |
| **Data Subject** | Individual whose data is processed |
| **PII** | Personally Identifiable Information |
| **PHI** | Protected Health Information |
| **DPA** | Data Processing Agreement |
| **DPIA** | Data Protection Impact Assessment |
| **RoPA** | Records of Processing Activities |
| **SCC** | Standard Contractual Clauses |
| **BCR** | Binding Corporate Rules |
| **TIA** | Transfer Impact Assessment |

## Appendix B: Regulatory Contacts

| Regulation | Authority | Contact |
|------------|-----------|---------|
| GDPR | Lead Supervisory Authority | Varies by country |
| CCPA/CPRA | CA AG / CPPA | privacy@oag.ca.gov |
| HIPAA | HHS OCR | ocrmail@hhs.gov |
| EU AI Act | AI Office | TBD |
| FTC | FTC | ftc.gov/complaint |

## Appendix C: Key Dates

- **GDPR:** May 25, 2018
- **CCPA:** January 1, 2020
- **CPRA amendments:** January 1, 2023
- **EU AI Act entry into force:** August 1, 2024
- **EU AI Act prohibited AI:** February 2, 2025
- **EU AI Act GPAI rules:** August 2, 2025
- **EU AI Act high-risk (Annex III):** August 2, 2026
- **EU AI Act high-risk (Annex I):** August 2, 2027

---

## Summary

AI memory systems must navigate a complex regulatory landscape. Key principles:

1. **Know your data** — Classify everything, detect sensitive categories automatically
2. **Document everything** — Legal basis, consent, processing activities
3. **Implement rights** — Access, deletion, portability, objection
4. **Audit continuously** — Log all access, monitor compliance, prepare for audits
5. **Plan for change** — Build modular compliance, monitor emerging regulations

The regulatory environment will only become more complex. Building compliance into the architecture from day one is far cheaper than retrofitting.
