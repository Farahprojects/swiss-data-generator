
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add keyframes for payment success animation to be used in tailwind.config.js
export const paymentSuccessAnimations = {
  keyframes: {
    spin: {
      '0%': { transform: 'rotate(0deg)' },
      '100%': { transform: 'rotate(360deg)' }
    },
    scale: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.5)' },
      '100%': { transform: 'scale(1)' }
    },
    pulse: {
      '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)' },
      '70%': { transform: 'scale(1.2)', boxShadow: '0 0 0 10px rgba(34, 197, 94, 0)' },
      '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' }
    }
  },
  animation: {
    spin: 'spin 1s ease-in-out forwards',
    scale: 'scale 0.5s ease-in-out forwards',
    pulse: 'pulse 0.5s ease-in-out 0.8s forwards'
  }
}
