#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all TypeScript and TypeScript React files
function getAllTsFiles(dir) {
  const files = [];
  
  function walk(currentPath) {
    const items = fs.readdirSync(currentPath);
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

function removeLogToSupabaseCalls(content) {
  // Remove multi-line logToSupabase calls (with object parameter)
  content = content.replace(/\s*logToSupabase\s*\([^)]*\{[^}]*\}\s*\)\s*;?\s*/gs, '');
  
  // Remove single-line logToSupabase calls
  content = content.replace(/\s*logToSupabase\s*\([^)]*\)\s*;?\s*/g, '');
  
  // Clean up any leftover empty lines or whitespace issues
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  return content;
}

const srcFiles = getAllTsFiles('src');
let totalFilesModified = 0;
let totalCallsRemoved = 0;

console.log(`Found ${srcFiles.length} TypeScript files to check...`);

srcFiles.forEach(file => {
  try {
    const originalContent = fs.readFileSync(file, 'utf8');
    
    // Count original logToSupabase calls
    const originalCalls = (originalContent.match(/logToSupabase\s*\(/g) || []).length;
    
    if (originalCalls > 0) {
      const newContent = removeLogToSupabaseCalls(originalContent);
      const newCalls = (newContent.match(/logToSupabase\s*\(/g) || []).length;
      
      if (originalCalls !== newCalls) {
        fs.writeFileSync(file, newContent);
        const removed = originalCalls - newCalls;
        console.log(`✓ ${file}: Removed ${removed} logToSupabase calls`);
        totalFilesModified++;
        totalCallsRemoved += removed;
      }
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log(`\nCleanup complete!`);
console.log(`Modified ${totalFilesModified} files`);
console.log(`Removed ${totalCallsRemoved} total logToSupabase calls`);

// Clean up temporary files
const tempFiles = [
  'cleanup_logging.txt',
  'cleanup_remaining_logs.sh',
  'global_fix_logging.js',
  'remove_all_logging.js'
];

tempFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`Removed temp file: ${file}`);
  }
});