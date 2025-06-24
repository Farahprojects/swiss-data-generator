
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  MousePointer, 
  Crop, 
  Sliders, 
  Filter, 
  RotateCw, 
  RotateCcw,
  Undo2 
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { EditorTool } from './ImageEditorModal';

interface EditorToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  onReset: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  activeTool,
  onToolChange,
  onReset
}) => {
  const isMobile = useIsMobile();
  
  const tools = [
    { id: 'select' as EditorTool, icon: MousePointer, label: 'Select' },
    { id: 'crop' as EditorTool, icon: Crop, label: 'Crop' },
    { id: 'adjust' as EditorTool, icon: Sliders, label: 'Adjust' },
    { id: 'filter' as EditorTool, icon: Filter, label: 'Filter' },
    { id: 'rotate' as EditorTool, icon: RotateCw, label: 'Rotate' },
  ];

  return (
    <div className="flex items-center justify-between p-4 border-b bg-white overflow-x-auto">
      <div className={`flex items-center ${isMobile ? 'space-x-1' : 'space-x-2'}`}>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? 'default' : 'outline'}
              size={isMobile ? 'sm' : 'sm'}
              onClick={() => onToolChange(tool.id)}
              className={`flex items-center ${isMobile ? 'px-2' : 'space-x-2'}`}
            >
              <Icon className="h-4 w-4" />
              {!isMobile && <span>{tool.label}</span>}
            </Button>
          );
        })}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className={`flex items-center ${isMobile ? 'px-2' : 'space-x-2'}`}
        >
          <Undo2 className="h-4 w-4" />
          {!isMobile && <span>Reset</span>}
        </Button>
      </div>
    </div>
  );
};
