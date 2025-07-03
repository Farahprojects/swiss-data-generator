
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Focus, Brain } from "lucide-react";

const timingInsights = [
  {
    icon: <TrendingUp className="w-8 h-8 text-primary" />,
    title: "Flow",
    desc: "Daily/weekly energy forecast to optimize session timing.",
  },
  {
    icon: <Focus className="w-8 h-8 text-primary" />,
    title: "Focus",
    desc: "Pinpoint career and personal themes for coaching goals.",
  },
  {
    icon: <Brain className="w-8 h-8 text-primary" />,
    title: "Mindset",
    desc: "Cognitive patterns & client communication style.",
  },
  {
    icon: <Star className="w-8 h-8 text-primary" />,
    title: "Monthly",
    desc: "Month-ahead game plan for growth and breakthroughs.",
  },
];

const TimingToolkitSection = () => (
  <div>
    <h2 className="text-2xl font-light mb-6 mt-16 text-center text-gray-900 tracking-tight">Timing & Guidance Toolkit</h2>
    <p className="max-w-xl mx-auto text-center text-gray-600 mb-10 font-light">Add individual timing insights to your coaching sessions for laser-focused guidance.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {timingInsights.map(({ icon, title, desc }) => (
        <Card key={title} className="shadow-lg border-primary/80 border-2 flex flex-col h-full">
          <CardHeader className="flex flex-row items-start gap-4">
            <Badge className="bg-primary/90 text-white px-3 py-1">Timing Tool</Badge>
            <div className="ml-auto">{icon}</div>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow pt-0">
            <CardTitle className="text-2xl mb-2 font-light text-gray-900 tracking-tight">{title}</CardTitle>
            <CardDescription className="text-gray-700 mb-4 font-light">{desc}</CardDescription>
            <div className="flex flex-col md:flex-row md:items-end md:gap-4 mt-auto">
              <div className="text-3xl font-light text-gray-900">$15</div>
              <span className="text-gray-500 text-sm mt-1 md:mt-0 font-light">per insight</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default TimingToolkitSection;
