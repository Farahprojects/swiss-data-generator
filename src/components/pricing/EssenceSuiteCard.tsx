
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const EssenceSuiteCard = () => (
  <Card className="shadow-lg border-primary border-2 h-full">
    <CardHeader className="flex flex-row items-start gap-4">
      <Badge className="bg-primary text-white mb-2 px-3 py-1">Most Popular for Coaches</Badge>
      <Users className="w-8 h-8 text-primary ml-auto" />
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl mb-2 font-light text-gray-900 tracking-tight">Client Essence Suite</CardTitle>
      <CardDescription className="mb-4 text-gray-700 font-light">
        <span className="font-normal text-gray-900">Whole-client analysis</span>: Access <span className="font-normal">Personal</span>, <span className="font-normal">Professional</span>, and <span className="font-normal">Relational</span> insights, all from a single birth chart. 
      </CardDescription>
      <ul className="list-disc list-inside text-gray-700 mb-5 font-light">
        <li>360° coaching foundation in one step</li>
        <li>Unlock three layers of every client</li>
        <li>Personal, career, and relationship blind spots</li>
        <li>Enhances onboarding and discovery</li>
      </ul>
      <div className="flex flex-col md:flex-row md:items-end md:gap-4 mt-4">
        <div className="text-3xl font-light text-gray-900">$15</div>
        <span className="text-gray-500 text-sm mt-1 md:mt-0 font-light">per client, includes all three perspectives</span>
      </div>
    </CardContent>
  </Card>
);

export default EssenceSuiteCard;
