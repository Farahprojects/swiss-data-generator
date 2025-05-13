
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Info } from "lucide-react";

export const SupportCard = () => {
  return (
    <Card className="overflow-hidden border-2 border-gray-100">
      <div className="bg-gradient-to-r from-primary/10 to-transparent p-1"></div>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Info className="h-5 w-5 text-primary" />
          Support
        </CardTitle>
        <CardDescription>Need help?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">
          Having an issue or question about our API? Our support team is ready to help you with any technical concerns or inquiries.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between gap-3">
        <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary/10 flex-1">Documentation</Button>
        <Button className="flex-1">Contact Support</Button>
      </CardFooter>
    </Card>
  );
};
