
import { BillingSection } from "@/components/dashboard/BillingSection";

export const BillingPanel = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Billing & Credits</h3>
        <p className="text-sm text-gray-500">
          Manage your payment methods, view transaction history, and monitor your credit balance.
        </p>
      </div>
      <BillingSection />
    </div>
  );
};
