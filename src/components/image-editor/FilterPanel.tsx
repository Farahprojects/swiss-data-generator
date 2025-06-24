
import React from 'react';
import { Button } from '@/components/ui/button';
import { filters } from 'fabric';

interface FilterPanelProps {
  canvas: any;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ canvas }) => {
  const filterOptions = [
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

    let imageFilters: any[] = [];

    switch (filterType) {
      case 'grayscale':
        imageFilters = [new filters.Grayscale()];
        break;
      case 'sepia':
        imageFilters = [new filters.Sepia()];
        break;
      case 'vintage':
        imageFilters = [
          new filters.Brightness({ brightness: -0.1 }),
          new filters.Contrast({ contrast: 0.15 }),
          new filters.Sepia()
        ];
        break;
      case 'blur':
        imageFilters = [new filters.Blur({ blur: 0.1 })];
        break;
      default:
        imageFilters = [];
    }

    imageObject.filters = imageFilters;
    imageObject.applyFilters();
    canvas.renderAll();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Filters</h3>
      
      <div className="grid grid-cols-2 gap-2">
        {filterOptions.map((filter) => (
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
