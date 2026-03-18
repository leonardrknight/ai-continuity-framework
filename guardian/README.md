# Guardian Agent

Guardian is a reference implementation of the AI Continuity Framework's multi-agent memory system. It provides:

- **Persistent memory** across conversations
- **Automatic extraction** of facts, preferences, and relationships
- **Semantic search** for relevant context retrieval
- **Memory lifecycle management** (consolidation, decay, curation)

## Architecture

Guardian uses a multi-agent pipeline powered by [Inngest](https://www.inngest.com/):

| Agent | Schedule | Purpose |
|-------|----------|---------|
| **Extractor** | Every 5 min | Processes raw conversation events |
| **Scribe** | Every 2 min | Extracts memories from conversations |
| **Consolidator** | Hourly | Deduplicates and merges related memories |
| **Curator** | Daily 3 AM | Manages memory lifecycle (decay, archival) |
| **Responder** | On-event | Retrieves relevant memories for responses |

## Quick Start (Production)

```bash
# Install dependencies
cd guardian
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Anthropic credentials

# Run database migrations
npx supabase db push

# Build and start
npm run build
npm start
```

## Local Development

For local development, you need both Guardian and Inngest running persistently. The easiest way is using the provided tmux script:

### Prerequisites

- Node.js 18+
- tmux (`sudo apt install tmux` or `brew install tmux`)
- Supabase project with migrations applied
- Anthropic API key

### Start Local Dev Environment

```bash
# One command to start everything
./scripts/start-local.sh

# Check status
./scripts/start-local.sh status

# Attach to see logs
./scripts/start-local.sh attach
# (Detach with Ctrl+B then D, switch windows with Ctrl+B then N)

# Stop everything
./scripts/start-local.sh stop
```

This creates a persistent tmux session with two windows:
- **guardian** — The main Guardian server (port 3000)
- **inngest** — Inngest dev server (port 8288)

### Manual Setup

If you prefer to run things manually:

```bash
# Terminal 1: Start Guardian with Inngest dev mode
cd guardian
INNGEST_DEV=1 env $(grep -v '^#' .env.local | xargs) node dist/index.js

# Terminal 2: Start Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

**Important:** Both processes must stay running. If you close the terminal, they will stop and the memory pipeline won't process new conversations.

### Why tmux?

Simple backgrounding (`&` or `nohup`) doesn't work reliably because:
- Many shells kill child processes on exit
- The Inngest cron jobs need a persistent connection to Guardian
- Memory extraction only happens while both services are running

tmux keeps processes alive independent of your terminal session.

### Verify It's Working

```bash
# Check Guardian
curl http://localhost:3000/health
# Should show: {"status":"ok","inngest":"configured",...}

# Check Inngest has registered functions
curl -s http://localhost:8288/dev | grep function_count
# Should show: "function_count":5
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (not anon key) |
| `ANTHROPIC_API_KEY` | Yes | For Claude-based memory extraction |
| `INNGEST_DEV` | Dev only | Set to `1` for local Inngest dev server |
| `INNGEST_EVENT_KEY` | Prod only | Inngest cloud event key |
| `INNGEST_SIGNING_KEY` | Prod only | Inngest cloud signing key |

## Database Setup

Guardian requires these Supabase tables (created by migrations):

- `conversations` — Chat session metadata
- `messages` — Individual messages with `processed` flag
- `extracted_memories` — Raw extracted memories
- `consolidated_memories` — Deduplicated, merged memories

Run migrations:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

## Troubleshooting

### "inngest":"not configured"

Make sure `INNGEST_DEV=1` is set when starting Guardian, or configure production Inngest keys.

### Memories not being extracted

1. Check Inngest is running: `curl http://localhost:8288/health`
2. Check for unprocessed messages in the database
3. Look at Inngest logs for errors: `./scripts/start-local.sh attach` then Ctrl+B, N

### Process dies when terminal closes

Use the tmux script: `./scripts/start-local.sh`

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and config status |
| `/api/chat` | POST | Send message, get response with memory |
| `/api/inngest` | POST | Inngest webhook endpoint |

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) in the root of this repository.
