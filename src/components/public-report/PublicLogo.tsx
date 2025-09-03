import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type PublicLogoProps = {
  className?: string;
  linkClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  asLink?: boolean;
};

export const PublicLogo = ({ className, linkClassName, size = 'md', asLink = true }: PublicLogoProps) => {
  const homePath = '/';
  
  const sizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const logoSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const logoElement = (
    <div className={cn('flex items-center gap-2', className)}>
      <img 
        src="/favicon.png" 
        alt="TheRAI Logo" 
        className={cn('object-contain', logoSizeClasses[size])}
      />
      <span className={cn(
        'font-gt-sectra font-medium text-foreground tracking-tight',
        sizeClasses[size]
      )}>
        Therai.
      </span>
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