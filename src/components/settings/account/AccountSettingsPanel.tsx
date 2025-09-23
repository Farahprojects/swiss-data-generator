
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { EmailSettingsPanel } from "./EmailSettingsPanel"; // Removed - no longer needed
import { PasswordSettingsPanel } from "./PasswordSettingsPanel";

export const AccountSettingsPanel = () => {
  const { message } = useToast();

  // Function to render inline toast message
  const renderInlineMessage = () => {
    if (!message) return null;
    
    return (
      <Alert 
        className={`mb-4 ${
          message.variant === "destructive" ? "bg-red-50 text-red-800 border border-red-200" : "bg-green-50 text-green-800 border border-green-200"
        }`}
      >
        <AlertCircle className={`h-4 w-4 ${message.variant === "destructive" ? "text-red-600" : "text-green-600"}`} />
        <AlertDescription>
          {message.title && <p className="font-medium">{message.title}</p>}
          {message.description && <p>{message.description}</p>}
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6">Account Settings</h2>
      
      {message && renderInlineMessage()}
      
      {/* Email Settings Panel - Removed - no longer needed for signed user email changes */}
      
      <div>
        <PasswordSettingsPanel />
      </div>
    </div>
  );
};

export default AccountSettingsPanel;
