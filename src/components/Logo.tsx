
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  linkClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
};

const Logo = ({ className, linkClassName, size = 'md', asLink = true }: LogoProps) => {
  const { user } = useAuth();
  const homePath = user ? '/dashboard' : '/';
  
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-10',
  };

  const logoElement = (
    <div className={cn('flex items-center', className)}>
      <img 
        src="/lovable-uploads/199b30cd-9776-433c-bd35-ba9230edd913.png"
        alt="Therai"
        className={cn('object-contain', sizeClasses[size])}
      />
    </div>
  );

  if (asLink) {
    return (
      <Link to={homePath} className={cn('flex items-center', linkClassName)}>
        {logoElement}
      </Link>
    );
  }
  
  return logoElement;
};

export default Logo;
