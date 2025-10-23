import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sparkles, Database, Code2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  // Redirect authenticated users to generate page
  if (!loading && user) {
    return <Navigate to="/generate" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      
      {/* Simple Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="text-2xl font-light italic text-gray-900">
            Swiss Data Generator
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => window.location.href = '/login'}
              variant="outline"
              className="font-light"
            >
              Sign In
            </Button>
            <Button
              onClick={() => window.location.href = '/signup'}
              className="bg-gray-900 hover:bg-gray-800 font-light"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <section className="max-w-4xl mx-auto px-6 py-24 text-center space-y-8">
          
          <h1 className="text-6xl font-light italic text-gray-900">
            Generate Swiss<br />Astrology Data
          </h1>
          
          <p className="text-xl text-gray-600 font-light max-w-2xl mx-auto">
            Create accurate astrological data in JSON format. 
            Perfect for AI applications and astrology tools.
          </p>

          <div className="flex gap-4 justify-center pt-6">
            <Button
              onClick={() => window.location.href = '/signup'}
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-lg font-light px-8 py-6 rounded-xl"
            >
              Start Generating Data
            </Button>
          </div>

          <p className="text-sm text-gray-500 font-light pt-4">
            Only $30/year for unlimited access
          </p>

        </section>

        {/* Features Grid */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-gray-100">
                  <Database className="w-8 h-8 text-gray-900" />
                </div>
              </div>
              <h3 className="text-2xl font-light italic text-gray-900">
                Swiss Ephemeris
              </h3>
              <p className="text-gray-600 font-light">
                Powered by the industry-standard Swiss Ephemeris engine for accurate astronomical calculations
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-gray-100">
                  <Code2 className="w-8 h-8 text-gray-900" />
                </div>
              </div>
              <h3 className="text-2xl font-light italic text-gray-900">
                JSON Output
              </h3>
              <p className="text-gray-600 font-light">
                Get clean, structured JSON data ready to use in your AI applications and tools
              </p>
            </div>

            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="p-4 rounded-full bg-gray-100">
                  <Sparkles className="w-8 h-8 text-gray-900" />
                </div>
              </div>
              <h3 className="text-2xl font-light italic text-gray-900">
                System Prompts
              </h3>
              <p className="text-gray-600 font-light">
                Pre-built system prompts to help you integrate astrology AI into your applications
              </p>
            </div>

          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gray-50 py-24">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-4xl font-light italic text-gray-900 text-center mb-16">
              How It Works
            </h2>
            <div className="space-y-8">
              
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-light text-xl">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-light italic text-gray-900 mb-2">Sign Up</h3>
                  <p className="text-gray-600 font-light">
                    Create your account with a simple $30/year subscription
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-light text-xl">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-light italic text-gray-900 mb-2">Generate Data</h3>
                  <p className="text-gray-600 font-light">
                    Enter birth details and select chart type to generate Swiss ephemeris data
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-light text-xl">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-light italic text-gray-900 mb-2">Copy & Use</h3>
                  <p className="text-gray-600 font-light">
                    Copy the JSON output and paste directly into your AI application
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="max-w-4xl mx-auto px-6 text-center space-y-6">
            <h2 className="text-4xl font-light italic text-gray-900">
              Ready to Start Generating?
            </h2>
            <p className="text-xl text-gray-600 font-light">
              Join today for just $30/year
            </p>
            <Button
              onClick={() => window.location.href = '/signup'}
              size="lg"
              className="bg-gray-900 hover:bg-gray-800 text-lg font-light px-8 py-6 rounded-xl"
            >
              Create Your Account
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center text-sm text-gray-500 font-light">
            <div>© 2025 Swiss Data Generator</div>
            <div className="flex gap-6">
              <a href="/legal" className="hover:text-gray-900">Legal</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Index;
