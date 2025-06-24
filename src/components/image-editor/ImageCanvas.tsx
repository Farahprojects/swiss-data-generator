
import React, { useRef, useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricImage, filters, Rect } from 'fabric';
import { ImageAdjustments } from './ImageEditorModal';
import { useIsMobile } from '@/hooks/use-mobile';

interface ImageCanvasProps {
  imageUrl: string;
  onCanvasReady: (canvas: FabricCanvas) => void;
  activeTool: string;
  adjustments: ImageAdjustments;
  cropApplied?: boolean;
}

export const ImageCanvas: React.FC<ImageCanvasProps> = ({
  imageUrl,
  onCanvasReady,
  activeTool,
  adjustments,
  cropApplied = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const imageObjectRef = useRef<FabricImage | null>(null);
  const overlayObjectRef = useRef<Rect | null>(null);
  const canApplyFiltersRef = useRef<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();

  const calculateCanvasSize = useCallback(() => {
    if (!containerRef.current) return { width: 600, height: 450 };

    const container = containerRef.current;
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 32;
    
    const maxWidth = isMobile ? Math.min(containerWidth, 350) : Math.min(containerWidth, 600);
    const maxHeight = isMobile ? Math.min(containerHeight, 300) : Math.min(containerHeight, 450);

    return { width: maxWidth, height: maxHeight };
  }, [isMobile]);

  const resizeCanvas = useCallback(() => {
    if (!fabricCanvasRef.current || !containerRef.current) return;

    const canvas = fabricCanvasRef.current;
    const { width: newWidth, height: newHeight } = calculateCanvasSize();
    
    // Store current zoom and viewport transform
    const currentZoom = canvas.getZoom();
    const currentVpt = canvas.viewportTransform?.slice() || [1, 0, 0, 1, 0, 0];
    
    // Resize canvas
    canvas.setDimensions({ width: newWidth, height: newHeight });
    
    // If we have an image, rescale and recenter it
    if (imageObjectRef.current) {
      const img = imageObjectRef.current;
      const imgWidth = img.width || 1;
      const imgHeight = img.height || 1;
      
      // Calculate new scale to fit the resized canvas
      const scale = Math.min(newWidth / imgWidth, newHeight / imgHeight) * 0.9;
      
      img.scale(scale);
      canvas.centerObject(img);
      
      // If we have an overlay, update its position and size to match the image
      if (overlayObjectRef.current) {
        const overlay = overlayObjectRef.current;
        overlay.set({
          left: img.left,
          top: img.top,
          width: img.getScaledWidth(),
          height: img.getScaledHeight(),
          originX: img.originX,
          originY: img.originY,
          angle: img.angle
        });
      }
    }
    
    canvas.renderAll();
  }, [calculateCanvasSize]);

  // Handle window resize with debouncing
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        resizeCanvas();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [resizeCanvas]);

  // Handle mobile mode changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      resizeCanvas();
    }
  }, [isMobile, resizeCanvas]);

  // Initial canvas setup
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const { width, height } = calculateCanvasSize();

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    // Only load image initially if we have an imageUrl and haven't cropped yet
    if (imageUrl && !cropApplied) {
      loadImageToCanvas(canvas, imageUrl);
    }

    return () => {
      canvas.dispose();
    };
  }, [imageUrl, onCanvasReady]);

  // Only reload image when cropApplied changes from true to false (reset)
  useEffect(() => {
    if (!fabricCanvasRef.current || !imageUrl) return;
    
    // If cropApplied just changed to false, reload the original image
    if (!cropApplied && fabricCanvasRef.current.getObjects().length === 0) {
      loadImageToCanvas(fabricCanvasRef.current, imageUrl);
    }
  }, [cropApplied, imageUrl]);

  const loadImageToCanvas = async (canvas: FabricCanvas, url: string) => {
    try {
      console.log('Loading image to canvas:', url);
      
      // Try loading with CORS first
      const img = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous'
      });
      
      addImageToCanvas(canvas, img);
      canApplyFiltersRef.current = true;
      console.log('Image loaded successfully with CORS');
      
    } catch (error) {
      console.warn('CORS loading failed, trying without CORS:', error);
      
      try {
        // Fallback without CORS
        const img = await FabricImage.fromURL(url);
        addImageToCanvas(canvas, img);
        canApplyFiltersRef.current = false;
        console.log('Image loaded without CORS - filters disabled');
        
      } catch (fallbackError) {
        console.error('Failed to load image:', fallbackError);
      }
    }
  };

  const addImageToCanvas = (canvas: FabricCanvas, img: FabricImage) => {
    // Clear canvas first
    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    
    // Scale image to fit canvas while maintaining aspect ratio
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const imgWidth = img.width || 1;
    const imgHeight = img.height || 1;
    
    const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight) * 0.9;
    
    img.scale(scale);
    canvas.centerObject(img);
    
    // Set initial state - non-selectable unless in crop mode
    img.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });
    
    canvas.add(img);
    canvas.renderAll();
    
    imageObjectRef.current = img;
    
    // Test filter capabilities
    testFilterCapability(img, canvas);
  };

  const testFilterCapability = (img: FabricImage, canvas: FabricCanvas) => {
    try {
      const testFilter = new filters.Brightness({ brightness: 0 });
      img.filters = [testFilter];
      img.applyFilters();
      canApplyFiltersRef.current = true;
      console.log('Filters can be applied to this image');
    } catch (error) {
      console.warn('Filters cannot be applied due to CORS restrictions:', error);
      canApplyFiltersRef.current = false;
      img.filters = [];
    }
    canvas.renderAll();
  };

  // Apply adjustments when they change (only if not cropped)
  useEffect(() => {
    if (!imageObjectRef.current || !fabricCanvasRef.current || cropApplied) {
      if (cropApplied) {
        console.log('Skipping filter application - image has been cropped');
        return;
      }
      return;
    }

    const img = imageObjectRef.current;
    const canvas = fabricCanvasRef.current;
    const { brightness, contrast, opacity, opacityColor, rotation } = adjustments;

    try {
      // Apply filters (brightness and contrast only)
      if (canApplyFiltersRef.current) {
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

        img.filters = imageFilters;
        img.applyFilters();
      }
      
      // Apply rotation
      img.rotate(rotation);

      // Handle opacity overlay
      if (overlayObjectRef.current) {
        canvas.remove(overlayObjectRef.current);
        overlayObjectRef.current = null;
      }

      if (opacity > 0) {
        const overlay = new Rect({
          left: img.left,
          top: img.top,
          width: img.getScaledWidth(),
          height: img.getScaledHeight(),
          fill: opacityColor,
          opacity: opacity / 100,
          selectable: false,
          evented: false,
          excludeFromExport: false
        });

        // Position overlay to match image rotation and position
        overlay.set({
          originX: img.originX,
          originY: img.originY,
          angle: img.angle
        });

        canvas.add(overlay);
        overlayObjectRef.current = overlay;
      }
      
      canvas.renderAll();
      console.log('Applied adjustments:', adjustments);
      
    } catch (error) {
      console.error('Error applying adjustments:', error);
      // If filters fail, at least apply rotation
      try {
        img.rotate(rotation);
        canvas.renderAll();
      } catch (rotationError) {
        console.error('Error applying rotation:', rotationError);
      }
    }
  }, [adjustments, cropApplied]);

  return (
    <div 
      ref={containerRef}
      className="flex items-center justify-center h-full bg-gray-100 rounded-lg relative"
    >
      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded shadow-lg max-w-full max-h-full"
      />
      {!canApplyFiltersRef.current && !cropApplied && (
        <div className="absolute top-2 left-2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-2 py-1 rounded text-xs">
          Filters disabled due to image restrictions
        </div>
      )}
      {cropApplied && (
        <div className="absolute top-2 left-2 bg-green-100 border border-green-400 text-green-800 px-2 py-1 rounded text-xs">
          Crop applied - ready to save
        </div>
      )}
    </div>
  );
};
