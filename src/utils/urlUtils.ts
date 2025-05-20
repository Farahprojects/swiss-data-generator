
/**
 * Generates an absolute URL for the given path using the current origin
 * This ensures consistency when dealing with redirects in auth flows
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = window.location.origin;
  // Remove trailing slashes from the base and leading slashes from the path
  // to ensure we don't end up with double slashes
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.replace(/^\/+/, '');
  return `${cleanBase}/${cleanPath}`;
}

/**
 * Extracts the token from a URL parameter
 * Supabase sometimes sends just 'token' and sometimes uses a full OTP token format
 * 
 * @param searchParams - The URLSearchParams object from the URL
 * @returns The token string or null if not found
 */
export function extractTokenFromUrl(searchParams: URLSearchParams): string | null {
  // Try the simple token parameter first
  const token = searchParams.get('token');
  if (token) return token;
  
  // If no simple token exists, try the longer format
  const otpToken = searchParams.get('otp');
  return otpToken;
}

/**
 * Checks if the given URL is a password reset URL
 * 
 * @param path - The URL path to check
 * @param search - The search params string from the URL
 * @returns Boolean indicating if this is a password reset URL
 */
export function isPasswordResetUrl(path: string, search: string): boolean {
  return path.includes('/auth/password') && 
         (search.includes('token=') || search.includes('otp=')) &&
         search.includes('type=recovery');
}
