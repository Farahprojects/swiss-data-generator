
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Clock, Sparkles, BrainCog, Compass } from "lucide-react";

const timingReports = [
  {
    title: "Flow",
    icon: <Sparkles className="w-6 h-6 text-blue-400" />,
    description: "Reveal the optimal energy for today's actions and opportunities.",
    price: "$15"
  },
  {
    title: "Monthly",
    icon: <Clock className="w-6 h-6 text-teal-500" />,
    description: "A monthly astrological forecast for big-picture planning.",
    price: "$15"
  },
  {
    title: "Focus",
    icon: <Compass className="w-6 h-6 text-purple-500" />,
    description: "Clarity on purpose, key lessons, and your next best move.",
    price: "$15"
  },
  {
    title: "Mindset",
    icon: <BrainCog className="w-6 h-6 text-amber-500" />,
    description: "Uncover your mental superpowers and communication style.",
    price: "$15"
  },
]

export function TimingMasterySection() {
  return (
    <div>
      <h2 className="text-2xl font-extrabold text-center mb-6 text-secondary-foreground">Timing Mastery</h2>
      <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">Unlock actionable guidance exactly when you need it. Each report dives into a unique layer of timing—mix, match, or collect them all!</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {timingReports.map(report => (
          <Card 
            key={report.title}
            className="flex flex-col items-center justify-between py-6 hover:shadow-lg border-2"
          >
            <CardHeader>
              <div className="flex justify-center mb-2">{report.icon}</div>
              <CardTitle className="text-xl">{report.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <p className="text-gray-600 mb-4 min-h-[64px] text-center">{report.description}</p>
              <div className="text-lg font-bold text-primary">{report.price}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
