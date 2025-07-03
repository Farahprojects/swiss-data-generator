
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  email: string;
  isValid: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const EmailInput: React.FC<Props> = ({
  email,
  isValid,
  onChange,
  onFocus,
  disabled = false,
  placeholder = "Enter your email",
}) => (
  <div className="space-y-2">
    <Label htmlFor="email" className="text-sm font-light text-gray-700">Email Address</Label>

    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      disabled={disabled}
      placeholder={placeholder}
      className={`h-12 rounded-xl border-gray-200 bg-gray-50/50 font-light placeholder:text-gray-400 focus:border-gray-900 focus:bg-white transition-all duration-300 ${!isValid && email ? "border-red-300 bg-red-50/30" : ""}`}
      required
    />

    {!isValid && email && (
      <p className="text-xs text-red-500 font-light">Please enter a valid email address</p>
    )}
  </div>
);

export default EmailInput;
