
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export function EssenceCollectionCard() {
  return (
    <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-200 h-full bg-gradient-to-br from-blue-50/60 via-indigo-50/60 to-fuchsia-50/50">
      <div className="absolute -top-3 -right-3">
        <Badge className="bg-primary text-white px-4 py-1 text-base shadow-md">
          <Star className="w-4 h-4 mr-1" />
          Most Popular
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-primary">
          Essence Collection
        </CardTitle>
        <CardDescription>
          <span className="block text-lg font-semibold text-gray-900 mb-1">Discover Your Complete Self</span>
          <span className="block text-md text-gray-600">
            Three unique perspectives – <span className="font-medium text-primary">Personal</span>, <span className="font-medium text-primary">Professional</span>, <span className="font-medium text-primary">Relational</span> – all drawn from your cosmic blueprint.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          <ul className="space-y-2 text-gray-700 mb-2 text-sm">
            <li>
              <span className="font-semibold text-gray-900">Personal:</span> Your core motivations and the authentic you.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Professional:</span> How you shine and grow in work & purpose.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Relational:</span> Your natural style in love, friendship, and teamwork.
            </li>
          </ul>
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="md:border-r md:pr-6">
              <span className="block text-lg font-bold text-primary">$15</span>
              <span className="block text-xs text-gray-700">Per report</span>
            </div>
            <div className="flex flex-col md:pl-6">
              <span className="block text-lg font-bold text-secondary-foreground">$35</span>
              <span className="block text-xs text-gray-700">Bundle: All 3</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
