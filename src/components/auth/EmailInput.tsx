
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailInputProps {
  email: string;
  isValid: boolean;
  onChange: (email: string) => void;
}

const EmailInput: React.FC<EmailInputProps> = ({ email, isValid, onChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1 ${!isValid && email ? 'border-red-500' : ''}`}
        required
      />
      {!isValid && email && (
        <p className="text-sm text-red-500 mt-1">Please enter a valid email address</p>
      )}
    </div>
  );
};

export default EmailInput;
