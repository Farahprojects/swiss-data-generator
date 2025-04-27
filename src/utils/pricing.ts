
export const getPriceId = (planType: string) => {
  switch (planType.toLowerCase()) {
    case 'starter':
      return 'price_1RII04J1YhE4Ljp0daRu1V2J';
    case 'growth':
      return 'price_1RII4eJ1YhE4Ljp0vNfZnwov';
    case 'professional':
      return 'price_1RII6CJ1YhE4Ljp0BTCF0IYX';
    case 'yearly-cycle':
      return 'price_1RIIAkJ1YhE4Ljp07H39uZnZ';
    case 'relationship':
      // Note: The relationship compatibility has a product ID instead of price ID
      // Using the product ID as provided, but this may need to be updated to a price ID
      return 'prod_SChY6pgEbdigNb';
    case 'transits':
      return 'price_1RII87J1YhE4Ljp0TPLjRtut';
    default:
      return 'price_1RII04J1YhE4Ljp0daRu1V2J';
  }
};

export const plans = [
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
    availableAddOns: ["yearly-cycle", "transits", "relationship"] // All add-ons available
  },
  {
    name: "Growth",
    price: "$49",
    description: "For apps that need serious astrology features",
    features: [
      "Western + Vedic Natal Charts",
      "12 month Transit forecast",
      "Yearly Cycle",
      "200,000 API calls/month",
      "2 API keys",
      "Sidereal toggle unlocked",
    ],
    cta: "Start Free Trial",
    highlight: true,
    icon: "🚀",
    availableAddOns: ["relationship"] // Only relationship compatibility as add-on
  },
  {
    name: "Professional",
    price: "$99",
    description: "Ideal for commercial apps or multi-feature astrology platforms",
    features: [
      "Everything in Growth, plus:",
      "Relationship Compatibility",
      "Return Charts (Solar, Lunar, Saturn, Jupiter)",
      "750,000 API calls/month",
      "Full access API",
      "Slack/email support priority",
    ],
    cta: "Start Free Trial",
    highlight: false,
    icon: "🌟",
    availableAddOns: [] // No add-ons needed as everything is included
  },
];

export const addOns = [
  {
    id: "relationship",
    name: "Relationship Compatibility",
    price: "$15",
    description: "Add relationship analysis capabilities to any plan",
    details: "Deep dive into relationship dynamics with comprehensive synastry analysis. Compare two charts to understand relationship strengths, challenges, and potentials. Perfect for relationship-focused applications."
  },
  {
    id: "yearly-cycle",
    name: "Yearly Cycle",
    price: "$15",
    description: "Add Solar, Lunar, Saturn, and Jupiter return calculations",
    details: "Calculate and analyze important astrological returns including Solar (yearly), Lunar (monthly), and planetary returns for Jupiter and Saturn. Essential for long-term planning and life cycle analysis."
  },
  {
    id: "transits",
    name: "Transits (12 months ahead)",
    price: "$19",
    description: "Comprehensive transit predictions for future planning",
    details: "Access detailed planetary transit predictions for the next 12 months. Understand upcoming astrological influences, potential challenges, and opportunities for personal growth and strategic decision-making."
  },
];

export const faqs = [
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
