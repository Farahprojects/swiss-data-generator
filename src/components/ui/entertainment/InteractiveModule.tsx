import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Star, Heart, Sparkles, Moon, Sun, Zap } from 'lucide-react';

interface InteractiveModuleProps {
  timeRemaining: number;
  onError?: () => void;
  config?: {
    gameType?: 'cosmic-collector' | 'energy-matcher' | 'constellation';
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

export const InteractiveModule: React.FC<InteractiveModuleProps> = ({
  timeRemaining,
  onError,
  config = {}
}) => {
  const { gameType = 'cosmic-collector', difficulty = 'easy' } = config;
  
  const [score, setScore] = useState(0);
  const [gameActive, setGameActive] = useState(false);
  const [collectibles, setCollectibles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    type: 'star' | 'moon' | 'heart' | 'spark';
    collected: boolean;
  }>>([]);

  const icons = {
    star: Star,
    moon: Moon,
    heart: Heart,
    spark: Sparkles
  };

  const colors = {
    star: 'text-yellow-400',
    moon: 'text-blue-400',
    heart: 'text-pink-400',
    spark: 'text-purple-400'
  };

  // Generate collectibles
  const generateCollectibles = () => {
    const types: Array<'star' | 'moon' | 'heart' | 'spark'> = ['star', 'moon', 'heart', 'spark'];
    const newCollectibles = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 280 + 10, // Keep within bounds
      y: Math.random() * 200 + 10,
      type: types[Math.floor(Math.random() * types.length)],
      collected: false
    }));
    setCollectibles(newCollectibles);
  };

  // Start game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    generateCollectibles();
  };

  // Collect item
  const collectItem = (id: number) => {
    if (!gameActive) return;
    
    setCollectibles(prev => 
      prev.map(item => 
        item.id === id ? { ...item, collected: true } : item
      )
    );
    setScore(prev => prev + 10);
  };

  // Auto-start game when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      startGame();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Regenerate collectibles periodically
  useEffect(() => {
    if (!gameActive) return;
    
    const interval = setInterval(() => {
      const allCollected = collectibles.every(item => item.collected);
      if (allCollected) {
        generateCollectibles();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive, collectibles]);

  const renderCosmicCollector = () => (
    <div className="w-full space-y-4">
      {/* Game Title & Score */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-light text-foreground">Cosmic Collector</h3>
        <div className="text-sm text-muted-foreground">
          Tap the cosmic elements to collect them!
        </div>
        <div className="text-xl font-medium text-primary">Score: {score}</div>
      </div>

      {/* Game Area */}
      <div className="relative w-full h-64 bg-gradient-to-br from-muted/20 to-muted/40 rounded-xl border border-muted overflow-hidden">
        {/* Background stars */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-primary/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        {/* Collectible Items */}
        {collectibles.map((item) => {
          const IconComponent = icons[item.type];
          
          return (
            <motion.button
              key={item.id}
              className={`absolute ${colors[item.type]} ${item.collected ? 'pointer-events-none' : ''}`}
              style={{
                left: item.x,
                top: item.y,
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: item.collected ? 0 : 1,
                opacity: item.collected ? 0 : 1,
                rotate: item.collected ? 360 : 0
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
              transition={{ 
                duration: 0.3,
                type: "spring",
                stiffness: 400
              }}
              onClick={() => collectItem(item.id)}
            >
              <IconComponent className="h-8 w-8" />
            </motion.button>
          );
        })}

        {/* Collect effect */}
        {collectibles.some(item => item.collected) && (
          <motion.div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.6 }}
          >
            <Sparkles className="h-12 w-12 text-primary" />
          </motion.div>
        )}
      </div>

      {/* Game Controls */}
      <div className="text-center space-y-2">
        {!gameActive && (
          <Button 
            onClick={startGame}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Start Collecting
          </Button>
        )}
        
        <div className="text-xs text-muted-foreground">
          {timeRemaining > 10 ? 
            "Keep collecting while we prepare your report!" : 
            "Almost done with your report!"}
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {renderCosmicCollector()}
    </motion.div>
  );
};