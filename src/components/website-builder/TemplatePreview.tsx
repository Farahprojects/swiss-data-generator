import { motion } from "framer-motion";

const HeroSection = () => (
  <section
    className="relative py-24 px-6 overflow-hidden"
    style={{
      background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}CC 100%)`,
      fontFamily: `${fontFamily}, sans-serif`,
    }}
  >
    {/* Soft background shape */}
    <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
    <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />

    <div className="max-w-5xl mx-auto text-center text-white relative z-10">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6"
      >
        {customizationData.coachName || "Your Name"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-xl md:text-2xl font-light opacity-90 mb-10"
      >
        {customizationData.tagline || "Professional Life Coach"}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9 }}
      >
        <Button
          className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-3 text-lg rounded-full shadow-md transition-all duration-300"
        >
          {customizationData.buttonText || "Book a Consultation"}
        </Button>
      </motion.div>
    </div>
  </section>
);
