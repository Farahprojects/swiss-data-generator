
import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StreamingChunk {
  audioData: string;
  chunkIndex: number;
  isLast: boolean;
}

interface StreamingResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  chunkIndex: number;
}

export const useStreamingSpeechToText = (
  onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void,
  onSilenceDetected?: () => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chunkCounterRef = useRef(0);
  const processingChunksRef = useRef<Set<number>>(new Set());
  const transcriptPartsRef = useRef<Map<number, string>>(new Map());
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const isRecordingRef = useRef(false);
  const monitoringRef = useRef(false);
  const { toast } = useToast();

  // Warm up the edge function
  const warmupEdgeFunction = useCallback(async () => {
    try {
      await supabase.functions.invoke('streaming-speech-to-text', {
        body: { action: 'warmup' }
      });
    } catch (error) {
      console.log('Warmup request sent (expected to fail during warmup)');
    }
  }, []);

  // Convert audio blob to base64 (removed faulty preprocessing)
  const convertAudioToBase64 = useCallback((audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        resolve(base64Audio);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(audioBlob);
    });
  }, []);

  // Process streaming chunk
  const processStreamingChunk = useCallback(async (chunk: StreamingChunk) => {
    try {
      const { data, error } = await supabase.functions.invoke('streaming-speech-to-text', {
        body: {
          action: 'process_chunk',
          audioData: chunk.audioData,
          chunkIndex: chunk.chunkIndex,
          isLast: chunk.isLast,
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            model: 'latest_short', // Optimized for real-time
            useEnhanced: true,
            speechContexts: [{
              phrases: ["therapy", "session", "client", "feelings", "emotions", "breakthrough", "progress"],
              boost: 15
            }]
          }
        }
      });

      if (error) {
        console.error('Streaming STT error:', error);
        return;
      }

      const result = data as StreamingResult;
      if (result.text) {
        transcriptPartsRef.current.set(result.chunkIndex, result.text);
        
        // Merge all processed chunks in order
        const sortedEntries = Array.from(transcriptPartsRef.current.entries())
          .sort(([a], [b]) => a - b);
        const mergedTranscript = sortedEntries.map(([, text]) => text).join(' ');
        
        if (onTranscriptUpdate) {
          onTranscriptUpdate(mergedTranscript, result.isFinal);
        }
      }

      processingChunksRef.current.delete(chunk.chunkIndex);
      setProcessingProgress(prev => Math.min(100, prev + (100 / chunkCounterRef.current)));

    } catch (error) {
      console.error('Error processing streaming chunk:', error);
      processingChunksRef.current.delete(chunk.chunkIndex);
    }
  }, [onTranscriptUpdate]);

  // Enhanced silence monitoring with faster detection
  const monitorSilence = useCallback(() => {
    if (!analyserRef.current || monitoringRef.current) return;
    
    monitoringRef.current = true;
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let silenceStart: number | null = null;
    
    const checkSilence = () => {
      if (!isRecordingRef.current || !analyserRef.current) {
        monitoringRef.current = false;
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate RMS with improved sensitivity
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / bufferLength);
      const normalizedLevel = Math.min(100, (rms / 128) * 100);
      
      setAudioLevel(normalizedLevel);
      
      // Reduced silence threshold and timeout for faster detection
      const silenceThreshold = 6; // More sensitive
      const silenceTimeout = 1000; // 1 second instead of 3
      const now = Date.now();
      
      if (rms < silenceThreshold) {
        if (silenceStart === null) {
          silenceStart = now;
        } else if (now - silenceStart >= silenceTimeout) {
          console.log('1 second of silence detected, processing chunks...');
          monitoringRef.current = false;
          
          if (onSilenceDetected) {
            onSilenceDetected();
          }
          
          if (isRecordingRef.current) {
            stopRecording();
          }
          return;
        }
      } else {
        if (silenceStart !== null) {
          silenceStart = null;
        }
      }
      
      requestAnimationFrame(checkSilence);
    };
    
    checkSilence();
  }, [onSilenceDetected]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting streaming recording...');
      
      // Warm up edge function
      warmupEdgeFunction();
      
      // Reset state
      chunkCounterRef.current = 0;
      processingChunksRef.current.clear();
      transcriptPartsRef.current.clear();
      setProcessingProgress(0);
      
      // Enhanced audio constraints for better quality and faster processing
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      
      // Set up audio context for silence detection
      audioContextRef.current = new AudioContext({ sampleRate: 48000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      // Optimized MediaRecorder with reduced bitrate for faster processing
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000 // Reduced from 128000 for faster uploads
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      isRecordingRef.current = true;

      // Process chunks as they arrive (streaming approach)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          const chunkIndex = chunkCounterRef.current++;
          console.log(`Processing audio chunk ${chunkIndex}, size:`, event.data.size);
          
          processingChunksRef.current.add(chunkIndex);
          audioChunksRef.current.push(event.data);
          
          try {
            // Convert chunk to base64 (no preprocessing)
            const base64Audio = await convertAudioToBase64(event.data);
            
            // Process chunk immediately (streaming)
            const chunk: StreamingChunk = {
              audioData: base64Audio,
              chunkIndex,
              isLast: false
            };
            
            processStreamingChunk(chunk);
          } catch (error) {
            console.error('Error processing chunk:', error);
            processingChunksRef.current.delete(chunkIndex);
          }
        }
      };

      // Start recording with smaller chunks for faster processing
      mediaRecorder.start(500); // 500ms chunks instead of 100ms
      setIsRecording(true);
      
      // Start monitoring for silence
      setTimeout(() => monitorSilence(), 100);
      
      toast({
        title: "Streaming recording started",
        description: "Speak now... Processing in real-time",
      });
    } catch (error) {
      console.error('Error starting streaming recording:', error);
      isRecordingRef.current = false;
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast, monitorSilence, warmupEdgeFunction, convertAudioToBase64, processStreamingChunk]);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise(async (resolve) => {
      if (!mediaRecorderRef.current || !isRecordingRef.current) {
        resolve('');
        return;
      }

      console.log('Stopping streaming recording...');
      isRecordingRef.current = false;
      monitoringRef.current = false;
      setIsProcessing(true);

      // Clear silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          // Mark last chunk and wait for all processing to complete
          if (audioChunksRef.current.length > 0) {
            const lastChunkIndex = chunkCounterRef.current - 1;
            const lastChunk = audioChunksRef.current[audioChunksRef.current.length - 1];
            
            if (lastChunk) {
              const base64Audio = await convertAudioToBase64(lastChunk);
              const finalChunk: StreamingChunk = {
                audioData: base64Audio,
                chunkIndex: lastChunkIndex,
                isLast: true
              };
              
              await processStreamingChunk(finalChunk);
            }
          }
          
          // Wait for all chunks to be processed
          const waitForProcessing = () => {
            if (processingChunksRef.current.size === 0) {
              const sortedEntries = Array.from(transcriptPartsRef.current.entries())
                .sort(([a], [b]) => a - b);
              const finalTranscript = sortedEntries.map(([, text]) => text).join(' ');
              
              setIsProcessing(false);
              setProcessingProgress(100);
              
              toast({
                title: "Speech processed",
                description: finalTranscript ? "Text has been added" : "No speech detected",
              });
              
              resolve(finalTranscript);
            } else {
              setTimeout(waitForProcessing, 100);
            }
          };
          
          waitForProcessing();
        } catch (error) {
          console.error('Error in streaming stop handler:', error);
          setIsProcessing(false);
          resolve('');
        }
      };

      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      
      // Clean up audio context
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      setIsRecording(false);
      setAudioLevel(0);
    });
  }, [convertAudioToBase64, processStreamingChunk, toast]);

  const toggleRecording = useCallback(async () => {
    if (isRecordingRef.current) {
      return stopRecording();
    } else {
      await startRecording();
      return Promise.resolve('');
    }
  }, [startRecording, stopRecording]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    processingProgress,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
