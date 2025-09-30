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

  const [actualFrequencies, setActualFrequencies] = useState<Record<string, number>>({});
  const recalibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context with maximum precision
  const initializeAudio = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: 'interactive',
        sampleRate: 48000, // Standard high-quality sample rate
      });
      
      console.log('[Beats] Audio Context initialized');
      console.log('[Beats] Sample Rate:', ctx.sampleRate, 'Hz');
      console.log('[Beats] Base Latency:', ctx.baseLatency);
      console.log('[Beats] Output Latency:', ctx.outputLatency);
      
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
        // Smooth fade-out to prevent click using scheduled exponential ramp
        if (tone.gainNode) {
          const now = audioContext.currentTime;
          const stopTime = now + 0.035; // ~35ms total fade time
          const currentGain = Math.max(0.0001, tone.gainNode.gain.value || 0.0001);
          tone.gainNode.gain.cancelScheduledValues(now);
          tone.gainNode.gain.setValueAtTime(currentGain, now);
          // Exponential ramp to near-zero avoids zero-crossing clicks
          tone.gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

          // Stop exactly at the end of the fade; cleanup on end
          try {
            tone.oscillator.onended = () => {
              try { tone.oscillator!.disconnect(); } catch {}
              try { tone.gainNode!.disconnect(); } catch {}
            };
            tone.oscillator.stop(stopTime);
          } catch {
            // Fallback in case stop scheduling fails
            setTimeout(() => {
              try { tone.oscillator!.stop(); } catch {}
              try { tone.oscillator!.disconnect(); } catch {}
              try { tone.gainNode!.disconnect(); } catch {}
            }, 40);
          }
        }
        return { ...tone, isPlaying: false, oscillator: null, gainNode: null };
      } else {
        // Start tone with precise frequency and smooth fade-in
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        // Use setValueAtTime for maximum precision instead of direct assignment
        oscillator.frequency.setValueAtTime(tone.frequency, audioContext.currentTime);
        
        // Smooth fade-in to prevent click/thump
        const targetVolume = tone.isMuted ? 0 : tone.volume;
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext.currentTime + 0.05); // 50ms fade-in
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        console.log(`[Beats] Started ${tone.label} at ${tone.frequency} Hz (target precision: ±0.01 Hz)`);
        
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
        const targetVolume = tone.isMuted ? 0 : newVolume;
        // Smooth volume change to prevent clicks
        tone.gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext!.currentTime + 0.02);
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
        const targetVolume = newMuted ? 0 : tone.volume;
        // Smooth mute/unmute to prevent clicks
        tone.gainNode.gain.linearRampToValueAtTime(targetVolume, audioContext!.currentTime + 0.02);
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
        // Smooth fade-in before play to avoid click
        if (layer.gainNode) {
          const now = audioContext!.currentTime;
          const target = layer.isMuted ? 0.0001 : Math.max(0.0001, layer.volume);
          layer.gainNode.gain.cancelScheduledValues(now);
          layer.gainNode.gain.setValueAtTime(0.0001, now);
          layer.gainNode.gain.exponentialRampToValueAtTime(target, now + 0.05);
        }
        layer.audioElement.play();
      } else {
        // Smooth fade-out then pause to avoid click
        if (layer.gainNode) {
          const now = audioContext!.currentTime;
          layer.gainNode.gain.cancelScheduledValues(now);
          const current = Math.max(0.0001, layer.gainNode.gain.value);
          layer.gainNode.gain.setValueAtTime(current, now);
          layer.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
          setTimeout(() => {
            try { layer.audioElement!.pause(); } catch {}
          }, 35);
        } else {
          layer.audioElement.pause();
        }
      }
      
      return layer;
    }));
  };

  // Update audio layer volume (smooth to avoid zipper noise)
  const updateLayerVolume = (layerId: string, newVolume: number) => {
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId) return layer;
      
      if (layer.gainNode) {
        const now = audioContext!.currentTime;
        const target = layer.isMuted ? 0 : newVolume;
        layer.gainNode.gain.linearRampToValueAtTime(target, now + 0.02);
      }
      
      return { ...layer, volume: newVolume };
    }));
  };

  // Toggle audio layer mute (smooth)
  const toggleLayerMute = (layerId: string) => {
    setAudioLayers(prev => prev.map(layer => {
      if (layer.id !== layerId) return layer;
      
      const newMuted = !layer.isMuted;
      if (layer.gainNode) {
        const now = audioContext!.currentTime;
        const target = newMuted ? 0 : layer.volume;
        layer.gainNode.gain.linearRampToValueAtTime(target, now + 0.02);
      }
      
      return { ...layer, isMuted: newMuted };
    }));
  };

  // Periodic frequency recalibration and monitoring (prevent drift)
  useEffect(() => {
    if (!audioContext) return;

    recalibrationIntervalRef.current = setInterval(() => {
      const frequencies: Record<string, number> = {};
      
      tones.forEach(tone => {
        if (tone.oscillator && tone.isPlaying) {
          // Lock frequency to target value with maximum precision
          tone.oscillator.frequency.setValueAtTime(tone.frequency, audioContext.currentTime);
          
          // Read back the actual frequency value
          const actualFreq = tone.oscillator.frequency.value;
          frequencies[tone.id] = actualFreq;
          
          // Check for drift and log warnings
          const drift = Math.abs(actualFreq - tone.frequency);
          if (drift > 0.1) {
            console.warn(`[Beats] Frequency drift detected on ${tone.label}: ${drift.toFixed(4)} Hz`);
          }
        }
      });
      
      setActualFrequencies(frequencies);
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
        <style>{`
          .slider-vertical {
            -webkit-appearance: slider-vertical;
            writing-mode: bt-lr;
          }
          .slider-vertical::-webkit-slider-track {
            background: #e5e7eb;
            border-radius: 8px;
          }
          .slider-vertical::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #374151;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .slider-vertical::-webkit-slider-thumb:hover {
            background: #111827;
            transform: scale(1.1);
          }
          .slider-vertical::-moz-range-track {
            background: #e5e7eb;
            border-radius: 8px;
            border: none;
          }
          .slider-vertical::-moz-range-thumb {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #374151;
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        `}</style>
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

         {/* Unified Binaural Mixer */}
         {isInitialized && (
           <div className="bg-white rounded-xl p-6 shadow-sm">
             <div className="text-center mb-6">
               <h2 className="text-xl font-light italic text-gray-900">
                 Binaural Tone Mixer
               </h2>
             </div>

             {/* Three-Column Layout: Low | Mix | High */}
             <div className="grid grid-cols-3 gap-6 items-start">
               
               {/* LEFT: Low Tone */}
               <div className="space-y-4">
                 <div className="flex items-center justify-center">
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input
                       type="checkbox"
                       checked={!tones.find(t => t.id === 'low')?.isMuted}
                       onChange={() => toggleMute('low')}
                       className="w-4 h-4 rounded border-gray-300 focus:ring-gray-900"
                     />
                     <span className="text-sm font-light text-gray-700">Low Tone</span>
                   </label>
                 </div>

                 {/* Preset */}
                 <select
                   value={tones.find(t => t.id === 'low')?.frequency || 136.10}
                   onChange={(e) => applyPreset('low', parseFloat(e.target.value))}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                 >
                   <option value={136.10}>Custom ({tones.find(t => t.id === 'low')?.frequency.toFixed(1)} Hz)</option>
                   {PLANETARY_FREQUENCIES.map((preset) => (
                     <option key={preset.name} value={preset.hz}>
                       {preset.name} - {preset.hz} Hz
                     </option>
                   ))}
                 </select>

                 {/* Frequency Input */}
                 <div className="space-y-1">
                   <input
                     type="number"
                     step="0.1"
                     min="20"
                     max="20000"
                     value={tones.find(t => t.id === 'low')?.frequency || 0}
                     onChange={(e) => updateFrequency('low', parseFloat(e.target.value) || 0)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                   />
                   {tones.find(t => t.id === 'low')?.isPlaying && actualFrequencies['low'] && (
                     <div className="text-xs text-green-600 font-light text-center">
                       {actualFrequencies['low'].toFixed(1)} Hz
                     </div>
                   )}
                 </div>

                 {/* Vertical Volume Slider */}
                 <div className="flex flex-col items-center space-y-2">
                   <div className="text-xs font-light text-gray-500">
                     {Math.round((tones.find(t => t.id === 'low')?.volume || 0) * 100)}%
                   </div>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={tones.find(t => t.id === 'low')?.volume || 0}
                     onChange={(e) => updateVolume('low', parseFloat(e.target.value))}
                     className="w-6 h-20 slider-vertical"
                   />
                 </div>
               </div>

               {/* CENTER: Audio Upload Section */}
               <div className="space-y-4 text-center">
                 <div className="text-sm font-light text-gray-700 mb-2">Audio Track</div>
                 
                 {/* Audio Upload */}
                 <div className="space-y-3">
                   <input
                     type="file"
                     accept="audio/*"
                     onChange={(e) => {
                       const file = e.target.files?.[0];
                       if (file && audioLayers[0]) {
                         handleAudioUpload('layer1', file);
                       }
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                   />
                   
                   {/* Audio Controls */}
                   {audioLayers[0]?.audioElement && (
                     <div className="space-y-2">
                       <div className="flex items-center justify-center gap-2">
                         <button
                           onClick={() => toggleLayerMute('layer1')}
                           className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                         >
                           {audioLayers[0].isMuted ? (
                             <VolumeX className="w-4 h-4 text-gray-400" />
                           ) : (
                             <Volume2 className="w-4 h-4 text-gray-700" />
                           )}
                         </button>
                         <Button
                           onClick={() => toggleAudioLayer('layer1')}
                           variant={audioLayers[0].audioElement.paused ? "outline" : "default"}
                           size="sm"
                           className="rounded-lg"
                         >
                           {audioLayers[0].audioElement.paused ? (
                             <>
                               <Play className="w-3 h-3 mr-1" />
                               Play
                             </>
                           ) : (
                             <>
                               <Pause className="w-3 h-3 mr-1" />
                               Stop
                             </>
                           )}
                         </Button>
                       </div>
                       
                       {/* Volume Control */}
                       <div className="space-y-1">
                         <div className="text-xs font-light text-gray-500">
                           Volume ({Math.round((audioLayers[0]?.volume || 0) * 100)}%)
                         </div>
                         <input
                           type="range"
                           min="0"
                           max="1"
                           step="0.01"
                           value={audioLayers[0]?.volume || 0}
                           onChange={(e) => updateLayerVolume('layer1', parseFloat(e.target.value))}
                           className="w-full h-1"
                         />
                       </div>
                     </div>
                   )}
                 </div>

                 {/* Quick Presets */}
                 <div className="space-y-2">
                   <div className="text-xs font-light text-gray-600">Quick Presets</div>
                   <select
                     onChange={(e) => {
                       const preset = PLANETARY_FREQUENCIES.find(p => p.name === e.target.value);
                       if (preset) {
                         updateFrequency('low', preset.hz);
                         updateFrequency('high', preset.hz + 8); // 8Hz binaural beat
                       }
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                   >
                     <option value="">Select Preset</option>
                     {PLANETARY_FREQUENCIES.map((preset) => (
                       <option key={preset.name} value={preset.name}>
                         {preset.name}
                       </option>
                     ))}
                   </select>
                 </div>
               </div>

               {/* RIGHT: High Tone */}
               <div className="space-y-4">
                 <div className="flex items-center justify-center">
                   <label className="flex items-center space-x-2 cursor-pointer">
                     <input
                       type="checkbox"
                       checked={!tones.find(t => t.id === 'high')?.isMuted}
                       onChange={() => toggleMute('high')}
                       className="w-4 h-4 rounded border-gray-300 focus:ring-gray-900"
                     />
                     <span className="text-sm font-light text-gray-700">High Tone</span>
                   </label>
                 </div>

                 {/* Preset */}
                 <select
                   value={tones.find(t => t.id === 'high')?.frequency || 144.10}
                   onChange={(e) => applyPreset('high', parseFloat(e.target.value))}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                 >
                   <option value={144.10}>Custom ({tones.find(t => t.id === 'high')?.frequency.toFixed(1)} Hz)</option>
                   {PLANETARY_FREQUENCIES.map((preset) => (
                     <option key={preset.name} value={preset.hz}>
                       {preset.name} - {preset.hz} Hz
                     </option>
                   ))}
                 </select>

                 {/* Frequency Input */}
                 <div className="space-y-1">
                   <input
                     type="number"
                     step="0.1"
                     min="20"
                     max="20000"
                     value={tones.find(t => t.id === 'high')?.frequency || 0}
                     onChange={(e) => updateFrequency('high', parseFloat(e.target.value) || 0)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg font-light text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                   />
                   {tones.find(t => t.id === 'high')?.isPlaying && actualFrequencies['high'] && (
                     <div className="text-xs text-green-600 font-light text-center">
                       {actualFrequencies['high'].toFixed(1)} Hz
                     </div>
                   )}
                 </div>

                 {/* Vertical Volume Slider */}
                 <div className="flex flex-col items-center space-y-2">
                   <div className="text-xs font-light text-gray-500">
                     {Math.round((tones.find(t => t.id === 'high')?.volume || 0) * 100)}%
                   </div>
                   <input
                     type="range"
                     min="0"
                     max="1"
                     step="0.01"
                     value={tones.find(t => t.id === 'high')?.volume || 0}
                     onChange={(e) => updateVolume('high', parseFloat(e.target.value))}
                     className="w-6 h-20 slider-vertical"
                   />
                 </div>
               </div>
             </div>

             {/* Bottom: Single Play/Stop Button */}
             <div className="mt-6 flex justify-center">
               <Button
                 onClick={() => {
                   const hasPlaying = tones.some(t => t.isPlaying);
                   if (hasPlaying) {
                     // Stop all
                     tones.forEach(tone => {
                       if (tone.isPlaying) toggleTone(tone.id);
                     });
                   } else {
                     // Play only selected (unmuted) tones
                     tones.forEach(tone => {
                       if (!tone.isMuted) toggleTone(tone.id);
                     });
                   }
                 }}
                 variant={tones.some(t => t.isPlaying) ? "default" : "outline"}
                 className="rounded-xl px-8"
               >
                 {tones.some(t => t.isPlaying) ? (
                   <>
                     <Pause className="w-4 h-4 mr-2" />
                     Stop All
                   </>
                 ) : (
                   <>
                     <Play className="w-4 h-4 mr-2" />
                     Play Selected
                   </>
                 )}
               </Button>
             </div>
           </div>
         )}

      </div>
    </div>
  );
}
