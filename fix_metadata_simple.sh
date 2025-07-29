#!/bin/bash

# Fix all standard report engines to collect only AI metadata (no overcomplication)

echo "Fixing standard report engines to collect only AI metadata..."

# Function to fix a report engine
fix_report_engine() {
    local file=$1
    local engine_name=$2
    
    echo "Fixing $file..."
    
    # Remove startTime variable
    sed -i '' '/const startTime = Date.now();/d' "$file"
    
    # Replace metadata collection with simple AI metadata only
    sed -i '' 's/\/\/ Collect metadata/\/\/ Collect AI metadata only/' "$file"
    sed -i '' 's/duration_ms: Date.now() - startTime,//' "$file"
    sed -i '' 's/temperature: 0.2,//' "$file"
    sed -i '' 's/max_tokens: 8192//' "$file"
    
    echo "✅ Fixed $file"
}

# Fix all standard report engines
fix_report_engine "supabase/functions/standard-report/index.ts" "standard-report"
fix_report_engine "supabase/functions/standard-report-one/index.ts" "standard-report-one"
fix_report_engine "supabase/functions/standard-report-two/index.ts" "standard-report-two" 
fix_report_engine "supabase/functions/standard-report-three/index.ts" "standard-report-three"

echo "✅ All standard report engines fixed with simple AI metadata collection!" 