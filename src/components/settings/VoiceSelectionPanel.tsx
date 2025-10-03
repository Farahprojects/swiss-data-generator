import React, { useState, useRef } from 'react';
import { useUserData } from '@/hooks/useUserData';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const VoiceSelectionPanel: React.FC = () => {
  const { preferences, updateTtsVoice, saving } = useUserData();
  const ttsVoice = preferences?.tts_voice || 'Puck';
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleVoiceChange = async (voice: string) => {
    await updateTtsVoice(voice, { showToast: false });
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
        
        // Female voices - CONFIRMED WORKING
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
        
        {/* Elegant Voice Selection Dropdown */}
        <div className="flex items-center gap-3">
          {/* Play Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePlayPreview(ttsVoice)}
            disabled={isLoading === ttsVoice}
            className="h-10 w-10 p-0 border-gray-300 hover:bg-gray-50"
          >
            {isLoading === ttsVoice ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
            ) : playingVoice === ttsVoice ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          {/* Voice Name Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="h-10 px-3 justify-between min-w-[140px] border-gray-300 hover:bg-gray-50"
              >
                <span className="text-sm font-medium">{ttsVoice}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {voices.map((voice) => (
                <DropdownMenuItem
                  key={voice.name}
                  onClick={() => handleVoiceChange(voice.name)}
                  className={`cursor-pointer ${ttsVoice === voice.name ? 'bg-gray-100' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm">{voice.name}</span>
                    <span className="text-xs text-gray-500">{voice.gender}</span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
