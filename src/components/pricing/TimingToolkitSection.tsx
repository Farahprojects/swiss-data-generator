
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Focus, Brain } from "lucide-react";

const timingInsights = [
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "Flow",
    desc: "Daily/weekly energy forecast to optimize session timing.",
  },
  {
    icon: <Focus className="w-6 h-6 text-primary" />,
    title: "Focus",
    desc: "Pinpoint career and personal themes for coaching goals.",
  },
  {
    icon: <Brain className="w-6 h-6 text-primary" />,
    title: "Mindset",
    desc: "Cognitive patterns & client communication style.",
  },
  {
    icon: <Star className="w-6 h-6 text-primary" />,
    title: "Monthly",
    desc: "Month-ahead game plan for growth and breakthroughs.",
  },
];

const TimingToolkitSection = () => (
  <div>
    <h2 className="text-xl font-bold mb-2 mt-10">Timing & Guidance Toolkit</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {timingInsights.map(({ icon, title, desc }) => (
        <Card key={title} className="flex flex-col border-primary/40 border-2 h-full">
          <CardHeader className="flex flex-row items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-gray-700 mb-3">{desc}</CardDescription>
            <div className="flex flex-col mt-3">
              <span className="text-2xl font-bold text-primary">$15</span>
              <span className="text-gray-500 text-xs">per insight</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default TimingToolkitSection;
