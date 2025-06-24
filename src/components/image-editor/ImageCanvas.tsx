
import React, { useRef, useEffect } from 'react';
import { Canvas as FabricCanvas, FabricImage } from 'fabric';
import { ImageAdjustments } from './ImageEditorModal';

interface ImageCanvasProps {
  imageUrl: string;
  onCanvasReady: (canvas: FabricCanvas) => void;
  activeTool: string;
  adjustments: ImageAdjustments;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  onCanvasReady,
  activeTool,
  adjustments
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const imageObjectRef = useRef<FabricImage | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    // Load the image
    if (imageUrl) {
      FabricImage.fromURL(imageUrl)
        .then((img) => {
          // Scale image to fit canvas while maintaining aspect ratio
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();
          const imgWidth = img.width || 1;
          const imgHeight = img.height || 1;
          
          const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
          
          img.scale(scale);
          img.center();
          
          canvas.add(img);
          canvas.renderAll();
          
          imageObjectRef.current = img;
        })
        .catch((error) => {
          console.error('Error loading image:', error);
        });
    }

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, onCanvasReady]);

  // Apply adjustments when they change
  useEffect(() => {
    if (!imageObjectRef.current) return;

    const img = imageObjectRef.current;
    const { brightness, contrast, saturation, rotation } = adjustments;

    // Apply filters
    const filters = [];
    
    if (brightness !== 0) {
      filters.push(new (fabric as any).Image.filters.Brightness({
        brightness: brightness / 100
      }));
    }
    
    if (contrast !== 0) {
      filters.push(new (fabric as any).Image.filters.Contrast({
        contrast: contrast / 100
      }));
    }
    
    if (saturation !== 0) {
      filters.push(new (fabric as any).Image.filters.Saturation({
        saturation: saturation / 100
      }));
    }

    img.filters = filters;
    img.applyFilters();
    
    // Apply rotation
    img.rotate(rotation);
    
    fabricCanvasRef.current?.renderAll();
  }, [adjustments]);

  return (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded shadow-lg max-w-full max-h-full"
      />
    </div>
  );
};
