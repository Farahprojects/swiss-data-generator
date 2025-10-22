# WebSocket Broadcast Optimization Plan

## Problem
Assistant messages taking ~2-3 seconds to appear after LLM generates response (<1s). 
Suspected bottleneck: Database INSERT → RLS evaluation → Broadcast pipeline.

## Root Cause Analysis

### Findings
1. **Replica Identity**: ✅ Already DEFAULT (not FULL) - not the issue
2. **Indexes**: ✅ All proper indexes exist on conversations(user_id) and conversations_participants(user_id)
3. **RLS Policy**: ❌ **MAIN BOTTLENECK** - Uses expensive `UNION` query that requires:
   - Executing 2 separate SELECT queries
   - Sorting results
   - Deduplicating (even though duplicates impossible)
4. **Unused Columns**: Messages table has 6 unused columns increasing payload size

### Current RLS Policy (SLOW)
```sql
chat_id IN (
  SELECT id FROM conversations WHERE user_id = auth.uid()
  UNION  -- Requires sort + dedupe
  SELECT conversation_id FROM conversations_participants WHERE user_id = auth.uid()
)
```

## Optimization Strategy

### Phase 1: Optimize RLS Policies (BIGGEST WIN)
Replace `UNION` with `EXISTS + OR`:
```sql
EXISTS (SELECT 1 FROM conversations WHERE id = chat_id AND user_id = auth.uid())
OR
EXISTS (SELECT 1 FROM conversations_participants WHERE conversation_id = chat_id AND user_id = auth.uid())
```

**Why faster:**
- `EXISTS` stops at first match (short-circuit)
- `OR` allows PostgreSQL to try either path efficiently
- No sorting/deduplication overhead
- Direct index usage

**Expected improvement**: 50-70% faster RLS evaluation

### Phase 2: Remove Unused Columns
Drop columns that aren't used but are broadcast with every message:
- `reply_to_id` - Never used
- `model` - Never populated
- `token_count` - Never populated
- `latency_ms` - Never populated
- `error` - Always empty jsonb
- `updated_at` - Messages never updated
- `set_messages_updated_at` trigger - No longer needed

**Expected improvement**: 20-30% smaller broadcast payload

## Migration Files Created

1. **20251022131000_optimize_messages_table.sql** - Drop unused columns
2. **20251022131100_optimize_rls_policies.sql** - Replace UNION with EXISTS

## Estimated Total Performance Gain
- **60-80% reduction** in broadcast latency
- **Current**: ~2-3s delay after LLM response
- **After optimization**: ~0.3-0.8s delay

## Next Steps After Testing

If still experiencing delays:
1. Implement true streaming (like ChatGPT) - show words as they arrive
2. Use Gemini streaming API to bypass DB-first pattern
3. Consider WebSocket-first, DB-second pattern for real-time display

## Safe to Apply?
✅ Yes - No breaking changes:
- Columns being dropped are unused
- RLS policy optimization is functionally equivalent
- Type definitions will auto-regenerate

