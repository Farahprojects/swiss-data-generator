
import { useState, useCallback } from 'react';

export interface TextFormatting {
  fontFamily?: string;
  fontSize?: string;
  color?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
}

export interface UseTextEditorProps {
  onCustomizationChange?: (field: string, value: any) => void;
}

export const useTextEditor = ({ onCustomizationChange }: UseTextEditorProps) => {
  const [activeFormatting, setActiveFormatting] = useState<TextFormatting>({});

  const updateFormatting = useCallback((field: string, formatting: TextFormatting) => {
    if (onCustomizationChange) {
      // Update the specific field's formatting
      onCustomizationChange(`${field}Formatting`, formatting);
      setActiveFormatting(formatting);
    }
  }, [onCustomizationChange]);

  const getFontFamilies = useCallback(() => [
    { value: 'Inter', label: 'Inter', category: 'Sans Serif' },
    { value: 'Arial', label: 'Arial', category: 'Sans Serif' },
    { value: 'Helvetica', label: 'Helvetica', category: 'Sans Serif' },
    { value: 'Georgia', label: 'Georgia', category: 'Serif' },
    { value: 'Times New Roman', label: 'Times New Roman', category: 'Serif' },
    { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
    { value: 'Roboto', label: 'Roboto', category: 'Sans Serif' },
    { value: 'Open Sans', label: 'Open Sans', category: 'Sans Serif' },
  ], []);

  const getFontSizes = useCallback(() => [
    { value: '12px', label: '12px' },
    { value: '14px', label: '14px' },
    { value: '16px', label: '16px' },
    { value: '18px', label: '18px' },
    { value: '20px', label: '20px' },
    { value: '24px', label: '24px' },
    { value: '28px', label: '28px' },
    { value: '32px', label: '32px' },
    { value: '36px', label: '36px' },
    { value: '48px', label: '48px' },
  ], []);

  const getFontWeights = useCallback(() => [
    { value: '300', label: 'Light' },
    { value: '400', label: 'Normal' },
    { value: '500', label: 'Medium' },
    { value: '600', label: 'Semi Bold' },
    { value: '700', label: 'Bold' },
  ], []);

  return {
    activeFormatting,
    setActiveFormatting,
    updateFormatting,
    getFontFamilies,
    getFontSizes,
    getFontWeights,
  };
};
