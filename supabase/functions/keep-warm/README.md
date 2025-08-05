# Keep Warm Service

## Overview
The keep-warm service pings all critical edge functions every 30 seconds to keep them warm and reduce cold start latency.

## Edge Functions Kept Warm
- `translator-edge` - Swiss data processing
- `standard-report` - AI report generation
- `standard-report-one` - AI report generation
- `standard-report-two` - AI report generation
- `validate-promo-code` - Promo code validation
- `verify-guest-payment` - Payment verification
- `initiate-report-flow` - Report flow initiation
- `get-report-data` - Report data retrieval

## Usage

### Manual Trigger
```bash
curl -X POST https://wrvqqvqvwqmfdqvqmaar.functions.supabase.co/keep-warm
```

### Automated Service
```bash
npm run keep-warm
```

### Environment Variables
- `KEEP_WARM_URL` - Override the keep-warm service URL (optional)

## Response Format
```json
{
  "success": true,
  "message": "Warm ping completed",
  "summary": {
    "total": 8,
    "successful": 8,
    "failed": 0,
    "results": {
      "translator-edge": { "success": true, "duration": 150 },
      "standard-report": { "success": true, "duration": 120 },
      // ... other functions
    }
  },
  "totalDuration": 500,
  "timestamp": "2025-01-05T12:00:00.000Z"
}
```

## Adding New Functions
To add a new edge function to the warm list, edit `supabase/functions/keep-warm/index.ts` and add the function name to the `EDGE_FUNCTIONS` array:

```typescript
const EDGE_FUNCTIONS = [
  "translator-edge",
  "standard-report",
  // ... existing functions
  "your-new-function", // Add here
];
```

## Monitoring
The service logs:
- ✅ Successful pings with duration
- ❌ Failed pings with error details
- 📊 Summary statistics
- ⏰ Next ping timing

## Benefits
- **Reduced cold starts** - Functions stay warm in memory
- **Faster response times** - No initialization delay
- **Better user experience** - Consistent performance
- **Modular design** - Easy to add/remove functions 