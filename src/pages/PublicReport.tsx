
import React, { useState, useEffect } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import TheraiChatGPTSection from '@/components/public-report/TheraiChatGPTSection';

import { ReportForm } from '@/components/shared/ReportForm';
import MobileReportTrigger from '@/components/public-report/MobileReportTrigger';
import MobileReportDrawer from '@/components/public-report/MobileReportDrawer';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

const PublicReport = () => {
  // SSR Debug Logging
  if (typeof window === 'undefined') {
    console.log('[🧠 SSR] PublicReport.tsx is rendering on server');
  } else {
    console.log('[🌐 CLIENT] PublicReport.tsx is rendering on client');
  }

  // Hard fail test for SSR debugging (uncomment to test error boundary)
  // if (typeof window === 'undefined') {
  //   throw new Error('🔥 Force fail on SSR to test error boundary');
  // }

  try {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isClientMobile, setIsClientMobile] = useState(false);

    // Safe mobile detection on client side only
    useEffect(() => {
      if (typeof window !== 'undefined') {
        setIsClientMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      }
    }, []);

    // Global error handlers to catch client-side errors
    useEffect(() => {
      if (typeof window !== 'undefined') {
        const handleError = (event: ErrorEvent) => {
          console.error('[CLIENT ERROR]', event?.error || event?.message || event);
        };

        const handleRejection = (event: PromiseRejectionEvent) => {
          console.error('[CLIENT PROMISE ERROR]', event?.reason || event);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);

        return () => {
          window.removeEventListener('error', handleError);
          window.removeEventListener('unhandledrejection', handleRejection);
        };
      }
    }, []);

  // Diagnostic useEffect to catch runtime errors
  useEffect(() => {
    // Only run diagnostics in browser environment
    if (typeof window === 'undefined') return;
    
    const runDiagnostics = async () => {
      try {
        console.log('[DIAG] Starting diagnostics...');

        // Try a basic Supabase ping to price_list table
        const { data, error } = await supabase.from('price_list').select('*').limit(1);
        console.log('[DIAG] Supabase response:', data, error);

        if (error) throw error;
        
        console.log('[DIAG] All checks passed successfully');
      } catch (err: any) {
        console.error('[DIAG ERROR] Report page crashed with:', err?.message || err);
        console.error('[DIAG ERROR] Full error object:', err);
      }
    };

    runDiagnostics();
    }, []);

    const handleGetReportClick = () => {
      if (isClientMobile) {
        setIsDrawerOpen(true);
      } else if (typeof window !== 'undefined') {
        // For desktop, scroll to form
        const reportSection = document.querySelector('#report-form');
        if (reportSection) {
          reportSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    const handleCloseDrawer = () => {
      setIsDrawerOpen(false);
    };

    const handleOpenDrawer = () => {
      setIsDrawerOpen(true);
    };

  try {
    return (
      <div className="min-h-screen bg-background">
        <HeroSection onGetReportClick={handleGetReportClick} />
        
        {/* Modern Sample Report Section */}
        <section className="py-32 bg-gradient-to-b from-white to-gray-50/30 relative overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-8 w-2 h-2 bg-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute top-1/3 right-12 w-1 h-1 bg-primary/30 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/4 w-1.5 h-1.5 bg-primary/25 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
            <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-primary/15 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-24 space-y-8">
                <h2 className="text-5xl md:text-6xl font-light text-gray-900 leading-tight tracking-tight">
                  See what you'll <span className="italic font-medium">discover</span>
                </h2>
                <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
                  Real psychological profiles with profound insights—experience the depth and precision that awaits you.
                </p>
              </div>

              {/* Enhanced Profile Showcase */}
              <div className="space-y-24">
                {/* Individual Profiles Grid */}
                <div className="grid lg:grid-cols-2 gap-12">
                  {/* Profile Card 1 */}
                  <div className="group bg-white rounded-3xl p-12 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
                    <div className="text-center mb-10">
                      <h3 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">Peter Farah</h3>
                      <p className="text-lg text-gray-600 font-light">Creative Visionary • Structured Strategist</p>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="transform group-hover:translate-x-2 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Communication Style</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Expressive and conceptual, prefers big-picture discussions with room for structured planning.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Decision Making</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Balances intuitive insights with methodical analysis, values both innovation and process.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Relationship Needs</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Thrives with partners who appreciate both creative freedom and collaborative planning.</p>
                      </div>
                    </div>
                  </div>

                  {/* Profile Card 2 */}
                  <div className="group bg-white rounded-3xl p-12 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
                    <div className="text-center mb-10">
                      <h3 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">Olivia Patten</h3>
                      <p className="text-lg text-gray-600 font-light">Intuitive Connector • Detail Orchestrator</p>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="transform group-hover:translate-x-2 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Communication Style</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Empathetic and thorough, excels at reading between the lines and organizing details.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Decision Making</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Combines emotional intelligence with systematic execution, values harmony and efficiency.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Relationship Needs</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Values partners who bring vision while appreciating her attention to emotional nuances.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sync Dynamic Section */}
                <div className="relative overflow-hidden bg-gray-900 text-white rounded-3xl p-16">
                  {/* Background elements */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-8 left-16 w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="absolute top-16 right-20 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-12 left-1/4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                    <div className="absolute bottom-16 right-1/3 w-2 h-2 bg-white rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  </div>

                  <div className="relative z-10 text-center mb-16">
                    <h3 className="text-4xl md:text-5xl font-light leading-tight tracking-tight mb-4">
                      Their <span className="italic font-medium">Sync Dynamic</span>
                    </h3>
                    <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mx-auto"></div>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-12 relative z-10">
                    <div className="text-center group">
                      <div className="w-32 h-32 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-105 transition-all duration-500 group-hover:bg-white/20">
                        <span className="text-4xl font-light text-white group-hover:scale-110 transition-transform duration-300">92%</span>
                      </div>
                      <h4 className="font-medium text-white mb-4 text-sm tracking-wide uppercase">Vision Alignment</h4>
                      <p className="text-gray-300 font-light leading-relaxed">Both value growth and structured progress toward shared goals.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-32 h-32 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-105 transition-all duration-500 group-hover:bg-white/20">
                        <span className="text-4xl font-light text-white group-hover:scale-110 transition-transform duration-300">88%</span>
                      </div>
                      <h4 className="font-medium text-white mb-4 text-sm tracking-wide uppercase">Communication Flow</h4>
                      <p className="text-gray-300 font-light leading-relaxed">Peter's big picture thinking complements Olivia's detail orientation perfectly.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-32 h-32 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-105 transition-all duration-500 group-hover:bg-white/20">
                        <span className="text-4xl font-light text-white group-hover:scale-110 transition-transform duration-300">95%</span>
                      </div>
                      <h4 className="font-medium text-white mb-4 text-sm tracking-wide uppercase">Growth Potential</h4>
                      <p className="text-gray-300 font-light leading-relaxed">Their different strengths create a powerful dynamic for mutual development.</p>
                    </div>
                  </div>
                </div>

                {/* Report Examples Grid */}
                <div className="grid lg:grid-cols-2 gap-12">
                  {/* Cognitive Profile Card */}
                  <div className="group bg-white rounded-3xl p-12 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
                    <div className="text-center mb-10">
                      <h3 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">Cognitive Processing Profile</h3>
                      <p className="text-lg text-gray-600 font-light">Personal Essence Report • Generated in 2 minutes</p>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="transform group-hover:translate-x-2 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Primary Style</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Creative Visionary (Big-Picture) - Naturally gravitates towards seeing the grand scheme and weaving ideas into cohesive visions.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Secondary Style</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Structured Strategist (Process) - Brings methodical execution to innovative ideas.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Key Insight</h4>
                        <p className="text-gray-600 font-light leading-relaxed">A harmonious blend of creativity and structure that enables navigating challenges with agility while bringing visionary ideas to fruition.</p>
                      </div>
                    </div>
                  </div>

                  {/* Astro Data Card */}
                  <div className="group bg-white rounded-3xl p-12 border border-gray-100 hover:border-gray-200 transition-all duration-500 hover:shadow-xl hover:-translate-y-2">
                    <div className="text-center mb-10">
                      <h3 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">Raw Astro Data</h3>
                      <p className="text-lg text-gray-600 font-light">Generated in seconds • Powered by Therai GPT</p>
                    </div>
                    
                    <div className="space-y-8">
                      <div className="transform group-hover:translate-x-2 transition-transform duration-300">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Birth Chart Data</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Sun: Gemini 15°42' • Moon: Scorpio 28°13' • Rising: Virgo 3°51'</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-500">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">Planetary Positions</h4>
                        <p className="text-gray-600 font-light leading-relaxed">Mercury: Gemini 22° • Venus: Cancer 8° • Mars: Leo 14°</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-2 transition-transform duration-700">
                        <h4 className="font-medium text-gray-900 mb-3 text-sm tracking-wide uppercase">House Placements</h4>
                        <p className="text-gray-600 font-light leading-relaxed">10th House stellium • 2nd House emphasis • 7th House focus</p>
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-gray-50/60 rounded-2xl border border-gray-200/30">
                      <div className="flex items-center justify-center gap-3 mb-3">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-700 tracking-wide uppercase">Therai GPT</span>
                      </div>
                      <p className="text-sm text-gray-600 text-center font-light leading-relaxed">
                        Instant calculations with our branded AI engine
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* CTA Button */}
                <div className="text-center">
                  <button 
                    onClick={handleGetReportClick}
                    className="bg-gray-900 text-white px-16 py-6 rounded-xl text-xl font-light hover:bg-gray-800 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Begin Your Journey
                  </button>
                  <p className="text-gray-500 mt-6 font-light text-lg">Takes 2 minutes • Instant results</p>
                </div>
              </div>
            </div>
          </div>
        </section>


        <TestsSection />
        <TheraiChatGPTSection />
        {!isClientMobile && (
          <div id="report-form">
            <ReportForm />
          </div>
        )}
        <MobileReportTrigger 
          isDrawerOpen={isDrawerOpen}
          onOpenDrawer={handleOpenDrawer}
        />
        <MobileReportDrawer 
          isOpen={isDrawerOpen} 
          onClose={handleCloseDrawer} 
        />
        <FeaturesSection onGetReportClick={handleGetReportClick} />
        <Footer />
      </div>
    );
    } catch (err: any) {
      console.error('[REPORT RUNTIME ERROR]', err);
      return <div>Sorry, something went wrong.</div>;
    }
  } catch (err: any) {
    console.error('[REPORT SSR ERROR]', err?.message || err);
    return <div>Sorry, something went wrong.</div>;
  }
};

export default PublicReport;
