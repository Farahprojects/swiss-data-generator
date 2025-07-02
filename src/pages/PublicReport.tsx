
import React, { useState, useEffect } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';

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
        
        {/* Sample Report Section */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  See What You'll Get
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Here's a real psychological profile generated for Peter Farah - see the depth and actionable insights you'll receive.
                </p>
              </div>

              {/* Sync Pro Compatibility Preview */}
              <div className="mb-20">
                <div className="grid md:grid-cols-2 gap-8 mb-12">
                  {/* Peter's Profile */}
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 hover:scale-[1.02] group">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Peter Farah</h3>
                      <p className="text-gray-600 font-medium">Creative Visionary • Structured Strategist</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                        <h4 className="font-bold text-gray-900 mb-2">Communication Style</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Expressive and conceptual, prefers big-picture discussions with room for structured planning.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                        <h4 className="font-bold text-gray-900 mb-2">Decision Making</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Balances intuitive insights with methodical analysis, values both innovation and process.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                        <h4 className="font-bold text-gray-900 mb-2">Relationship Needs</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Thrives with partners who appreciate both creative freedom and collaborative planning.</p>
                      </div>
                    </div>
                  </div>

                  {/* Olivia's Profile */}
                  <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-500 hover:scale-[1.02] group">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Olivia Chen</h3>
                      <p className="text-gray-600 font-medium">Intuitive Connector • Detail Orchestrator</p>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                        <h4 className="font-bold text-gray-900 mb-2">Communication Style</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Empathetic and thorough, excels at reading between the lines and organizing details.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                        <h4 className="font-bold text-gray-900 mb-2">Decision Making</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Combines emotional intelligence with systematic execution, values harmony and efficiency.</p>
                      </div>
                      
                      <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                        <h4 className="font-bold text-gray-900 mb-2">Relationship Needs</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">Values partners who bring vision while appreciating her attention to emotional nuances.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Their Sync Dynamic */}
                <div className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-3xl p-8 border border-primary/20">
                  {/* Magical background elements */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-4 left-8 w-2 h-2 bg-primary/40 rounded-full animate-pulse"></div>
                    <div className="absolute top-8 right-12 w-1 h-1 bg-primary/60 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                    <div className="absolute bottom-6 left-1/4 w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                    <div className="absolute bottom-8 right-1/3 w-1 h-1 bg-primary/70 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                  </div>

                  <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center relative z-10">
                    Their Sync Dynamic
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                  </h3>
                  
                  <div className="grid md:grid-cols-3 gap-8 relative z-10">
                    <div className="text-center group">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-all duration-500 shadow-lg hover:shadow-xl">
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">92%</span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300">Vision Alignment</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Both value growth and structured progress toward shared goals.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-all duration-500 shadow-lg hover:shadow-xl" style={{animationDelay: '0.2s'}}>
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">88%</span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300">Communication Flow</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Peter's big picture thinking complements Olivia's detail orientation perfectly.</p>
                    </div>
                    
                    <div className="text-center group">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 hover:scale-110 transition-all duration-500 shadow-lg hover:shadow-xl" style={{animationDelay: '0.4s'}}>
                        <span className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">95%</span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors duration-300">Growth Potential</h4>
                      <p className="text-gray-600 text-sm leading-relaxed">Their different strengths create a powerful dynamic for mutual development.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Individual Report Example */}
              <div className="bg-white rounded-3xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-500 group max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Peter Farah's Cognitive Processing Profile</h3>
                  <p className="text-gray-600 font-medium">Personal Essence Report • Generated in 2 minutes</p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="transform group-hover:translate-x-1 transition-transform duration-300">
                      <h4 className="font-bold text-gray-900 mb-2">Primary Style</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">Creative Visionary (Big-Picture) - Naturally gravitates towards seeing the grand scheme and weaving ideas into cohesive visions.</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-500">
                      <h4 className="font-bold text-gray-900 mb-2">Peak State</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">Thrives when oscillating between creative exploration and structured planning sessions.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="transform group-hover:translate-x-1 transition-transform duration-700">
                      <h4 className="font-bold text-gray-900 mb-2">Secondary Style</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">Structured Strategist (Process) - Brings methodical execution to innovative ideas.</p>
                    </div>
                    
                    <div className="transform group-hover:translate-x-1 transition-transform duration-900">
                      <h4 className="font-bold text-gray-900 mb-2">Execution Approach</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">Prefers flexible iteration, starting with broad vision and refining through cycles.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl border border-primary/20">
                  <h4 className="font-bold text-gray-900 mb-2 text-center">Key Insight</h4>
                  <p className="text-gray-800 text-center leading-relaxed">
                    A harmonious blend of creativity and structure that enables navigating challenges with agility while bringing visionary ideas to fruition.
                  </p>
                </div>
              </div>
              
              <div className="text-center mt-12">
                <button 
                  onClick={handleGetReportClick}
                  className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-hover transition-colors duration-200 shadow-lg"
                >
                  Get Your Personal Report
                </button>
                <p className="text-gray-500 mt-4">Takes 2 minutes • Instant results</p>
              </div>
            </div>
          </div>
        </section>


        <TestsSection />
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
