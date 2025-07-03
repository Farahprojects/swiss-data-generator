
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

/**
 * Slimmed‑down email field.
 *  – Border turns red on invalid input.
 *  – Error text appears only after the user types.
 *  – Clears parent‑level form errors through onFocus.
 */
const EmailInput: React.FC<Props> = ({
  email,
  isValid,
  onChange,
  onFocus,
  disabled = false,
  placeholder = "Enter your email",
}) => (
  <div className="space-y-2">
    <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>

    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      disabled={disabled}
      placeholder={placeholder}
      className={`h-12 ${!isValid && email ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-primary"}`}
      required
    />

    {!isValid && email && (
      <p className="text-xs text-red-600">Please enter a valid email address</p>
    )}
  </div>
);

export default EmailInput;
