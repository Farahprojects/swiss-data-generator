
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const SupportCard = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Support</CardTitle>
        <CardDescription>Need help?</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-2">
          Having an issue or question about our API?
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Documentation</Button>
        <Button>Contact Support</Button>
      </CardFooter>
    </Card>
  );
};
