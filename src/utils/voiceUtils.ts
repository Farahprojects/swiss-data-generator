// src/utils/voiceUtils.ts

export const GOOGLE_VOICE_MAP: Record<string, string> = {
  // Female HD Voices
  'alloy':   'en-US-Neural2-A',
  'echo':    'en-US-Neural2-C',
  'fable':   'en-US-Wavenet-B',
  'onyx':    'en-US-Wavenet-D',
  'nova':    'en-US-Wavenet-F',
  'shimmer': 'en-US-Wavenet-H',
  
  // Male HD Voices
  'en-us-studio-m': 'en-US-Studio-M',
};

export const getGoogleVoiceCode = (voiceName: string): string => {
  return GOOGLE_VOICE_MAP[voiceName.toLowerCase()] || 'en-US-Neural2-F'; // Default to a high-quality female voice
};
