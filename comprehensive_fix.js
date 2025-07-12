// This is a comprehensive cleanup script to fix all remaining logToSupabase calls
const fs = require('fs');
const path = require('path');

// Files that need both stubs and cleanup
const filesToFix = [
  'src/components/settings/SettingsModal.tsx',
  'src/components/settings/account/EmailSettingsPanel.tsx',
  'src/components/settings/account/PasswordSettingsPanel.tsx',
  'src/components/settings/panels/NotificationsPanel.tsx',
  'src/components/website-builder/PublishingModal.tsx',
  'src/contexts/NavigationStateContext.tsx',
  'src/hooks/useAuthGuard.ts',
  'src/hooks/useEmailChange.ts',
  'src/hooks/usePasswordManagement.ts',
  'src/hooks/useUserPreferences.ts',
  'src/pages/Contact.tsx',
  'src/pages/Legal.tsx',
  'src/pages/Login.tsx',
  'src/pages/NotFound.tsx',
  'src/pages/Signup.tsx',
  'src/pages/auth/ConfirmEmail.tsx',
  'src/pages/auth/Password.tsx',
  'src/pages/dashboard/WebsiteBuilder.tsx',
  'src/services/authService.ts',
  'src/services/clients.ts',
  'src/utils/notificationService.ts',
  'src/utils/supabaseWithAuth.ts'
];

function addStubAndCleanup(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has logToSupabase calls
  if (!content.includes('logToSupabase(')) {
    console.log(`No logToSupabase calls in ${filePath}`);
    return;
  }

  // Add stub at the top
  if (!content.includes('const logToSupabase = () => {};')) {
    content = 'const logToSupabase = () => {};\n' + content;
  }

  // Remove all logToSupabase calls
  // Remove multi-line calls with objects
  content = content.replace(/\s*logToSupabase\s*\([^)]*\{[\s\S]*?\}\s*\)\s*;?\s*/g, '');
  
  // Remove single-line calls  
  content = content.replace(/\s*logToSupabase\s*\([^)]*\)\s*;?\s*/g, '');

  // Clean up extra whitespace
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  fs.writeFileSync(filePath, content);
  console.log(`Fixed: ${filePath}`);
}

// Fix all files
filesToFix.forEach(addStubAndCleanup);

console.log('All files processed!');