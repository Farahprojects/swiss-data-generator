import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ApiProducts = () => {
  const apiModules = [
    {
      title: "Western Natal Chart API",
      description: "Complete Western astrology calculations including aspects, house systems, and essential dignities. Perfect for modern astrological applications.",
      features: [
        "Tropical zodiac positions",
        "Multiple house systems",
        "Major and minor aspects",
        "Essential dignities",
        "Midpoints calculation",
        "Part calculations"
      ],
      icon: "⭐",
      featured: true
    },
    {
      title: "Vedic Natal Chart API",
      description: "Comprehensive Vedic astrology calculations including dashas, yogas, and traditional divisional charts (D-charts). Full planetary positions with dignity calculations.",
      features: [
        "Planetary positions in Vedic zodiac",
        "Dasha calculations (Vimshottari)",
        "Divisional charts (D-1 to D-60)",
        "Ashtakavarga calculations",
        "Yogas and combinations",
        "Dignity & strength calculations"
      ],
      icon: "🕉️",
      featured: true
    },
    {
      title: "Transit Calculations",
      description: "Real-time planetary transit data with customizable time spans. Get daily, weekly, or monthly forecasts with precise timing.",
      features: ["Current planetary positions", "Ingress timing", "Aspect timing", "Customizable periods"],
      icon: "🌠",
    },
    {
      title: "Synastry Chart",
      description: "Detailed relationship compatibility analysis between two natal charts, including interaspects, composite charts, and more.",
      features: ["Interaspect analysis", "Composite charts", "Midpoints", "Compatibility scoring"],
      icon: "💫",
    },
    {
      title: "Progressed Chart",
      description: "Secondary progressions and solar arc directions for predictive astrology. Track the evolution of a natal chart over time.",
      features: ["Secondary progressions", "Solar arc directions", "Progressed lunar phases", "Progressed aspects"],
      icon: "⭐",
    },
    {
      title: "Planetary Positions & Aspects",
      description: "Precise planetary positions at any given time, including minor planets, asteroids, and fixed stars, with aspect calculations.",
      features: ["Heliocentric & geocentric", "Fixed stars", "Asteroids", "Minor planets"],
      icon: "🪐",
    },
    {
      title: "Moon Phases",
      description: "Accurate lunar phase calculations with precise timing. Includes new moons, full moons, quarters, and void-of-course periods.",
      features: ["All lunar phases", "Void-of-course timing", "Lunar mansions", "Eclipse data"],
      icon: "🌙",
    },
    {
      title: "Return Charts",
      description: "Calculate various planetary returns, including Saturn return, Jupiter return, Solar return, and other significant cyclical events.",
      features: ["Solar returns", "Lunar returns", "Saturn returns", "Jupiter returns"],
      icon: "♄",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-6">API Products</h1>
              <p className="text-xl text-gray-700 mb-8">
                Our comprehensive suite of astrological calculation modules,
                powered by Swiss Ephemeris for unmatched precision.
              </p>
            </div>
          </div>
        </section>

        {/* API Modules Grid */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {apiModules.map((module, index) => (
                <div key={index} className="border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex flex-col h-full">
                    <div className="p-8">
                      <div className="flex items-center mb-4">
                        <div className="text-4xl mr-4">{module.icon}</div>
                        <h3 className="text-2xl font-bold">{module.title}</h3>
                      </div>
                      <p className="text-gray-700 mb-6">{module.description}</p>
                      
                      <h4 className="text-lg font-semibold mb-3">Key Features:</h4>
                      <ul className="grid grid-cols-1 gap-2 mb-8">
                        {module.features.map((feature, i) => (
                          <li key={i} className="flex items-center">
                            <svg className="w-5 h-5 text-primary mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                            </svg>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="flex space-x-4 mt-auto">
                        <Link to="/documentation">
                          <Button variant="outline">View Documentation</Button>
                        </Link>
                        <Link to="/pricing">
                          <Button>Pricing</Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-accent">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to integrate with Theraiapi?
            </h2>
            <p className="text-lg mb-8 max-w-2xl mx-auto">
              Start building with our high-precision astrological API today.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button className="text-lg px-8 py-6">Start Free Trial</Button>
              </Link>
              <Link to="/documentation">
                <Button variant="outline" className="text-lg px-8 py-6">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ApiProducts;
