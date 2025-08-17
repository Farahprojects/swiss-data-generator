import React from 'react';
import './typewriter.css';

interface TypewriterTextProps {
  text: string;
  msPerChar?: number;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({ text, msPerChar = 40 }) => {
  if (!text || text.length === 0) return null;
  
  const duration = (text.length * msPerChar) / 1000;
  
  return (
    <span
      className="typewriter"
      style={{
        animation: `type-reveal ${duration}s steps(${text.length}) 1 forwards`
      }}
    >
      {text}
    </span>
  );
};
