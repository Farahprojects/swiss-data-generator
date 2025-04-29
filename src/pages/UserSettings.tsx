
import { UserSettingsLayout } from "@/components/settings/UserSettingsLayout";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeaderNavigation from "@/components/HeaderNavigation";

const UserSettings = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <HeaderNavigation />
      
      <main className="flex-grow bg-gray-50">
        <UserSettingsLayout />
      </main>
      
      <Footer />
    </div>
  );
};

export default UserSettings;
