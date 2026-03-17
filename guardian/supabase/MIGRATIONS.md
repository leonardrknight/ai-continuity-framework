# Guardian Supabase Migrations

## Project Info
- **Supabase Project:** wonrcapaoyxwlmofrghe (amigo-saas)
- **Credentials:** Stored in pass vault at `supabase/amigo-saas/*`

## Migration Commands

```bash
# Navigate to guardian directory
cd ~/clawd/ai-continuity-framework/guardian

# Check migration status (always use --dns-resolver for IPv6/pooler compatibility)
npx supabase migration list --dns-resolver https

# Apply pending migrations to remote
npx supabase db push --dns-resolver https

# Mark a migration as applied (if manually run in SQL editor)
npx supabase migration repair <version> --status applied --dns-resolver https

# Mark a migration as reverted (to re-run it)
npx supabase migration repair <version> --status reverted --dns-resolver https

# Create new migration
npx supabase migration new <name>
```

## Migration History

| Version | Name | Status | Notes |
|---------|------|--------|-------|
| 20260317180000 | fix_match_memories | Applied | Fixes PGRST203 overload error and type mismatch |
| 20260405000000 | guardian_schema | Applied | Consolidated schema (includes all tables) |

## Troubleshooting

### IPv6/Connection Issues
Always use `--dns-resolver https` flag when connecting to Supabase from environments with IPv6 issues.

### Migration Tracking Out of Sync
If a migration was applied manually (via SQL editor) but not tracked:
1. Create the migration file locally with the same timestamp
2. Run `npx supabase migration repair <version> --status applied --dns-resolver https`

### Checking What's in Remote DB
Use the Supabase Dashboard SQL Editor or:
```bash
# Pull remote schema (creates local diff)
npx supabase db pull --dns-resolver https
```

## March 17, 2026 Fix Session

The `match_memories` function had two issues:
1. **PGRST203**: Multiple function overloads with similar signatures
2. **42804**: Type mismatch - FLOAT vs REAL return values

Solution: Single unified function with explicit DOUBLE PRECISION casts.

The fix was applied manually to the DB, then migration tracking was synced using:
```bash
# Added the fix migration file locally
# Then marked consolidated schema as applied (since DB already had all tables)
npx supabase migration repair 20260405000000 --status applied --dns-resolver https
```
