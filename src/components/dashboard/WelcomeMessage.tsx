
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
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 border border-primary/20">
      <h1 className="text-2xl font-semibold text-foreground">
        {getGreeting()}, {user?.email?.split('@')[0] || 'Coach'}!
      </h1>
      <p className="text-muted-foreground mt-1">{getCurrentTime()}</p>
      <p className="text-foreground/80 mt-2">Ready to help your clients today?</p>
    </div>
  );
};
