const fs = require('fs');
const path = require('path');

// List of all files that need to have logToSupabase calls removed
const filesToProcess = [
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

function removeLogToSupabaseCalls(content) {
  // Remove logToSupabase function calls - handle both single and multi-line calls
  const logCallRegex = /logToSupabase\s*\([^)]*\)\s*;?/gs;
  
  // Also handle cases where logToSupabase is called without semicolon
  content = content.replace(logCallRegex, '');
  
  // Remove any remaining empty lines that might have been left
  content = content.replace(/^\s*$/gm, '').replace(/\n\n\n+/g, '\n\n');
  
  return content;
}

// Process each file
filesToProcess.forEach(filePath => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const updatedContent = removeLogToSupabaseCalls(content);
      fs.writeFileSync(filePath, updatedContent);
      console.log(`✓ Processed ${filePath}`);
    } else {
      console.log(`⚠ File not found: ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
  }
});

console.log('Completed removing all logToSupabase calls');