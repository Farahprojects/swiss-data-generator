import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type EntertainmentMode = 'text' | 'video' | 'image';

interface EntertainmentWindowProps {
  mode?: EntertainmentMode;
  countdown?: number;
  className?: string;
}

// Text animation content
const TEXT_CONTENT = [
  "Your cosmic blueprint is being carefully analyzed...",
  "Mapping the celestial influences at your birth...",
  "Decoding planetary patterns and aspects...",
  "Revealing your unique astrological signature...",
  "Connecting the stars to your personal journey...",
  "Unveiling the wisdom written in the cosmos...",
  "Your personalized report is almost ready..."
];

// Text Animation Component
const TextAnimation: React.FC<{ countdown: number }> = ({ countdown }) => {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (currentTextIndex >= TEXT_CONTENT.length) return;

    const currentText = TEXT_CONTENT[currentTextIndex];
    
    if (isTyping) {
      // Typing effect
      if (displayedText.length < currentText.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentText.slice(0, displayedText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, wait before next text
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 1500);
        return () => clearTimeout(timeout);
      }
    } else {
      // Fade out and move to next text
      const timeout = setTimeout(() => {
        setDisplayedText('');
        setCurrentTextIndex((prev) => (prev + 1) % TEXT_CONTENT.length);
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, currentTextIndex, isTyping]);

  return (
    <div className="min-h-[120px] flex items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={currentTextIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className="text-lg font-light text-gray-700 text-center italic leading-relaxed"
        >
          {displayedText}
          {isTyping && displayedText.length < TEXT_CONTENT[currentTextIndex].length && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="ml-1"
            >
              |
            </motion.span>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

// Video Component
const VideoComponent: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (isPlaying) {
      vid.pause();
    } else {
      vid.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl bg-gray-100">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        loop
        muted={isMuted}
        playsInline
        preload="auto"
        controls={false}
      >
        <source src="https://placeholder-video-url.mp4" type="video/mp4" />
      </video>
      
      <div className="absolute bottom-3 right-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={togglePlay}
          className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={toggleMute}
          className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>
      
      {/* Placeholder overlay for demo */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-200/30 to-gray-300/30 flex items-center justify-center">
        <p className="text-gray-600 font-light text-center">
          Video Content<br />
          <span className="text-sm opacity-70">Coming Soon</span>
        </p>
      </div>
    </div>
  );
};

// Image Component
const ImageComponent: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Placeholder images - these would be real astronomy/astrology images
  const images = [
    "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop",
    "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&h=300&fit=crop"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-48 overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentImageIndex}
          src={images[currentImageIndex]}
          alt="Astronomy imagery"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>
      
      {/* Image indicators */}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentImageIndex ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

const EntertainmentWindow: React.FC<EntertainmentWindowProps> = ({ 
  mode = 'text', 
  countdown = 0,
  className = "" 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="border-2 border-gray-200 shadow-lg">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Content based on mode */}
            {mode === 'text' && <TextAnimation countdown={countdown} />}
            {mode === 'video' && <VideoComponent />}
            {mode === 'image' && <ImageComponent />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default EntertainmentWindow;