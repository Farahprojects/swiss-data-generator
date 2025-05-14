
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Star as StarIcon,
  Moon,
  Globe,
  HeartHandshake,
  Clock3,
  CalendarRange,
} from "lucide-react";
import { motion } from "framer-motion";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Landing / Index page – 2025‑04‑26 refresh
 * ------------------------------------------------------------------
 * ✦  Animated hero with subtle star‑field overlay
 * ✦  Lucide icons (no more random emojis)
 * ✦  Framer‑motion fade‑ups for sections
 * ✦  Cleaner stat cards & logo strip
 */

interface Feature {
  title: string;
  description: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const features: Feature[] = [
  {
    title: "Natal Charts",
    description:
      "Precise Western & Vedic natal calculations delivered in milliseconds.",
    Icon: Globe,
  },
  {
    title: "Vedic Charts",
    description:
      "Divisional charts, dashas, yogas & strength scoring in one call.",
    Icon: CalendarRange,
  },
  {
    title: "Transits",
    description: "Real‑time planetary motion & ingress alerts, time‑zone ready.",
    Icon: Clock3,
  },
  {
    title: "Synastry",
    description: "Composite & inter‑aspect reports with instant compatibility scoring.",
    Icon: HeartHandshake,
  },
  {
    title: "Progressions",
    description: "Secondary progressions & solar‑arc directions (NASA‑grade maths).",
    Icon: StarIcon,
  },
  {
    title: "Moon Phases",
    description: "Exact lunar phases, eclipses & void‑of‑course windows.",
    Icon: Moon,
  },
];

const clients = ["AstroApp", "MoonTracker", "ZodiacTech", "StarGuide", "CosmicSoft"];

// Animation helpers --------------------------------------------------------
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" },
  }),
};

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users to dashboard
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UnifiedNavigation />

      <main className="flex-grow overflow-hidden">
        {/* Hero */}
        <section className="relative h-[90vh] w-full overflow-hidden bg-gradient-to-b from-primary/5 via-white to-white pt-20">
          {/* Starfield overlay */}
          <div
            aria-hidden
            className="absolute inset-0 bg-[url('/svg/stars.svg')] bg-repeat opacity-5 [mask-image:radial-gradient(white,transparent)]"
          />

          {/* Enhanced radial glow behind the title */}
          <div 
            aria-hidden
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-gradient-to-r from-[#9b87f5]/20 to-[#D3E4FD]/20 blur-3xl opacity-70"
          />

          <div className="container relative z-10 mx-auto flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mx-auto max-w-xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-5xl font-extrabold text-transparent md:text-6xl lg:text-7xl"
              >
                Astro
              </motion.h1>

              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                className="mt-1 text-2xl font-normal text-gray-600 md:text-3xl"
              >
                The Intelligent Engine Behind the Stars
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                className="mt-4 text-lg text-gray-500 leading-relaxed max-w-xl mx-auto"
              >
                Astrology intelligence for platforms, advisors, and visionary teams.
                Powered by Swiss Ephemeris with 0.001″ precision, global time-zones,
                and blazing-fast responses.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-6 flex flex-row items-center justify-center gap-4"
            >
              <Link to="/signup">
                <Button 
                  size="lg" 
                  className="transform transition duration-200 hover:scale-105 hover:bg-primary-hover"
                >
                  Start Free Trial
                </Button>
              </Link>
              <Link to="/documentation">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="transform transition duration-200 hover:scale-105 hover:bg-accent"
                >
                  View Docs
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="bg-white py-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            className="container mx-auto px-4"
          >
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 md:flex-row md:justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">99.99%+</p>
                <p className="text-gray-600">Uptime SLA*</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">0.001″</p>
                <p className="text-gray-600">Arc‑second precision</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">10M+</p>
                <p className="text-gray-600">Monthly calls served</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Client strip */}
        <section className="bg-gray-50 py-10">
          <div className="container mx-auto px-4">
            <p className="mb-6 text-center text-sm font-semibold tracking-wide text-gray-500">
              Trusted by innovators&nbsp;→
            </p>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-80">
              {clients.map((client, i) => (
                <span key={i} className="text-lg font-medium text-gray-400">
                  {client}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="mx-auto mb-16 max-w-3xl text-center"
            >
              <h2 className="mb-4 text-3xl font-bold md:text-4xl">
                Comprehensive Celestial Toolkit
              </h2>
              <p className="text-lg text-gray-600">
                Mix and match endpoints to craft horoscopes, coaching dashboards
                or crypto‑trading algos &mdash; all through one key.
              </p>
            </motion.div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <feature.Icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="mt-16 text-center"
            >
              <Link to="/api-products">
                <Button variant="outline" size="lg">
                  Explore All Modules
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-primary py-20 text-white">
          <div className="container mx-auto px-4 text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="mb-6 text-3xl font-bold md:text-4xl"
            >
              Bring next‑level astrology to your users today
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mx-auto mb-8 max-w-2xl text-xl opacity-90"
            >
              Get a free key &mdash; no credit‑card required. Scale to millions of
              calls when you're ready.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link to="/signup">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                  Claim Free Key
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                  Talk to Sales
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
