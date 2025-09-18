
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function InlineToast() {
  const { message, clearToast } = useToast();
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (message) {
      setVisible(true);
      
      // Auto-hide success and default messages after 5 seconds
      if (message.variant !== "destructive") {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(clearToast, 300); // Clear after animation
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [message, clearToast]);
  
  if (!message) return null;
  
  const handleClose = () => {
    setVisible(false);
    setTimeout(clearToast, 300); // Clear after animation
  };
  
  const getIcon = () => {
    switch (message.variant) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "destructive":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-primary" />;
    }
  };
  
  return (
    <div className="fixed bottom-0 inset-x-0 pb-6 flex justify-center pointer-events-none z-50">
      <Card 
        className={cn(
          "bg-white shadow-lg rounded-lg pointer-events-auto max-w-md w-full mx-4 overflow-hidden transition-all duration-300",
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <div className="p-4 flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            {getIcon()}
          </div>
          <div className="ml-3 w-0 flex-1">
            {message.title && (
              <p className="text-sm font-medium text-gray-900">
                {message.title}
              </p>
            )}
            {message.description && (
              <p className="mt-1 text-sm text-gray-500">
                {message.description}
              </p>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-md inline-flex text-gray-400 hover:text-gray-500"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
