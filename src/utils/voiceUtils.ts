// src/utils/voiceUtils.ts

export const GOOGLE_VOICE_MAP: Record<string, string> = {
  // Google Studio HD Voices - Friendly names to Google codes
  'Aria': 'en-US-Studio-O',      // Female
  'Bella': 'en-US-Studio-Q',     // Female  
  'Charlie': 'en-US-Studio-M',   // Male
  'Puck': 'en-US-Studio-P',      // Male
  'Duke': 'en-US-Studio-R',      // Male
  'Echo': 'en-US-Studio-S',      // Female
  'Fable': 'en-US-Studio-T',     // Male
  'Grace': 'en-US-Studio-U',     // Female
  'Hawk': 'en-US-Studio-V',      // Male
  'Iris': 'en-US-Studio-W',      // Female
  'Jade': 'en-US-Studio-X',      // Female
  'Kai': 'en-US-Studio-Y',       // Male
  'Luna': 'en-US-Studio-Z',      // Female
};

export const getGoogleVoiceCode = (voiceName: string): string => {
  // The bug was here: .toLowerCase() was used when the map keys are capitalized.
  // By using voiceName directly, we ensure a correct lookup.
  const mappedVoice = GOOGLE_VOICE_MAP[voiceName];
  const finalVoice = mappedVoice || 'en-US-Studio-O'; // Default to Studio-O (Aria)

  return finalVoice;
};
