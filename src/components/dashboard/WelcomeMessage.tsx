
import { useAuth } from "@/contexts/AuthContext";

export const WelcomeMessage = () => {
  const { user } = useAuth();
  
  const getCurrentTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return now.toLocaleDateString('en-US', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-100 p-6 mb-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-gray-900">
        {getGreeting()}, {user?.email?.split('@')[0] || 'Coach'}!
      </h1>
      <p className="text-gray-600 mt-1">{getCurrentTime()}</p>
      <p className="text-gray-700 mt-2">Ready to help your clients today?</p>
    </div>
  );
};
