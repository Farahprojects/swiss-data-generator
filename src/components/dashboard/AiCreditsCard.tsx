
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const AiCreditsCard = () => {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">AI Credits</CardTitle>
        <CardDescription>Available for AI-powered reports</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Current balance:</span>
          <span className="text-2xl font-bold">$0</span>
        </div>
        <p className="text-sm text-gray-500">
          AI reports are $2 per analysis
        </p>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button className="w-full bg-white text-black border-black border hover:bg-gray-100">
          Top Up Credits
        </Button>
      </CardFooter>
    </Card>
  );
};
