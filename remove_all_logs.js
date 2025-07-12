const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First, find all files containing logToSupabase
const findCommand = `find src -type f \\( -name "*.tsx" -o -name "*.ts" \\) -exec grep -l "logToSupabase" {} \\;`;

try {
  const files = execSync(findCommand).toString().trim().split('\n').filter(f => f);
  
  files.forEach(filePath => {
    console.log(`Processing: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove all logToSupabase calls - handle multiline cases too
    content = content.replace(/logToSupabase\s*\([^}]*\}\s*\)\s*;?\s*/gs, '');
    content = content.replace(/logToSupabase\s*\([^)]*\)\s*;?\s*/g, '');
    
    // Clean up empty lines
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Cleaned ${filePath}`);
  });
  
  console.log(`\nCompleted! Processed ${files.length} files.`);
  
} catch (error) {
  console.error('Error:', error.message);
}