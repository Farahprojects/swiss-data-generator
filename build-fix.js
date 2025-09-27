#!/usr/bin/env node

// Build the shared UI package first
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sharedUIPath = resolve(__dirname, 'packages/shared-ui');

try {
  console.log('🔨 Building shared UI package...');
  
  // Install dependencies first
  console.log('📦 Installing shared UI dependencies...');
  execSync('npm install', { 
    cwd: sharedUIPath, 
    stdio: 'inherit' 
  });
  
  // Build the package
  console.log('🏗️ Building shared UI...');
  execSync('npm run build', { 
    cwd: sharedUIPath, 
    stdio: 'inherit' 
  });
  
  console.log('✅ Shared UI package built successfully!');
  console.log('📁 Dist directory should now exist');
  
} catch (error) {
  console.error('❌ Failed to build shared UI package:', error.message);
  process.exit(1);
}