#!/bin/bash

# Fix syntax errors in all standard report engines

echo "Fixing syntax errors in standard report engines..."

# Function to fix a report engine
fix_syntax_errors() {
    local file=$1
    local engine_name=$2
    
    echo "Fixing $file..."
    
    # Remove empty lines in metadata object
    sed -i '' '/^      $/d' "$file"
    
    # Remove trailing commas in metadata object
    sed -i '' 's/model: OPENAI_MODEL,/model: OPENAI_MODEL/' "$file"
    
    # Remove duplicate return statements
    sed -i '' '/console.log.*Successfully generated report from OpenAI/d' "$file"
    sed -i '' '/return generatedText;/d' "$file"
    
    echo "✅ Fixed $file"
}

# Fix all standard report engines
fix_syntax_errors "supabase/functions/standard-report-one/index.ts" "standard-report-one"
fix_syntax_errors "supabase/functions/standard-report-two/index.ts" "standard-report-two" 
fix_syntax_errors "supabase/functions/standard-report-three/index.ts" "standard-report-three"

echo "✅ All syntax errors fixed!" 