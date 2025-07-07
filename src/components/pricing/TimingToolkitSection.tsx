import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Star, Focus, Brain } from "lucide-react";

interface TimingToolkitSectionProps {
  getPriceById: (id: string) => any;
  formatPrice: (price: number) => string;
}

const timingInsights = [
  {
    icon: <TrendingUp className="w-8 h-8 text-gray-600" />,
    title: "Flow",
    desc: "Daily/weekly energy forecast to optimize session timing.",
    priceId: 'flow'
  },
  {
    icon: <Focus className="w-8 h-8 text-gray-600" />,
    title: "Focus",
    desc: "Pinpoint career and personal themes for coaching goals.",
    priceId: 'focus'
  },
  {
    icon: <Brain className="w-8 h-8 text-gray-600" />,
    title: "Mindset",
    desc: "Cognitive patterns & client communication style.",
    priceId: 'mindset'
  },
  {
    icon: <Star className="w-8 h-8 text-gray-600" />,
    title: "Monthly",
    desc: "Month-ahead game plan for growth and breakthroughs.",
    priceId: 'monthly'
  },
];

const TimingToolkitSection = ({ getPriceById, formatPrice }: TimingToolkitSectionProps) => (
  <div>
    <h2 className="text-2xl font-light mb-6 mt-16 text-center text-gray-900 tracking-tight">Timing & Guidance Toolkit</h2>
    <p className="max-w-xl mx-auto text-center text-gray-600 mb-10 font-light">Add individual timing insights to your coaching sessions for laser-focused guidance.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {timingInsights.map(({ icon, title, desc, priceId }) => {
        const priceData = getPriceById(priceId);
        const price = priceData?.unit_price_usd || 0;
        
        return (
          <Card key={title} className="shadow-sm border-gray-200 border flex flex-col h-full bg-white">
            <CardHeader className="flex flex-row items-start gap-4">
              <Badge className="bg-white text-black border border-gray-300 px-3 py-1 font-light transition-colors duration-200 hover:bg-black hover:text-white">Timing Tool</Badge>
              <div className="ml-auto">{icon}</div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow pt-0">
              <CardTitle className="text-2xl mb-2 font-light text-gray-900 tracking-tight">{title}</CardTitle>
              <CardDescription className="text-gray-700 mb-4 font-light">{desc}</CardDescription>
              <div className="flex flex-col md:flex-row md:items-end md:gap-4 mt-auto">
                <div className="text-3xl font-light text-gray-900">
                  {price > 0 ? formatPrice(price) : '$--'}
                </div>
                <span className="text-gray-500 text-sm mt-1 md:mt-0 font-light">per insight</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
    <div className="flex justify-center mt-12">
      <button
        className="bg-black text-white px-10 py-5 text-lg font-light rounded-xl shadow transition-all duration-300 hover:bg-gray-900 hover:scale-105 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gray-400"
      >
        Start
      </button>
    </div>
  </div>
);

export default TimingToolkitSection;
