#!/bin/bash

# Update all standard report engines to include metadata collection

echo "Updating standard report engines with metadata collection..."

# Function to update a report engine
update_report_engine() {
    local file=$1
    local engine_name=$2
    
    echo "Updating $file..."
    
    # Update generateReport function signature
    sed -i '' 's/async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<string> {/async function generateReport(systemPrompt: string, reportData: any, requestId: string): Promise<{ report: string; metadata: any }> {/' "$file"
    
    # Add startTime variable
    sed -i '' 's/const logPrefix = `\[standard-report\]\[${requestId}\]`;/const logPrefix = `\[standard-report\]\[${requestId}\]`;\n  const startTime = Date.now();/' "$file"
    
    # Update return statement to include metadata
    sed -i '' 's/const generatedText = data.choices\[0\].message.content;/const generatedText = data.choices[0].message.content;\n    \n    \/\/ Collect metadata\n    const metadata = {\n      duration_ms: Date.now() - startTime,\n      token_count: data.usage?.total_tokens || 0,\n      prompt_tokens: data.usage?.prompt_tokens || 0,\n      completion_tokens: data.usage?.completion_tokens || 0,\n      model: OPENAI_MODEL,\n      temperature: 0.2,\n      max_tokens: 8192\n    };\n    \n    console.log(`${logPrefix} AI Generation Metadata:`, metadata);\n    return { report: generatedText, metadata };/' "$file"
    
    # Update main function to handle new return format
    sed -i '' 's/const report = await generateReport(systemPrompt, reportData, requestId);/const { report, metadata } = await generateReport(systemPrompt, reportData, requestId);/' "$file"
    
    # Add metadata to report_logs insert
    sed -i '' 's/engine_used: selectedEngine,/engine_used: selectedEngine,\n        metadata: metadata,/' "$file"
    
    echo "✅ Updated $file"
}

# Update all standard report engines
update_report_engine "supabase/functions/standard-report-one/index.ts" "standard-report-one"
update_report_engine "supabase/functions/standard-report-two/index.ts" "standard-report-two" 
update_report_engine "supabase/functions/standard-report-three/index.ts" "standard-report-three"

echo "✅ All standard report engines updated with metadata collection!" 