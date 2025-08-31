
import { Routes, Route } from "react-router-dom";
import Chat from "@/pages/Chat";

const GuestAppShell = () => {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </div>
  );
};

export default GuestAppShell;
