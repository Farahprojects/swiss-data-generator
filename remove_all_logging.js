#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files with logging calls to clean up
const filesToClean = [
  'src/components/settings/SettingsModal.tsx',
  'src/components/settings/account/EmailSettingsPanel.tsx',
  'src/components/settings/account/PasswordSettingsPanel.tsx',
  'src/components/settings/panels/NotificationsPanel.tsx',
  'src/components/website-builder/PublishingModal.tsx',
  'src/contexts/AuthContext.tsx',
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

function removeLogs(content) {
  // Remove multi-line logToSupabase calls
  content = content.replace(/\s*logToSupabase\([^)]*\{[^}]*\}\);?\s*/gs, '');
  
  // Remove single-line logToSupabase calls
  content = content.replace(/\s*logToSupabase\([^)]*\);\s*/g, '');
  
  // Clean up any remaining empty try-catch blocks or similar
  content = content.replace(/try\s*\{\s*\}\s*catch[^}]*\}/g, '');
  
  return content;
}

console.log('Starting to clean up logging calls...');

filesToClean.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      const originalLength = content.length;
      
      content = removeLogs(content);
      
      if (content.length !== originalLength) {
        fs.writeFileSync(file, content);
        console.log(`✓ Cleaned ${file} (removed ${originalLength - content.length} characters)`);
      } else {
        console.log(`- ${file} was already clean`);
      }
    } else {
      console.log(`✗ ${file} not found`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Cleanup complete!');