const fs = require('fs');
const { execSync } = require('child_process');

// Get all files with logToSupabase
const command = 'find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "logToSupabase" 2>/dev/null || true';
const files = execSync(command).toString().trim().split('\n').filter(f => f.length > 0);

console.log(`Found ${files.length} files with logToSupabase calls`);

files.forEach(filePath => {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove ALL logToSupabase calls completely
  // This regex matches logToSupabase followed by parentheses and everything until the closing semicolon
  content = content.replace(/\s*logToSupabase\s*\([^;]*\}\s*\)\s*;?\s*/gs, '');
  content = content.replace(/\s*logToSupabase\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Clean up multiple empty lines
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  fs.writeFileSync(filePath, content);
  console.log(`✓ Cleaned ${filePath}`);
});

console.log('All logToSupabase calls removed!');