
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
