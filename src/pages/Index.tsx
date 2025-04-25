
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Index = () => {
  const features = [
    {
      title: "Natal Charts",
      description: "Calculate precise natal charts with both Western and Vedic systems.",
      icon: "✨",
    },
    {
      title: "Transits",
      description: "Real-time planetary transits with accurate timing and aspects.",
      icon: "🌠",
    },
    {
      title: "Synastry",
      description: "Detailed relationship compatibility analysis between two charts.",
      icon: "💫",
    },
    {
      title: "Progressions",
      description: "Secondary progressions and solar arc directions for predictive work.",
      icon: "⭐",
    },
    {
      title: "Moon Phases",
      description: "Precise lunar phase calculations with timing and zodiacal positions.",
      icon: "🌙",
    },
    {
      title: "Return Charts",
      description: "Planetary returns including Saturn, Jupiter, Venus, and more.",
      icon: "♄",
    },
  ];

  const clients = [
    "AstroApp", "MoonTracker", "ZodiacTech", "StarGuide", "CosmicSoft"
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-b from-accent to-white py-20">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1470813740244-df37b8c1edcb?ixlib=rb-4.0.3')] bg-cover opacity-5"></div>
          </div>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary-hover">
                Swiss Ephemeris-Powered Astrology API
              </h1>
              <p className="text-xl md:text-2xl text-gray-700 mb-8">
                The most accurate astrological calculations for developers,
                astrologers, and businesses. Build powerful applications with our
                high-precision API.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/signup">
                  <Button className="text-lg px-8 py-6">Get Started</Button>
                </Link>
                <Link to="/documentation">
                  <Button variant="outline" className="text-lg px-8 py-6">
                    View Documentation
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-12 bg-white">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-6 flex items-center justify-center">
                <Star className="text-primary w-6 h-6 mr-2" />
                <span className="font-semibold">Powered by Swiss Ephemeris</span>
              </div>
              <p className="text-gray-600 text-center max-w-2xl mb-8">
                The industry standard for high-precision astronomical calculations,
                providing accuracy within 0.001 arc seconds.
              </p>
              <div className="w-full max-w-4xl px-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-3xl font-bold text-primary mb-2">99.9%</p>
                    <p className="text-gray-600">Uptime Reliability</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-3xl font-bold text-primary mb-2">0.001″</p>
                    <p className="text-gray-600">Arc Second Accuracy</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-3xl font-bold text-primary mb-2">10M+</p>
                    <p className="text-gray-600">API Calls Monthly</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Client Logos */}
        <section className="py-10 bg-gray-50">
          <div className="container mx-auto px-4">
            <p className="text-center text-gray-500 mb-6">Trusted by innovative companies</p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6">
              {clients.map((client, index) => (
                <div key={index} className="text-lg font-semibold text-gray-400">{client}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl font-bold mb-4">Comprehensive Astrological Data</h2>
              <p className="text-lg text-gray-600">
                Access our full suite of astrological calculations through a simple, 
                developer-friendly API.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
                >
                  <div className="text-3xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-16 text-center">
              <Link to="/api-products">
                <Button variant="outline" className="text-lg px-8 py-6">
                  Explore All API Products
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to integrate astrology into your applications?
            </h2>
            <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Get started with our API today and bring the power of precise
              astrological calculations to your users.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                  Contact Sales
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

export default Index;
