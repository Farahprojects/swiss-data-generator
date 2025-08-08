// Enhanced form memory cache with sessionStorage persistence
interface FormMemoryData {
  name: string;
  email: string;
}

let formMemoryCache: FormMemoryData | null = null;

const STORAGE_KEY = 'formMemoryData';

// Load from sessionStorage on module initialization
if (typeof window !== 'undefined') {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      formMemoryCache = JSON.parse(stored);
      console.log('📖 Form memory loaded from sessionStorage:', formMemoryCache);
    }
  } catch (error) {
    console.error('Failed to load form memory from sessionStorage:', error);
  }
}

export const setFormMemory = (name: string, email: string) => {
  formMemoryCache = { name, email };
  
  // Persist to sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formMemoryCache));
      console.log('📝 Form memory stored:', formMemoryCache);
    } catch (error) {
      console.error('Failed to save form memory to sessionStorage:', error);
    }
  }
};

export const getFormMemory = (): FormMemoryData | null => {
  console.log('📖 Form memory retrieved:', formMemoryCache);
  return formMemoryCache;
};

export const clearFormMemory = () => {
  console.log('🗑️ Form memory cleared');
  formMemoryCache = null;
  
  // Clear from sessionStorage
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear form memory from sessionStorage:', error);
    }
  }
};