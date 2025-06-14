
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EssenceSuiteCard = () => (
  <Card className="shadow-lg border-primary border-2 md:col-span-2">
    <CardHeader className="flex flex-row items-start gap-4">
      <Badge className="bg-primary text-white mb-2 px-3 py-1">Most Popular for Coaches</Badge>
      <Users className="w-8 h-8 text-primary ml-auto" />
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl mb-2">Client Essence Suite</CardTitle>
      <CardDescription className="mb-4 text-gray-700">
        <span className="font-semibold text-primary">Whole-client analysis</span>: Access <strong>Personal</strong>, <strong>Professional</strong>, and <strong>Relational</strong> insights, all from a single birth chart. 
      </CardDescription>
      <ul className="list-disc list-inside text-gray-700 mb-5">
        <li>360° coaching foundation in one step</li>
        <li>Unlock three layers of every client</li>
        <li>Personal, career, and relationship blind spots</li>
        <li>Enhances onboarding and discovery</li>
      </ul>
      <div className="flex flex-col md:flex-row md:items-end md:gap-4 mt-4">
        <div className="text-3xl font-bold text-primary">$15</div>
        <span className="text-gray-500 text-sm mt-1 md:mt-0">per client, includes all three perspectives</span>
      </div>
    </CardContent>
  </Card>
);

export default EssenceSuiteCard;
