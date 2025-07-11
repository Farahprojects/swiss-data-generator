import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoPlayerModuleProps {
  timeRemaining: number;
  onError?: () => void;
  config?: {
    videoSrc?: string;
    autoPlay?: boolean;
    showControls?: boolean;
    fallbackToAnimation?: boolean;
  };
}

const DEFAULT_VIDEO_SRC = 'https://auth.theraiastro.com/storage/v1/object/public/therai-assets/loading-video.mp4';

export const VideoPlayerModule: React.FC<VideoPlayerModuleProps> = ({
  timeRemaining,
  onError,
  config = {}
}) => {
  const {
    videoSrc = DEFAULT_VIDEO_SRC,
    autoPlay = true,
    showControls = true,
    fallbackToAnimation = true
  } = config;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    if (!video.muted) video.volume = 0.7;
    setIsMuted(!isMuted);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoReady = () => {
    setIsLoading(false);
  };

  const handleVideoError = () => {
    console.error('Video failed to load:', videoSrc);
    setHasError(true);
    setIsLoading(false);
    
    if (fallbackToAnimation) {
      onError?.();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  if (hasError) {
    return (
      <div className="w-full h-64 bg-muted/30 rounded-xl flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground">Video unavailable</div>
          <div className="text-sm text-muted-foreground">
            Switching to alternative content...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="relative w-full h-0 pt-[56.25%] overflow-hidden rounded-xl shadow-lg bg-muted/20">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
        
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay={autoPlay}
          loop
          muted={isMuted}
          playsInline
          preload="auto"
          controls={false}
          onCanPlay={handleVideoReady}
          onLoadedData={handleVideoReady}
          onError={handleVideoError}
        />

        {/* Video Controls */}
        {showControls && !isLoading && (
          <div className="absolute inset-0 group">
            {/* Control overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            
            {/* Bottom controls */}
            <div className="absolute bottom-3 right-3 flex space-x-2 opacity-70 group-hover:opacity-100 transition-opacity duration-300">
              <Button
                variant="secondary"
                size="sm"
                onClick={togglePlay}
                className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="secondary"
                size="sm"
                onClick={toggleMute}
                className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Video Caption */}
      <div className="text-center text-sm text-muted-foreground">
        While we prepare your personalized report...
      </div>
    </div>
  );
};