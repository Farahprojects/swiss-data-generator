
import React, { useState } from 'react';
import { Edit } from 'lucide-react';

interface EditableSectionProps {
  children: React.ReactNode;
  sectionId: string;
  onEdit: () => void;
  isEditable?: boolean;
  className?: string;
}

export const EditableSection: React.FC<EditableSectionProps> = ({
  children,
  sectionId,
  onEdit,
  isEditable = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditable) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <>
          <div className="absolute inset-0 border-2 border-dashed border-blue-500 pointer-events-none rounded-lg z-10" />
          <button
            onClick={onEdit}
            className="absolute top-2 right-2 bg-blue-500 text-white p-2 rounded-full shadow-lg hover:bg-blue-600 transition-colors z-20"
            title="Edit this section"
          >
            <Edit className="h-4 w-4" />
          </button>
        </>
      )}
      {children}
    </div>
  );
};
