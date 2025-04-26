
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const BillingSection = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
              <div>
                <h3 className="font-medium">Professional Plan</h3>
                <p className="text-sm text-gray-500">50,000 API calls/month</p>
              </div>
              <div className="text-right">
                <p className="font-bold">$79/month</p>
                <p className="text-sm text-gray-500">Next billing: May 25, 2023</p>
              </div>
            </div>
            <div className="pt-2 space-y-4">
              <div className="flex justify-between">
                <Button variant="outline">Change Plan</Button>
                <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
                  Cancel Subscription
                </Button>
              </div>
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

      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>View your previous invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Date</th>
                  <th className="text-left py-3 px-4 font-medium">Description</th>
                  <th className="text-left py-3 px-4 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">Apr 25, 2023</td>
                  <td className="py-3 px-4">Professional Plan - Monthly</td>
                  <td className="py-3 px-4">$79.00</td>
                  <td className="py-3 px-4">
                    <a href="#" className="text-primary hover:underline">PDF</a>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Mar 25, 2023</td>
                  <td className="py-3 px-4">Professional Plan - Monthly</td>
                  <td className="py-3 px-4">$79.00</td>
                  <td className="py-3 px-4">
                    <a href="#" className="text-primary hover:underline">PDF</a>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Feb 25, 2023</td>
                  <td className="py-3 px-4">Professional Plan - Monthly</td>
                  <td className="py-3 px-4">$79.00</td>
                  <td className="py-3 px-4">
                    <a href="#" className="text-primary hover:underline">PDF</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
