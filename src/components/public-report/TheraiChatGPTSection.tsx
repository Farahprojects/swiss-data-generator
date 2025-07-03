import React from 'react';
import { ExternalLink } from 'lucide-react';
import theraiChatGPTMockup from '@/assets/therai-chatgpt-mockup.jpg';

const TheraiChatGPTSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50/30">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Image on the left */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl bg-white p-8">
                <img 
                  src={theraiChatGPTMockup}
                  alt="Therai ChatGPT Interface"
                  className="w-full h-auto rounded-xl"
                />
              </div>
              
              {/* Floating elements for visual appeal */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-gray-200 rounded-full animate-pulse opacity-60"></div>
              <div className="absolute -bottom-6 -left-6 w-6 h-6 bg-gray-300 rounded-full animate-pulse opacity-40" style={{animationDelay: '1s'}}></div>
            </div>

            {/* Content on the right */}
            <div className="space-y-8">
              <div>
                <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 tracking-tight">
                  Unlock Deeper Insights with 
                  <span className="block text-gray-700">Therai ChatGPT</span>
                </h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Take your reports even further. Copy and paste any report or astro data into our specialized ChatGPT wrapper to unlock instant, deeper analysis and personalized guidance.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Instant Deep Analysis</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Get immediate follow-up questions, explanations, and actionable insights from your reports.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Personalized Guidance</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Ask specific questions about your personality traits, relationships, or timing insights.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Works with All Reports</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Compatible with Essence, Sync, Snapshots, and raw Astro Data reports.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <a 
                  href="https://chatgpt.com/g/g-68636dbe19588191b04b0a60bcbf3df3-therai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-gray-900 text-white px-8 py-4 rounded-xl text-lg font-normal hover:bg-gray-800 transition-all duration-300 hover:scale-105 border border-gray-800/20 shadow-lg hover:shadow-xl"
                >
                  Try Therai ChatGPT
                  <ExternalLink className="h-5 w-5" />
                </a>
                <p className="text-gray-500 mt-3 text-sm font-light">
                  Available in the ChatGPT store • Free to use with your reports
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TheraiChatGPTSection;