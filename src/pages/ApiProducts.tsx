import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * ApiProducts.tsx
 * --------------------------------------------------------
 * Displays all publicly‑available Swiss‑Ephemeris modules.
 * ‑ Featured modules appear first and span the full grid row
 *   on >lg breakpoints for extra emphasis.
 * ‑ Each card has a fixed min‑height so buttons align.
 * ‑ The CTA placeholder at the bottom is now wrapped in JSX
 *   comments so the file compiles even if you leave it in.
 *
 * 2025‑04‑26 | chatGPT refactor
 */

interface ApiModule {
  title: string;
  description: string;
  features: string[];
  icon: string;
  featured?: boolean;
}

const apiModules: ApiModule[] = [
  // ⭐ Featured modules first so the grid presents them up‑front
  {
    title: "Western Natal Chart API",
    description:
      "Complete Western astrology calculations including aspects, house systems, and essential dignities. Perfect for modern astrological applications.",
    features: [
      "Tropical zodiac positions",
      "Multiple house systems",
      "Major and minor aspects",
      "Essential dignities",
      "Midpoints calculation",
      "Part calculations",
    ],
    icon: "⭐",
    featured: true,
  },
  {
    title: "Vedic Natal Chart API",
    description:
      "Comprehensive Vedic astrology calculations including dashas, yogas, and traditional divisional charts (D‑charts). Full planetary positions with dignity calculations.",
    features: [
      "Planetary positions in Vedic zodiac",
      "Dasha calculations (Vimshottari)",
      "Divisional charts (D‑1 to D‑60)",
      "Ashtakavarga calculations",
      "Yogas and combinations",
      "Dignity & strength calculations",
    ],
    icon: "🕉️",
    featured: true,
  },
  // — Standard modules
  {
    title: "Transit Calculations",
    description:
      "Real‑time planetary transit data with customisable time spans. Get daily, weekly, or monthly forecasts with precise timing.",
    features: [
      "Current planetary positions",
      "Ingress timing",
      "Aspect timing",
      "Customisable periods",
    ],
    icon: "🌠",
  },
  {
    title: "Synastry Chart",
    description:
      "Detailed relationship compatibility analysis between two natal charts, including inter‑aspects, composite charts, and more.",
    features: [
      "Inter‑aspect analysis",
      "Composite charts",
      "Midpoints",
      "Compatibility scoring",
    ],
    icon: "💫",
  },
  {
    title: "Progressed Chart",
    description:
      "Secondary progressions and solar‑arc directions for predictive astrology. Track the evolution of a natal chart over time.",
    features: [
      "Secondary progressions",
      "Solar‑arc directions",
      "Progressed lunar phases",
      "Progressed aspects",
    ],
    icon: "🚀",
  },
  {
    title: "Planetary Positions & Aspects",
    description:
      "Precise planetary positions at any given time, including minor planets, asteroids, and fixed stars, with aspect calculations.",
    features: [
      "Heliocentric & geocentric",
      "Fixed stars",
      "Asteroids",
      "Minor planets",
    ],
    icon: "🪐",
  },
  {
    title: "Moon Phases",
    description:
      "Accurate lunar phase calculations with precise timing. Includes new moons, full moons, quarters, and void‑of‑course periods.",
    features: [
      "All lunar phases",
      "Void‑of‑course timing",
      "Lunar mansions",
      "Eclipse data",
    ],
    icon: "🌙",
  },
  {
    title: "Return Charts",
    description:
      "Calculate various planetary returns, including Saturn return, Jupiter return, Solar return, and other significant cyclical events.",
    features: [
      "Solar returns",
      "Lunar returns",
      "Saturn returns",
      "Jupiter returns",
    ],
    icon: "♄",
  },
];

// --- Helpers --------------------------------------------------------------
const sortModules = (a: ApiModule, b: ApiModule) => {
  // Featured first; otherwise keep original order
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  return 0;
};

const ApiProducts = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="mb-6 text-4xl font-bold">API Products</h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-700">
              A comprehensive Swiss‑Ephemeris tool‑kit. Pick the module you need
              &mdash; or mix‑and‑match for full‑stack astrological insight.
            </p>
          </div>
        </section>

        {/* Cards */}
        <section className="bg-white py-20">
          <div className="container mx-auto px-4">
            <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {apiModules.sort(sortModules).map((module, index) => (
                <div
                  key={index}
                  className={`relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md ${
                    module.featured ? "lg:col-span-3" : ""
                  }`}
                >
                  {/* Badge for featured */}
                  {module.featured && (
                    <span className="absolute right-4 top-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      Featured
                    </span>
                  )}

                  <div className="flex flex-col p-8">
                    {/* Header */}
                    <div className="mb-4 flex items-center gap-4">
                      <div className="text-4xl lg:text-5xl">{module.icon}</div>
                      <h3 className="text-2xl font-bold lg:text-3xl">
                        {module.title}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="mb-6 text-gray-700">{module.description}</p>

                    {/* Features */}
                    <h4 className="mb-3 text-lg font-semibold">Key Features</h4>
                    <ul className="mb-8 grid list-disc grid-cols-1 gap-2 pl-5">
                      {module.features.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>

                    {/* Actions */}
                    <div className="mt-auto flex gap-4">
                      <Link to="/documentation">
                        <Button variant="outline">Docs</Button>
                      </Link>
                      <Link to="/pricing">
                        <Button>Pricing</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section (leave as‑is or swap in your own component) */}
        {/**
          <CtaSection />
        */}
      </main>

      <Footer />
    </div>
  );
};

export default ApiProducts;
