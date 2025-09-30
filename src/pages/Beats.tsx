import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface ToneSource {
  id: string;
  label: string;
  frequency: number;
  volume: number;
  isMuted: boolean;
  isPlaying: boolean;
  oscillator: OscillatorNode | null;
  gainNode: GainNode | null;
}

interface AudioLayer {
  id: string;
  label: string;
  volume: number;
  isMuted: boolean;
  audioElement: HTMLAudioElement | null;
  gainNode: GainNode | null;
}

const PLANETARY_FREQUENCIES = [
  { name: 'Earth (OM)', hz: 136.10 },
  { name: 'Moon', hz: 210.42 },
  { name: 'Sun', hz: 126.22 },
  { name: 'Mercury', hz: 141.27 },
  { name: 'Venus', hz: 221.23 },
  { name: 'Mars', hz: 144.72 },
  { name: 'Jupiter', hz: 183.58 },
  { name: 'Saturn', hz: 147.85 },
  { name: 'Uranus', hz: 207.36 },
  { name: 'Neptune', hz: 211.44 },
  { name: 'Pluto', hz: 140.25 },
  { name: 'A4 (Standard)', hz: 440.00 },
  { name: 'A4 (432 Hz)', hz: 432.00 },
];

export default function Beats() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [tones, setTones] = useState<ToneSource[]>([
    { id: 'low', label: 'Low Tone', frequency: 136.10, volume: 0.5, isMuted: false, isPlaying: false, oscillator: null, gainNode: null },
    { id: 'high', label: 'High Tone', frequency: 144.10, volume: 0.5, isMuted: false, isPlaying: false, oscillator: null, gainNode: null },
  ]);
  
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([
    { id: 'layer1', label: 'Layer 1', volume: 0.5, isMuted: false, audioElement: null, gainNode: null },
    { id: 'layer2', label: 'Layer 2', volume: 0.5, isMuted: false, audioElement: null, gainNode: null },
  ]);

  const recalibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context
  const initializeAudio = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
      setIsInitialized(true);
    }
  };

  // Start/stop tone with frequency lock
  const toggleTone = (toneId: string) => {
    if (!audioContext) return;

    setTones(prev => prev.map(tone => {
      if (tone.id !== toneId) return tone;

      if (tone.isPlaying && tone.oscillator) {
        // Stop tone
        tone.oscillator.stop();
        tone.oscillator.disconnect();
        if (tone.gainNode) tone.gainNode.disconnect();
        return { ...tone, isPlaying: false, oscillator: null, gainNode: null };
      } else {
        // Start tone with precise frequency
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = tone.frequency;
        
        gainNode.gain.value = tone.isMuted ? 0 : tone.volume;
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        return { ...tone, isPlaying: true, oscillator, gainNode };
      }
    }));
  };

  // Update frequency with precision lock
  const updateFrequency = (toneId: string, newFrequency: number) => {
    setTones(prev => prev.map(tone => {
      if (tone.id !== toneId) return tone;
      
      // Update oscillator if playing
      if (tone.oscillator && tone.isPlaying) {
        tone.oscillator.frequency.setValueAtTime(newFrequency, audioContext!.currentTime);
      }
      
      return { ...tone, frequency: newFrequency };
    }));
  };

  // Update volume
  const updateVolume = (toneId: string, newVolume: number) => {
    setTones(prev => prev.map(tone => {
      if (tone.id !== toneId) return tone;
      
      if (tone.gainNode) {
        tone.gainNode.gain.setValueAtTime(tone.isMuted ? 0 : newVolume, audioContext!.currentTime);
      }
      
      return { ...tone, volume: newVolume };
    }));
  };

  // Toggle mute
  const toggleMute = (toneId: string) => {
    setTones(prev => prev.map(tone => {
      if (tone.id !== toneId) return tone;
      
      const newMuted = !tone.isMuted;
      if (tone.gainNode) {
        tone.gainNode.gain.setValueAtTime(newMuted ? 0 : tone.volume, audioContext!.currentTime);
      }
      
      return { ...tone, isMuted: newMuted };
    }));
  };

  // Apply preset frequency
  const applyPreset = (toneId: string, frequency: number) => {
    updateFrequency(toneId, frequency);
  };

  // Handle audio file upload
  const handleAudioUpload = (layerId: string, file: File) => {
    if (!audioContext) return;

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    
    const source = audioContext.createMediaElementSource(audio);
    const gainNode = audioContext.createGain();
    
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId) return layer;
      
      // Cleanup old audio
      if (layer.audioElement) {
        layer.audioElement.pause();
        layer.audioElement.src = '';
      }
      
      gainNode.gain.value = layer.isMuted ? 0 : layer.volume;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      return { ...layer, audioElement: audio, gainNode };
    }));
  };

  // Toggle audio layer
  const toggleAudioLayer = (layerId: string) => {
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId || !layer.audioElement) return layer;
      
      if (layer.audioElement.paused) {
        layer.audioElement.play();
      } else {
        layer.audioElement.pause();
      }
      
      return layer;
    }));
  };

  // Update audio layer volume
  const updateLayerVolume = (layerId: string, newVolume: number) => {
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId) return layer;
      
      if (layer.gainNode) {
        layer.gainNode.gain.setValueAtTime(layer.isMuted ? 0 : newVolume, audioContext!.currentTime);
      }
      
      return { ...layer, volume: newVolume };
    }));
  };

  // Toggle audio layer mute
  const toggleLayerMute = (layerId: string) => {
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId) return layer;
      
      const newMuted = !layer.isMuted;
      if (layer.gainNode) {
        layer.gainNode.gain.setValueAtTime(newMuted ? 0 : layer.volume, audioContext!.currentTime);
      }
      
      return { ...layer, isMuted: newMuted };
    }));
  };

  // Periodic frequency recalibration (prevent drift)
  useEffect(() => {
    if (!audioContext) return;

    recalibrationIntervalRef.current = setInterval(() => {
      tones.forEach(tone => {
        if (tone.oscillator && tone.isPlaying) {
          // Lock frequency to target value
          tone.oscillator.frequency.setValueAtTime(tone.frequency, audioContext.currentTime);
        }
      });
    }, 100); // Recalibrate every 100ms

    return () => {
      if (recalibrationIntervalRef.current) {
        clearInterval(recalibrationIntervalRef.current);
      }
    };
  }, [audioContext, tones]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      tones.forEach(tone => {
        if (tone.oscillator) {
          tone.oscillator.stop();
          tone.oscillator.disconnect();
        }
        if (tone.gainNode) tone.gainNode.disconnect();
      });
      
      audioLayers.forEach(layer => {
        if (layer.audioElement) {
          layer.audioElement.pause();
          layer.audioElement.src = '';
        }
        if (layer.gainNode) layer.gainNode.disconnect();
      });
      
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-light text-gray-900 tracking-tight italic">
            Binaural Beats Generator
          </h1>
          <p className="text-lg text-gray-600 font-light">
            Explore planetary frequencies and binaural soundscapes
          </p>
        </div>

        {/* Initialize Button */}
        {!isInitialized && (
          <div className="text-center">
            <Button
              onClick={initializeAudio}
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-xl font-light"
            >
              Start Audio Engine
            </Button>
          </div>
        )}

        {/* Tone Generators */}
        {isInitialized && (
          <div className="space-y-6">
            {/* Tone Sources */}
            <div className="space-y-6">
              {tones.map((tone) => (
                <div key={tone.id} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-light text-gray-900">{tone.label}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleMute(tone.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        {tone.isMuted ? (
                          <VolumeX className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Volume2 className="w-5 h-5 text-gray-700" />
                        )}
                      </button>
                      <Button
                        onClick={() => toggleTone(tone.id)}
                        variant={tone.isPlaying ? "default" : "outline"}
                        className="rounded-xl"
                      >
                        {tone.isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Play
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Preset Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-light text-gray-700">Preset</label>
                    <select
                      value={tone.frequency}
                      onChange={(e) => applyPreset(tone.id, parseFloat(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-gray-900"
                    >
                      <option value={tone.frequency}>Custom ({tone.frequency.toFixed(2)} Hz)</option>
                      {PLANETARY_FREQUENCIES.map((preset) => (
                        <option key={preset.name} value={preset.hz}>
                          {preset.name} - {preset.hz} Hz
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Manual Frequency Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-light text-gray-700">
                      Frequency (Hz)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="20"
                      max="20000"
                      value={tone.frequency}
                      onChange={(e) => updateFrequency(tone.id, parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>

                  {/* Volume Control */}
                  <div className="space-y-2">
                    <label className="text-sm font-light text-gray-700">
                      Volume ({Math.round(tone.volume * 100)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={tone.volume}
                      onChange={(e) => updateVolume(tone.id, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Audio Layers */}
            <div className="space-y-6">
              <div className="border-t border-gray-200 pt-6">
                <h2 className="text-xl font-light text-gray-900 mb-4 italic">Mix Layers</h2>
                
                {audioLayers.map((layer) => (
                  <div key={layer.id} className="bg-white rounded-xl p-6 shadow-sm space-y-4 mb-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-light text-gray-900">{layer.label}</h3>
                      <div className="flex items-center gap-2">
                        {layer.audioElement && (
                          <>
                            <button
                              onClick={() => toggleLayerMute(layer.id)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              {layer.isMuted ? (
                                <VolumeX className="w-5 h-5 text-gray-400" />
                              ) : (
                                <Volume2 className="w-5 h-5 text-gray-700" />
                              )}
                            </button>
                            <Button
                              onClick={() => toggleAudioLayer(layer.id)}
                              variant={layer.audioElement.paused ? "outline" : "default"}
                              className="rounded-xl"
                            >
                              {layer.audioElement.paused ? (
                                <>
                                  <Play className="w-4 h-4 mr-2" />
                                  Play
                                </>
                              ) : (
                                <>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Stop
                                </>
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-light text-gray-700">Upload Audio</label>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAudioUpload(layer.id, file);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl font-light focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>

                    {/* Volume Control */}
                    {layer.audioElement && (
                      <div className="space-y-2">
                        <label className="text-sm font-light text-gray-700">
                          Volume ({Math.round(layer.volume * 100)}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={layer.volume}
                          onChange={(e) => updateLayerVolume(layer.id, parseFloat(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Binaural Beat Info */}
            {tones.length >= 2 && (
              <div className="bg-gray-100 rounded-xl p-6">
                <h3 className="text-sm font-light text-gray-700 mb-2">Binaural Beat</h3>
                <p className="text-2xl font-light text-gray-900">
                  {Math.abs(tones[1].frequency - tones[0].frequency).toFixed(2)} Hz
                </p>
                <p className="text-xs text-gray-600 font-light mt-2">
                  Difference between high and low tones
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
