import { useState, useEffect } from 'react';

export const useAstrologyFacts = (): string => {
  const [currentFact, setCurrentFact] = useState<string>('');

  useEffect(() => {
    // Stub implementation - replace with your actual astrology facts logic
    const facts = [
      'The moon influences emotions and intuition',
      'Mercury rules communication and thought',
      'Venus governs love and beauty'
    ];
    setCurrentFact(facts[Math.floor(Math.random() * facts.length)]);
  }, []);

  return currentFact;
};
