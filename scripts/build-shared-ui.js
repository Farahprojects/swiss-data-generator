#!/usr/bin/env node

import { execSync } from 'child_process';
import { resolve } from 'path';

const sharedUIPath = resolve(process.cwd(), 'packages/shared-ui');

try {
  console.log('🔨 Building shared UI package...');
  execSync('npm run build', { 
    cwd: sharedUIPath, 
    stdio: 'inherit' 
  });
  console.log('✅ Shared UI package built successfully!');
} catch (error) {
  console.error('❌ Failed to build shared UI package:', error.message);
  process.exit(1);
}