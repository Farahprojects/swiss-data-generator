import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Info } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "$19",
      description: "Simple, very clean, enough for solo devs or small apps",
      features: [
        "Choose Western OR Vedic Natal Charts",
        "50,000 API calls/month",
        "1 API key",
      ],
      cta: "Start Free Trial",
      highlight: false,
      icon: "⚡",
    },
    {
      name: "Growth",
      price: "$49",
      description: "For apps that need serious astrology features",
      features: [
        "Western + Vedic Natal Charts",
        "Full Transit Calculations",
        "Progressions",
        "200,000 API calls/month",
        "2 API keys",
        "Sidereal toggle unlocked",
      ],
      cta: "Start Free Trial",
      highlight: true,
      icon: "🚀",
    },
    {
      name: "Professional",
      price: "$99",
      description: "Ideal for commercial apps or multi-feature astrology platforms",
      features: [
        "Everything in Growth, plus:",
        "Synastry Charts",
        "Return Charts (Solar, Lunar, Saturn, Jupiter)",
        "750,000 API calls/month",
        "5 API keys",
        "Slack/email support priority",
      ],
      cta: "Start Free Trial",
      highlight: false,
      icon: "🌟",
    },
  ];

  const addOns = [
    {
      name: "Relationship Compatibility",
      price: "$15",
      description: "Add relationship analysis capabilities to any plan",
      details: "Deep dive into relationship dynamics with comprehensive synastry analysis. Compare two charts to understand relationship strengths, challenges, and potentials. Perfect for relationship-focused applications."
    },
    {
      name: "Yearly Cycle",
      price: "$15",
      description: "Add Solar, Lunar, Saturn, and Jupiter return calculations",
      details: "Calculate and analyze important astrological returns including Solar (yearly), Lunar (monthly), and planetary returns for Jupiter and Saturn. Essential for long-term planning and life cycle analysis."
    },
    {
      name: "Progressions",
      price: "$9",
      description: "Add progression calculations to your plan",
      details: "Access secondary progressions calculations to track the evolution of a natal chart over time. Understand long-term developmental patterns and life transitions."
    },
  ];

  const faqs = [
    {
      question: "How accurate is the Swiss Ephemeris data?",
      answer: "Swiss Ephemeris is the industry standard for astronomical calculations, offering accuracy within 0.001 arc seconds for planetary positions, making it suitable for professional astrologers and applications requiring high precision."
    },
    {
      question: "Can I switch plans later?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade mid-billing cycle, we'll prorate the difference. Downgrading will take effect at the start of your next billing cycle."
    },
    {
      question: "What happens if I exceed my monthly API call limit?",
      answer: "If you exceed your monthly limit, additional calls will be charged at our overage rate. You'll receive notifications as you approach your limit so you can upgrade if needed."
    },
    {
      question: "Do you offer a free trial?",
      answer: "Yes, we offer a 14-day free trial for all plans to help you evaluate our API and ensure it meets your needs before committing."
    },
    {
      question: "How is an API call counted?",
      answer: "Each request to our API endpoints counts as one API call. For example, requesting a natal chart counts as one call, regardless of how much data is returned."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-6">Simple, Transparent Pricing</h1>
              <p className="text-xl text-gray-700 mb-8">
                Choose the plan that best fits your needs. All plans include access to our 
                Swiss Ephemeris-powered API and comprehensive documentation.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Tables */}
        <section className="py-20 -mt-10">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`bg-white rounded-xl shadow-lg overflow-hidden border ${
                    plan.highlight ? 'border-primary' : 'border-gray-100'
                  } flex flex-col`}
                >
                  {plan.highlight && (
                    <div className="bg-primary text-white py-2 text-center text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  <div className="p-8 flex-grow">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{plan.icon}</span>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                    </div>
                    <div className="mb-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="h-5 w-5 text-primary mr-2 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-8 pt-0">
                    <Link to="/signup">
                      <Button 
                        className={`w-full py-6 ${
                          plan.highlight ? '' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Add-ons Section */}
            <div className="mt-16">
              <h2 className="text-3xl font-bold text-center mb-8">Add-on Modules</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {addOns.map((addon, index) => (
                  <div 
                    key={index}
                    className="bg-white rounded-lg shadow-md p-6 border border-gray-100"
                  >
                    <h3 className="text-xl font-semibold mb-2">{addon.name}</h3>
                    <div className="text-2xl font-bold mb-2">
                      {addon.price}<span className="text-sm text-gray-600">/month</span>
                    </div>
                    <p className="text-gray-600 mb-4">{addon.description}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Info className="mr-2" />
                          More Info
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[300px] p-4">
                        <p className="text-sm text-gray-700">{addon.details}</p>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-16 max-w-3xl mx-auto text-center">
              <p className="text-gray-600">
                All plans include a 14-day free trial. No credit card required to get started.
              </p>
            </div>
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Feature Comparison</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full bg-white shadow-sm rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-4 font-medium text-gray-600">Feature</th>
                    <th className="p-4 font-medium text-gray-600">Starter</th>
                    <th className="p-4 font-medium text-gray-600 bg-primary/5">Professional</th>
                    <th className="p-4 font-medium text-gray-600">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">API Calls/month</td>
                    <td className="p-4 text-center">10,000</td>
                    <td className="p-4 text-center bg-primary/5">50,000</td>
                    <td className="p-4 text-center">Unlimited</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Natal Charts</td>
                    <td className="p-4 text-center">Basic</td>
                    <td className="p-4 text-center bg-primary/5">Advanced</td>
                    <td className="p-4 text-center">Advanced</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Transit Calculations</td>
                    <td className="p-4 text-center">✓</td>
                    <td className="p-4 text-center bg-primary/5">✓</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Moon Phases</td>
                    <td className="p-4 text-center">✓</td>
                    <td className="p-4 text-center bg-primary/5">✓</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Synastry/Relationship</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-primary/5">✓</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Secondary Progressions</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-primary/5">✓</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Planetary Returns</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-primary/5">✓</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Support</td>
                    <td className="p-4 text-center">Community</td>
                    <td className="p-4 text-center bg-primary/5">Email</td>
                    <td className="p-4 text-center">Dedicated</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">Custom Development</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-primary/5">—</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                  <tr className="border-t border-gray-200">
                    <td className="p-4 text-gray-700">SLA</td>
                    <td className="p-4 text-center">—</td>
                    <td className="p-4 text-center bg-primary/5">—</td>
                    <td className="p-4 text-center">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Frequently Asked Questions</h2>
            
            <div className="max-w-3xl mx-auto">
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className="border-b border-gray-200 pb-6">
                    <h3 className="text-xl font-semibold mb-2">{faq.question}</h3>
                    <p className="text-gray-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 text-center">
                <p className="text-gray-600 mb-6">
                  Have more questions about our API or pricing?
                </p>
                <Link to="/contact">
                  <Button variant="outline">Contact Us</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Ready to build with Theraiapi?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Start your 14-day free trial today. No credit card required.
            </p>
            <Link to="/signup">
              <Button className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                Start Free Trial
              </Button>
            </Link>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Pricing;
