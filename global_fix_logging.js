const fs = require('fs');

const files = [
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

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if logToSupabase is used
    if (content.includes('logToSupabase(')) {
      // Add import at the top
      if (!content.includes('import { logToSupabase } from')) {
        const firstImport = content.indexOf('import');
        if (firstImport !== -1) {
          content = content.slice(0, firstImport) + 
            "import { logToSupabase } from '@/utils/emptyLogger';\n" + 
            content.slice(firstImport);
        }
      }
      
      // Remove all logToSupabase calls completely
      content = content.replace(/\s*logToSupabase\([^)]*\{[^}]*\}\s*\);\s*/gs, '');
      content = content.replace(/\s*logToSupabase\([^)]*\);\s*/g, '');
      
      fs.writeFileSync(file, content);
      console.log(`Fixed ${file}`);
    }
  }
});

console.log('All files fixed');