
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
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const logoElement = (
    <div className={cn('flex items-baseline', className)}>
      <span 
        className={cn(
          'font-gt-sectra font-medium tracking-tight text-black', 
          sizeClasses[size]
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        Therai
      </span>
      <span 
        className={cn(
          'font-sans font-medium text-[#7B61FF] ml-[0.15em]', 
          sizeClasses[size]
        )}
      >
        api
      </span>
    </div>
  );

  if (asLink) {
    return (
      <Link to={homePath} className={cn('flex items-baseline', linkClassName)}>
        {logoElement}
      </Link>
    );
  }
  
  return logoElement;
};

export default Logo;
