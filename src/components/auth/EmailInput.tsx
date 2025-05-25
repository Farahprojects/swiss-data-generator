
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  email: string;
  isValid: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  disabled?: boolean;
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
}) => (
  <div className="space-y-1">
    <Label htmlFor="email">Email</Label>

    <Input
      id="email"
      type="email"
      value={email}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      disabled={disabled}
      className={!isValid && email ? "border-red-500" : ""}
      required
    />

    {!isValid && email && (
      <p className="text-xs text-red-600">Please enter a valid email address</p>
    )}
  </div>
);

export default EmailInput;
