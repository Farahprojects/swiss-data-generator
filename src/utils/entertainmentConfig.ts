import { EntertainmentConfig } from '@/components/ui/EntertainmentWindow';

// Predefined entertainment configurations
export const entertainmentConfigs = {
  // Text-based entertainment with typewriter effect
  textTypewriter: {
    type: 'text' as const,
    fallback: 'animation' as const,
    content: {
      animationType: 'typewriter',
      speed: 80,
      messages: [
        "✨ Analyzing your cosmic blueprint...",
        "🌟 Aligning with universal energies...",
        "🔮 Unveiling hidden patterns...",
        "💫 Connecting celestial influences...",
        "🌙 Interpreting lunar wisdom...",
        "☀️ Channeling solar power...",
        "🪐 Exploring planetary alignments...",
        "🌌 Discovering your soul's journey..."
      ]
    }
  },

  // Text-based with fade animations
  textFade: {
    type: 'text' as const,
    fallback: 'animation' as const,
    content: {
      animationType: 'fade',
      speed: 100,
      messages: [
        "🔍 Scanning celestial coordinates...",
        "📊 Processing astronomical data...",
        "🎯 Mapping your unique path...",
        "🌟 Revealing cosmic insights...",
        "🔮 Translating universal wisdom...",
        "💎 Crafting your personal guide..."
      ]
    }
  },

  // Video entertainment
  video: {
    type: 'video' as const,
    fallback: 'animation' as const,
    content: {
      videoSrc: 'https://auth.theraiastro.com/storage/v1/object/public/therai-assets/loading-video.mp4',
      autoPlay: true,
      showControls: true,
      fallbackToAnimation: true
    }
  },

  // Cosmic animation
  cosmicAnimation: {
    type: 'animation' as const,
    fallback: 'text' as const,
    content: {
      animationType: 'cosmic',
      speed: 1,
      colorScheme: 'cosmic'
    }
  },

  // Geometric animation
  geometricAnimation: {
    type: 'animation' as const,
    fallback: 'text' as const,
    content: {
      animationType: 'geometric',
      speed: 1.2,
      colorScheme: 'cool'
    }
  },

  // Interactive game
  interactive: {
    type: 'interactive' as const,
    fallback: 'animation' as const,
    content: {
      gameType: 'cosmic-collector',
      difficulty: 'easy'
    }
  },

  // Mixed experience - can be programmatically switched
  mixed: {
    type: 'text' as const,
    fallback: 'animation' as const,
    content: {
      animationType: 'typewriter',
      speed: 90,
      messages: [
        "🎭 Preparing your cosmic experience...",
        "🎨 Creating visual magic...",
        "🎵 Harmonizing universal frequencies...",
        "✨ Almost ready to reveal your insights..."
      ]
    }
  }
} as const;

// Get entertainment config based on preferences or defaults
export const getEntertainmentConfig = (
  type?: keyof typeof entertainmentConfigs,
  userPreferences?: {
    preferVideo?: boolean;
    preferInteractive?: boolean;
    fastConnection?: boolean;
    mobile?: boolean;
  }
): EntertainmentConfig => {
  // If a specific type is requested, return it
  if (type && entertainmentConfigs[type]) {
    return entertainmentConfigs[type];
  }

  // Smart selection based on user preferences and capabilities
  if (userPreferences) {
    const { preferVideo, preferInteractive, fastConnection, mobile } = userPreferences;

    // Interactive preference (desktop users mostly)
    if (preferInteractive && !mobile) {
      return entertainmentConfigs.interactive;
    }

    // Video preference with good connection
    if (preferVideo && fastConnection) {
      return entertainmentConfigs.video;
    }

    // Mobile users get lighter experiences
    if (mobile) {
      return entertainmentConfigs.textFade;
    }

    // Slow connection gets text-only
    if (!fastConnection) {
      return entertainmentConfigs.textTypewriter;
    }
  }

  // Default fallback
  return entertainmentConfigs.textTypewriter;
};

// Switch entertainment type dynamically during the wait period
export const createDynamicConfig = (timeRemaining: number): EntertainmentConfig => {
  // Start with video for first 10 seconds
  if (timeRemaining > 14) {
    return entertainmentConfigs.video;
  }
  
  // Switch to interactive for middle period
  if (timeRemaining > 8) {
    return entertainmentConfigs.interactive;
  }
  
  // End with animation for final countdown
  return entertainmentConfigs.cosmicAnimation;
};

// Get random entertainment type (for variety)
export const getRandomEntertainment = (): EntertainmentConfig => {
  const types = ['textTypewriter', 'video', 'cosmicAnimation', 'interactive'] as const;
  const randomType = types[Math.floor(Math.random() * types.length)];
  return entertainmentConfigs[randomType];
};