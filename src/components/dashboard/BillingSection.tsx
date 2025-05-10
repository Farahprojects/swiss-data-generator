
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

// Mock data - this would come from an API in a real app
const mockData = {
  currentBalance: 250,
  apiCallsRemaining: 5000,
  costPerCall: 0.05,
  transactions: [
    { id: "tx_123", date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), amount: 100, description: "API Credits Top-up" },
    { id: "tx_456", date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), amount: 200, description: "API Credits Top-up" },
    { id: "tx_789", date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), amount: 50, description: "API Credits Top-up" },
  ]
};

export const BillingSection = () => {
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  
  const handleTopup = async () => {
    setIsProcessingTopup(true);
    
    try {
      // In a real app, this would call an API endpoint to initiate the topup process
      // For example: await supabase.functions.invoke('create-topup-checkout')
      
      toast.success("Redirecting to payment page...");
      setTimeout(() => {
        setIsProcessingTopup(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to initiate topup:", error);
      toast.error("Could not process topup. Please try again.");
      setIsProcessingTopup(false);
    }
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>API Credits Balance</CardTitle>
          <CardDescription>Your current API credits and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h3 className="font-medium">Current Balance</h3>
                <p className="text-sm text-gray-500">{mockData.apiCallsRemaining} API calls remaining</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${mockData.currentBalance.toFixed(2)}</p>
                <p className="text-sm text-gray-500">${mockData.costPerCall.toFixed(3)} per API call</p>
              </div>
            </div>
            <div className="pt-2">
              <Button 
                onClick={handleTopup}
                disabled={isProcessingTopup}
                className="flex items-center gap-2"
              >
                <PlusCircle size={16} />
                {isProcessingTopup ? "Processing..." : "Top-up Credits"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Manage your payment settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-8 bg-gray-800 rounded mr-4"></div>
                <span>•••• •••• •••• 4242</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Expires 09/25</span>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline">Update Payment Method</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your recent API credit purchases</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockData.transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date.toLocaleDateString()}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell>${transaction.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Button variant="link" className="p-0 h-auto">
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};
