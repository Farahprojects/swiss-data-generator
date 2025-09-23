import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <img
      src="https://api.therai.co/storage/v1/object/public/therai-assets/Therailogoblack.png"
      alt="therai"
      className={`${sizeClasses[size]} object-contain ${className}`}
    />
  );
};

export { Logo };