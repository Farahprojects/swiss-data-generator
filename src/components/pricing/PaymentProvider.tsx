
import React, { createContext, useContext } from "react";
import { useCheckout } from "@/hooks/use-checkout";
import { CheckoutSheet } from "./CheckoutSheet";

const CheckoutContext = createContext<ReturnType<typeof useCheckout> | null>(null);

export const useCheckoutWizard = () => {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error("useCheckoutWizard must be used within CheckoutProvider");
  return context;
};

export const PaymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const checkoutState = useCheckout();

  return (
    <CheckoutContext.Provider value={checkoutState}>
      {children}
      <CheckoutSheet />
    </CheckoutContext.Provider>
  );
};
