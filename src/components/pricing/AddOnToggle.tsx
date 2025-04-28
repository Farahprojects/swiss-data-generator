
import React from "react";

interface AddOnToggleProps {
  label: string;
}

export const AddOnToggle: React.FC<AddOnToggleProps> = ({ label }) => {
  const [checked, setChecked] = React.useState(false);
  
  const displayName = {
    'Transits': 'Transits',
    'Yearly Cycle': 'Yearly Cycle',
    'Relationship Compatibility': 'Relationship Compatibility',
    'relationship compatibility': 'Relationship Compatibility'
  }[label] || label;

  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-6 transition-all duration-200 hover:border-primary/50 hover:shadow-sm">
      <div className="space-y-2">
        <span className="text-lg font-semibold text-primary">{displayName}</span>
        <p className="text-sm text-gray-600">Enhance your analytics with advanced insights and predictive features.</p>
      </div>
      <input
        type="checkbox"
        className="h-6 w-6 rounded-md accent-primary"
        checked={checked}
        onChange={() => setChecked(!checked)}
      />
    </label>
  );
};
