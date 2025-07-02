
import React, { useState, useEffect } from 'react';
import HeroSection from '@/components/public-report/HeroSection';
import FeaturesSection from '@/components/public-report/FeaturesSection';
import TestsSection from '@/components/public-report/TestsSection';
import TestimonialsSection from '@/components/public-report/TestimonialsSection';
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
                  Here's a real psychological profile generated for Peter Farrah - see the depth and actionable insights you'll receive.
                </p>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Peter Farrah's Cognitive Processing Profile</h3>
                  <p className="text-gray-600">Personal Essence Report • Generated in 2 minutes</p>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  <div className="bg-blue-50 p-6 rounded-lg mb-6">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2">Primary Style: Creative Visionary (Big-Picture)</h4>
                    <h4 className="text-lg font-semibold text-blue-900 mb-3">Secondary Style: Structured Strategist (Process)</h4>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Thinking & Decision-Making</h4>
                      <p className="text-gray-700 leading-relaxed">
                        Peter's cognitive landscape is a vibrant tapestry of expansive ideas and structured execution. As a Creative Visionary, he naturally gravitates towards seeing the grand scheme of things, weaving together disparate threads into a cohesive vision. His mind is a kaleidoscope of possibilities, always seeking to innovate and explore new horizons.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Peak State</h4>
                      <p className="text-gray-700 leading-relaxed">
                        Peter thrives in environments that allow for both creative exploration and structured planning. His peak performance emerges when he can oscillate between brainstorming sessions and methodical planning.
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Execution Transition</h4>
                      <p className="text-gray-700 leading-relaxed">
                        Peter prefers a flexible iteration approach to move from planning to action. He benefits from starting with a broad vision and then refining it through iterative cycles.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 p-6 bg-green-50 rounded-lg">
                    <h4 className="text-lg font-semibold text-green-900 mb-2">Summary</h4>
                    <p className="text-green-800">
                      Peter's cognitive processing style is a harmonious blend of creativity and structure. By embracing his natural cognitive styles, Peter can navigate challenges with agility and bring his visionary ideas to fruition.
                    </p>
                  </div>
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

        <TestimonialsSection />
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
