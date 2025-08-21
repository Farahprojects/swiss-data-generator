// src/utils/voiceUtils.ts

export const GOOGLE_VOICE_MAP: Record<string, string> = {
  'alloy': 'en-US-Neural2-A',
  'echo': 'en-US-Neural2-C',
  'fable': 'en-US-Wavenet-B',
  'onyx': 'en-US-Wavenet-D',
  'nova': 'en-US-Wavenet-F',
  'shimmer': 'en-US-Wavenet-H',
};

export const getGoogleVoiceCode = (voiceName: string): string => {
  return GOOGLE_VOICE_MAP[voiceName.toLowerCase()] || 'en-US-Neural2-F'; // Default to a high-quality voice
};
