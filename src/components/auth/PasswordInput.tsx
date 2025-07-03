
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { passwordRequirements } from '@/utils/authValidation';
import { logToSupabase } from '@/utils/batchedLogManager';

interface PasswordInputProps {
  password: string;
  isValid: boolean;
  showRequirements?: boolean;
  onChange: (password: string) => void;
  label?: string;
  onFocus?: () => void;
  placeholder?: string;
  id?: string;
  showMatchError?: boolean;
  disabled?: boolean;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ 
  password, 
  isValid, 
  showRequirements = true, 
  onChange,
  label = "",
  onFocus,
  placeholder = "Enter your password",
  id,
  showMatchError = false,
  disabled = false
}) => {
  const [showPassword, setShowPassword] = useState(false);

  // If an id is provided, use that; otherwise, derive from label
  const inputId = id || label.toLowerCase().replace(/\s/g, '-');

  const togglePasswordVisibility = () => {
    logToSupabase('Password visibility toggled', {
      level: 'debug',
      page: 'PasswordInput',
      data: { visible: !showPassword }
    });
    setShowPassword(!showPassword);
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={inputId} className="text-gray-700 font-light text-sm tracking-wide">{label}</Label>}
      <div className="relative">
        <Input
          id={inputId}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`h-12 bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 focus:border-gray-600 font-light pr-12 ${
            (!isValid && password) || showMatchError ? 'border-red-500 focus:border-red-500' : ''
          }`}
          required
          disabled={disabled}
        />
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
          tabIndex={-1}
          disabled={disabled}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      
      {showRequirements && password.length > 0 && (
        <div className="mt-2 space-y-1">
          {passwordRequirements.map((req) => (
            <div 
              key={req.key} 
              className={`text-xs flex items-center font-light ${req.validate(password) ? 'text-green-600' : 'text-gray-500'}`}
            >
              <span className="mr-1">•</span> {req.text}
            </div>
          ))}
        </div>
      )}

      {showMatchError && (
        <p className="text-xs text-red-600 mt-1 font-light">Passwords do not match</p>
      )}
    </div>
  );
};

export default PasswordInput;
