# Migration Cleanup

## Overview
This directory has been cleaned up to remove all the old, redundant migrations and consolidate them into a single, comprehensive migration file.

## What was done:
1. **Backed up** all original migrations to `../migrations_backup/`
2. **Removed** all old migration files (73 files)
3. **Created** a single consolidated migration: `20250101000000-consolidated-schema.sql`

## The consolidated migration includes:
- All core table structures (guest_reports, report_logs, translator_logs, etc.)
- All necessary indexes for performance
- Essential triggers and functions
- Row Level Security policies
- Replica identity settings for realtime

## Benefits:
- **No more confusion** about which migrations are active
- **Clean slate** for future migrations
- **Single source of truth** for the current schema
- **Easier to understand** the database structure

## If you need to restore:
All original migrations are backed up in `../migrations_backup/` directory.

## Next steps:
When you need to make schema changes, create new migrations with descriptive names like:
- `20250101000001-add-new-feature.sql`
- `20250101000002-modify-existing-table.sql` 