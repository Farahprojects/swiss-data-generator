
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ApiModule {
  title: string;
  description: string;
  features: string[];
  apiCalls: string;
  planType: "starter" | "growth" | "professional";
  featured?: boolean;
}

const apiModules: ApiModule[] = [
  {
    title: "Natal Chart API",
    description: "Complete astrological calculations supporting both Western and Vedic traditions. Access comprehensive planetary positions, aspects, house systems, and essential dignities.",
    features: [
      "Western & Vedic zodiac positions",
      "Multiple house systems support",
      "Major and minor aspects",
      "Essential dignities",
      "Dashas & divisional charts (D-charts)",
      "Detailed planetary positions",
    ],
    apiCalls: "50,000 API calls/month",
    planType: "starter",
    featured: true,
  },
  {
    title: "Transit Calculations",
    description: "Comprehensive 12-month transit predictions and forecasting capabilities. Track planetary movements and predict upcoming astrological events.",
    features: [
      "12-month transit forecast",
      "Real-time planetary positions",
      "Ingress timing",
      "Aspect timing predictions",
      "Daily, weekly, monthly forecasts",
      "Customizable time spans",
    ],
    apiCalls: "200,000 API calls/month",
    planType: "growth",
    featured: true,
  },
  {
    title: "Relationship Compatibility",
    description: "Advanced synastry and relationship analysis tools. Compare charts and generate detailed compatibility insights.",
    features: [
      "Deep synastry analysis",
      "Inter-aspect calculations",
      "Composite charts",
      "Relationship scoring",
      "Compatibility reports",
      "Partnership dynamics",
    ],
    apiCalls: "750,000 API calls/month",
    planType: "professional",
  },
  {
    title: "Yearly Cycle Analysis",
    description: "Calculate and analyze major planetary returns and cycles for comprehensive life path predictions.",
    features: [
      "Solar returns",
      "Lunar returns",
      "Saturn returns",
      "Jupiter returns",
      "Progressed charts",
      "Cycle timing",
    ],
    apiCalls: "200,000 API calls/month",
    planType: "growth",
  }
];

const getPlanBadgeColor = (planType: ApiModule["planType"]) => {
  switch (planType) {
    case "starter":
      return "default";
    case "growth":
      return "secondary";
    case "professional":
      return "outline";
    default:
      return "default";
  }
};

const ApiProducts = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        <section className="container mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="mb-6 text-4xl font-bold text-primary">
              All The Cosmos in One API
            </h1>
            <p className="mx-auto mb-16 max-w-3xl text-xl text-gray-700">
              Access comprehensive astrological calculations through our Swiss-Ephemeris powered API.
              Choose the endpoints you need and scale as you grow.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {apiModules.map((module, index) => (
              <Card 
                key={index} 
                className={`relative flex h-full flex-col overflow-hidden border border-gray-100 transition-shadow hover:shadow-md ${
                  module.featured ? "md:col-span-2" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold">
                      {module.title}
                    </CardTitle>
                    <Badge variant={getPlanBadgeColor(module.planType)} className="capitalize">
                      {module.planType} Plan
                    </Badge>
                  </div>
                  <CardDescription className="mt-2 text-gray-700">
                    {module.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col flex-grow">
                  <div className="mb-6">
                    <h4 className="mb-3 text-lg font-semibold">Key Features</h4>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {module.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-primary">•</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <p className="text-sm text-gray-600">{module.apiCalls}</p>
                    <div className="flex gap-4">
                      <Link to="/documentation">
                        <Button variant="outline">View Docs</Button>
                      </Link>
                      <Link to="/pricing">
                        <Button>See Pricing</Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-primary py-16 text-center text-white">
          <h2 className="mb-6 text-3xl font-bold">
            Ready to harness the power of the cosmos?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl">
            Start your free 14-day trial now — no credit card required.
          </p>
          <Link to="/signup">
            <Button className="bg-white px-8 py-6 text-lg text-primary hover:bg-gray-100">
              Start Free Trial
            </Button>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ApiProducts;
