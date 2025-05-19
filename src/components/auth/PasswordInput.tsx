
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { passwordRequirements } from '@/utils/authValidation';

interface PasswordInputProps {
  password: string;
  isValid: boolean;
  showRequirements?: boolean;
  onChange: (password: string) => void;
  label?: string;
  onFocus?: () => void;
  placeholder?: string;  // Added the missing placeholder prop
  id?: string;  // Added the missing id prop
}

const PasswordInput: React.FC<PasswordInputProps> = ({ 
  password, 
  isValid, 
  showRequirements = true, 
  onChange,
  label = "Password",
  onFocus,
  placeholder = "Enter your password",  // Added default value
  id
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // If an id is provided, use that; otherwise, derive from label
  const inputId = id || label.toLowerCase().replace(/\s/g, '-');

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`mt-1 pr-10 ${!isValid && password ? 'border-red-500' : ''}`}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      
      {showRequirements && password.length > 0 && (
        <div className="mt-2 space-y-1">
          {passwordRequirements.map((req) => (
            <div 
              key={req.key} 
              className={`text-xs flex items-center ${req.validate(password) ? 'text-green-600' : 'text-gray-600'}`}
            >
              <span className="mr-1">•</span> {req.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordInput;
