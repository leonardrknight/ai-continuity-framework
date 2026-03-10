# CLAUDE.md — AI Continuity Framework

## Project Identity

An open-source methodology and reference architecture for AI assistant persistent memory and identity. Includes the **Guardian Agent** — a cloud service that manages this repo using persistent memory.

**Repo:** `ai-continuity-framework`
**Type:** Methodology / Research / Templates + Guardian Agent (Next.js)
**Governance:** FORGE Tier 0 (all changes require Leo's approval)

---

## Directory Map

```
├── 01–09-*.md              ← Core methodology (numbered sequence, append-only)
├── templates/              ← Ready-to-use identity/memory file templates
├── research/               ← Deep research iterations (7 complete, 10 planned)
│   └── iteration-N/        ← Each has 00-synthesis.md + topic papers
├── proposals/              ← Implementation proposals (Soul Capture, Agent Swarm)
├── insights/               ← Production observations
├── guardian/               ← Guardian Agent (Next.js + TypeScript)
├── docs/
│   ├── constitution/       ← PRODUCT.md, TECH.md, GOVERNANCE.md
│   ├── adr/                ← Architecture Decision Records
│   └── parking-lot/        ← Deferred items
├── abc/                    ← FORGE entry artifacts (FORGE-ENTRY.md, INTAKE.md)
├── _forge/                 ← FORGE inbox/ledger
└── .claude/                ← FORGE agents and skills
```

---

## Key Concepts

| Term | Meaning |
|------|---------|
| **Scaffolding** | Technical backup (files, configs, credentials) — gets AI operational |
| **Soul** | Identity docs (values, voice, relationships) — makes AI "itself" |
| **Identity Journal** | Living record of voice, values, lessons, relationships |
| **Weekly Reflection** | Scheduled ritual for consolidating wisdom |
| **Hub-and-Spoke** | One brain, many interfaces |

---

## Working With This Repo

### Adding Content
- New core documents get next available number: `NN-Title.md`
- Research goes in `research/iteration-N/NN-topic.md`
- Insights go in `insights/YYYY-MM-DD-slug.md`
- Templates go in `templates/`

### Quality Checks
No automated tooling. Manual review for:
- Markdown validity
- Internal link integrity (cross-references)
- Consistent terminology (see Key Concepts above)
- Provider-neutral language (no vendor lock-in)

### Change Control
- Core documents (01-XX) and templates: **PR required**
- Research iterations: **direct push OK** (research velocity)
- ADR required for: architecture changes, new core doc topics, template schema changes
- See `docs/constitution/GOVERNANCE.md` for full policy

---

## FORGE Agents Available

| Agent | Command | Role |
|-------|---------|------|
| @F | `/forge-f` | Frame — Product intent |
| @O | `/forge-o` | Orchestrate — Architecture |
| @R | `/forge-r` | Refine — Review & coherence |
| @G | `/forge-g` | Govern — Routing & policy |
| @E | `/forge-e` | Execute — Write per approved handoffs |
| @Q | `/forge-q` | Quality — Advisory analysis |

---

## Constitutional Documents

- **PRODUCT.md** — What we're building and why → `docs/constitution/PRODUCT.md`
- **TECH.md** — Repo structure and standards → `docs/constitution/TECH.md`
- **GOVERNANCE.md** — Decision authority and change control → `docs/constitution/GOVERNANCE.md`

---

## Research Status

7 of 10 planned iterations complete. See `research/iteration-log.md` for the full log.

| Iteration | Focus |
|-----------|-------|
| 1 | Infrastructure, search, voice, consolidation, migration, timing |
| 2 | Conflicts, scale, override, privacy, isolation, surfacing |
| 3 | Emotion, continuity, visualization, debugging, transparency, versioning |
| 4 | Corrections, collaboration, export, search UX, performance, testing |
| 5 | Onboarding, capacity, failure recovery, security, compliance, cost |
| 6 | Interoperability, temporal reasoning, context switching, summarization, relationships, culture |
| 7 | Agent architecture, NL commands, analytics, team memory, templates, long-term evolution |

---

## Infrastructure (DO NOT SEARCH — USE THESE VALUES)

### Supabase
- **Organization:** Knight Ventures, Inc. (`iwcqfdsbnvlofvwwbpae`)
- **Project:** ai-continuity-framework
- **Project Ref:** `effzofflphvbyvcenvly`
- **Region:** us-east-1 (East US / North Virginia)
- **Dashboard:** https://supabase.com/dashboard/project/effzofflphvbyvcenvly
- **API URL:** `https://effzofflphvbyvcenvly.supabase.co`
- **CLI link command:** `supabase link --project-ref effzofflphvbyvcenvly`

### Vercel
- **Team:** knightventures (`team_peXyhOy36qK8p0onzEyuSRTA`)
- **Project:** ai-continuity-framework (`prj_nccd3R2fwFVuTK6XgkPXt6yrbHsI`)
- **Dashboard:** https://vercel.com/knightventures/ai-continuity-framework
- **Production URL:** https://ai-continuity-framework.vercel.app (pending first deploy)
- **Root directory:** `guardian/`

### GitHub
- **Repo:** leonardrknight/ai-continuity-framework
- **Main branch:** main
- **CI/CD:** GitHub Actions (`.github/workflows/ci.yml`) — Sacred Four (typecheck, lint, test, build)
- **Triggers:** Push/PR to main affecting `guardian/**`

### Environment Files
- **Local:** `.env.local` (gitignored, contains all secrets)
- **Vercel:** Sync via `vercel env pull .env.local`
- **Template:** `.env.local` contains Supabase URL/keys, Vercel IDs, GitHub App placeholders

### Guardian Agent Commands
```bash
cd guardian
pnpm install                 # Install dependencies
pnpm dev                     # Development server (tsx watch)
pnpm build                   # Production build (tsc)
pnpm start                   # Start production server
pnpm typecheck               # TypeScript strict check
pnpm lint                    # ESLint + Prettier check
pnpm test                    # Vitest (run once)
pnpm test:watch              # Vitest (watch mode)

# Sacred Four (must all pass before merge)
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```
