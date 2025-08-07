// Simple in-memory cache for form data
interface FormMemoryData {
  name: string;
  email: string;
}

let formMemoryCache: FormMemoryData | null = null;

export const setFormMemory = (name: string, email: string) => {
  formMemoryCache = { name, email };
  console.log('📝 Form memory stored:', formMemoryCache);
};

export const getFormMemory = (): FormMemoryData | null => {
  console.log('📖 Form memory retrieved:', formMemoryCache);
  return formMemoryCache;
};

export const clearFormMemory = () => {
  console.log('🗑️ Form memory cleared');
  formMemoryCache = null;
};