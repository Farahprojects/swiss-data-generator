
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface InlineEditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  editClassName?: string;
  isEditable?: boolean;
  onEditStart?: () => void;
  onEditEnd?: () => void;
}

export const InlineEditableText: React.FC<InlineEditableTextProps> = ({
  value,
  onChange,
  placeholder = "Click to edit",
  multiline = false,
  className = "",
  editClassName = "",
  isEditable = true,
  onEditStart,
  onEditEnd
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (!isEditable) return;
    setIsEditing(true);
    setEditValue(value);
    onEditStart?.();
  };

  const handleSave = () => {
    onChange(editValue);
    setIsEditing(false);
    onEditEnd?.();
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
    onEditEnd?.();
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
    if (!inputRef.current?.contains(e.relatedTarget as Node)) {
      handleSave();
    }
  };

  if (!isEditable) {
    return <span className={className}>{value || placeholder}</span>;
  }

  if (isEditing) {
    const InputComponent = multiline ? 'textarea' : 'input';
    
    return (
      <InputComponent
        ref={inputRef as any}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleClickOutside}
        className={cn(
          "bg-white border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          multiline && "resize-none min-h-[60px]",
          editClassName
        )}
        style={{
          fontSize: 'inherit',
          fontFamily: 'inherit',
          fontWeight: 'inherit',
          lineHeight: 'inherit',
          color: 'inherit',
          width: '100%'
        }}
        rows={multiline ? 3 : undefined}
      />
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
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
};
