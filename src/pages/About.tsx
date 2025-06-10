
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Star, Award, Rocket } from "lucide-react";

const About = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section with Theme Color Gradient */}
        <section className="relative overflow-hidden bg-white py-32">
          <div className="container relative z-10 mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
                Revolutionizing Astrological Technology
              </h1>
              <p className="text-xl text-gray-700 mb-8">
                Building the future of astrological calculations through advanced technology
                and innovative solutions.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section with White Background */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
              <h2 className="text-3xl font-bold mb-8 text-center text-primary">My mission is to restore clarity through rhythm.</h2>
              <p className="text-lg mb-6 text-gray-700">
                We believe that behind every breakthrough lies a pattern an energetic signature waiting to be decoded. By blending journaled experience with the deeper intelligence of cycles and resonance, we help people reconnect with their natural flow where insight, action, and timing align.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                At the heart of Therai is the belief that understanding yourself isn't about overthinking. it's about tuning in to the frequency that was already guiding you.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section with Modern Cards */}
        <section className="py-24 bg-gradient-to-b from-background to-accent/20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-16 text-center text-primary">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Founder Card */}
              <div className="backdrop-blur-sm bg-white/50 rounded-2xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full mb-6 flex items-center justify-center">
                    <Star className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-primary">Peter Farah</h3>
                  <p className="text-lg font-medium text-gray-700 mb-2">Founder and Creator</p>
                  <p className="text-gray-600">
                    Passionate entrepreneur blending technology, astrology, and psychology to build
                    innovative, user-focused platforms. Driven by curiosity, creativity, and a
                    commitment to deep understanding.
                  </p>
                  <p className="text-sm text-gray-500 mt-4">Australia</p>
                </div>
              </div>

              {/* OpenAI Support Card */}
              <div className="backdrop-blur-sm bg-white/50 rounded-2xl p-8 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full mb-6 flex items-center justify-center">
                    <Rocket className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-primary">OpenAI</h3>
                  <p className="text-lg font-medium text-gray-700 mb-2">Creative Technology Support</p>
                  <p className="text-gray-600">
                    Powering the AI tools that assist and inspire the development of our platform,
                    enabling innovative solutions and enhanced user experiences through advanced
                    artificial intelligence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section with Cards */}
        <section className="py-24 bg-gradient-to-b from-accent/20 to-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-12 text-center text-primary">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                  <h3 className="font-semibold text-xl mb-4 text-primary">Accuracy</h3>
                  <p className="text-gray-700">
                    We are committed to providing the most precise astrological calculations
                    possible, based on the highest scientific standards.
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                  <h3 className="font-semibold text-xl mb-4 text-primary">Innovation</h3>
                  <p className="text-gray-700">
                    We continuously work to improve Therai and add new features that enable
                    innovative applications of astrological wisdom.
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                  <h3 className="font-semibold text-xl mb-4 text-primary">Accessibility</h3>
                  <p className="text-gray-700">
                    We believe in making astrological data accessible to developers of all
                    skill levels through a clear, well-documented API.
                  </p>
                </div>
                <div className="backdrop-blur-sm bg-white/50 rounded-xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all">
                  <h3 className="font-semibold text-xl mb-4 text-primary">Reliability</h3>
                  <p className="text-gray-700">
                    Our infrastructure is designed for high availability and performance,
                    ensuring your applications can always access the data they need.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">
              Join us in revolutionizing astrology software
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-700">
              Start your journey with the best astrological applications with the most accurate data available.
            </p>
            <div className="flex justify-center">
              <Link to="/signup">
                <Button className="bg-primary text-white hover:bg-primary/90 text-lg px-8 py-6">
                  Get Started
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

export default About;
