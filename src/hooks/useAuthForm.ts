
import { useState, useEffect } from 'react';
import { validateEmail, validatePassword, validatePasswordMatch } from '@/utils/authValidation';

interface AuthFormState {
  email: string;
  password: string;
  confirmPassword: string;
  emailValid: boolean;
  passwordValid: boolean;
  passwordsMatch: boolean;
  showConfirmPassword: boolean;
  formValid: boolean;
}

export const useAuthForm = (isSignup: boolean) => {
  const [formState, setFormState] = useState<AuthFormState>({
    email: '',
    password: '',
    confirmPassword: '',
    emailValid: false,
    passwordValid: false,
    passwordsMatch: false,
    showConfirmPassword: false,
    formValid: false,
  });

  const updateEmail = (email: string) => {
    const emailValid = validateEmail(email);
    setFormState(prev => ({
      ...prev,
      email,
      emailValid,
    }));
  };

  const updatePassword = (password: string) => {
    const passwordValid = validatePassword(password);
    const passwordsMatch = validatePasswordMatch(password, formState.confirmPassword);
    const showConfirmPassword = password.length > 0 && isSignup;
    
    setFormState(prev => ({
      ...prev,
      password,
      passwordValid,
      passwordsMatch,
      showConfirmPassword,
    }));
  };

  const updateConfirmPassword = (confirmPassword: string) => {
    const passwordsMatch = validatePasswordMatch(formState.password, confirmPassword);
    setFormState(prev => ({
      ...prev,
      confirmPassword,
      passwordsMatch,
    }));
  };

  useEffect(() => {
    // For login, we only need valid email and password
    // For signup, we need email, password, and matching passwords (if shown)
    const formValid = formState.emailValid && formState.passwordValid && 
      (!isSignup || !formState.showConfirmPassword || formState.passwordsMatch);
      
    setFormState(prev => ({
      ...prev,
      formValid,
    }));
  }, [formState.emailValid, formState.passwordValid, formState.passwordsMatch, formState.showConfirmPassword, isSignup]);

  return {
    formState,
    updateEmail,
    updatePassword,
    updateConfirmPassword,
  };
};
