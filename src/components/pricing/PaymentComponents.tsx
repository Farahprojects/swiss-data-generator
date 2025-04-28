
import { PricingPlanCard } from "./PricingPlanCard";
import { AddOnToggle } from "./AddOnToggle";

export { PricingPlanCard };
export { AddOnToggle };

// Export the PricingPlanCard as PricingPlan for backward compatibility
export const PricingPlan = PricingPlanCard;

// Export the AddOnToggle as AddOnCard for backward compatibility
export const AddOnCard = AddOnToggle;
