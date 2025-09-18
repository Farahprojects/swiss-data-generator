
// This file now only handles Stripe return paths and standardized link names
// Database queries for links have been removed since we're using direct checkout sessions

/**
 * Common link types used in the application
 * This helps standardize link name references across the app
 */
export const STRIPE_LINK_TYPES = {
  API_CREDITS_TOPUP: 'API Credits Top-up',
  MANAGE_SUBSCRIPTION: 'Manage Subscription',
  UPDATE_PAYMENT_METHOD: 'Update Payment Method',
  PLAN_PREFIX: 'Plan',
  ADDON_PREFIX: 'Addon'
};

/**
 * Gets the standard link name format that should be used
 * Based on the type of link and optional identifier
 * @param type The link type (e.g., "Plan", "Addon", "Payment")
 * @param identifier Optional identifier (e.g., plan name, addon name)
 */
export const getStandardLinkName = (type: string, identifier?: string): string => {
  if (identifier) {
    return `${type} ${identifier}`;
  }
  return type;
};

/**
 * Stores the current location before redirecting to Stripe
 * @param path The path to return to after Stripe checkout
 */
export const storeStripeReturnPath = (path: string): void => {
  try {
    // Make sure we're storing the full path including query params
    localStorage.setItem('stripe_return_location', path);
    console.log(`Stored Stripe return location: ${path}`);
  } catch (e) {
    console.error('Error storing Stripe return location:', e);
  }
};

/**
 * Gets the stored return location for Stripe redirect
 * @param defaultPath Default path to return to if no stored location
 */
export const getStripeReturnLocation = (defaultPath: string = '/settings'): string => {
  try {
    const storedLocation = localStorage.getItem('stripe_return_location');
    if (storedLocation) {
      // Remove the stored location after retrieving it
      localStorage.removeItem('stripe_return_location');
      return storedLocation;
    }
  } catch (e) {
    console.error('Error retrieving Stripe return location:', e);
  }
  // Default to settings page
  return defaultPath;
};
