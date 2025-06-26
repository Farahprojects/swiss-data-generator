
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TextFormattingToolbar } from './TextFormattingToolbar';
import { useTextEditor, TextFormatting } from '@/hooks/useTextEditor';

interface EnhancedInlineTextProps {
  value: string;
  onChange: (value: string) => void;
  onFormattingChange?: (formatting: TextFormatting) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  editClassName?: string;
  isEditable?: boolean;
  fieldName: string;
  formatting?: TextFormatting;
  onCustomizationChange?: (field: string, value: any) => void;
}

export const EnhancedInlineText: React.FC<EnhancedInlineTextProps> = ({
  value,
  onChange,
  onFormattingChange,
  placeholder = "Click to edit",
  multiline = false,
  className = "",
  editClassName = "",
  isEditable = true,
  fieldName,
  formatting = {},
  onCustomizationChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | undefined>();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { 
    updateFormatting, 
    getFontFamilies, 
    getFontSizes, 
    getFontWeights 
  } = useTextEditor({ onCustomizationChange });

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      
      // Position toolbar
      const rect = inputRef.current.getBoundingClientRect();
      setToolbarPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isEditable) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    setShowToolbar(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowToolbar(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Enter' && multiline && e.metaKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleClickOutside = (e: React.FocusEvent) => {
    // Don't close if clicking on toolbar
    const target = e.relatedTarget as Element;
    if (target && target.closest('[data-toolbar]')) {
      return;
    }
    handleSave();
  };

  const handleFormattingChange = (newFormatting: TextFormatting) => {
    if (onFormattingChange) {
      onFormattingChange(newFormatting);
    }
    updateFormatting(fieldName, newFormatting);
  };

  const getComputedStyle = (): React.CSSProperties => {
    return {
      fontFamily: formatting.fontFamily || 'inherit',
      fontSize: formatting.fontSize || 'inherit',
      color: formatting.color || 'inherit',
      fontWeight: formatting.fontWeight || 'inherit',
      textAlign: (formatting.textAlign as React.CSSProperties['textAlign']) || 'inherit',
    };
  };

  if (!isEditable) {
    return (
      <span className={className} style={getComputedStyle()}>
        {value || placeholder}
      </span>
    );
  }

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <div ref={containerRef} className="relative">
        <InputComponent
          ref={inputRef as any}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleClickOutside}
          className={cn(
            "bg-white border-2 border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            multiline && "resize-none min-h-[60px]",
            editClassName
          )}
          style={{
            ...getComputedStyle(),
            width: '100%'
          }}
          rows={multiline ? 3 : undefined}
        />
        
        <TextFormattingToolbar
          formatting={formatting}
          onFormattingChange={handleFormattingChange}
          fontFamilies={getFontFamilies()}
          fontSizes={getFontSizes()}
          fontWeights={getFontWeights()}
          isVisible={showToolbar}
          position={toolbarPosition}
        />
      </div>
    );
  }

  return (
    <span
      onClick={handleStartEdit}
      className={cn(
        "cursor-text hover:bg-blue-50 hover:bg-opacity-50 rounded px-1 py-0.5 transition-colors duration-200 min-h-[1.5em] inline-block",
        !value && "text-gray-400",
        className
      )}
      style={getComputedStyle()}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
};
