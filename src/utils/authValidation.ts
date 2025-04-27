
// Email regex pattern for validation
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password validation
export const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;

export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return passwordRegex.test(password);
};

export const validatePasswordMatch = (password: string, confirmPassword: string): boolean => {
  return password === confirmPassword && password.length > 0;
};

// Password requirements explanation
export const passwordRequirements = [
  { key: "length", text: "At least 8 characters", validate: (p: string) => p.length >= 8 },
  { key: "number", text: "At least one number", validate: (p: string) => /[0-9]/.test(p) },
  { key: "special", text: "At least one special character", validate: (p: string) => /[!@#$%^&*]/.test(p) },
];
