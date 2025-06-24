
import React, { useRef, useEffect } from 'react';
import { Canvas as FabricCanvas, FabricImage, filters } from 'fabric';
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
  const canApplyFiltersRef = useRef<boolean>(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    // Load the image with CORS handling
    if (imageUrl) {
      FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      })
        .then((img) => {
          // Scale image to fit canvas while maintaining aspect ratio
          const canvasWidth = canvas.getWidth();
          const canvasHeight = canvas.getHeight();
          const imgWidth = img.width || 1;
          const imgHeight = img.height || 1;
          
          const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
          
          img.scale(scale);
          canvas.centerObject(img);
          
          canvas.add(img);
          canvas.renderAll();
          
          imageObjectRef.current = img;
          
          // Test if we can apply filters by trying a simple one
          try {
            const testFilter = new filters.Brightness({ brightness: 0 });
            img.filters = [testFilter];
            img.applyFilters();
            canApplyFiltersRef.current = true;
            console.log('Filters can be applied to this image');
          } catch (error) {
            console.warn('CORS restriction: Filters cannot be applied to this image', error);
            canApplyFiltersRef.current = false;
            // Clear any failed filters
            img.filters = [];
          }
          
          canvas.renderAll();
        })
        .catch((error) => {
          console.error('Error loading image:', error);
          // Try loading without CORS if the first attempt fails
          FabricImage.fromURL(imageUrl)
            .then((img) => {
              const canvasWidth = canvas.getWidth();
              const canvasHeight = canvas.getHeight();
              const imgWidth = img.width || 1;
              const imgHeight = img.height || 1;
              
              const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
              
              img.scale(scale);
              canvas.centerObject(img);
              
              canvas.add(img);
              canvas.renderAll();
              
              imageObjectRef.current = img;
              canApplyFiltersRef.current = false; // Disable filters for non-CORS images
              console.warn('Image loaded without CORS - filters will be disabled');
            })
            .catch((fallbackError) => {
              console.error('Failed to load image even without CORS:', fallbackError);
            });
        });
    }

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, onCanvasReady]);

  // Apply adjustments when they change
  useEffect(() => {
    if (!imageObjectRef.current || !canApplyFiltersRef.current) {
      if (!canApplyFiltersRef.current) {
        console.warn('Skipping filter application due to CORS restrictions');
      }
      return;
    }

    const img = imageObjectRef.current;
    const { brightness, contrast, saturation, rotation } = adjustments;

    try {
      // Apply filters using v6 syntax
      const imageFilters = [];
      
      if (brightness !== 0) {
        imageFilters.push(new filters.Brightness({
          brightness: brightness / 100
        }));
      }
      
      if (contrast !== 0) {
        imageFilters.push(new filters.Contrast({
          contrast: contrast / 100
        }));
      }
      
      if (saturation !== 0) {
        imageFilters.push(new filters.Saturation({
          saturation: saturation / 100
        }));
      }

      img.filters = imageFilters;
      img.applyFilters();
      
      // Apply rotation
      img.rotate(rotation);
      
      fabricCanvasRef.current?.renderAll();
    } catch (error) {
      console.error('Error applying filters:', error);
      // If filters fail, at least apply rotation
      try {
        img.rotate(rotation);
        fabricCanvasRef.current?.renderAll();
      } catch (rotationError) {
        console.error('Error applying rotation:', rotationError);
      }
    }
  }, [adjustments]);

  return (
    <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded shadow-lg max-w-full max-h-full"
      />
      {!canApplyFiltersRef.current && (
        <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-2 py-1 rounded text-xs">
          Filters disabled due to image restrictions
        </div>
      )}
    </div>
  );
};
