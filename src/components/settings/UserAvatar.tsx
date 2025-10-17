
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export const UserAvatar = ({ size = "default" }: { size?: "xs" | "sm" | "default" | "lg" }) => {
  const { user } = useAuth();
  
  const getInitial = () => {
    if (!user?.email) return "?";
    return user.email.charAt(0).toUpperCase();
  };
  
  const sizeClasses = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    default: "h-12 w-12 text-lg",
    lg: "h-16 w-16 text-2xl"
  };
  
  return (
    <Avatar className={sizeClasses[size]}>
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitial()}
      </AvatarFallback>
    </Avatar>
  );
};
