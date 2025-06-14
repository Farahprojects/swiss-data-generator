
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const RelationshipDynamicsCard = () => (
  <Card className="shadow-lg border-primary/80 border-2">
    <CardHeader className="flex flex-row items-start gap-4">
      <Badge className="bg-primary/90 text-white mb-2 px-3 py-1">Unlock Compatibility</Badge>
      <Users className="w-8 h-8 text-primary ml-auto" />
    </CardHeader>
    <CardContent>
      <CardTitle className="text-2xl mb-2">Relationship Dynamics Suite</CardTitle>
      <CardDescription className="mb-4 text-gray-700">
        <span className="font-semibold">Personal &amp; Professional Compatibility</span>: Get two types of compatibility insights for any pair — ideal for coaching on love, business partnerships, or team dynamics.
      </CardDescription>
      <ul className="list-disc list-inside text-gray-700 mb-5">
        <li>Support clients through relationship transitions</li>
        <li>Enhance group, couple, or workplace coaching</li>
        <li>Address personal &amp; career chemistry together</li>
      </ul>
      <div className="flex flex-col md:flex-row md:items-end md:gap-4 mt-4">
        <div className="text-3xl font-bold text-primary">$15</div>
        <span className="text-gray-500 text-sm mt-1 md:mt-0">per analysis (includes both angles)</span>
      </div>
    </CardContent>
  </Card>
);

export default RelationshipDynamicsCard;
