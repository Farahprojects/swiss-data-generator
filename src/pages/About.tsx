
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const About = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow">
        {/* Header Section */}
        <section className="bg-accent py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-6">About Theraiapi</h1>
              <p className="text-xl text-gray-700 mb-8">
                Providing the most accurate astrological calculations for developers,
                astrologers, and businesses worldwide.
              </p>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">Our Mission</h2>
              <p className="text-lg mb-6 text-gray-700">
                At Theraiapi, our mission is to provide astrologers, developers, and businesses with the most precise astrological calculations available. We believe in empowering creators to build innovative applications that bring the ancient wisdom of astrology into the modern digital world.
              </p>
              <p className="text-lg mb-6 text-gray-700">
                We've built our API on top of the Swiss Ephemeris, the gold standard in astronomical calculations, ensuring that every planetary position, aspect, and transit is calculated with the highest possible accuracy.
              </p>
              <p className="text-lg text-gray-700">
                By offering a developer-friendly API that's both powerful and easy to integrate, we're helping to bring astrological insights to more people than ever before, through applications that speak to the needs of today's users.
              </p>
            </div>
          </div>
        </section>

        {/* Swiss Ephemeris Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">The Swiss Ephemeris Advantage</h2>
              <p className="text-lg mb-6 text-gray-700">
                Our API is powered by the Swiss Ephemeris, developed by Astrodienst AG, which is the most accurate and widely respected astronomical calculation engine for astrological purposes.
              </p>
              <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <h3 className="font-semibold text-xl mb-4">Why Swiss Ephemeris?</h3>
                <ul className="space-y-3">
                  <li className="flex">
                    <svg className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Accuracy within 0.001 arc seconds for planetary positions</span>
                  </li>
                  <li className="flex">
                    <svg className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Based on NASA's JPL DE431 ephemeris</span>
                  </li>
                  <li className="flex">
                    <svg className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Covers a time span of 10,000 years</span>
                  </li>
                  <li className="flex">
                    <svg className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Includes positions for all planets, asteroids, and major fixed stars</span>
                  </li>
                  <li className="flex">
                    <svg className="h-6 w-6 text-primary mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Industry standard used by professional astrologers worldwide</span>
                  </li>
                </ul>
              </div>
              <p className="text-lg text-gray-700">
                By building on this foundation, we ensure that applications using our API can provide the most accurate and reliable astrological information possible.
              </p>
            </div>
          </div>
        </section>

        {/* Team Section (Placeholder) */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Our Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((item) => (
                <div key={item} className="text-center">
                  <div className="w-40 h-40 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <h3 className="font-semibold text-xl mb-2">Team Member</h3>
                  <p className="text-gray-600 mb-2">Co-Founder & Developer</p>
                  <p className="text-gray-500 text-sm">
                    Expert in both astrology and software development, with over 10 years of experience in building astrological applications.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-xl mb-4">Accuracy</h3>
                  <p className="text-gray-700">
                    We are committed to providing the most precise astrological calculations possible, based on the highest scientific standards.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-xl mb-4">Accessibility</h3>
                  <p className="text-gray-700">
                    We believe in making astrological data accessible to developers of all skill levels through a clear, well-documented API.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-xl mb-4">Innovation</h3>
                  <p className="text-gray-700">
                    We continuously work to improve our API and add new features that enable innovative applications of astrological wisdom.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h3 className="font-semibold text-xl mb-4">Reliability</h3>
                  <p className="text-gray-700">
                    Our infrastructure is designed for high availability and performance, ensuring your applications can always access the data they need.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-primary text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">
              Join us in revolutionizing astrology software
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Start building your astrological applications with the most accurate data available.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/signup">
                <Button className="bg-white text-primary hover:bg-gray-100 text-lg px-8 py-6">
                  Get Started
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8 py-6">
                  Contact Us
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
