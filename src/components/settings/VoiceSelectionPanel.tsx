import React, { useState, useRef } from 'react';
import { useChatStore } from '@/core/store';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

export const VoiceSelectionPanel: React.FC = () => {
  const ttsVoice = useChatStore((s) => s.ttsVoice);
  const setTtsVoice = useChatStore((s) => s.setTtsVoice);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVoiceChange = (voice: string) => {
    setTtsVoice(voice);
  };

  const handlePlayPreview = async (voice: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoice === voice) {
      setPlayingVoice(null);
      return;
    }

    setPlayingVoice(voice);
    setIsLoading(voice);

    try {
      // Voice preview URLs from Supabase storage bucket
      const voicePreviews: Record<string, string> = {
        // Male voices - CONFIRMED WORKING
        'Puck': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-puck.wav',
        'Enceladus': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-enceladus.wav',
        'Orus': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-orus.wav',
        'Algenib': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-algenib.wav', // TODO: Upload
        
        // Female voices - TODO: Upload all
        'Achernar': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-achernar.wav',
        'Aoede': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-aoede.wav',
        'Leda': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-leda.wav',
        'Sulafat': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-sulafat.wav',
        'Zephyr': 'https://api.therai.co/storage/v1/object/public/therai-assets/chirp3-hd-zephyr.wav',
      };

      const audioUrl = voicePreviews[voice];
      if (!audioUrl) {
        throw new Error('Voice preview not found');
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingVoice(null);
      };
      
      audio.onerror = () => {
        setPlayingVoice(null);
        setIsLoading(null);
        console.error('Error playing voice preview for:', voice);
      };
      
      await audio.play();
      setIsLoading(null);
    } catch (error) {
      console.error('Error playing voice preview:', error);
      setPlayingVoice(null);
      setIsLoading(null);
    }
  };

  const voices = [
    { name: 'Puck', gender: 'Male' },
    { name: 'Algenib', gender: 'Male' },
    { name: 'Enceladus', gender: 'Male' },
    { name: 'Orus', gender: 'Male' },
    { name: 'Achernar', gender: 'Female' },
    { name: 'Aoede', gender: 'Female' },
    { name: 'Leda', gender: 'Female' },
    { name: 'Sulafat', gender: 'Female' },
    { name: 'Zephyr', gender: 'Female' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Assistant Voice</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose the voice for your AI assistant. Click the play button to preview each voice.
        </p>
        
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Male Voices</h4>
            <div className="space-y-2">
              {voices.filter(v => v.gender === 'Male').map((voice) => (
                <div key={voice.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id={voice.name}
                      name="voice"
                      value={voice.name}
                      checked={ttsVoice === voice.name}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
                    />
                    <label htmlFor={voice.name} className="text-sm font-medium text-gray-900 cursor-pointer">
                      {voice.name}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayPreview(voice.name)}
                    disabled={isLoading === voice.name}
                    className="h-8 w-8 p-0"
                  >
                    {isLoading === voice.name ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                    ) : playingVoice === voice.name ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Female Voices</h4>
            <div className="space-y-2">
              {voices.filter(v => v.gender === 'Female').map((voice) => (
                <div key={voice.name} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      id={voice.name}
                      name="voice"
                      value={voice.name}
                      checked={ttsVoice === voice.name}
                      onChange={(e) => handleVoiceChange(e.target.value)}
                      className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300"
                    />
                    <label htmlFor={voice.name} className="text-sm font-medium text-gray-900 cursor-pointer">
                      {voice.name}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePlayPreview(voice.name)}
                    disabled={isLoading === voice.name}
                    className="h-8 w-8 p-0"
                  >
                    {isLoading === voice.name ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
                    ) : playingVoice === voice.name ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
