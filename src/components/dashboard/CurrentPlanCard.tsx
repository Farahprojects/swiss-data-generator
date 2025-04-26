
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const CurrentPlanCard = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Current Plan</CardTitle>
        <CardDescription>Professional</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">$79/month</p>
        <p className="text-sm text-gray-500 mt-1">Next billing: May 25, 2023</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">Upgrade Plan</Button>
      </CardFooter>
    </Card>
  );
};
