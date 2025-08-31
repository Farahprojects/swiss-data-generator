
import { Routes, Route } from "react-router-dom";
import { VerificationStatus } from "@/components/profile/VerificationStatus";
import Chat from "@/pages/Chat";
import UserSettings from "@/pages/UserSettings";
import AuthEmailHandler from "@/pages/auth/EmailHandler";
import PasswordResetHandler from "@/pages/auth/PasswordResetHandler";

const AuthedAppShell = () => {
  return (
    <div className="min-h-screen bg-background">
      <VerificationStatus />
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/settings" element={<UserSettings />} />
        <Route path="/auth/email" element={<AuthEmailHandler />} />
        <Route path="/auth/password" element={<PasswordResetHandler />} />
      </Routes>
    </div>
  );
};

export default AuthedAppShell;
