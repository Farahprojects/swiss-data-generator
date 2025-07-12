#!/bin/bash

# Script to clean up remaining logging imports and calls
echo "Cleaning up remaining logging imports and calls..."

# Files to clean up
files=(
  "src/components/settings/SettingsModal.tsx"
  "src/components/settings/account/EmailSettingsPanel.tsx"
  "src/components/settings/account/PasswordSettingsPanel.tsx"
  "src/components/settings/panels/NotificationsPanel.tsx"
  "src/components/ui/InlineToast.tsx"
  "src/components/website-builder/PublishingModal.tsx"
  "src/contexts/AuthContext.tsx"
  "src/contexts/NavigationStateContext.tsx"
  "src/hooks/useAuthGuard.ts"
  "src/hooks/useEmailChange.ts"
  "src/hooks/usePasswordManagement.ts"
  "src/hooks/useUserPreferences.ts"
  "src/pages/Contact.tsx"
  "src/pages/Legal.tsx"
  "src/pages/Login.tsx"
  "src/pages/NotFound.tsx"
  "src/pages/Signup.tsx"
  "src/pages/auth/ConfirmEmail.tsx"
  "src/pages/auth/Password.tsx"
  "src/pages/dashboard/WebsiteBuilder.tsx"
  "src/services/authService.ts"
  "src/services/clients.ts"
  "src/utils/notificationService.ts"
  "src/utils/supabaseWithAuth.ts"
)

# Remove the import lines for batchedLogManager
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Remove the import line
    sed -i '/import.*logToSupabase.*@\/utils\/batchedLogManager/d' "$file"
    sed -i '/import.*batchedLogManager.*@\/utils\/batchedLogManager/d' "$file"
    sed -i '/import.*useBatchedLogging.*@\/hooks\/use-batched-logging/d' "$file"
    echo "Cleaned: $file"
  fi
done

echo "Import cleanup complete!"