// src/utils/voiceUtils.ts

export const GOOGLE_VOICE_MAP: Record<string, string> = {
  // Female HD Voices
  'alloy':   'en-US-Neural2-A',
  'echo':    'en-US-Neural2-C',
  'fable':   'en-US-Wavenet-B',
  'onyx':    'en-US-Wavenet-D',
  'nova':    'en-US-Wavenet-F',
  'shimmer': 'en-US-Wavenet-H',
  
  // Google Studio HD Voices (from UI dropdown)
  'en-us-studio-o': 'en-US-Studio-O', // Female
  'en-us-studio-q': 'en-US-Studio-Q', // Female
  'en-us-studio-m': 'en-US-Studio-M', // Male
};

export const getGoogleVoiceCode = (voiceName: string): string => {
  const lowerVoiceName = voiceName.toLowerCase();
  const mappedVoice = GOOGLE_VOICE_MAP[lowerVoiceName];
  const finalVoice = mappedVoice || 'en-US-Studio-O'; // Default to Studio-O (Female)

  return finalVoice;
};
