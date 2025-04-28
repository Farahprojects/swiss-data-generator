
import { Check } from "lucide-react";
import { PaymentProvider } from "./PaymentProvider";
import { PricingPlanCard } from "./PricingPlanCard";
import { AddOnToggle } from "./AddOnToggle";

export { PricingPlanCard };
export { AddOnToggle };
export { PaymentProvider };

// Re-export the context hook for convenience
export { useCheckoutWizard } from "./PaymentProvider";

// Export the AddOnToggle as AddOnCard for backward compatibility
export const AddOnCard = AddOnToggle;
// Export the PaymentProvider as CheckoutProvider for backward compatibility
export const CheckoutProvider = PaymentProvider;
