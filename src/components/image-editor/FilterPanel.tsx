
import React from 'react';
import { Button } from '@/components/ui/button';

interface FilterPanelProps {
  canvas: any;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ canvas }) => {
  const filters = [
    { name: 'None', action: () => applyFilter('none') },
    { name: 'Grayscale', action: () => applyFilter('grayscale') },
    { name: 'Sepia', action: () => applyFilter('sepia') },
    { name: 'Vintage', action: () => applyFilter('vintage') },
    { name: 'Blur', action: () => applyFilter('blur') },
  ];

  const applyFilter = (filterType: string) => {
    if (!canvas) return;

    const objects = canvas.getObjects();
    const imageObject = objects.find((obj: any) => obj.type === 'image');
    
    if (!imageObject) return;

    let filters: any[] = [];

    switch (filterType) {
      case 'grayscale':
        filters = [new (fabric as any).Image.filters.Grayscale()];
        break;
      case 'sepia':
        filters = [new (fabric as any).Image.filters.Sepia()];
        break;
      case 'vintage':
        filters = [
          new (fabric as any).Image.filters.Brightness({ brightness: -0.1 }),
          new (fabric as any).Image.filters.Contrast({ contrast: 0.15 }),
          new (fabric as any).Image.filters.Sepia()
        ];
        break;
      case 'blur':
        filters = [new (fabric as any).Image.filters.Blur({ blur: 0.1 })];
        break;
      default:
        filters = [];
    }

    imageObject.filters = filters;
    imageObject.applyFilters();
    canvas.renderAll();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Filters</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {filters.map((filter) => (
          <Button
            key={filter.name}
            variant="outline"
            size="sm"
            onClick={filter.action}
            className="w-full"
          >
            {filter.name}
          </Button>
        ))}
      </div>

      <div className="text-sm text-gray-600">
        <p>Click on a filter to preview it on your image. You can switch between filters to find the perfect look.</p>
      </div>
    </div>
  );
};
