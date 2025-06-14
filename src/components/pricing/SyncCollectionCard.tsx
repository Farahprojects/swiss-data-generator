
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { HeartHandshake } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function SyncCollectionCard() {
  return (
    <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all duration-200 h-full bg-gradient-to-br from-pink-50/60 via-rose-50/60 to-orange-50/50">
      <div className="absolute -top-3 -right-3">
        <Badge className="bg-rose-500 text-white px-4 py-1 text-base shadow-md flex items-center gap-1">
          <HeartHandshake className="w-4 h-4" />
          Relationships
        </Badge>
      </div>
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-rose-600">
          Sync Collection
        </CardTitle>
        <CardDescription>
          <span className="block text-lg font-semibold text-gray-900 mb-1">Astrological Chemistry, Decoded</span>
          <span className="block text-md text-gray-600">
            Compare <span className="font-medium text-rose-500">Personal</span> and <span className="font-medium text-rose-500">Professional</span> compatibility with anyone—see both sides of the story from the same data.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          <ul className="space-y-2 text-gray-700 mb-2 text-sm">
            <li>
              <span className="font-semibold text-gray-900">Personal:</span> Unlock love languages, connection strengths, and attraction patterns.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Professional:</span> Optimize synergy at work, with partners, or in teams.
            </li>
          </ul>
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <div className="md:border-r md:pr-6">
              <span className="block text-lg font-bold text-rose-600">$15</span>
              <span className="block text-xs text-gray-700">Per report</span>
            </div>
            <div className="flex flex-col md:pl-6">
              <span className="block text-lg font-bold text-secondary-foreground">$25</span>
              <span className="block text-xs text-gray-700">Bundle: Both</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
